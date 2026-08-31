#!/usr/bin/env python3
"""Generate interview prep scenarios PDF."""

from pathlib import Path

from fpdf import FPDF


class GuidePDF(FPDF):
    def header(self):
        pass

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(130, 130, 130)
        self.cell(0, 10, f"Page {self.page_no()}", align="C")

    def ensure_space(self, height: float):
        if self.get_y() + height > self.page_break_trigger:
            self.add_page()

    def section_title(self, title: str):
        self.ensure_space(20)
        self.ln(2)
        self.set_font("Helvetica", "B", 15)
        self.set_text_color(20, 60, 120)
        self.multi_cell(0, 8, title)
        self.ln(1)

    def sub_title(self, title: str):
        self.ensure_space(14)
        self.ln(1)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 7, title)
        self.ln(1)

    def body(self, text: str):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text: str):
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.set_x(self.l_margin + 4)
        self.multi_cell(0, 5.5, f"  -  {text}")
        self.ln(0.5)

    def quote_box(self, text: str):
        self.ensure_space(16)
        self.set_fill_color(250, 252, 255)
        self.set_draw_color(180, 200, 230)
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(40, 50, 70)
        self.multi_cell(0, 5.5, text, border=1, fill=True)
        self.ln(2)

    def tip_box(self, label: str, text: str):
        self.ensure_space(14)
        self.set_fill_color(245, 250, 245)
        self.set_draw_color(170, 200, 170)
        self.set_font("Helvetica", "B", 10)
        self.set_text_color(30, 70, 40)
        self.cell(0, 6, label, new_x="LMARGIN", new_y="NEXT", fill=True)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, text, border="LRB", fill=True)
        self.ln(2)


