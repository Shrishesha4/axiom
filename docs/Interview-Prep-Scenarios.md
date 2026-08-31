# Interview Prep: Axiom MVP

**For:** Life sciences + cloud + AI company conversations  
**Tone:** Plain English. Say these in your own words — you do not need to sound like an expert.

---

## Quick elevator pitch (30 seconds)

> "I built Axiom, an MVP for competitive pharmaceutical intelligence. A user types a question like 'What is the Alzheimer trial landscape?' and the app pulls **live data** from ClinicalTrials.gov, FDA, and PubMed, shows charts and rankings, and uses AI to explain what it found. I vibe-coded it as a fast proof-of-concept — Docker on a GCP VM, with guardrails so the AI explains real numbers instead of making them up."

---

## The one idea to remember

**Problem:** Researchers and strategy teams waste time jumping between websites to understand a therapy area.

**Solution:** One workspace that fetches live public data, visualizes it, and uses AI as an assistant — not as a fake database.

**Why MVP:** Prove the workflow works before investing in enterprise features (private data, compliance, alerts, etc.).

---

# Part 1: Core questions and answers

## Scenario A: "Tell me about your project."

**What to say:**

"Axiom is an AI-powered research workspace for life sciences competitive intelligence. Instead of opening five different websites, a user asks one question in plain English. The system searches live trial data, FDA safety info, and PubMed papers, then builds a dashboard — charts, trial tables, momentum rankings — and lets the user chat with an AI agent about what it found. They can also generate an executive briefing or run a bull-vs-bear investment debate on the data.

It is an MVP I built to show how cloud + AI can speed up early-stage research workflows. It is deployed on a Google Cloud VM with Docker and nginx."

**If they want more detail, add:**

- Frontend: Next.js (what users see)
- Backend: Python FastAPI (the brain)
- Database: PostgreSQL (saves investigations and user sessions, not a giant trial warehouse)
- AI: OpenRouter with DeepSeek V4 Flash (open-source), using tool calling so the model fetches data instead of guessing

---

## Scenario B: "Why did you choose this project?"

**What to say:**

"Three reasons:

1. **It matches the industry.** Life sciences teams constantly need competitive landscape views — who is running trials, which mechanisms are crowded, where white-space exists. That is real work, not a toy demo.

2. **It shows cloud + AI together.** The cloud part is reliable hosting and APIs. The AI part is not 'chat for chat's sake' — it orchestrates live data fetches and explains results. That is the kind of product a life sciences cloud company would care about.

3. **Public data makes an MVP possible.** ClinicalTrials.gov, openFDA, and PubMed are free official APIs. I could build something credible without needing proprietary pharma datasets on day one."

**Simple analogy:**

"I did not build a fake demo with hardcoded charts. I built a working assistant that goes to the real library every time."

---

## Scenario C: "What problem does it solve?"

**What to say:**

"Today, competitive intelligence in pharma often looks like this: open ClinicalTrials.gov, export spreadsheets, search PubMed separately, check FDA adverse events elsewhere, then write a slide deck by hand. That takes hours and the data is stale the next day.

Axiom reduces that to one flow: ask a question, get a live dashboard, ask follow-ups, export a briefing. The AI handles the tedious gathering and first-pass synthesis. The human still makes decisions — but they start with organized, cited, live data."

**Who benefits:**

- BD / strategy teams scouting therapy areas
- Researchers comparing mechanisms
- Anyone doing early competitive landscaping before a deeper analyst dive

---

## Scenario D: "You said you vibe-coded this. What does that mean?"

**What to say (honest and confident):**

"Vibe coding means I used AI coding tools — mainly Cursor — to build the MVP quickly. I described what I wanted, reviewed the code the AI suggested, tested it, and iterated. I did not hand-write every line from scratch.

That let me focus on **product flow and architecture** instead of boilerplate. For an MVP, speed matters. The trade-off is I own the design decisions — what data sources, how the agent calls tools, what the dashboard shows — even if AI helped write the implementation."

**If they push on quality:**

"I still validate behavior: does the agent cite real NCT IDs? Do charts match API data? Does deployment work on GCP? Vibe coding is a accelerator, not a substitute for thinking."

**Tools you likely used:**

| Tool | How you used it |
|------|-----------------|
| **Cursor** | Main IDE; AI pair programmer for frontend, backend, Docker, fixes |
| **OpenRouter** | API gateway to LLMs — one key, swap models easily |
| **DeepSeek V4 Flash (via OpenRouter)** | Open-source model for agent reasoning, tool selection, explanations, briefings, debate |
| **Docker Compose** | Run database + API + web together |
| **GCP VM** | Host the app in the cloud |
| **nginx** | Front door — routes visitors to the right service |
| **dpdns** | Free domain pointing to your VM |

---

## Scenario E: "How does the AI actually work? Walk me through it."

**What to say (step by step):**

