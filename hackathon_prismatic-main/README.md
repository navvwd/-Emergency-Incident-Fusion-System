# 🚨 EIFS — Emergency Intelligence Fusion System

![License](https://img.shields.io/badge/license-MIT-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)
![Express](https://img.shields.io/badge/Express.js-404D59?style=flat)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=flat&logo=tailwind-css&logoColor=white)
![Sarvam AI](https://img.shields.io/badge/Sarvam_AI-AI_Powered-purple)
![Moonshot Kimi](https://img.shields.io/badge/Moonshot_Kimi-Vision_AI-FF8C00)
![OpenAI Embeddings](https://img.shields.io/badge/OpenAI_Embeddings-412991)

**EIFS** is a real-time, AI-powered pipeline designed to rapidly ingest multi-modal emergency reports (Voice, Text, Image), extract critical intelligence natively in multiple Indian languages, mitigate duplicate reports via semantic similarity, and instantly reflect active incidents onto a live responder dashboard.

Built during the Prismatic Hackathon to solve the noise factor during mass emergency reporting.

---

## 📸 Dashboard Preview

*(Screenshots to be added after live deployment)*

| Live Incident Map & Feed | Mobile Responsive Dispatch |
| :---: | :---: |
| `[Place Screenshot Here]` | `[Place Mobile Screenshot Here]` |

---

## 🛠️ Tech Stack & Architecture

- **Frontend:** React 19, Vite, Tailwind CSS 3 (Dark Theme), Leaflet, Recharts, Sonner.
- **Backend:** Node.js, Express, TypeScript.
- **Database:** Supabase PostgreSQL with `pgvector` for deduplication.
- **AI/ML Integration:**
  - **Sarvam AI APIs:** Speech-to-Text (Translate), Language ID, Translation, Document Intelligence, Sarvam-30b Chat (Entity Extraction), and TTS.
  - **Moonshot Kimi:** Vision Scene Description using `moonshot-v1-8k-vision-preview` endpoint.
  - **OpenAI:** `text-embedding-3-small` for vector search.

---

## 🚀 Setup Instructions

### 1. Database Setup
1. Create a Supabase project at [supabase.com](https://supabase.com/).
2. Run the SQL script located in `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor to set up the DB, the `pgvector` extension, and the necessary RPC deduplication functions.

### 2. Environment Variables
Create a `.env` file in both the `/server` and `/client` directories using the `.env.example` templates provided.

**`server/.env`:**
```env
# Server
PORT=3001
NODE_ENV=development

# AI Providers
SARVAM_API_KEY=your_sarvam_api_key_here
MOONSHOT_API_KEY=your_moonshot_api_key_here
OPENAI_API_KEY=your_openai_api_key_here

# Supabase Admin
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

**`client/.env`:**
```env
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Run the Backend
```bash
cd server
npm install
npm run dev
```
*(The backend will start at `http://localhost:3001` and hot-reload via nodemon & tsx.)*

### 4. Run the Frontend
```bash
cd client
npm install
npm run dev
```
*(The React dashboard will be served at `http://localhost:5173`.)*

---

## 📦 Building for Production

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

## 🔗 Main Endpoints

- `POST /api/ingest-report`: Multi-modal ingestion route. Accepts FormData with `report_type` (`text`, `voice`, `image`), `text_content` (optional), and the `file` buffer itself.
- `GET /api/incidents`: Fallback REST query for active incidents ordered by severity.

**Built and conceptualized for the AI-First Emergency Response Hackathon Track.**
