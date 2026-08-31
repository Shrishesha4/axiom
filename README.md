# Axiom

AI-powered  research workspace for competitive pharmaceutical intelligence. Queries live public data sources at investigation time — no pre-seeded demo datasets.

## How It Works

1. Enter any therapeutic area or competitive intelligence question in the command center
2. The agent fetches live data from ClinicalTrials.gov, openFDA, and PubMed via tool calls
3. The workspace builds KPIs, charts, and trial tables from that live dataset
4. Use **Explain these signals** for AI analysis grounded in fetched data
5. Ask follow-up questions — the agent can call tools again for fresh results
6. Generate an **Executive Briefing** from the live investigation

## Data Provenance

All data comes from official public APIs at query time:

| Source | Data |
|--------|------|
| [ClinicalTrials.gov API v2](https://clinicaltrials.gov/data-api/api) | Clinical trials, phases, sponsors, interventions |
| [openFDA](https://open.fda.gov/apis/) | Drug approvals, adverse events |
| [PubMed E-utilities](https://www.ncbi.nlm.nih.gov/home/develop/api/) | Scientific publications |

PostgreSQL stores investigations, agent traces, and summaries only — not a static trial warehouse.

Momentum scores are **computed server-side** from live trial data. The LLM explains them; it does not invent them.

## Quick Start (Docker)

```bash
cp .env.example .env
# Edit .env and set OPENROUTER_API_KEY

docker compose up -d
```

- **App:** http://localhost:3001
- **API:** http://localhost:8000
- **Health:** http://localhost:8000/health

First investigation may take 30–60 seconds while live APIs are queried.

## Local Development

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
export DATABASE_URL=postgresql://axiom:axiom@localhost:5432/axiom_db
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────────────┐
│  Next.js    │────▶│   FastAPI    │────▶│ PostgreSQL              │
│  (port 3001)│ SSE │  (port 8000) │     │ (investigations only)   │
└─────────────┘     └──────┬───────┘     └─────────────────────────┘
                           │
              ┌────────────┼────────────┐
              ▼            ▼            ▼
      ClinicalTrials.gov  openFDA    PubMed
              │
              ▼
        ┌──────────────┐
        │  OpenRouter  │
        │ DeepSeek V4  │
        │    Flash     │
        └──────────────┘
```

## Tech Stack

- **Frontend:** Next.js, Tailwind CSS, shadcn/ui, Recharts
- **Backend:** FastAPI, SQLAlchemy, OpenRouter function calling (DeepSeek V4 Flash)
- **Database:** PostgreSQL 16 (investigation state)
- **Infrastructure:** Docker Compose