1. User types: "Show me the diabetes drug trial landscape."
2. Frontend sends that to the FastAPI backend.
3. The **orchestrator** (agent loop) sends the question to the LLM with a list of **tools** it can call.
4. The LLM decides: "I need `get_therapy_landscape` and `rank_therapies_by_momentum`."
5. Backend runs those tools — they hit **real APIs** (ClinicalTrials.gov, PubMed, openFDA).
6. Results go back to the LLM. It writes a summary using **only** that data.
7. Backend saves the investigation, builds dashboard config (which charts to show), streams text to the UI.
8. User can ask follow-ups or generate an executive briefing.

**Key phrase to use:**

"The LLM is the coordinator. The numbers come from code and public APIs, not from the model's memory."

---

## Scenario F: "How do you stop the AI from making up trial data?"

**What to say:**

"That was a deliberate design choice. Three guardrails:

1. **Tool-first architecture** — The agent must call tools to get trial counts, rankings, and safety data. It is instructed to use only tool results.

2. **Server-computed scores** — Momentum rankings are calculated in Python from live data. The LLM explains the scores; it does not invent them.

3. **Strict prompts** — System prompt says: never invent trial counts, drug names, or statistics; cite NCT IDs from results.

4. **Validation** — The code checks if synthesis contradicts empty data (e.g. saying 'no trials' when trials exist).

For a production system I would add more: source citations in UI, audit logs, human review for high-stakes outputs."

---

## Scenario G: "Why DeepSeek V4 Flash and OpenRouter?"

**What to say:**

"I use DeepSeek V4 Flash — an open-source model that is fast, cost-effective, and strong at coding, reasoning, and agent workflows. I access it through OpenRouter, which gives me one API integration, easy model swapping, and provider failover without rewriting the app.

Under the hood it is the same OpenAI-compatible API format, so the code uses the standard chat completions + function calling pattern."

---

# Part 2: Features — what exists vs what you could add

## What the MVP already has (be ready to name 2–3)

| Feature | What it does | Why it matters |
|---------|--------------|----------------|
| **Live investigation** | Fetches fresh trial/FDA/PubMed data per query | No stale demo data |
| **AI agent with tools** | LLM calls 8+ tools (search trials, landscape, rankings, etc.) | Real agentic workflow |
| **Dynamic dashboard** | Charts/sections adapt to question intent | User sees what they asked for |
| **Momentum rankings** | Server-side scoring from live trials | Quantified competitive signal |
| **White-space opportunities** | Finds undercrowded mechanism areas | Strategy / BD insight |
| **Competitive matrix** | Bubble chart positioning therapies | Visual competitive view |
| **Explain these signals** | AI narrates the dashboard data | Bridges data → insight |
| **Follow-up chat** | Ask more questions on same investigation | Interactive research |
| **Executive briefing** | Markdown report from live investigation | Shareable output |
| **Bull vs Bear debate** | Two AI analysts argue opposite sides, then synthesize | Decision-support framing |
| **Session library** | Save and revisit past investigations | Continuity |
| **Auth + admin** | Login, Google OAuth option, token limits | Multi-user MVP |

## Exclusive / differentiated ideas (future — say "next phase")

These are strong answers for "where would you take this?"

1. **Proprietary data connectors** — Connect customer internal pipelines, CRM, or lab data (not just public APIs).
2. **Alerting** — "Notify me when a competitor starts a Phase 3 trial in my therapy area."
3. **Regulatory workflow** — Export audit-ready reports with full source trail (important for pharma).
4. **Multi-tenant workspaces** — Teams, roles, shared investigations (enterprise cloud pattern).
5. **RAG on internal documents** — Upload PDFs, SEC filings, conference abstracts; AI answers with citations.
6. **Forecasting module** — Approval timeline estimates from historical phase-transition data.
7. **Comparator trials** — Side-by-side protocol comparison across sponsors.
8. **Safety signal monitoring** — Continuous openFDA watch with trend detection.
9. **Fine-tuned domain model** — Smaller model trained on pharma language for cheaper/faster queries.
10. **GCP-native scaling** — Cloud Run / GKE, Cloud SQL, Secret Manager, IAM — proper enterprise deploy.

**How to say it simply:**

"The MVP proves the user journey. Production would add customer data, compliance, alerts, and enterprise cloud hardening — that is where a life sciences cloud company adds real value."

---

# Part 3: "Where are you going forward?"

## Scenario H: "What is your roadmap?"

**Short answer:**

"Phase 1 is done — working MVP with live public data and AI agent. Phase 2 would be harden for real users: better auth, monitoring, faster caching, more data sources. Phase 3 would be enterprise: private data integration, team features, compliance, and deployment on proper GCP services instead of a single VM."

**Phased table (if they want structure):**

| Phase | Focus | Examples |
|-------|-------|----------|
| **Now (MVP)** | Prove workflow | Live APIs, agent, dashboard, briefing, deploy on GCP VM |
| **Next** | Reliability + UX | Caching, error handling, mobile polish, more charts |
| **Later** | Enterprise | SSO, audit logs, private data, alerts, multi-tenant, GxP considerations |

---

## Scenario I: "How is this relevant to our company?"

**Tailor based on what they emphasize:**

**If they are life sciences focused:**

"It automates a workflow your customers already do manually — competitive landscaping. The MVP shows AI can sit on top of trusted public data sources and produce analyst-ready outputs."

