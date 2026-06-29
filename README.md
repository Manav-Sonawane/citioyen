# Community Hero — Hyperlocal Problem Solver

> AI-powered civic issue reporting that actually gets things resolved.

Built for the **Coding Ninjas x Google Vibe2Ship Hackathon**.

Community Hero lets citizens report local infrastructure problems — potholes, broken streetlights, water leaks, fallen trees, and more — and gives them a transparent, AI-assisted view into how those reports get verified, tracked, and resolved. It's built around one core idea: civic reporting tools usually fail not because people don't report issues, but because reports disappear into a black box with no visible accountability. Every feature here is aimed at closing that trust gap.

🔗 **Live App:** https://citioyen-frontend-552953604736.asia-south1.run.app
🔗 **Backend API:** https://citioyen-backend-552953604736.asia-south1.run.app

---

## Features

### Citizen Reporting
- Report via a structured form **or** a conversational AI chatbot — just describe the issue in plain language
- Photo/video upload per report
- Smart location input: Google Places Autocomplete, "use my current location," or pick directly on a map — built to handle hyperlocal landmarks that standard geocoding can't resolve
- Reports are matched to real **BMC administrative wards** for accurate routing

### AI-Powered Intelligence (Gemini API)
- **Automatic categorization** — category, severity (1–5), and confidence score from description + photo
- **Duplicate detection** — text embeddings + pgvector cosine similarity surface "others reported this nearby" instantly
- **AI-verified resolution** — Gemini visually compares before/after photos and flags mismatches instead of blindly trusting a status update
- **Human override, always** — admins see both photos and the AI's reasoning side-by-side before overriding; overrides are logged for future AI-accuracy review

### Transparency & Accountability
- Full timestamped status history on every issue (reported → verified → assigned → in_progress → resolved/closed/rejected)
- Category-based SLA deadlines with automatic breach escalation
- Public, no-login dashboard: total issues, resolution rate, avg. resolution time, category/status breakdowns, live SLA breaches
- Predictive hotspot insights — which ward + category combinations are trending up

### Community & Roles
- Confirm/dispute validation on others' reports, reputation scoring, public leaderboard
- Four roles — citizen, field agent, admin, super admin — each with a purpose-built dashboard
- Email/password auth + Google OAuth

---

## Tech Stack

| Layer | Tech |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router |
| Backend | Node.js, Express 5, TypeScript |
| Database | PostgreSQL 16 + pgvector (HNSW index), Drizzle ORM |
| AI | Gemini API (categorization, embeddings, multimodal resolution verification) |
| Maps/Location | Google Maps JavaScript API, Places Autocomplete, Geocoding API |
| Auth | JWT, Google OAuth 2.0 |
| Infra | Docker, Google Cloud Run, Google Cloud SQL, Google Artifact Registry, Google Cloud Storage |

---

## Architecture

```
citioyen/
├── backend/          # Express API
│   ├── src/
│   │   ├── db/        # Drizzle schema, migrations, seed data
│   │   ├── routes/    # Auth, issues, chat, stats, admin endpoints
│   │   ├── services/  # Gemini, GCS storage, geocoding, escalation
│   │   └── middleware/
│   └── Dockerfile
├── frontend/          # React + Vite SPA
│   └── src/
│       ├── pages/
│       └── components/
└── docker-compose.yaml  # Local Postgres + pgvector for dev
```

### Database schema highlights
- **issues** — core entity: status, severity, category, SLA deadline, geo-location, ward assignment
- **issue_status_history** — append-only audit trail (never overwritten, only appended)
- **issue_embeddings** — `vector(768)` column with HNSW index for duplicate detection
- **wards / ward_aliases** — modeled on real BMC administrative ward boundaries, with multiple area-name aliases per ward for accurate geocoded matching
- **issue_validations**, **issue_media** — community votes and before/after photos

---

## Local Development

### Prerequisites
- Node.js 20+
- Docker Desktop
- A Gemini API key ([Google AI Studio](https://aistudio.google.com))
- A Google Maps API key with Maps JavaScript API + Geocoding API enabled
- A GCS bucket (uniform bucket-level access, public-read)

### Setup

```bash
# clone and install (npm workspaces — installs both frontend and backend)
git clone <your-repo-url>
cd citioyen
npm install

# start local Postgres + pgvector
docker compose up -d

# backend env
cd backend
cp .env.example .env   # fill in your keys
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev             # http://localhost:3000

# frontend env (new terminal)
cd frontend
cp .env.example .env    # fill in your keys
npm run dev              # http://localhost:5173
```

### Useful scripts

| Command | What it does |
|---|---|
| `npm run dev --workspace=backend` | Start backend in watch mode |
| `npm run dev --workspace=frontend` | Start frontend dev server |
| `npm run db:studio` | Open Drizzle Studio to browse the DB |
| `npm run db:seed` | Seed categories, wards, ward aliases |

---

## Deployment

Both frontend and backend are containerized and deployed to **Google Cloud Run**, connected to a **Google Cloud SQL** Postgres instance (with pgvector enabled) via Cloud Run's native Cloud SQL connector. Images are built and pushed to **Google Artifact Registry**. The Gemini API key is sourced from **Google AI Studio**.

```bash
# build & push backend
docker build -t citioyen-backend -f backend.Dockerfile .
docker tag citioyen-backend asia-south1-docker.pkg.dev/<project>/<repo>/citioyen-backend:latest
docker push asia-south1-docker.pkg.dev/<project>/<repo>/citioyen-backend:latest

# deploy
gcloud run deploy citioyen-backend \
  --image=asia-south1-docker.pkg.dev/<project>/<repo>/citioyen-backend:latest \
  --region=asia-south1 \
  --add-cloudsql-instances=<project>:<region>:<instance> \
  --service-account=<your-gcs-service-account> \
  --allow-unauthenticated
```

(Frontend follows the same build/push/deploy pattern — see `frontend.Dockerfile`.)

---

## Why These Design Choices

- **AI suggests, humans decide.** Every AI judgment in this app — categorization, duplicate matches, resolution verification — is a suggestion an admin or citizen can see evidence for and override. Nothing is fully automated without a visible audit trail.
- **Real municipal data, not placeholders.** Ward data is modeled on actual BMC administrative boundaries, not arbitrary names, so location matching reflects how the city is genuinely organized.
- **Address input is a first-class problem.** Citizens often report issues after leaving the location — raw GPS coordinates alone produce wrong data. The app combines autocomplete, geolocation, and manual map-picking specifically to handle this.

---

## License

Built for the Coding Ninjas x Google Vibe2Ship Hackathon, 2026.
