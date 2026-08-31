#!/usr/bin/env python3
"""Generate a beginner-friendly project guide PDF."""

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

    def section_title(self, title: str):
        self.ensure_space(20)
        self.ln(2)
        self.set_font("Helvetica", "B", 16)
        self.set_text_color(20, 60, 120)
        self.multi_cell(0, 9, title)
        self.ln(1)

    def ensure_space(self, height: float):
        if self.get_y() + height > self.page_break_trigger:
            self.add_page()

    def sub_title(self, title: str):
        self.ln(2)
        self.set_font("Helvetica", "B", 12)
        self.set_text_color(40, 40, 40)
        self.multi_cell(0, 7, title)
        self.ln(1)

    def body(self, text: str):
        self.set_font("Helvetica", "", 11)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 6, text)
        self.ln(2)

    def bullet(self, text: str):
        self.set_font("Helvetica", "", 11)
        self.set_text_color(30, 30, 30)
        x = self.get_x()
        self.set_x(x + 4)
        self.multi_cell(0, 6, f"  -  {text}")
        self.ln(1)

    def analogy_box(self, text: str):
        self.set_fill_color(245, 248, 255)
        self.set_draw_color(180, 200, 230)
        self.set_font("Helvetica", "I", 10)
        self.set_text_color(50, 70, 100)
        self.multi_cell(0, 6, f"Analogy: {text}", border=1, fill=True)
        self.ln(3)


