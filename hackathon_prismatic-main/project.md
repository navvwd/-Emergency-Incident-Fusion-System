# Emergency Intelligence Fusion System (EIFS)

## Hackathon: Prismatic 2k26 — AI/ML Track — Problem Statement AI-01

### Team: Mohammad Abrar (Solo Founder / Builder)

---

## 🔴 STATUS: PHASE 0 — NOT STARTED

> **Last Updated**: 2026-04-06
> **Current Sprint**: Initial Scaffold
> **Blockers**: None
> **Next Action**: Scaffold monorepo, backend services, Supabase schema

---

## 1. PROBLEM STATEMENT (VERBATIM)

> Design a system that ingests multi-source emergency reports (voice, text, images) and produces a deduplicated, structured incident list with severity scoring and prioritization in near real-time.

### Evaluation Criteria (from judges)

- [x] Extract location, incident type, and affected count
- [x] Deduplicate multiple reports referring to the same event
- [x] Assign severity score based on extracted data
- [x] Ensure low latency processing
- [x] Display structured output

### Example Scenario

> "Inputs include 'Accident near Anna Nagar, 2 injured,' 'Bike crash Anna Nagar signal,' and an image of a damaged vehicle. The system merges them into one incident, identifies it as a road accident, extracts the location, and assigns high severity."

---

## 2. PRODUCT OVERVIEW

### One-Liner

A multilingual, AI-powered emergency report fusion system that ingests voice (22 Indian languages), text, and images — deduplicates overlapping reports into unified incidents — scores severity in real-time — and displays everything on a live dashboard with map visualization.

### Key Differentiator