def build_pdf(output_path: Path) -> None:
    pdf = GuidePDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(15, 45, 90)
    pdf.multi_cell(0, 11, "Interview Prep: Axiom MVP")
    pdf.ln(4)
    pdf.body(
        "Scenario-based answers for life sciences, cloud, and AI conversations. "
        "Say these in your own words - you do not need to sound like an expert."
    )

    # --- Elevator pitch ---
    pdf.section_title("Quick Elevator Pitch (30 seconds)")
    pdf.quote_box(
        '"I built Axiom, an MVP for competitive pharmaceutical intelligence. '
        "A user types a question like 'What is the Alzheimer trial landscape?' "
        "and the app pulls live data from ClinicalTrials.gov, FDA, and PubMed, "
        "shows charts and rankings, and uses AI to explain what it found. "
        "I vibe-coded it as a fast proof-of-concept on Docker and a GCP VM, "
        'with guardrails so the AI explains real numbers instead of making them up."'
    )

    pdf.section_title("The One Idea to Remember")
    pdf.bullet("Problem: Teams waste time jumping between websites to understand a therapy area.")
    pdf.bullet("Solution: One workspace that fetches live public data, visualizes it, and uses AI as an assistant.")
    pdf.bullet("Why MVP: Prove the workflow works before investing in enterprise features.")

    # --- Part 1 ---
    pdf.section_title("Part 1: Core Questions and Answers")

    pdf.sub_title('Scenario A: "Tell me about your project."')
    pdf.body("What to say:")
    pdf.quote_box(
        "Axiom is an AI-powered research workspace for life sciences competitive intelligence. "
        "Instead of opening five different websites, a user asks one question in plain English. "
        "The system searches live trial data, FDA safety info, and PubMed papers, then builds "
        "a dashboard - charts, trial tables, momentum rankings - and lets the user chat with "
        "an AI agent about what it found. They can also generate an executive briefing or run "
        "a bull-vs-bear investment debate on the data.\n\n"
        "It is an MVP I built to show how cloud + AI can speed up early-stage research workflows. "
        "It is deployed on a Google Cloud VM with Docker and nginx."
    )
    pdf.body("If they want more detail, add:")
    pdf.bullet("Frontend: Next.js (what users see)")
    pdf.bullet("Backend: Python FastAPI (the brain)")
    pdf.bullet("Database: PostgreSQL (saves investigations and user sessions)")
    pdf.bullet("AI: OpenRouter with DeepSeek V4 Flash (open-source), using tool calling so the model fetches data instead of guessing")

    pdf.sub_title('Scenario B: "Why did you choose this project?"')
    pdf.body("What to say - three reasons:")
    pdf.bullet("It matches the industry. Life sciences teams need competitive landscape views - real work, not a toy demo.")
    pdf.bullet("It shows cloud + AI together. The AI orchestrates live data fetches and explains results.")
    pdf.bullet("Public data makes an MVP possible. ClinicalTrials.gov, openFDA, and PubMed are free official APIs.")
    pdf.tip_box(
        "Simple analogy:",
        "I did not build a fake demo with hardcoded charts. I built a working assistant that goes to the real library every time.",
    )

    pdf.sub_title('Scenario C: "What problem does it solve?"')
    pdf.quote_box(
        "Today, competitive intelligence in pharma often looks like this: open ClinicalTrials.gov, "
        "export spreadsheets, search PubMed separately, check FDA adverse events elsewhere, "
        "then write a slide deck by hand. That takes hours and the data is stale the next day.\n\n"
        "Axiom reduces that to one flow: ask a question, get a live dashboard, ask follow-ups, "
        "export a briefing. The AI handles the tedious gathering and first-pass synthesis. "
        "The human still makes decisions - but they start with organized, cited, live data."
    )
    pdf.body("Who benefits:")
    pdf.bullet("BD / strategy teams scouting therapy areas")
    pdf.bullet("Researchers comparing mechanisms")
    pdf.bullet("Anyone doing early competitive landscaping before a deeper analyst dive")

    pdf.sub_title('Scenario D: "You said you vibe-coded this. What does that mean?"')
    pdf.quote_box(
        "Vibe coding means I used AI coding tools - mainly Cursor and Antigravity - to build the MVP quickly. "
        "I described what I wanted, reviewed the code the AI suggested, tested it, and iterated. "
        "I did not hand-write every line from scratch.\n\n"
        "That let me focus on product flow and architecture instead of boilerplate. "
        "For an MVP, speed matters. I own the design decisions - data sources, agent tools, "
        "dashboard layout - even if AI helped write the implementation."
    )
    pdf.body("If they push on quality:")
    pdf.quote_box(
        "I still validate behavior: does the agent cite real NCT IDs? Do charts match API data? "
        "Does deployment work on GCP? Vibe coding is an accelerator, not a substitute for thinking."
    )
    pdf.body("Tools you used:")
    pdf.bullet("Cursor/Antigravity - main IDE; AI pair programmer for frontend, backend, Docker, fixes")
    pdf.bullet("OpenRouter - API gateway to access LLMs with one integration")
    pdf.bullet("DeepSeek V4 Flash - open-source model for agent reasoning, tool selection, explanations, briefings, debate")
    pdf.bullet("Docker Compose - run database + API + web together")
    pdf.bullet("GCP VM - host the app in the cloud")
    pdf.bullet("nginx - front door, routes visitors to the right service")
    pdf.bullet("dpdns - free domain pointing to your VM")

    pdf.sub_title('Scenario E: "How does the AI actually work?"')
    pdf.body("What to say - step by step:")
    pdf.bullet('User types: "Show me the diabetes drug trial landscape."')
    pdf.bullet("Frontend sends that to the FastAPI backend.")
    pdf.bullet("The orchestrator (agent loop) sends the question to the LLM with a list of tools it can call.")
    pdf.bullet("The LLM decides which tools to call (e.g. get_therapy_landscape, rank_therapies_by_momentum).")
    pdf.bullet("Backend runs those tools - they hit real APIs (ClinicalTrials.gov, PubMed, openFDA).")
    pdf.bullet("Results go back to the LLM. It writes a summary using only that data.")
    pdf.bullet("Backend saves the investigation, builds dashboard config, streams text to the UI.")
    pdf.bullet("User can ask follow-ups or generate an executive briefing.")
    pdf.tip_box(
        "Key phrase:",
        "The LLM is the coordinator. The numbers come from code and public APIs, not from the model's memory.",
    )

    pdf.sub_title('Scenario F: "How do you stop the AI from making up trial data?"')
    pdf.body("What to say - four guardrails:")
    pdf.bullet("Tool-first architecture - agent must call tools to get trial counts, rankings, and safety data.")
    pdf.bullet("Server-computed scores - momentum rankings are calculated in Python from live data.")
    pdf.bullet("Strict prompts - never invent trial counts, drug names, or statistics; cite NCT IDs.")
    pdf.bullet("Validation - code checks if synthesis contradicts empty data.")
    pdf.body(
        "For production I would add: source citations in UI, audit logs, human review for high-stakes outputs."
    )

    pdf.sub_title('Scenario G: "Why DeepSeek V4 Flash and OpenRouter?"')
    pdf.quote_box(
        "I use DeepSeek V4 Flash - an open-source model that is fast, cost-effective, and strong at "
        "coding, reasoning, and agent workflows. I access it through OpenRouter, which gives me one "
        "API integration, easy model swapping, and provider failover without rewriting the app. "
        "Under the hood it uses the same OpenAI-compatible API format with chat completions and function calling."
    )

    # --- Part 2 ---
    pdf.section_title("Part 2: Features - What Exists vs What You Could Add")

    pdf.sub_title("What the MVP already has (name 2-3 in an interview)")
    features = [
        ("Live investigation", "Fetches fresh trial/FDA/PubMed data per query"),
        ("AI agent with tools", "LLM calls 8+ tools - search trials, landscape, rankings, etc."),
        ("Dynamic dashboard", "Charts and sections adapt to question intent"),
        ("Momentum rankings", "Server-side scoring from live trials"),
        ("White-space opportunities", "Finds undercrowded mechanism areas"),
        ("Competitive matrix", "Bubble chart positioning therapies"),
        ("Explain these signals", "AI narrates the dashboard data"),
        ("Follow-up chat", "Ask more questions on same investigation"),
        ("Executive briefing", "Markdown report from live investigation"),
        ("Bull vs Bear debate", "Two AI analysts argue opposite sides, then synthesize"),
        ("Session library", "Save and revisit past investigations"),
        ("Auth + admin", "Login, Google OAuth option, token limits"),
    ]
    for name, desc in features:
        pdf.bullet(f"{name} - {desc}")

    pdf.sub_title('Future features (answer "where would you take this?")')
    future = [
        "Proprietary data connectors - customer internal pipelines, CRM, lab data",
        "Alerting - notify when a competitor starts a Phase 3 trial",
        "Regulatory workflow - audit-ready reports with full source trail",
        "Multi-tenant workspaces - teams, roles, shared investigations",
        "RAG on internal documents - PDFs, SEC filings, conference abstracts",
        "Forecasting module - approval timeline estimates from historical data",
        "Comparator trials - side-by-side protocol comparison across sponsors",
        "Safety signal monitoring - continuous openFDA watch with trend detection",
        "Fine-tuned domain model - smaller model trained on pharma language",
        "GCP-native scaling - Cloud Run, GKE, Cloud SQL, Secret Manager, IAM",
    ]
    for i, item in enumerate(future, 1):
        pdf.bullet(f"{i}. {item}")
    pdf.tip_box(
        "How to say it simply:",
        "The MVP proves the user journey. Production would add customer data, compliance, alerts, "
        "and enterprise cloud hardening - that is where a life sciences cloud company adds real value.",
    )

    # --- Part 3 ---
    pdf.section_title('Part 3: "Where Are You Going Forward?"')

    pdf.sub_title('Scenario H: "What is your roadmap?"')
    pdf.quote_box(
        "Phase 1 is done - working MVP with live public data and AI agent. "
        "Phase 2 would harden for real users: better auth, monitoring, faster caching, more data sources. "
        "Phase 3 would be enterprise: private data integration, team features, compliance, "
        "and deployment on proper GCP services instead of a single VM."
    )
    pdf.body("Phased breakdown:")
    pdf.bullet("Now (MVP): Live APIs, agent, dashboard, briefing, deploy on GCP VM")
    pdf.bullet("Next: Caching, error handling, mobile polish, more charts")
    pdf.bullet("Later: SSO, audit logs, private data, alerts, multi-tenant, GxP considerations")

    pdf.sub_title('Scenario I: "How is this relevant to our company?"')
    pdf.body("If they are life sciences focused:")
    pdf.quote_box(
        "It automates a workflow your customers already do manually - competitive landscaping. "
        "The MVP shows AI can sit on top of trusted public data sources and produce analyst-ready outputs."
    )
    pdf.body("If they are cloud focused:")
    pdf.quote_box(
        "It is a containerized app designed for cloud deploy. The next step is migrating from a single VM "
        "to managed GCP services - Cloud Run, Cloud SQL, load balancing."
    )
    pdf.body("If they are AI focused:")
    pdf.quote_box(
        "It is not a chatbot wrapper. It is an agentic system with tool calling, streaming, "
        "guardrails against hallucination, and structured outputs (dashboards, briefings, debate). "
        "That is a reusable pattern for other domain agents."
    )

    # --- Part 4 ---
    pdf.section_title("Part 4: Technical Scenarios")

    pdf.sub_title('Scenario J: "How is it deployed?"')
    pdf.quote_box(
        "I run it on a Google Cloud VM - a rented Linux server. Docker Compose starts three containers: "
        "PostgreSQL, the Python API, and the Next.js frontend. nginx sits in front as the front door "
        "on ports 80/443. A free dpdns domain points to the VM's IP.\n\n"
        "To update: pull latest code, run docker compose up -d --build, nginx keeps routing traffic."
    )

    pdf.sub_title('Scenario K: "What tech stack did you use?"')
    stack = [
        ("UI", "Next.js, React, Tailwind, shadcn/ui"),
        ("Charts", "Recharts"),
        ("API", "FastAPI (Python)"),
        ("DB", "PostgreSQL"),
        ("AI", "OpenRouter + DeepSeek V4 Flash (open-source)"),
        ("Data", "ClinicalTrials.gov, openFDA, PubMed"),
        ("Infra", "Docker, GCP VM, nginx, dpdns"),
    ]
    for layer, tech in stack:
        pdf.bullet(f"{layer}: {tech}")

    pdf.sub_title('Scenario L: "What are the limitations?"')
    limits = [
        "Public data only - no proprietary pipelines yet",
        "Single VM - not auto-scaling or highly available",
        "First investigation can take 30-60 seconds (live API calls)",
        "MVP auth - not enterprise SSO or full compliance",
        "AI outputs still need human verification for high-stakes decisions",
        "Token costs scale with usage - production needs budgeting",
    ]
    for item in limits:
        pdf.bullet(item)
    pdf.tip_box(
        "Frame it positively:",
        "Those are intentional MVP boundaries. They keep scope manageable while proving the core workflow.",
    )

    # --- Part 5 ---
    pdf.section_title("Part 5: Tough or Surprise Questions")

    pdf.sub_title('Scenario M: "Did you really build this yourself?"')
    pdf.quote_box(
        "I built it with AI-assisted development - Cursor/Antigravity helped me write code faster. "
        "I designed the architecture, chose the data sources, defined the agent tools and prompts, "
        "set up deployment, and tested the flows. Think of it as being the architect and product owner "
        "with an AI junior developer, not as copying a tutorial."
    )

    pdf.sub_title('Scenario N: "Why pharma / competitive intelligence specifically?"')
    pdf.quote_box(
        "Because it is a domain where data quality matters more than flashy chat. "
        "If the AI invents a trial count, someone could make a bad business decision. "
        "That forces good engineering - tool calling, live APIs, server-side metrics. "
        "It maps directly to life sciences customers."
    )

    pdf.sub_title('Scenario O: "What would you do differently if you started again?"')
    pdf.bullet("Add caching earlier for repeated API calls")
    pdf.bullet("Set up CI/CD from day one instead of manual deploys")
    pdf.bullet("Define the tool schema and dashboard config before building UI")
    pdf.bullet("Write a short architecture doc earlier for onboarding")

    pdf.sub_title('Scenario P: "Demo walkthrough" (if they ask you to show it live)')
    pdf.body("Script:")
    steps = [
        "Open home page - enter a therapy area question",
        'Point to agent trace: "See it searching ClinicalTrials.gov live"',
        "Show dashboard: landscape chart, momentum table, white-space section",
        'Click "Explain these signals" - AI narrates the data',
        'Ask a follow-up: "Which therapy has the most Phase 3 trials?"',
        "Generate executive briefing - show structured report",
        "Optional: run bull/bear debate",
    ]
    for i, step in enumerate(steps, 1):
        pdf.bullet(f"{i}. {step}")
    pdf.tip_box(
        "If something is slow:",
        "First load hits live APIs - production would cache common queries.",
    )

    # --- Part 6 ---
    pdf.section_title("Part 6: Cheat Sheet - Phrases That Sound Informed")
    cheats = [
        ("Agentic AI", "The LLM picks which tools to call, in a loop, until it has enough data."),
        ("RAG", "My MVP uses live API calls instead of a vector DB - RAG on internal docs is a next step."),
        ("Hallucination", "Numbers come from code; the LLM only explains them."),
        ("SSE / streaming", "Long AI answers stream to the browser so the user sees progress."),
        ("MVP", "Minimum viable product - enough to test the workflow, not everything enterprise needs."),
        ("Vibe coding", "AI-assisted rapid development with Cursor - fast iteration, human oversight."),
        ("Momentum score", "A server-computed ranking from trial activity - not something the model guesses."),
        ("White-space", "Areas where few trials exist but differentiation potential is high."),
    ]
    for term, answer in cheats:
        pdf.bullet(f"{term}: {answer}")

    # --- Part 7 ---
    pdf.section_title("Part 7: Questions YOU Can Ask Them")
    pdf.body("Shows interest and ties back to your project:")
    questions = [
        "Do your customers already use ClinicalTrials.gov manually, or do you integrate trial data?",
        "How do you handle AI governance when outputs could influence business decisions?",
        "Are you investing in agentic workflows or mostly chat/RAG assistants today?",
        "What would make an MVP like this valuable enough to pilot with a real team?",
        "Do you deploy customer workloads on GCP, and would containerized apps fit your architecture?",
    ]
    for i, q in enumerate(questions, 1):
        pdf.bullet(f'{i}. "{q}"')

    pdf.ln(4)
    pdf.body(
        "Practice out loud once. Pick 3 scenarios most likely for your interview "
        "and memorize the opening two sentences of each."
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(output_path))


if __name__ == "__main__":
    out = Path(__file__).resolve().parent / "Axiom-Interview-Prep.pdf"
    build_pdf(out)
    print(f"Created: {out}")
