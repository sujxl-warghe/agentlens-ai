# AgentLens AI

[![Built with Paritok](https://img.shields.io/badge/Built%20with-Paritok-1f2d3d)](https://github.com/Paritok-official/paritok-4b-v1)

**Analyze • Diagnose • Optimize • Benchmark AI Agents**

AgentLens AI is an AI observability and optimization platform that analyzes AI-powered repositories, detects token inefficiencies, optimizes prompts using **Paritok**, benchmarks token savings, and generates GitHub Pull Requests with approved optimizations.

> Built with **Paritok**
> https://github.com/Paritok-official/paritok-4b-v1

---

# Why AgentLens?

Large AI applications waste thousands of input tokens through duplicated prompts, oversized RAG context, redundant LLM calls, and inefficient memory handling.

AgentLens helps developers discover these issues automatically and optimize them before deployment.

The result is:

- Lower token usage
- Reduced inference cost
- Faster responses
- Better AI observability

---

# Features

- Repository Analysis
- GitHub Repository & ZIP Upload
- Agent Framework Detection
- AI Doctor Health Score
- Prompt Extraction
- Token Inefficiency Detection
- Prompt Compression using Paritok
- Before vs After Benchmark
- Cost & Latency Estimation
- One-click GitHub Pull Request Generation
- Guest Mode
- GitHub OAuth

---

# How Paritok is Used

Paritok is integrated directly into the optimization pipeline.

For every prompt discovered during repository analysis:

1. AgentLens extracts prompts.
2. Sends them to Paritok.
3. Receives compressed prompts.
4. Computes token savings.
5. Benchmarks improvements.
6. Generates an optimization Pull Request.

This enables developers to reduce prompt size without manually rewriting prompts.

---

# Architecture

```
Frontend (Next.js)

        │

Repository Scan

        │

Framework Detection

        │

AI Doctor

        │

Prompt Extraction

        │

Paritok Optimization

        │

Benchmark Engine

        │

GitHub Pull Request
```

---

# Tech Stack

### Frontend

- Next.js 15
- TypeScript
- TailwindCSS
- NextAuth

### Backend

- FastAPI
- Python
- SQLAlchemy
- AsyncIO

### AI

- Paritok
- GitHub API

### Database

- SQLite (Development)
- PostgreSQL (Production Ready)

---

# Pull Request Generation

AgentLens can automatically:

- Create a Git branch
- Apply approved optimizations
- Commit changes
- Generate a GitHub Pull Request

Every modification is based on the exact optimization returned by Paritok.

---

# Running Locally

## Backend

```bash
cd backend

python -m venv venv

source venv/bin/activate

pip install -r requirements.txt

uvicorn app.main:app --reload
```

Backend:

```
http://localhost:8000
```

---

## Frontend

```bash
cd frontend

npm install

npm run dev
```

Frontend:

```
http://localhost:3000
```

---

# Environment Variables

### Backend

```
DATABASE_URL=

PARITOK_API_KEY=
```

### Frontend

```
AUTH_SECRET=

AUTH_TRUST_HOST=true

AUTH_URL=http://localhost:3000

GITHUB_ID=

GITHUB_SECRET=
```

---

# Demo

1. Login using GitHub or Guest Mode

2. Paste any GitHub Repository

3. Analyze Repository

4. View AI Doctor Report

5. Optimize Prompts with Paritok

6. Compare Before vs After

7. Create GitHub Pull Request

---

# Screenshots

```
screenshots/

landing.png

dashboard.png

doctor.png

optimization.png

benchmark.png

pull-request.png
```

---

# Project Structure

```
frontend/

backend/

examples/

README.md
```

---

# Limitations

- SQLite used for local development
- Token counts are estimated
- Regex-based issue detection
- Local Paritok fallback when API is unavailable

---

# Future Work

- Tree-sitter AST analysis
- CrewAI support
- AutoGen support
- Google ADK support
- Multi-agent visualization
- Background job queue
- Enterprise dashboards

---

# License

Apache License 2.0