def build_pdf(output_path: Path) -> None:
    pdf = GuidePDF()
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 22)
    pdf.set_text_color(15, 45, 90)
    pdf.multi_cell(0, 12, "How This Project Works\n(and How It Gets Online)")
    pdf.ln(6)

    pdf.body(
        "This document explains the Axiom project in simple terms. "
        "No deep technical jargon - just the ideas you need to understand "
        "what the app does, how the pieces fit together, and how your website "
        "ends up live on the internet using a Google Cloud VM, a free domain "
        "from dpdns, and nginx."
    )

    # --- What is the project ---
    pdf.section_title("1. What Is This Project?")
    pdf.body(
        "Axiom is a web app that helps people research pharmaceutical and "
        "medical competition. A user types a question like \"What trials are "
        "running for diabetes drugs?\" and the app goes out to real public "
        "websites (ClinicalTrials.gov, FDA data, PubMed papers), pulls live "
        "information, shows charts and tables, and uses AI to explain what "
        "it found."
    )
    pdf.analogy_box(
        "Think of it like a smart research assistant. You ask a question at "
        "the front desk. The assistant runs to the library (public APIs), "
        "collects fresh books and articles, organizes them on your desk "
        "(charts and tables), and then summarizes what matters."
    )

    # --- Big picture ---
    pdf.section_title("2. The Big Picture - Four Main Parts")
    pdf.body("The whole system is made of four cooperating parts:")

    pdf.sub_title("A. The Frontend (what users see)")
    pdf.body(
        "Built with Next.js and React. This is every button, page, chart, "
        "and form in the browser. It lives in the frontend/ folder. "
        "When you open the website, you are talking to this part."
    )
    pdf.analogy_box(
        "The dining room of a restaurant - menus, tables, and what guests "
        "actually see and touch."
    )

    pdf.sub_title("B. The Backend (the brain)")
    pdf.body(
        "Built with Python and FastAPI. This is the server that does the "
        "real work: talks to the database, calls external APIs, runs the "
        "AI agent, and sends results back to the frontend. It lives in the "
        "backend/ folder and runs on port 8000 inside Docker."
    )
    pdf.analogy_box(
        "The kitchen - guests never go in, but this is where orders are "
        "cooked and decisions are made."
    )

    pdf.sub_title("C. The Database (the memory)")
    pdf.body(
        "PostgreSQL stores things the app needs to remember: user accounts, "
        "past investigations, saved summaries, and agent conversation traces. "
        "It does NOT store a giant copy of all trial data - that is fetched "
        "fresh each time from public APIs."
    )
    pdf.analogy_box(
        "A filing cabinet in the back office. It remembers your customers "
        "and their past orders, not every book in the world."
    )

    pdf.sub_title("D. External Services (outside help)")
    pdf.body(
        "The app also talks to services on the internet: ClinicalTrials.gov, "
        "openFDA, PubMed for data, OpenRouter for AI (DeepSeek V4 Flash), "
        "and optionally Google for sign-in. These are not part of your code - "
        "they are like utilities you plug into."
    )
    pdf.analogy_box(
        "Suppliers and specialists the kitchen calls when it needs something "
        "it does not keep on the shelf."
    )

    # --- How they talk ---
    pdf.section_title("3. How the Pieces Talk to Each Other")
    pdf.body("Here is the normal flow when someone uses the app:")
    pdf.bullet("User opens the website in their browser (frontend).")
    pdf.bullet("User types a research question and clicks go.")
    pdf.bullet("Frontend sends the request to the backend API.")
    pdf.bullet("Backend asks the AI agent what tools to use.")
    pdf.bullet("Agent fetches live data from ClinicalTrials.gov, FDA, PubMed.")
    pdf.bullet("Backend saves the investigation in PostgreSQL.")
    pdf.bullet("Backend sends charts, tables, and text back to the frontend.")
    pdf.bullet("User sees the dashboard and can ask follow-up questions.")
    pdf.ln(2)
    pdf.body(
        "For long AI responses, the backend streams results in real time "
        "(like watching text appear word by word) using a technology called SSE."
    )

    # --- Docker ---
    pdf.section_title("4. What Is Docker? (And docker compose)")
    pdf.body(
        "Docker packages each part of the app into a container - a small, "
        "self-contained box with everything that part needs to run. "
        "docker-compose.yml is the recipe that starts all boxes together."
    )
    pdf.analogy_box(
        "Imagine four lunchboxes, each with a complete meal inside. "
        "You do not install ingredients on the kitchen counter - you just "
        "open the right lunchbox. Docker does that for software."
    )
    pdf.body("Your docker-compose.yml starts three services:")
    pdf.bullet("db - PostgreSQL database")
    pdf.bullet("api - Python/FastAPI backend (port 8000)")
    pdf.bullet("web - Next.js frontend (port 3001 on your machine, 3000 inside)")
    pdf.body(
        "On your laptop you run: docker compose up -d --build. "
        "That builds and starts everything. The -d flag means run in the "
        "background."
    )

    # --- env file ---
    pdf.section_title("5. The .env File (Secret Settings)")
    pdf.body(
        "The .env file holds passwords and API keys. Docker reads it when "
        "starting containers. Important values include:"
    )
    pdf.bullet("OPENROUTER_API_KEY - lets the AI work")
    pdf.bullet("POSTGRES_PASSWORD - database password")
    pdf.bullet("JWT_SECRET - keeps user logins secure")
    pdf.bullet("NEXT_PUBLIC_API_URL - tells the frontend where the backend lives")
    pdf.bullet("GOOGLE_CLIENT_ID / SECRET - for Google sign-in (optional)")
    pdf.analogy_box(
        "Like the key ring for your building - each key opens something "
        "specific, and you never tape them to the front door."
    )

    # --- Deployment ---
    pdf.section_title("6. How Your App Gets Online (Your Setup)")
    pdf.body(
        "Running on your laptop is not the same as running on the internet. "
        "Your setup uses four pieces working together:"
    )

    pdf.sub_title("A. Google Cloud VM (your rented computer)")
    pdf.body(
        "A VM (Virtual Machine) is a computer you rent in Google's data center. "
        "It has an IP address (like a street address on the internet). "
        "You SSH into it, install Docker, copy your project, and run "
        "docker compose there - just like on your laptop, but it stays on 24/7."
    )
    pdf.analogy_box(
        "Renting a small office space in a big building. You put your "
        "equipment there and leave the lights on so customers can visit anytime."
    )

    pdf.sub_title("B. dpdns free domain (your friendly name)")
    pdf.body(
        "An IP address like 34.123.45.67 is hard to remember. dpdns gives "
        "you a free domain name (something like yourapp.dpdns.org) that "
        "points to your VM's IP address. You configure this in the dpdns "
        "dashboard by setting an A record to your VM's external IP."
    )
    pdf.analogy_box(
        "Like putting a readable sign on your shop instead of telling people "
        "\"go to building 34, room 123.\""
    )

    pdf.sub_title("C. nginx (the front door receptionist)")
    pdf.body(
        "nginx is a web server that sits in front of your app. When someone "
        "visits your domain, nginx is the first thing that answers. It decides "
        "where to send the request:"
    )
    pdf.bullet("Requests for the website (/) go to the Next.js app on port 3001")
    pdf.bullet("Requests for the API (/api or port 8000) go to the FastAPI backend")
    pdf.bullet("Can also handle HTTPS (the padlock in the browser) with SSL certificates")
    pdf.analogy_box(
        "A hotel receptionist. Guests walk in the main entrance (port 80/443). "
        "The receptionist checks what they need and directs them to the right "
        "room - restaurant, gym, or front desk."
    )

    pdf.sub_title("D. How a visitor's request flows")
    pdf.body("When someone types your dpdns domain in Chrome:")
    pdf.bullet("Browser looks up the domain and finds your GCP VM IP (via dpdns DNS).")
    pdf.bullet("Browser connects to nginx on port 80 or 443.")
    pdf.bullet("nginx forwards the request to the correct Docker container port.")
    pdf.bullet("The container (web or api) processes it and sends a response back.")
    pdf.bullet("nginx passes the response to the visitor's browser.")
    pdf.bullet("The user sees your app.")

    # --- Deploy steps ---
    pdf.section_title("7. Deploying Updates (The Simple Version)")
    pdf.body("When you change code and want the live site updated:")
    pdf.bullet("Push or copy your latest code to the GCP VM (git pull or scp).")
    pdf.bullet("Make sure .env on the server has the right production values.")
    pdf.bullet("Run: docker compose up -d --build --force-recreate")
    pdf.bullet("Docker rebuilds images and restarts containers with new code.")
    pdf.bullet("nginx keeps running - it just talks to the new containers.")
    pdf.body(
        "Important: NEXT_PUBLIC_API_URL in .env should be your public API "
        "address (e.g. https://yourdomain.dpdns.org or https://yourdomain.dpdns.org/api) "
        "so the browser can reach the backend, not localhost."
    )

    # --- Folder structure ---
    pdf.section_title("8. Project Folder Map (What Lives Where)")
    pdf.bullet("frontend/ - website UI (pages, components, styles)")
    pdf.bullet("backend/ - API server, AI agent, database models")
    pdf.bullet("docker-compose.yml - starts db, api, and web together")
    pdf.bullet(".env - secrets and configuration (never commit to git)")
    pdf.bullet(".env.example - template showing what settings exist")
    pdf.bullet("data/ - optional local data storage")

    # --- Tech stack simple ---
    pdf.section_title("9. Technologies at a Glance")
    pdf.body("You do not need to master all of these on day one. Just know the names:")
    pdf.bullet("Next.js / React - builds the website")
    pdf.bullet("Tailwind CSS - styling (colors, spacing, layout)")
    pdf.bullet("FastAPI - Python web framework for the API")
    pdf.bullet("PostgreSQL - database")
    pdf.bullet("Docker - runs everything in containers")
    pdf.bullet("nginx - public-facing web server on your VM")
    pdf.bullet("GCP - Google Cloud, hosts your VM")
    pdf.bullet("dpdns - free DNS so your domain points to the VM")

    # --- Troubleshooting ---
    pdf.section_title("10. Common Problems (Simple Fixes)")
    pdf.sub_title("Website does not load at all")
    pdf.bullet("Check VM is running in GCP console")
    pdf.bullet("Check firewall allows ports 80 and 443 (and 22 for SSH)")
    pdf.bullet("Check nginx is running: sudo systemctl status nginx")
    pdf.bullet("Check Docker containers: docker compose ps")

    pdf.sub_title("Page loads but API calls fail")
    pdf.bullet("Check NEXT_PUBLIC_API_URL points to the public URL, not localhost")
    pdf.bullet("Check nginx is proxying API requests to port 8000")
    pdf.bullet("Check api container is healthy: curl http://localhost:8000/health")

    pdf.sub_title("After code changes, nothing changed")
    pdf.bullet("Did you rebuild? docker compose up -d --build")
    pdf.bullet("Hard-refresh the browser (Ctrl+Shift+R or Cmd+Shift+R)")

    # --- Summary ---
    pdf.section_title("11. One-Paragraph Summary")
    pdf.body(
        "Axiom is a research web app with a React frontend, a Python backend, "
        "and a PostgreSQL database, all packaged in Docker. It fetches live "
        "medical data and uses AI to explain it. You host it on a Google Cloud "
        "VM, point a free dpdns domain at that VM, and use nginx as the "
        "front door that directs visitors to the right part of the app. "
        "To update the live site, copy new code to the VM and rebuild with "
        "docker compose."
    )

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(output_path))


if __name__ == "__main__":
    out = Path(__file__).resolve().parent / "Axiom-Beginner-Guide.pdf"
    build_pdf(out)
    print(f"Created: {out}")