Built on **Sarvam AI** (India's sovereign AI stack) for native Indian language support. A Tamil voice report, a Hindi text message, and a photo with Kannada signage all fuse into one structured incident seamlessly.

### User Flow

```
Reporter submits:
  🎙️ Tamil voice: "அண்ணா நகரில் பைக் விபத்து, ரெண்டு பேருக்கு காயம்"
  📝 Hindi text: "Anna Nagar signal pe bike accident, do log injured"
  📸 Image: Photo of damaged bike at intersection

System processes:
  → Voice: Sarvam STT → translate to English → extract entities
  → Text: Sarvam LID → translate → extract entities
  → Image: Sarvam Vision (signage) + Claude Vision (scene) → extract entities

Deduplication:
  → All 3 reports produce similar embeddings
  → Cosine similarity > 0.85 → MERGED into single incident

Dashboard shows:
  → 1 incident (not 3) on map at Anna Nagar
  → Severity: 7/10
  → Type: Road Accident
  → Affected: 2
  → Report count: 3
  → Live voice alert in Tamil plays for critical severity
```

---

## 3. TECH STACK

### Frontend

| Package           | Version | Purpose                          |
|-------------------|---------|----------------------------------|
| React             | ^18     | UI framework                     |
| TypeScript        | ^5      | Type safety                      |
| Vite              | ^5      | Build tool                       |
| Tailwind CSS      | ^3      | Styling                          |
| shadcn/ui         | latest  | Component library                |
| react-leaflet     | ^4      | Map visualization                |
| leaflet           | ^1.9    | Map engine                       |
| recharts          | ^2      | Charts (severity distribution)   |
| lucide-react      | latest  | Icons                            |
| @supabase/supabase-js | ^2  | Realtime subscriptions + auth    |

### Backend

| Package           | Version | Purpose                          |
|-------------------|---------|----------------------------------|
| Express           | ^4.18   | HTTP server                      |
| TypeScript        | ^5      | Type safety                      |
| tsx               | ^4      | TS execution (dev)               |
| multer            | ^1.4    | File upload handling             |
| cors              | ^2.8    | CORS middleware                  |
| dotenv            | ^16     | Env vars                         |
| axios             | ^1      | HTTP client for AI APIs          |
| @supabase/supabase-js | ^2  | DB client (service role)         |
| nodemon           | ^3      | Dev hot reload                   |

### Database

| Service          | Purpose                                  |
|------------------|------------------------------------------|
| Supabase PostgreSQL | Primary database                     |
| pgvector extension  | Embedding storage + similarity search |
| Supabase Realtime   | WebSocket push to frontend dashboard  |

### AI APIs

| API                      | Provider   | Purpose                                              |
|--------------------------|------------|------------------------------------------------------|
| Saaras v3 STT            | Sarvam AI  | Voice → text (22 Indian languages, auto-detect)      |
| Sarvam LID               | Sarvam AI  | Language + script detection from text                |
| Mayura Translation       | Sarvam AI  | Indic → English translation                          |
| Sarvam Vision            | Sarvam AI  | Image text/signage extraction (Indian scripts)       |
| Sarvam-30B Chat          | Sarvam AI  | Entity extraction + severity scoring                 |
| Bulbul v3 TTS            | Sarvam AI  | Voice alerts in source language                      |
| Claude Sonnet Vision     | Anthropic  | Scene understanding from images                      |
| text-embedding-3-small   | OpenAI     | Embeddings for deduplication (1536 dimensions)       |

### Hosting

| Service    | Purpose       |
|------------|---------------|
| Vercel     | Frontend      |
| Railway    | Backend       |
| Supabase   | Database      |

---

## 4. ARCHITECTURE

```
┌─────────────────────────────────────────────────────────────┐
│                  FRONTEND (Vercel)                           │
│                  React + Vite + Tailwind                     │
│                                                             │
│  ┌─────────────┐ ┌──────────────┐ ┌───────────────────────┐ │
│  │ VoiceRec    │ │ TextInput    │ │ ImageUploader         │ │
│  │ (Web Audio) │ │              │ │ (drag & drop)         │ │
│  └──────┬──────┘ └──────┬───────┘ └───────────┬───────────┘ │
│         └───────────────┼─────────────────────┘             │
│                         ▼                                   │
│              POST /api/ingest-report                        │
│                    (REST + FormData)                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │           DASHBOARD (Supabase Realtime)              │   │
│  │  ┌─────────────┐  ┌────────────────────────────┐    │   │
│  │  │ IncidentMap │  │ IncidentFeed (live cards)  │    │   │
│  │  │ (Leaflet)   │  │ sorted by severity         │    │   │
│  │  └─────────────┘  └────────────────────────────┘    │   │
│  │  ┌──────────────────────────────────────────────┐   │   │
│  │  │ StatsBar: total | critical | dedup ratio     │   │   │
│  │  └──────────────────────────────────────────────┘   │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼ REST
┌─────────────────────────────────────────────────────────────┐
│                   BACKEND (Railway)                          │
│                   Express + TypeScript                       │
│                                                             │
│   POST /api/ingest-report                                   │
│   │                                                         │
│   ├─ VOICE path:                                            │
│   │   Sarvam Saaras v3 (mode: "translate") → English text   │
│   │                                                         │
│   ├─ TEXT path:                                             │
│   │   Sarvam LID → detect language                          │
│   │   If not English → Sarvam Mayura → translate            │
│   │                                                         │
│   ├─ IMAGE path:                                            │
│   │   Promise.all([                                         │
│   │     Sarvam Vision → text/signage extraction,            │
│   │     Claude Vision → scene description                   │
│   │   ]) → merge descriptions                              │
│   │                                                         │
│   ├─ EXTRACTION (all paths converge):                       │
│   │   Sarvam-30B Chat → { location, incident_type,         │
│   │     affected_count, severity_score, summary }           │
│   │                                                         │
│   ├─ DEDUP:                                                 │
│   │   OpenAI embed(summary) → pgvector cosine search        │
│   │   similarity > 0.85 → merge into existing               │
│   │   else → create new incident                            │
│   │                                                         │
│   ├─ DB INSERT:                                             │
│   │   Insert raw_report + upsert incident via Supabase      │
│   │                                                         │
│   └─ ALERT (if severity >= 8):                              │
│       Sarvam Bulbul v3 → voice alert in source language     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   DATABASE (Supabase)                        │
│                   PostgreSQL + pgvector                      │
│                                                             │
│   raw_reports: id, report_type, raw_content, file_url,      │
│     extracted_data, embedding, incident_id, source_language, │
│     created_at                                              │
│                                                             │
│   incidents: id, location, latitude, longitude,             │
│     incident_type, affected_count, severity_score, status,  │
│     report_count, summary, created_at, updated_at           │
│                                                             │
│   Realtime enabled on: incidents, raw_reports               │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. FOLDER STRUCTURE

```
eifs/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── dashboard/
│   │   │   │   ├── IncidentMap.tsx        # Leaflet map, color-coded severity markers
│   │   │   │   ├── IncidentFeed.tsx       # Live-updating scrollable incident list
│   │   │   │   ├── IncidentCard.tsx       # Single incident card with severity badge
│   │   │   │   ├── StatsBar.tsx           # Top-level metrics row
│   │   │   │   └── SeverityChart.tsx      # Recharts severity distribution
│   │   │   ├── ingest/
│   │   │   │   ├── ReportForm.tsx         # Tabbed form: voice / text / image
│   │   │   │   ├── VoiceRecorder.tsx      # Web Audio API + record/stop/submit
│   │   │   │   ├── ImageUploader.tsx      # Drag-drop + preview
│   │   │   │   └── TextInput.tsx          # Textarea + language hint
│   │   │   ├── layout/
│   │   │   │   ├── Header.tsx             # App title + status indicators
│   │   │   │   └── Layout.tsx             # Split-pane layout
│   │   │   └── ui/                        # shadcn components (card, badge, button, etc.)
│   │   ├── hooks/
│   │   │   ├── useRealtimeIncidents.ts    # Supabase realtime subscription
│   │   │   ├── useRealtimeReports.ts      # Raw report feed subscription
│   │   │   └── useSubmitReport.ts         # POST to backend + loading state
│   │   ├── lib/
│   │   │   ├── supabase.ts               # Supabase client init (anon key)
│   │   │   ├── api.ts                     # Axios instance pointing to backend
│   │   │   ├── constants.ts               # Severity colors, incident types, map config
│   │   │   └── types.ts                   # Shared TypeScript types
│   │   ├── App.tsx                        # Root: layout with map + feed + form
│   │   ├── main.tsx                       # Entry point
│   │   └── index.css                      # Tailwind imports + custom styles
│   ├── public/
│   │   └── favicon.svg
│   ├── index.html
│   ├── package.json
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   └── vite.config.ts
│
├── server/                          # Express backend
│   ├── src/
│   │   ├── index.ts                       # Express app: CORS, multer, routes
│   │   ├── routes/
│   │   │   ├── reports.ts                 # POST /api/ingest-report
│   │   │   └── incidents.ts               # GET /api/incidents (fallback REST)
│   │   ├── services/
│   │   │   ├── sarvam.ts                  # All Sarvam API wrappers
│   │   │   │   # speechToText(buffer, mode)
│   │   │   │   # detectLanguage(text)
│   │   │   │   # translate(text, sourceLang, targetLang)
│   │   │   │   # extractImage(buffer)
│   │   │   │   # chatCompletion(text, systemPrompt)
│   │   │   │   # textToSpeech(text, language, speaker)
│   │   │   ├── claude.ts                  # Claude Vision: describeScene(buffer)
│   │   │   ├── embeddings.ts              # OpenAI: generateEmbedding(text)
│   │   │   └── dedup.ts                   # findMatch(embedding), mergeReport(), createIncident()
│   │   ├── lib/
│   │   │   ├── supabase.ts               # Supabase client (SERVICE_ROLE key)
│   │   │   └── prompts.ts                # All LLM prompt templates
│   │   └── types/
│   │       └── index.ts                   # Report, Incident, SarvamResponse types
│   ├── package.json
│   ├── tsconfig.json
│   └── .env.example
│
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql         # Tables + pgvector + functions
│
├── PROJECT.md                       # THIS FILE — source of truth
├── .env.example                     # All required env vars
└── README.md                        # Demo instructions + screenshots
```

---

## 6. DATABASE SCHEMA

```sql
-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- Incidents (deduplicated)
CREATE TABLE incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location TEXT NOT NULL,
  latitude FLOAT,
  longitude FLOAT,
  incident_type TEXT NOT NULL CHECK (incident_type IN (
    'road_accident', 'fire', 'flood', 'building_collapse',
    'medical', 'violence', 'infrastructure', 'other'
  )),
  affected_count INT DEFAULT 0,
  severity_score INT NOT NULL CHECK (severity_score BETWEEN 1 AND 10),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved', 'monitoring')),
  report_count INT DEFAULT 1,
  summary TEXT NOT NULL,
  alert_audio_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Raw reports (every submission)
CREATE TABLE raw_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL CHECK (report_type IN ('voice', 'text', 'image')),
  raw_content TEXT,
  file_url TEXT,
  extracted_data JSONB,
  embedding VECTOR(1536),
  incident_id UUID REFERENCES incidents(id),
  source_language TEXT DEFAULT 'en-IN',
  processing_time_ms INT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Similarity search function for deduplication
CREATE OR REPLACE FUNCTION match_reports(
  query_embedding VECTOR(1536),
  threshold FLOAT DEFAULT 0.85,
  max_results INT DEFAULT 1
)
RETURNS TABLE (incident_id UUID, similarity FLOAT)
LANGUAGE sql STABLE AS $$
  SELECT r.incident_id, 1 - (r.embedding <=> query_embedding) AS similarity
  FROM raw_reports r
  WHERE r.incident_id IS NOT NULL
    AND 1 - (r.embedding <=> query_embedding) > threshold
  ORDER BY similarity DESC
  LIMIT max_results;
$$;

-- Incident merge function (called when dedup finds a match)
CREATE OR REPLACE FUNCTION merge_into_incident(
  p_incident_id UUID,
  p_new_affected_count INT,
  p_new_severity INT
)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE incidents SET
    report_count = report_count + 1,
    affected_count = GREATEST(affected_count, p_new_affected_count),
    severity_score = GREATEST(severity_score, p_new_severity),
    updated_at = now()
  WHERE id = p_incident_id;
END;
$$;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE incidents;
ALTER PUBLICATION supabase_realtime ADD TABLE raw_reports;

-- Indexes
CREATE INDEX idx_raw_reports_embedding ON raw_reports
  USING ivfflat (embedding vector_cosine_ops) WITH (lists = 10);
CREATE INDEX idx_incidents_severity ON incidents (severity_score DESC);
CREATE INDEX idx_incidents_status ON incidents (status);
CREATE INDEX idx_raw_reports_incident ON raw_reports (incident_id);
```

---

## 7. API CONTRACTS

### POST /api/ingest-report

**Request**: `multipart/form-data`

| Field        | Type   | Required | Description                              |
|--------------|--------|----------|------------------------------------------|
| report_type  | string | yes      | `"voice"` \| `"text"` \| `"image"`       |
| text_content | string | if text  | The text report content                   |
| file         | File   | if voice/image | Audio file (wav/mp3/webm) or image (jpg/png) |

**Response**: `200 OK`

```json
{
  "success": true,
  "incident_id": "uuid",
  "is_merged": false,
  "extracted": {
    "location": "Anna Nagar Signal, Chennai",
    "incident_type": "road_accident",
    "affected_count": 2,
    "severity_score": 7,
    "summary": "Bike accident at Anna Nagar signal, 2 people injured"
  },
  "source_language": "ta-IN",
  "processing_time_ms": 4200
}
```

### GET /api/incidents

**Response**: Array of incidents (fallback if Realtime fails)

```json
[
  {
    "id": "uuid",
    "location": "Anna Nagar Signal, Chennai",
    "latitude": 13.0850,
    "longitude": 80.2101,
    "incident_type": "road_accident",
    "affected_count": 2,
    "severity_score": 7,
    "status": "active",
    "report_count": 3,
    "summary": "Bike accident at Anna Nagar signal, 2 people injured",
    "created_at": "2026-04-10T11:00:00Z",
    "updated_at": "2026-04-10T11:05:00Z"
  }
]
```

---

## 8. SARVAM API REFERENCE

### Base URL: `https://api.sarvam.ai`

### Auth Header: `api-subscription-key: <SARVAM_API_KEY>`

### Speech-to-Text (Saaras v3)

```
POST /speech-to-text
Content-Type: multipart/form-data

Fields:
  file: <audio_buffer>
  model: "saaras:v3"
  mode: "translate"   // translate = any Indic → English

Response:
{
  "transcript": "Bike accident at Anna Nagar, 2 people injured",
  "language_code": "ta-IN",
  "language_confidence": 0.95
}
```

### Language Identification

```
POST /text/language-identification
Content-Type: application/json

Body: { "input": "அண்ணா நகரில் விபத்து" }

Response:
{
  "language_code": "ta-IN",
  "script_code": "Tamil"
}
```

### Translation (Mayura)

```
POST /translate
Content-Type: application/json

Body: {
  "input": "அண்ணா நகரில் விபத்து, 2 பேர் காயம்",
  "source_language_code": "ta-IN",
  "target_language_code": "en-IN"
}

Response:
{
  "translated_text": "Accident at Anna Nagar, 2 people injured"
}
```

### Sarvam Vision (Document Intelligence)

```
POST /document-intelligence
Content-Type: multipart/form-data

Fields:
  file: <image_buffer>

Response:
{
  "extracted_text": "...",
  "tables": [...],
  "visual_elements": [...]
}
```

### Chat Completion (Sarvam-30B)

```
POST /chat/completions
Content-Type: application/json

Body: {
  "model": "sarvam-30b",
  "messages": [
    { "role": "system", "content": "<EXTRACTION_PROMPT>" },
    { "role": "user", "content": "<report_text>" }
  ],
  "temperature": 0.1
}

Response:
{
  "choices": [{
    "message": {
      "content": "{\"location\": ..., \"severity_score\": ...}"
    }
  }]
}
```

### Text-to-Speech (Bulbul v3)

```
POST /text-to-speech
Content-Type: application/json

Body: {
  "input": "அண்ணா நகரில் தீவிர சாலை விபத்து",
  "model": "bulbul:v3",
  "speaker": "Aditya",
  "language_code": "ta-IN"
}

Response: audio/wav binary
```

---

## 9. LLM PROMPTS

### Extraction Prompt (for Sarvam-30B)

```
You are an emergency report analyzer for India. Extract structured data from this emergency report.

Report type: {report_type}
Content: "{processed_text}"

Rules:
- Location should include area name AND city (e.g., "Anna Nagar Signal, Chennai")
- If location includes a well-known Indian landmark, intersection, or area, include it
- affected_count should be 0 if not mentioned
- severity_score calculation:
  - Deaths reported: +4
  - Serious injuries: +3
  - Minor injuries: +2
  - Infrastructure damage: +2
  - Large area affected: +2
  - Vulnerable population (children/elderly): +1
  - Minimum score: 1, Maximum: 10

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "location": "specific location, city",
  "latitude": approximate_lat_or_null,
  "longitude": approximate_lng_or_null,
  "incident_type": "road_accident|fire|flood|building_collapse|medical|violence|infrastructure|other",
  "affected_count": number,
  "severity_score": 1-10,
  "summary": "one-line dedup-friendly summary under 100 chars"
}
```

### Claude Vision Prompt (for scene understanding)

```
You are analyzing an emergency report image. Describe what you see in terms of:
1. What type of incident is shown (accident, fire, flood, etc.)
2. Visible damage or injuries
3. Location clues (street signs, landmarks, building names)
4. Estimated number of people affected
5. Any vehicles, equipment, or infrastructure involved

Be factual and concise. 2-3 sentences max.
```

---

## 10. ENVIRONMENT VARIABLES

```env
# Sarvam AI
SARVAM_API_KEY=

# Anthropic (Claude Vision)
ANTHROPIC_API_KEY=

# OpenAI (Embeddings only)
OPENAI_API_KEY=

# Supabase
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Server
PORT=3001
NODE_ENV=development

# Frontend (in client/.env)
VITE_API_URL=http://localhost:3001
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

---

## 11. UI DESIGN SPEC

### Theme: Dark Emergency Dashboard

```
Background:    #0A0A0B
Card BG:       #111113
Card Border:   #1E1E22
Accent:        #EF4444 (emergency red)
Accent 2:      #F59E0B (warning amber)
Accent 3:      #22C55E (resolved green)
Text Primary:  #F5F5F5
Text Secondary:#9CA3AF
Font:          Inter
```

### Severity Color Map

```
1-3  → #22C55E (green)    — Low
4-6  → #F59E0B (amber)    — Medium
7-8  → #F97316 (orange)   — High
9-10 → #EF4444 (red)      — Critical (pulsing animation)
```

### Layout (Desktop)

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: "EIFS" logo | Live indicator | Stats bar       │
├──────────────────────────┬──────────────────────────────┤
│                          │                              │
│     INCIDENT MAP         │    INCIDENT FEED             │
│     (Leaflet, 60%)       │    (scrollable cards, 40%)   │
│     Color-coded markers  │    Sorted by severity desc   │
│     Click → card focus   │    Each shows: type badge,   │
│                          │    location, severity,       │
│                          │    affected, report count,   │
│                          │    time ago                  │
│                          │                              │
├──────────────────────────┴──────────────────────────────┤
│  REPORT SUBMISSION PANEL (collapsible bottom drawer)    │
│  Tabs: [🎙️ Voice] [📝 Text] [📸 Image]                 │
│  Submit button + processing indicator                   │
└─────────────────────────────────────────────────────────┘
```

### Map Markers

- Circle markers, radius proportional to report_count
- Color = severity color from map above
- Critical incidents (9-10) have CSS pulse animation
- Popup on click: incident summary card
- Default center: Chennai (13.0827, 80.2707), zoom 12

---

## 12. BUILD PHASES

### Phase 1: Backend Pipeline (Hours 0-5)

- [ ] Initialize monorepo: `eifs/client` + `eifs/server`
- [ ] Server scaffold: Express, TypeScript, multer, CORS
- [ ] `services/sarvam.ts`: All 6 Sarvam API wrapper functions
- [ ] `services/claude.ts`: Claude Vision wrapper
- [ ] `services/embeddings.ts`: OpenAI embedding wrapper
- [ ] `lib/prompts.ts`: Extraction + vision prompts
- [ ] `routes/reports.ts`: Full ingest pipeline
- [ ] Test with curl: voice, text, image

### Phase 2: Database (Hours 5-7)

- [ ] Create Supabase project
- [ ] Run migration: tables + pgvector + functions + realtime
- [ ] `services/dedup.ts`: findMatch, mergeReport, createIncident
- [ ] `lib/supabase.ts`: Service role client
- [ ] Test full pipeline: submit → extract → dedup → store

### Phase 3: Frontend Dashboard (Hours 7-13)

- [ ] Vite + React + Tailwind + shadcn scaffold
- [ ] `hooks/useRealtimeIncidents.ts`: Supabase subscription
- [ ] `IncidentMap.tsx`: Leaflet with severity markers
- [ ] `IncidentFeed.tsx` + `IncidentCard.tsx`: Live feed
- [ ] `StatsBar.tsx`: Total, critical, dedup ratio
- [ ] Connect to backend: verify realtime updates work

### Phase 4: Report Submission UI (Hours 13-17)

- [ ] `VoiceRecorder.tsx`: Web Audio API record/stop
- [ ] `TextInput.tsx`: Textarea with submit
- [ ] `ImageUploader.tsx`: Drag-drop with preview
- [ ] `ReportForm.tsx`: Tabbed container
- [ ] Loading states + success/error feedback
- [ ] Test full flow: submit → see dashboard update

### Phase 5: Polish + Demo Prep (Hours 17-22)

- [ ] SeverityChart.tsx (recharts)
- [ ] TTS alerts for critical incidents (Bulbul v3)
- [ ] Seed 10-15 realistic demo reports
- [ ] Test dedup with 3 overlapping reports (Tamil voice + Hindi text + image)
- [ ] Error handling + edge cases
- [ ] Mobile responsive (judges might check on phone)

### Phase 6: Deploy + README (Hours 22-24)

- [ ] Deploy frontend to Vercel
- [ ] Deploy backend to Railway
- [ ] Final .env config in production
- [ ] README with screenshots + demo script
- [ ] Record backup demo video (in case WiFi fails)

---

## 13. DEMO SCRIPT (3 minutes)

### Slide 1: The Problem (30 sec)

"When emergencies happen in India, reports flood in through calls, WhatsApp, social media — in Tamil, Hindi, Telugu, any language. Emergency rooms see the same accident reported 5 times and waste resources. We built EIFS to fix this."

### Demo 1: Tamil Voice Report (45 sec)

- Click Voice tab
- Speak in Tamil: "அண்ணா நகரில் பைக் விபத்து, ரெண்டு பேருக்கு காயம்"
- Show it transcribes + translates + extracts + pins on map
- Point out: severity 7, road_accident, location extracted correctly

### Demo 2: Hindi Text (duplicate) (30 sec)

- Switch to Text tab
- Type: "Anna Nagar signal pe bike accident, do log injured"
- Show it detects Hindi, translates, recognizes SAME incident
- Report count jumps from 1 → 2, show "MERGED" indicator

### Demo 3: Image Upload (30 sec)

- Drop photo of damaged vehicle
- Show Sarvam Vision reads any signage + Claude describes scene
- Merges into same incident: report count → 3
- Show dedup ratio: "3 reports → 1 incident"

### Demo 4: Dashboard Overview (30 sec)

- Zoom out on map: multiple incidents across Chennai
- Show severity distribution chart
- Show stats bar: total incidents, critical count, avg processing time

### Closer (15 sec)

"Built on Sarvam AI — India's sovereign AI stack. Every voice report works in 22 Indian languages natively. The system that would work when Chennai floods, when a building collapses in Delhi, when it matters most."

---

## 14. CLAUDE CODE PROMPTS

### Prompt 1: Initialize Monorepo + Server Scaffold

```
Read PROJECT.md from the repo root — it is the source of truth for this entire project.

Initialize the monorepo structure for EIFS (Emergency Intelligence Fusion System):

1. Create `server/` directory with:
   - package.json with all dependencies from PROJECT.md Section 3 (Backend)
   - tsconfig.json targeting ES2020, strict mode, outDir dist
   - .env.example with all vars from Section 10
   - src/index.ts: Express app with CORS (allow all origins for dev), multer (memory storage, 10MB limit), JSON parsing, and a health check route at GET /health
   - src/types/index.ts: TypeScript types for Report, Incident, ExtractedData, SarvamSTTResponse, SarvamLIDResponse, SarvamTranslateResponse, SarvamChatResponse, SarvamVisionResponse, SarvamTTSResponse based on Section 7 and Section 8
   - Nodemon config for dev: watch src/, exec tsx

2. Create `client/` directory with:
   - Scaffold with: npm create vite@latest . -- --template react-ts
   - Add tailwind, postcss, autoprefixer configured
   - Add all frontend dependencies from PROJECT.md Section 3
   - src/lib/types.ts: Shared frontend types (Incident, RawReport, ReportType)
   - src/lib/constants.ts: Severity colors, incident type labels, map center coords from Section 11

Do NOT build any components or routes yet. Only scaffold + types + config.
```

### Prompt 2: Sarvam AI Service Layer

```
Read PROJECT.md Sections 8 and 9 for exact API contracts and prompts.

Create server/src/services/sarvam.ts with these functions:

1. speechToText(audioBuffer: Buffer, fileName: string): Promise<SarvamSTTResponse>
   - POST to /speech-to-text with FormData
   - model: "saaras:v3", mode: "translate"
   - Return { transcript, language_code, language_confidence }

2. detectLanguage(text: string): Promise<SarvamLIDResponse>
   - POST to /text/language-identification
   - Return { language_code, script_code }

3. translate(text: string, sourceLang: string, targetLang: string): Promise<string>
   - POST to /translate
   - Return translated_text string

4. extractImage(imageBuffer: Buffer, fileName: string): Promise<string>
   - POST to /document-intelligence with FormData
   - Return extracted_text string

5. chatCompletion(text: string, reportType: string): Promise<ExtractedData>
   - POST to /chat/completions
   - model: "sarvam-30b"
   - Use the extraction prompt from Section 9 with {report_type} and {processed_text} interpolated
   - temperature: 0.1
   - Parse the JSON response into ExtractedData type
   - Handle JSON parse errors gracefully (retry once if malformed)

6. textToSpeech(text: string, languageCode: string): Promise<Buffer>
   - POST to /text-to-speech
   - model: "bulbul:v3", speaker: "Aditya"
   - Return audio buffer

All functions must:
- Use axios
- Read SARVAM_API_KEY from process.env
- Set header: { "api-subscription-key": SARVAM_API_KEY }
- Base URL: https://api.sarvam.ai
- Include proper error handling with descriptive error messages
- Log processing time for each API call
```

### Prompt 3: Claude + OpenAI Services

```
Read PROJECT.md Sections 8 and 9.

Create two service files:

1. server/src/services/claude.ts
   - describeScene(imageBuffer: Buffer): Promise<string>
   - Use Anthropic API: POST https://api.anthropic.com/v1/messages
   - model: "claude-sonnet-4-20250514"
   - Send image as base64 with media_type "image/jpeg"
   - Use the Claude Vision prompt from PROJECT.md Section 9
   - Return the text description

2. server/src/services/embeddings.ts
   - generateEmbedding(text: string): Promise<number[]>
   - Use OpenAI API: POST https://api.openai.com/v1/embeddings
   - model: "text-embedding-3-small"
   - Return the embedding array (1536 dimensions)
```

### Prompt 4: Supabase + Dedup Service

```
Read PROJECT.md Sections 6 and 5.

1. Create supabase/migrations/001_initial_schema.sql
   - Copy the EXACT SQL from Section 6
   - This will be run manually in Supabase SQL editor

2. Create server/src/lib/supabase.ts
   - Initialize Supabase client with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
   - Export the client

3. Create server/src/services/dedup.ts with:

   a. findMatch(embedding: number[]): Promise<{ incident_id: string, similarity: number } | null>
      - Call the match_reports RPC function via Supabase
      - threshold: 0.85
      - Return the match or null

   b. createIncident(data: ExtractedData): Promise<string>
      - Insert into incidents table
      - Return the new incident ID

   c. mergeReport(incidentId: string, data: ExtractedData): Promise<void>
      - Call merge_into_incident RPC function
      - Pass incident_id, affected_count, severity_score

   d. storeRawReport(params: { report_type, raw_content, extracted_data, embedding, incident_id, source_language, processing_time_ms }): Promise<void>
      - Insert into raw_reports table
```

### Prompt 5: Ingest Route (The Brain)

```
Read PROJECT.md Sections 4 and 7 for the full pipeline flow.

Create server/src/routes/reports.ts:

POST /api/ingest-report handler:

1. Extract report_type, text_content from req.body, file from req.file
2. Start a timer for processing_time_ms
3. Branch by report_type:

   VOICE:
   - Call sarvam.speechToText(file.buffer, file.originalname)
   - processedText = result.transcript
   - sourceLanguage = result.language_code

   TEXT:
   - Call sarvam.detectLanguage(text_content)
   - If language is not "en-IN" or "en":
     - Call sarvam.translate(text_content, detectedLang, "en-IN")
     - processedText = translated text
   - Else: processedText = text_content
   - sourceLanguage = detected language

   IMAGE:
   - Run in parallel with Promise.all:
     - sarvam.extractImage(file.buffer, file.originalname)
     - claude.describeScene(file.buffer)
   - Merge: processedText = `Signage/Text in image: ${visionText}. Scene description: ${sceneDesc}`
   - sourceLanguage = "en-IN" (images processed in English)

4. Call sarvam.chatCompletion(processedText, report_type) → extracted data
5. Call embeddings.generateEmbedding(extracted.summary) → embedding vector
6. Call dedup.findMatch(embedding):
   - If match: call dedup.mergeReport(match.incident_id, extracted)
   - If no match: call dedup.createIncident(extracted) → new incident_id
7. Call dedup.storeRawReport({ all fields })
8. If severity >= 8, fire-and-forget: sarvam.textToSpeech (don't await, don't block response)
9. Return response per Section 7 API contract

Also create server/src/routes/incidents.ts:
- GET /api/incidents: Fetch all active incidents from Supabase, ordered by severity DESC

Wire both routes into src/index.ts.
```

### Prompt 6: Frontend Dashboard

```
Read PROJECT.md Sections 5 and 11 for file structure and design spec.

Build the frontend dashboard with these components:

1. src/lib/supabase.ts — init with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
2. src/lib/api.ts — axios instance with baseURL from VITE_API_URL

3. src/hooks/useRealtimeIncidents.ts:
   - On mount, fetch all incidents via GET /api/incidents
   - Subscribe to Supabase Realtime on incidents table (INSERT + UPDATE)
   - On INSERT: prepend to state
   - On UPDATE: replace matching incident in state
   - Return { incidents, loading }

4. src/components/dashboard/IncidentMap.tsx:
   - Leaflet map centered on Chennai (13.0827, 80.2707), zoom 12
   - Dark tile layer: https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png
   - CircleMarker for each incident:
     - Color from severity color map in Section 11
     - Radius: 8 + (report_count * 3), max 25
     - Critical (9-10) has CSS pulse animation
   - Popup on click: mini IncidentCard

5. src/components/dashboard/IncidentCard.tsx:
   - Props: incident object
   - Shows: incident_type badge (with icon), location, severity score (colored), affected count, report count, relative time (e.g. "2 min ago")
   - Dark card style per Section 11

6. src/components/dashboard/IncidentFeed.tsx:
   - Scrollable list of IncidentCard components
   - Sorted by severity_score DESC, then updated_at DESC
   - Title: "Live Incident Feed"
   - New incidents slide in with animation

7. src/components/dashboard/StatsBar.tsx:
   - Row of stat cards: Total Incidents | Critical (severity >= 8) | Reports Processed | Dedup Ratio
   - Dedup ratio = 1 - (incidents.length / totalReports)

8. src/App.tsx:
   - Full-screen dark layout
   - Header with "EIFS" title + green "LIVE" indicator
   - Split: Left 60% = IncidentMap, Right 40% = StatsBar + IncidentFeed
   - Bottom: collapsible drawer for report submission (build placeholder for now)

Use the exact color values from Section 11. Dark theme throughout. Inter font.
```

### Prompt 7: Report Submission UI

```
Read PROJECT.md Sections 5 and 11.

Build the report submission components:

1. src/hooks/useSubmitReport.ts:
   - Function: submitReport(reportType, textContent?, file?)
   - POST to /api/ingest-report as FormData
   - Track loading, error, result states
   - Return { submitReport, loading, error, result }

2. src/components/ingest/VoiceRecorder.tsx:
   - Record button (mic icon) → starts MediaRecorder (Web Audio API)
   - Stop button → saves as webm blob
   - Shows recording duration timer
   - On stop: shows audio preview + "Submit" button
   - On submit: calls submitReport('voice', null, audioBlob)

3. src/components/ingest/TextInput.tsx:
   - Textarea with placeholder "Describe the emergency in any language..."
   - Character count
   - Submit button
   - Calls submitReport('text', textContent)

4. src/components/ingest/ImageUploader.tsx:
   - Drag-and-drop zone with dashed border
   - Click to browse files
   - Shows image preview after selection
   - Submit button
   - Calls submitReport('image', null, imageFile)

5. src/components/ingest/ReportForm.tsx:
   - Tab navigation: Voice | Text | Image (use shadcn Tabs)
   - Each tab renders the corresponding component
   - Below tabs: show processing result when available:
     - "✓ Merged into existing incident" or "✓ New incident created"
     - Show extracted location, type, severity
   - This sits in the bottom collapsible drawer from App.tsx

All components use the dark theme from Section 11.
Submissions show a loading spinner while the backend processes.
```

### Prompt 8: Polish + Deploy

```
Read PROJECT.md Sections 5, 11, and 12.

Final polish pass:

1. Add SeverityChart.tsx (recharts):
   - Pie or bar chart showing incident distribution by severity bracket
   - Low (1-3), Medium (4-6), High (7-8), Critical (9-10)
   - Dark theme, severity colors from Section 11

2. Error handling:
   - Backend: wrap all route handlers in try-catch, return proper error responses
   - Frontend: toast notifications for submission success/error
   - Sarvam API failures: log and return partial results if possible

3. Loading states:
   - Skeleton loaders for IncidentFeed on initial load
   - Map: "Loading incidents..." overlay until data arrives

4. Mobile responsive:
   - Stack map above feed on screens < 768px
   - Report form becomes full-screen modal on mobile

5. Prepare for deploy:
   - server/: Add start script "node dist/index.js", build script "tsc"
   - client/: Verify vite build works
   - Create README.md with:
     - Project description
     - Setup instructions
     - Environment variables list
     - Demo screenshots placeholders
     - Tech stack badges
```

---

## 15. SEED DATA FOR DEMO

```json
[
  {
    "report_type": "text",
    "text_content": "அண்ணா நகர் சிக்னலில் பைக் விபத்து, 2 பேர் காயம்",
    "expected_incident_type": "road_accident",
    "language": "ta-IN"
  },
  {
    "report_type": "text",
    "text_content": "Anna Nagar signal pe bike accident hua, do log injured",
    "expected_incident_type": "road_accident",
    "language": "hi-IN",
    "should_dedup_with": "report_1"
  },
  {
    "report_type": "text",
    "text_content": "T. Nagar లో భారీ అగ్నిప్రమాదం, 3 అంతస్తుల భవనం తగలబడింది",
    "expected_incident_type": "fire",
    "language": "te-IN"
  },
  {
    "report_type": "text",
    "text_content": "Heavy flooding near Adyar river, water entered 50+ houses",
    "expected_incident_type": "flood",
    "language": "en-IN"
  },
  {
    "report_type": "text",
    "text_content": "Tambaram स्टेशन के पास पुल गिरा, कई लोग फंसे",
    "expected_incident_type": "building_collapse",
    "language": "hi-IN"
  },
  {
    "report_type": "text",
    "text_content": "அடையாறு நதியில் வெள்ளம், 50 வீடுகளுக்குள் தண்ணீர்",
    "expected_incident_type": "flood",
    "language": "ta-IN",
    "should_dedup_with": "report_4"
  },
  {
    "report_type": "text",
    "text_content": "Gas leak at Manali industrial area, workers evacuated",
    "expected_incident_type": "infrastructure",
    "language": "en-IN"
  },
  {
    "report_type": "text",
    "text_content": "மணலி தொழிற்சாலை பகுதியில் எரிவாயு கசிவு, தொழிலாளர்கள் வெளியேற்றம்",
    "expected_incident_type": "infrastructure",
    "language": "ta-IN",
    "should_dedup_with": "report_7"
  }
]
```

---

## 16. CHANGE LOG

| Date       | Change                                | Phase  |
|------------|---------------------------------------|--------|
| 2026-04-06 | Initial PROJECT.md created            | Phase 0 |

---

> **IMPORTANT FOR CLAUDE CODE**: Always read this file before starting any task. After completing any phase, update the checklist in Section 12 and add an entry to the Change Log in Section 16. This file is the single source of truth.