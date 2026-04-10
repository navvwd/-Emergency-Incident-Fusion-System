# EIFS — Emergency Intelligence Fusion System

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Express](https://img.shields.io/badge/Express.js-404D59?style=flat)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Sarvam AI](https://img.shields.io/badge/Sarvam_AI-AI_Powered-purple)
![Moonshot Kimi](https://img.shields.io/badge/Moonshot_Kimi-Vision_AI-FF8C00)
![OpenAI Embeddings](https://img.shields.io/badge/OpenAI_Embeddings-412991)

**EIFS** is a real-time, AI-powered pipeline designed to rapidly ingest multi-modal emergency reports (Voice, Text, Image), extract critical intelligence natively in multiple Indian languages, deduplicate reports via multi-metric fusion scoring, and reflect active incidents onto a live responder dashboard.

Built during the Prismatic Hackathon to solve the noise factor during mass emergency reporting.

---

## Tech Stack & Architecture

- **Frontend:** React 19, Vite, Tailwind CSS 3 (Dark Theme), Leaflet, Recharts, Sonner.
- **Backend:** Node.js, Express, TypeScript.
- **Database:** Supabase PostgreSQL with `pgvector` for semantic deduplication.
- **AI/ML Integration:**
  - **Sarvam AI APIs:** Speech-to-Text (Translate), Language ID, Translation, Document Intelligence, Sarvam-30b Chat (Entity Extraction), and TTS.
  - **Moonshot Kimi:** Vision Scene Description using `moonshot-v1-8k-vision-preview` endpoint.
  - **OpenAI:** `text-embedding-3-small` for vector search.

---

## Setup Instructions

### 1. Database Setup

1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. Run the migration scripts **in order** in the Supabase SQL Editor:
   - `supabase/migrations/001_initial_schema.sql` — base schema, pgvector, RPC functions
   - `supabase/migrations/002_fusion_algorithm.sql` — fusion dedup RPC + fusion_log table

### 2. Environment Variables

Create a `.env` file in both `server/` and `client/` using the `.env.example` templates provided.

**`server/.env`:**
```env
PORT=3001
NODE_ENV=development

# AI Providers
SARVAM_API_KEY=your_sarvam_api_key
MOONSHOT_API_KEY=your_moonshot_api_key
OPENAI_API_KEY=your_openai_api_key

# Supabase Admin
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**`client/.env`:**
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

> **Note:** `VITE_API_URL` can be left unset — the client auto-detects the server from the browser hostname, which enables LAN/mobile access.

### 3. Run the Backend

```bash
cd server
npm install
npm run dev
```

Server starts at `http://0.0.0.0:3001`.

### 4. Run the Frontend

```bash
cd client
npm install --legacy-peer-deps
npm run dev
```

> **Note:** `--legacy-peer-deps` is required because `react-leaflet` has a peer dependency on React 18 while this project uses React 19.

Dashboard is served at `http://localhost:5173`.

### 5. Verify Fusion Pipeline

```bash
node server/test_fusion.js
```

This sends test reports through the ingestion pipeline and verifies that multi-metric fusion deduplication works end-to-end.

---

## Android App

See [`android/SETUP.md`](android/SETUP.md) for instructions on building and running the Capacitor-based Android client.

---

## Main Endpoints

| Method | Endpoint | Description |
| ------ | -------- | ----------- |
| `GET` | `/health` | Enhanced health check with service status and critical events |
| `POST` | `/api/ingest-report` | Multi-modal ingestion (FormData: `report_type`, `text_content`, `file`) |
| `GET` | `/api/incidents` | Active incidents ordered by severity |
| `POST` | `/api/agent/init` | Initialize AI emergency agent session |
| `WS` | `/ws/live-voice-fusion` | Live voice streaming with real-time fusion |

---

## Building for Production

**Backend:**
```bash
cd server
npm run build
npm start
```

**Frontend:**
```bash
cd client
npm run build
```

---

Built and conceptualized for the AI-First Emergency Response Hackathon Track.