**If they are cloud focused:**

"It is a containerized app designed for cloud deploy. The next step is migrating from a single VM to managed GCP services — Cloud Run, Cloud SQL, load balancing — which is exactly the kind of modernization cloud teams sell."

**If they are AI focused:**

"It is not a chatbot wrapper. It is an agentic system with tool calling, streaming, guardrails against hallucination, and structured outputs (dashboards, briefings, debate). That is a reusable pattern for other domain agents."

---

# Part 4: Technical scenarios (still beginner-friendly)

## Scenario J: "How is it deployed?"

"I run it on a Google Cloud VM — a rented Linux server. Docker Compose starts three containers: PostgreSQL, the Python API, and the Next.js frontend. nginx sits in front as the front door on ports 80/443. A free dpdns domain points to the VM's IP so people can visit by name instead of a numeric address.

To update: pull latest code, run `docker compose up -d --build`, nginx keeps routing traffic to the new containers."

---

## Scenario K: "What tech stack did you use?"

| Layer | Technology | One-line why |
|-------|------------|--------------|
| UI | Next.js, React, Tailwind, shadcn/ui | Modern web app, fast to build |
| Charts | Recharts | Interactive dashboards |
| API | FastAPI (Python) | Fast to write, great for AI backends |
| DB | PostgreSQL | Reliable, stores investigations + users |
| AI | OpenRouter + DeepSeek V4 Flash | Open-source LLM with function calling |
| Data | ClinicalTrials.gov, openFDA, PubMed | Official public life sciences APIs |
| Infra | Docker, GCP VM, nginx, dpdns | Simple, cheap MVP hosting |

---

## Scenario L: "What are the limitations?"

**Good honest answer (shows maturity):**

- Public data only — no proprietary pipelines yet
- Single VM — not auto-scaling or highly available
- First investigation can take 30–60 seconds (live API calls)
- MVP auth — not enterprise SSO or full compliance
- AI outputs still need human verification for high-stakes decisions
- Token costs scale with usage — admin limits help but production needs budgeting

**Frame it positively:**

"Those are intentional MVP boundaries. They keep scope manageable while proving the core workflow."

---

# Part 5: Tough or surprise questions

## Scenario M: "Did you really build this yourself?"

"I built it with AI-assisted development — Cursor helped me write code faster. I designed the architecture, chose the data sources, defined the agent tools and prompts, set up deployment, and tested the flows. Think of it as being the architect and product owner with an AI junior developer, not as copying a tutorial."

---

## Scenario N: "Why pharma / competitive intelligence specifically?"

"Because it is a domain where **data quality matters more than flashy chat**. If the AI invents a trial count, someone could make a bad business decision. That forces good engineering — tool calling, live APIs, server-side metrics. It is a harder and more honest problem than a generic chatbot, and it maps directly to life sciences customers."

---

## Scenario O: "What would you do differently if you started again?"

- Add caching earlier for repeated API calls
- Set up CI/CD from day one instead of manual deploys
- Define the tool schema and dashboard config before building UI
- Write a short architecture doc earlier (like the beginner guide I made for onboarding)

---

## Scenario P: "Demo walkthrough" (if they ask you to show it live)

**Script:**

1. Open home page → enter a therapy area question
2. Point to agent trace: "See it searching ClinicalTrials.gov live"
3. Show dashboard: landscape chart, momentum table, white-space section
4. Click "Explain these signals" → AI narrates the data
5. Ask a follow-up in chat: "Which therapy has the most Phase 3 trials?"
6. Generate executive briefing → show structured report
7. Optional: run bull/bear debate

**If something is slow:** "First load hits live APIs — production would cache common queries."

---

# Part 6: Cheat sheet — phrases that sound informed

| They ask about… | You can say… |
|-----------------|--------------|
| Agentic AI | "The LLM picks which tools to call, in a loop, until it has enough data to answer." |
| RAG | "My MVP uses live API calls instead of a vector database — but RAG on internal docs is a natural next step." |
| Hallucination | "Numbers come from code; the LLM only explains them." |
| SSE / streaming | "Long AI answers stream to the browser so the user sees progress, not a blank screen." |
| MVP | "Minimum viable product — enough to test the workflow, not everything a enterprise customer needs." |
| Vibe coding | "AI-assisted rapid development with Cursor — fast iteration, human oversight." |
| Momentum score | "A server-computed ranking from trial activity — not something the model guesses." |
| White-space | "Areas where few trials exist but differentiation potential is high — found from live data patterns." |

---

# Part 7: Questions YOU can ask them

Shows interest and ties back to your project:

1. "Do your customers already use ClinicalTrials.gov manually, or do you integrate trial data into products?"
2. "How do you handle AI governance when outputs could influence research or business decisions?"
3. "Are you investing in agentic workflows or mostly chat/RAG assistants today?"
4. "What would make an MVP like this valuable enough to pilot with a real team?"
5. "Do you deploy customer workloads on GCP, and would containerized apps like this fit your reference architecture?"

---

*Practice out loud once. Pick 3 scenarios most likely for your interview and memorize the opening two sentences of each.*
