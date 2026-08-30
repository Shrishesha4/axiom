import re
import time
import xml.etree.ElementTree as ET
from typing import Any

import httpx

from config import get_settings
from services.therapy import infer_mechanism, normalize_drug_name

CT_API = "https://clinicaltrials.gov/api/v2/studies"
OPENFDA_BASE = "https://api.fda.gov"
PUBMED_SEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi"
PUBMED_FETCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/efetch.fcgi"

CONDITION_PATTERNS: list[tuple[str, str]] = [
    (r"alzheimer'?s?", "Alzheimer Disease"),
    (r"parkinson'?s?", "Parkinson Disease"),
    (r"type\s*2\s*diabetes|t2d", "Type 2 Diabetes"),
    (r"breast\s+cancer", "Breast Cancer"),
    (r"lung\s+cancer|nsclc", "Lung Cancer"),
    (r"melanoma", "Melanoma"),
    (r"rheumatoid\s+arthritis", "Rheumatoid Arthritis"),
    (r"multiple\s+sclerosis", "Multiple Sclerosis"),
    (r"crohn'?s?", "Crohn Disease"),
    (r"ulcerative\s+colitis", "Ulcerative Colitis"),
    (r"heart\s+failure", "Heart Failure"),
    (r"hypertension", "Hypertension"),
    (r"obesity", "Obesity"),
    (r"depression", "Depression"),
    (r"psoriasis", "Psoriasis"),
    (r"hepatitis\s+c", "Hepatitis C"),
    (r"hiv", "HIV"),
]


def infer_condition(query: str) -> str:
    lowered = query.lower()
    for pattern, condition in CONDITION_PATTERNS:
        if re.search(pattern, lowered):
            return condition

    cleaned = re.sub(
        r"^(please\s+)?(analyze|compare|which|what|how|find|show|list|identify|evaluate)\s+",
        "",
        query.strip(),
        flags=re.IGNORECASE,
    )
    cleaned = re.sub(
        r"\b(competitive landscape|clinical trial|trials|therapies|treatments|research|momentum|fda-approved|phase\s+[i\d]+)\b.*$",
        "",
        cleaned,
        flags=re.IGNORECASE,
    ).strip(" .,?")

    return cleaned[:120] if cleaned else query[:120]


_THERAPY_CLASS_SUFFIX = re.compile(
    r"\b(biologics?|biosimilars?|small\s+molecules?|therap(?:y|ies|eutic(?:s| agents)?)|"
    r"treatments?|drugs?|agents?|medications?|landscape|competitive\s+landscape|"
    r"fda-approved|pipeline)\b",
    re.IGNORECASE,
)


def normalize_condition(condition: str) -> str:
    """Map free-text condition strings to ClinicalTrials.gov-friendly disease terms."""
    text = (condition or "").strip()
    if not text:
        return text

    lowered = text.lower()
    for pattern, canonical in CONDITION_PATTERNS:
        if re.search(pattern, lowered):
            return canonical

    stripped = _THERAPY_CLASS_SUFFIX.sub("", text)
    stripped = re.sub(r"\s+", " ", stripped).strip(" ,.-")
    if stripped:
        stripped_lower = stripped.lower()
        for pattern, canonical in CONDITION_PATTERNS:
            if re.search(pattern, stripped_lower):
                return canonical
        if len(stripped) <= 120:
            return stripped

    return infer_condition(text)


def parse_study(study: dict) -> dict | None:
    try:
        proto = study.get("protocolSection", {})
        ident = proto.get("identificationModule", {})
        status_mod = proto.get("statusModule", {})
        design = proto.get("designModule", {})
        sponsor_mod = proto.get("sponsorCollaboratorsModule", {})
        arms = proto.get("armsInterventionsModule", {})
        conditions_mod = proto.get("conditionsModule", {})

        nct_id = ident.get("nctId", "")
        if not nct_id:
            return None

        phases = design.get("phases", [])
        phase = phases[0] if phases else "UNKNOWN"

        interventions = []
        for item in arms.get("interventions", []):
            name = item.get("name", "")
            if name and item.get("type") == "DRUG":
                interventions.append(name)

        sponsor = sponsor_mod.get("leadSponsor", {}).get("name", "Unknown")
        conditions = conditions_mod.get("conditions", [])
        condition = conditions[0] if conditions else ""

        enrollment = None
        enrollment_info = design.get("enrollmentInfo", {})
        if enrollment_info:
            enrollment = enrollment_info.get("count")

        start_date = status_mod.get("startDateStruct", {}).get("date", "")
        primary_drug = interventions[0] if interventions else None

        return {
            "nct_id": nct_id,
            "title": ident.get("briefTitle", ""),
            "phase": phase,
            "status": status_mod.get("overallStatus", ""),
            "sponsor": sponsor,
            "interventions": interventions,
            "therapy": primary_drug,
            "mechanism": infer_mechanism(primary_drug) if primary_drug else "Other",
            "enrollment": enrollment,
            "start_date": start_date,
            "condition": condition,
        }
    except Exception:
        return None


