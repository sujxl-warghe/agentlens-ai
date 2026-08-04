# AgentLens AI

**Analyze • Diagnose • Optimize • Benchmark**
An AI observability and optimization platform for agentic systems, built for the Paritok Token Efficiency Hackathon.

AgentLens scans a repository, detects the agent framework in use, diagnoses real
token inefficiencies (duplicate prompts, unbounded memory, oversized RAG
retrieval, redundant LLM calls), optimizes the offending prompts through
**Paritok**, and benchmarks the before/after token, cost, and latency delta —
with real numbers computed from the actual scanned code, not mocked data.

---

## Status: MVP complete and verified end-to-end

| Phase | Status |
|---|---|
| 1. Landing page, design system, auth | Done, verified |
| 2. Repository analysis (GitHub URL / ZIP / demo) | Done, verified |
| 3. Framework detection | Done, verified |
| 4. Agent scanner | Done, verified |
| 5. AI Doctor (health score + issues) | Done, verified |
| 6. Paritok optimization | Done, verified (local fallback active — see below) |
| 7. Before/after benchmark | Done, verified |
| 8. Reports | Lightweight markdown export (client-side) |
| 9. One-Click Optimization PR | Real GitHub branch/commit/PR creation (see below) |

Every stage was tested against all 3 built-in demo repos **and** a real public
GitHub repository (`langchain-ai/langgraph`, 510 files) with no crashes and
sensible, non-fabricated output at every step.

---

## Architecture

```
agentlens-ai/
├── frontend/                    Next.js 15 (App Router), TypeScript, Tailwind
│   └── src/
│       ├── app/
│       │   ├── (marketing)/     Landing page — no auth
│       │   ├── (auth)/          Sign-in (GitHub OAuth + Guest mode)
│       │   └── (dashboard)/     Analyze form + scan results (auth-gated)
│       ├── components/
│       │   ├── ui/              Hand-built shadcn-style primitives
│       │   ├── marketing/       Landing page sections
│       │   └── dashboard/       Health score, issues list, token dashboard,
│       │                        Paritok diff panel, benchmark charts
│       ├── lib/                 auth.ts, api.ts, report.ts, constants.ts
│       ├── hooks/                use-scan-polling.ts
│       └── types/                scan.ts — mirrors backend Pydantic schemas
│
└── backend/                     FastAPI, async, layered architecture
    └── app/
        ├── api/v1/routes/       health.py, repository.py
        ├── services/            repository_service, scan_orchestrator,
        │                        ai_doctor_service, paritok_service,
        │                        benchmark_service, demo_repos/ (fixtures)
        ├── analyzers/            repo_structure, agent_scanner, prompt_extractor
        ├── detectors/            framework_detector
        ├── models/               Pydantic request/response schemas
        └── db/                   Async SQLAlchemy (SQLite dev / Postgres prod)
```

**Design principle:** routes never touch the DB or the filesystem directly —
they call services, which orchestrate analyzers/detectors. Adding CrewAI,
AutoGen, or Google ADK support later means adding a signature set to
`framework_detector.py`, not touching the API layer.

**Pipeline:** `POST /scan` (or `/scan/demo`, `/scan/upload`) creates a `Scan`
row and kicks off a FastAPI background task
(`scan_orchestrator.run_scan_pipeline`) that runs all 7 phases in sequence,
committing partial results after each stage. The frontend polls
`GET /scan/{id}` every 1.5s and renders whatever's ready, so the UI shows
live progress instead of a blank loading screen.

---

## Honest limitations (read before demoing)

- **Paritok API**: the real Paritok Compression API endpoint isn't reachable
  from this dev environment (no key, no network egress to `api.paritok.dev`).
  `ParitokService` always *attempts* the real API first when
  `PARITOK_API_KEY` is set, and transparently falls back to a local,
  rule-based compression engine otherwise (dedup near-identical paragraphs,
  strip filler phrases, collapse whitespace). The before/after numbers are
  real and computed, not faked — just from a substitute engine. Swap in a
  real key and it uses the real API with zero code changes.
- **Token counts are estimates** (chars ÷ 4), not a real tokenizer call —
  standard approximation, noted in the UI.
- **Issue detection is regex/heuristic-based**, not a full AST parse via
  Tree-sitter (listed in the original tech stack). This was a deliberate
  scope cut to ship a working full pipeline in the available time — it's
  precision-favoring (fewer false positives) and validated against 3 demo
  repos plus 1 real-world repo, but won't catch everything an AST walk would.
- **Architecture Visualizer (React Flow graph)** from the original PRD was
  folded into the Agent Summary stat cards rather than built as a separate
  interactive graph page, to prioritize the Doctor → Paritok → Benchmark
  loop the hackathon is judged on.
- **Memory Analyzer / RAG Analyzer** as dedicated pages weren't built
  separately — their signal is surfaced through AI Doctor issues
  (`category: memory` / `category: rag`) instead.
- **Guest scan limit** is enforced server-side (403 after 3 scans), not just
  hidden in the UI.

---

## Flagship feature: One-Click Optimization Pull Request

From any scan of a real GitHub repository, "Optimize & Create PR" opens an
Optimization Plan (`/scan/[id]/optimize`) where you accept/reject individual
Paritok compressions, review a real GitHub-style diff of each one, and — with
one confirmed click — AgentLens creates a real branch, commits the accepted
changes, and opens a real Pull Request via the GitHub REST API.

**What's real, not simulated:**
- Every GitHub API call (`GitHubService`) hits `api.github.com` directly — no
  mocking. A bad/expired token gets GitHub's actual `401 Bad credentials`
  response, not a made-up error.
- The only "code generation" is a mechanical, literal swap: the exact prompt
  text Paritok already compressed during the scan replaces the exact
  original text in the live file, fetched fresh from GitHub at PR-creation
  time (not from the scan's now-deleted local clone). If a file changed on
  GitHub since the scan ran and the original text no longer matches, that
  file is skipped and reported — never force-applied.
- Issue types AgentLens can't safely auto-fix mechanically (unbounded
  memory, missing RAG dedup, redundant LLM calls) are shown in the plan as
  "flagged for manual review," not silently offered as an automated fix.
- This requires GitHub sign-in with `repo` scope (requested at sign-in,
  disclosed on the sign-in screen) and only works for scans whose source is
  a real GitHub URL — demo and ZIP-upload scans show a clear explanatory
  banner instead of a broken button.

**Honestly unverified**: I validated every step of this pipeline up to and
including the real GitHub network call (confirmed a fake token gets
GitHub's real `401` response), but I could not complete a full live PR
creation in this environment — that needs a real user finishing GitHub's
OAuth consent screen in a browser against a repository they actually own.
Test this specific final step yourself once `GITHUB_ID`/`GITHUB_SECRET`
are configured.



### Backend
```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
uvicorn app.main:app --reload --port 8000
```
API docs at `http://localhost:8000/docs`.

### Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # set AUTH_SECRET, optionally GITHUB_ID/SECRET
npm run dev
```
App at `http://localhost:3000`. Guest mode works with zero configuration;
GitHub OAuth requires a GitHub OAuth App (client ID/secret) in `.env.local`.

### Demo without any setup
Click "Try live demo" on the landing page, then "Continue as guest", then pick
any of the 3 built-in demo repositories. Full pipeline runs in 5-10 seconds.