def fetch_clinical_trials(
    condition: str,
    phase: str | None = None,
    status: str | None = None,
    max_results: int = 200,
) -> list[dict]:
    trials: list[dict] = []
    params: dict[str, Any] = {
        "query.cond": condition,
        "pageSize": 100,
        "countTotal": "true",
    }

    if phase:
        params["filter.advanced"] = f"AREA[Phase]{phase}"
    else:
        params["filter.advanced"] = (
            "AREA[Phase]PHASE2 OR AREA[Phase]PHASE3 OR AREA[Phase]PHASE4"
        )

    page_token = None

    with httpx.Client(timeout=60) as client:
        while len(trials) < max_results:
            if page_token:
                params["pageToken"] = page_token
            response = client.get(CT_API, params=params)
            response.raise_for_status()
            payload = response.json()

            for study in payload.get("studies", []):
                parsed = parse_study(study)
                if not parsed:
                    continue
                if status and parsed.get("status") != status:
                    continue
                trials.append(parsed)
                if len(trials) >= max_results:
                    break

            page_token = payload.get("nextPageToken")
            if not page_token:
                break
            time.sleep(0.25)

    return trials


def fetch_pubmed(therapy_name: str, condition: str | None = None, max_results: int = 8) -> list[dict]:
    publications: list[dict] = []
    term = therapy_name
    if condition:
        term = f"{therapy_name} AND {condition}"

    try:
        with httpx.Client(timeout=30) as client:
            search_params = {
                "db": "pubmed",
                "term": term,
                "retmax": max_results,
                "retmode": "json",
            }
            search_response = client.get(PUBMED_SEARCH, params=search_params)
            search_response.raise_for_status()
            id_list = search_response.json().get("esearchresult", {}).get("idlist", [])
            if not id_list:
                return []

            fetch_params = {
                "db": "pubmed",
                "id": ",".join(id_list),
                "retmode": "xml",
            }
            fetch_response = client.get(PUBMED_FETCH, params=fetch_params)
            fetch_response.raise_for_status()

            root = ET.fromstring(fetch_response.text)
            for article in root.findall(".//PubmedArticle"):
                pmid_el = article.find(".//PMID")
                title_el = article.find(".//ArticleTitle")
                abstract_els = article.findall(".//AbstractText")
                date_el = article.find(".//PubDate/Year")

                pmid = pmid_el.text if pmid_el is not None else ""
                title = title_el.text if title_el is not None else ""
                abstract = " ".join((el.text or "") for el in abstract_els)
                pub_date = date_el.text if date_el is not None else ""

                if pmid and title:
                    publications.append(
                        {
                            "pmid": pmid,
                            "title": title,
                            "abstract": abstract[:500] if abstract else "",
                            "pub_date": pub_date,
                        }
                    )
            time.sleep(0.34)
    except Exception:
        return []

    return publications


def fetch_safety_profile(therapy_name: str) -> dict:
    settings = get_settings()
    headers: dict[str, str] = {}
    if settings.openfda_api_key:
        headers["Authorization"] = f"Bearer {settings.openfda_api_key}"

    search_name = therapy_name.replace('"', "")
    params = {
        "search": f'patient.drug.medicinalproduct:"{search_name}"',
        "count": "patient.reaction.reactionmeddrapt.exact",
        "limit": 10,
    }

    events: list[dict] = []
    try:
        with httpx.Client(timeout=30) as client:
            response = client.get(
                f"{OPENFDA_BASE}/drug/event.json",
                params=params,
                headers=headers,
            )
            if response.status_code == 200:
                for item in response.json().get("results", []):
                    term = item.get("term", "")
                    count = item.get("count", 0)
                    if term:
                        events.append({"reaction": term, "count": count})
    except Exception:
        pass

    total = sum(event["count"] for event in events)
    return {
        "therapy": therapy_name,
        "events": events,
        "total_reports": total,
    }


def fetch_fda_approval(therapy_name: str) -> bool:
    settings = get_settings()
    headers: dict[str, str] = {}
    if settings.openfda_api_key:
        headers["Authorization"] = f"Bearer {settings.openfda_api_key}"

    search_name = therapy_name.replace('"', "")
    params = {"search": f'openfda.brand_name:"{search_name}"', "limit": 1}

    try:
        with httpx.Client(timeout=30) as client:
            response = client.get(
                f"{OPENFDA_BASE}/drug/drugsfda.json",
                params=params,
                headers=headers,
            )
            if response.status_code == 200:
                return bool(response.json().get("results"))
    except Exception:
        pass
    return False
