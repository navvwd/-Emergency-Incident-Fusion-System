# EIFS Data Fusion Algorithm v1.0

## Emergency Report Deduplication & Incident Fusion

---

## 1. THE PROBLEM

When an emergency occurs, multiple reports flood in:
- A Tamil voice call: "அண்ணா நகரில் பைக் விபத்து"
- A Hindi text: "Anna Nagar signal pe bike accident"
- An image of a damaged bike with extracted scene description

Naive embedding-only matching fails because:
- Reports in different languages produce different embedding neighborhoods
- "Fire near T. Nagar" and "Building fire at T. Nagar junction" are the same event but embedding similarity might be 0.78 (below a 0.85 threshold)
- Two unrelated accidents in Anna Nagar on the same day would wrongly merge on location alone
- A flood in Adyar and a separate drowning in Adyar river are different incidents

**We need multi-dimensional fusion, not single-metric matching.**

---

## 2. ALGORITHM OVERVIEW: WEIGHTED MULTI-METRIC FUSION SCORE

Instead of a single cosine similarity threshold, we compute a **Composite Fusion Score (CFS)** across 5 dimensions, each weighted by reliability:

```
CFS = (w_sem × S_semantic) + (w_geo × S_geospatial) + (w_temp × S_temporal) + (w_cat × S_categorical) + (w_ent × S_entity)
```

Where:
- S_semantic   = Semantic text similarity (embedding cosine)
- S_geospatial = Location proximity score
- S_temporal   = Time proximity score
- S_categorical = Incident type match score
- S_entity     = Named entity overlap score (locations, counts, keywords)

**Default Weights:**
```
w_sem  = 0.30   (semantic embedding similarity)
w_geo  = 0.25   (geospatial proximity)
w_temp = 0.20   (temporal proximity)
w_cat  = 0.15   (incident type match)
w_ent  = 0.10   (entity overlap)
───────────────
Total  = 1.00
```

**Fusion Threshold:** CFS ≥ 0.72 → MERGE into same incident

---

## 3. METRIC DEFINITIONS

### 3.1 Semantic Similarity (S_semantic)

Cosine similarity between OpenAI `text-embedding-3-small` vectors of the extracted English summaries.

```typescript
S_semantic = cosineSimilarity(embedding_new, embedding_existing)
// Range: 0.0 to 1.0
// 1.0 = identical text, 0.0 = completely unrelated
```

**Why summaries, not raw text?**
Raw reports come in different languages with different verbosity. After extraction, the LLM produces a normalized English summary like "Bike accident at Anna Nagar signal, 2 people injured" — these are far more comparable than raw multilingual input.

### 3.2 Geospatial Proximity (S_geospatial)

Uses Haversine distance between extracted lat/lng coordinates, mapped to a 0-1 score with exponential decay.

```typescript
function geoScore(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const distanceKm = haversineDistance(lat1, lng1, lat2, lng2);

  // Exponential decay: score drops as distance increases
  // 0 km → 1.0, 0.5 km → 0.78, 1 km → 0.61, 2 km → 0.37, 5 km → 0.08
  const DECAY_RATE = 0.5; // km — distance at which score = ~0.5
  return Math.exp(-distanceKm / DECAY_RATE);
}

function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
```

**Fallback when coordinates are missing:**
If either report lacks lat/lng (LLM couldn't geocode), use fuzzy string match on location names:
```typescript
function locationStringScore(loc1: string, loc2: string): number {
  // Normalize: lowercase, remove "near", "close to", etc.
  const norm1 = normalizeLocation(loc1);
  const norm2 = normalizeLocation(loc2);

  // Exact match
  if (norm1 === norm2) return 1.0;

  // Check if one contains the other ("Anna Nagar" in "Anna Nagar Signal, Chennai")
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;

  // Token overlap (Jaccard similarity on location words)
  const tokens1 = new Set(norm1.split(/\s+/));
  const tokens2 = new Set(norm2.split(/\s+/));
  const intersection = new Set([...tokens1].filter(t => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  return intersection.size / union.size;
}
```

### 3.3 Temporal Proximity (S_temporal)

Reports about the same incident typically arrive within a short window. Score decays over time.

```typescript
function temporalScore(time1: Date, time2: Date): number {
  const diffMinutes = Math.abs(time1.getTime() - time2.getTime()) / (1000 * 60);

  // Sigmoid-like decay:
  // 0 min → 1.0, 15 min → 0.87, 30 min → 0.61, 60 min → 0.27, 120 min → 0.05
  const HALF_LIFE_MINUTES = 30; // minutes at which score ≈ 0.5
  return Math.exp(-0.693 * diffMinutes / HALF_LIFE_MINUTES);
}
```

**Rationale:** Emergency reports about the same event cluster within 30-60 minutes. After 2 hours, a similar report is likely a different event.

### 3.4 Categorical Match (S_categorical)

Hard match on incident type with partial credit for related types.

```typescript
const CATEGORY_SIMILARITY: Record<string, Record<string, number>> = {
  'road_accident':      { 'road_accident': 1.0, 'medical': 0.3 },
  'fire':               { 'fire': 1.0, 'building_collapse': 0.4, 'infrastructure': 0.3 },
  'flood':              { 'flood': 1.0, 'infrastructure': 0.3 },
  'building_collapse':  { 'building_collapse': 1.0, 'fire': 0.4, 'infrastructure': 0.5 },
  'medical':            { 'medical': 1.0, 'road_accident': 0.3 },
  'violence':           { 'violence': 1.0 },
  'infrastructure':     { 'infrastructure': 1.0, 'building_collapse': 0.5, 'flood': 0.3, 'fire': 0.3 },
  'other':              { 'other': 1.0 },
};

function categoryScore(type1: string, type2: string): number {
  if (type1 === type2) return 1.0;
  return CATEGORY_SIMILARITY[type1]?.[type2] ?? 0.0;
}
```

**Why partial credit?** A "building collapse" report and a "fire" report at the same location might describe the same event — a fire that caused a collapse. Cross-category scores handle this.

### 3.5 Entity Overlap (S_entity)

Compares named entities extracted by the LLM: location keywords, affected count proximity, and incident-specific terms.

```typescript
function entityScore(extracted1: ExtractedData, extracted2: ExtractedData): number {
  let score = 0;
  let factors = 0;

  // 1. Location keyword overlap (Jaccard on significant tokens)
  const locTokens1 = extractSignificantTokens(extracted1.location);
  const locTokens2 = extractSignificantTokens(extracted2.location);
  if (locTokens1.size > 0 && locTokens2.size > 0) {
    const intersection = new Set([...locTokens1].filter(t => locTokens2.has(t)));
    const union = new Set([...locTokens1, ...locTokens2]);
    score += intersection.size / union.size;
    factors++;
  }

  // 2. Affected count proximity
  if (extracted1.affected_count > 0 && extracted2.affected_count > 0) {
    const maxCount = Math.max(extracted1.affected_count, extracted2.affected_count);
    const minCount = Math.min(extracted1.affected_count, extracted2.affected_count);
    score += minCount / maxCount; // 2/3 = 0.67, 2/2 = 1.0, 1/5 = 0.2
    factors++;
  }

  // 3. Summary keyword overlap (beyond stop words)
  const sumTokens1 = extractSignificantTokens(extracted1.summary);
  const sumTokens2 = extractSignificantTokens(extracted2.summary);
  if (sumTokens1.size > 0 && sumTokens2.size > 0) {
    const intersection = new Set([...sumTokens1].filter(t => sumTokens2.has(t)));
    const union = new Set([...sumTokens1, ...sumTokens2]);
    score += intersection.size / union.size;
    factors++;
  }

  return factors > 0 ? score / factors : 0;
}

function extractSignificantTokens(text: string): Set<string> {
  const STOP_WORDS = new Set([
    'the', 'a', 'an', 'in', 'at', 'on', 'near', 'to', 'of', 'and', 'is', 'was',
    'were', 'are', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
    'people', 'person', 'injured', 'reported', 'accident', 'incident',
  ]);
  return new Set(
    text.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter(t => t.length > 2 && !STOP_WORDS.has(t))
  );
}
```

---

## 4. COMPOSITE FUSION SCORE CALCULATION

```typescript
interface FusionCandidate {
  incident_id: string;
  score: number;
  breakdown: {
    semantic: number;
    geospatial: number;
    temporal: number;
    categorical: number;
    entity: number;
  };
}

const FUSION_WEIGHTS = {
  semantic: 0.30,
  geospatial: 0.25,
  temporal: 0.20,
  categorical: 0.15,
  entity: 0.10,
};

const FUSION_THRESHOLD = 0.72;

function computeFusionScore(
  newReport: { extracted: ExtractedData; embedding: number[]; created_at: Date },
  existingIncident: { extracted: ExtractedData; embedding: number[]; created_at: Date; latitude: number | null; longitude: number | null },
): FusionCandidate {
  // 1. Semantic similarity
  const semantic = cosineSimilarity(newReport.embedding, existingIncident.embedding);

  // 2. Geospatial proximity
  let geospatial: number;
  if (
    newReport.extracted.latitude && newReport.extracted.longitude &&
    existingIncident.latitude && existingIncident.longitude
  ) {
    geospatial = geoScore(
      newReport.extracted.latitude, newReport.extracted.longitude,
      existingIncident.latitude, existingIncident.longitude,
    );
  } else {
    // Fallback to location string matching
    geospatial = locationStringScore(
      newReport.extracted.location,
      existingIncident.extracted.location,
    );
  }

  // 3. Temporal proximity
  const temporal = temporalScore(newReport.created_at, existingIncident.created_at);

  // 4. Categorical match
  const categorical = categoryScore(
    newReport.extracted.incident_type,
    existingIncident.extracted.incident_type,
  );

  // 5. Entity overlap
  const entity = entityScore(newReport.extracted, existingIncident.extracted);

  // Composite score
  const score =
    FUSION_WEIGHTS.semantic * semantic +
    FUSION_WEIGHTS.geospatial * geospatial +
    FUSION_WEIGHTS.temporal * temporal +
    FUSION_WEIGHTS.categorical * categorical +
    FUSION_WEIGHTS.entity * entity;

  return {
    incident_id: existingIncident.incident_id,
    score,
    breakdown: { semantic, geospatial, temporal, categorical, entity },
  };
}
```

---

## 5. FUSION PIPELINE (FULL FLOW)

```
New report arrives
       │
       ▼
┌──────────────────────────────────────────┐
│  Step 1: CANDIDATE RETRIEVAL (fast)      │
│                                          │
│  Query pgvector for top-5 nearest        │
│  embeddings with cosine > 0.60           │
│  (lower threshold than final — cast      │
│  a wide net, filter later)               │
│                                          │
│  Also filter: only incidents from        │
│  last 4 hours (temporal pre-filter)      │
└──────────────────────┬───────────────────┘
                       │
            ┌──────────▼──────────┐
            │  0 candidates?      │
            │  → CREATE new       │
            │    incident         │
            └──────────┬──────────┘
                       │ 1+ candidates
                       ▼
┌──────────────────────────────────────────┐
│  Step 2: MULTI-METRIC SCORING            │
│                                          │
│  For each candidate incident:            │
│    Compute CFS across all 5 dimensions   │
│    Store breakdown for explainability     │
└──────────────────────┬───────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────┐
│  Step 3: DECISION                        │
│                                          │
│  bestMatch = candidate with highest CFS  │
│                                          │
│  if bestMatch.score >= 0.72:             │
│    → MERGE into bestMatch.incident_id    │
│    → Log fusion breakdown for dashboard  │
│  else:                                   │
│    → CREATE new incident                 │
└──────────────────────┬───────────────────┘
                       │
                       ▼
┌──────────────────────────────────────────┐
│  Step 4: INCIDENT UPDATE (on merge)      │
│                                          │
│  report_count += 1                       │
│  affected_count = MAX(old, new)          │
│  severity_score = MAX(old, new)          │
│  summary = pick longer/more detailed     │
│  updated_at = now()                      │
│                                          │
│  If new report has lat/lng and incident  │
│  doesn't → update incident coordinates   │
│                                          │
│  Recalculate severity using confidence-  │
│  weighted formula (more reports = higher │
│  confidence in severity estimate)        │
└──────────────────────────────────────────┘
```

---

## 6. SEVERITY RECALCULATION ON MERGE

When multiple reports merge, we gain confidence. Severity is recalculated:

```typescript
function recalculateSeverity(
  existingSeverity: number,
  existingReportCount: number,
  newSeverity: number,
): number {
  // Weighted average: existing severity has more weight because
  // it's been validated by more reports
  const existingWeight = existingReportCount;
  const newWeight = 1;
  const totalWeight = existingWeight + newWeight;

  const weightedSeverity = (existingSeverity * existingWeight + newSeverity * newWeight) / totalWeight;

  // Round to nearest integer, clamp 1-10
  return Math.min(10, Math.max(1, Math.round(weightedSeverity)));
}
```

**Confidence boost rule:** If 3+ reports independently assign severity ≥ 8, auto-escalate to severity 9 (high confidence critical).

```typescript
function applyConfidenceEscalation(
  currentSeverity: number,
  reportCount: number,
  allSeverities: number[],
): number {
  const highSeverityCount = allSeverities.filter(s => s >= 8).length;

  // 3+ independent reports saying critical → escalate
  if (highSeverityCount >= 3 && currentSeverity < 9) {
    return 9;
  }

  return currentSeverity;
}
```

---

## 7. DATABASE CHANGES

### Updated match_reports function (replaces the old one)

```sql
-- Candidate retrieval: wide net with low threshold
-- Returns top 5 candidates from last 4 hours
CREATE OR REPLACE FUNCTION find_fusion_candidates(
  query_embedding VECTOR(1536),
  semantic_threshold FLOAT DEFAULT 0.60,
  time_window_hours INT DEFAULT 4,
  max_candidates INT DEFAULT 5
)
RETURNS TABLE (
  incident_id UUID,
  semantic_similarity FLOAT,
  location TEXT,
  latitude FLOAT,
  longitude FLOAT,
  incident_type TEXT,
  affected_count INT,
  severity_score INT,
  summary TEXT,
  report_count INT,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)
LANGUAGE sql STABLE AS $$
  SELECT DISTINCT ON (i.id)
    i.id AS incident_id,
    1 - (r.embedding <=> query_embedding) AS semantic_similarity,
    i.location,
    i.latitude,
    i.longitude,
    i.incident_type,
    i.affected_count,
    i.severity_score,
    i.summary,
    i.report_count,
    i.created_at,
    i.updated_at
  FROM raw_reports r
  JOIN incidents i ON r.incident_id = i.id
  WHERE r.incident_id IS NOT NULL
    AND i.status = 'active'
    AND i.created_at >= NOW() - INTERVAL '1 hour' * time_window_hours
    AND 1 - (r.embedding <=> query_embedding) > semantic_threshold
  ORDER BY i.id, (1 - (r.embedding <=> query_embedding)) DESC
  LIMIT max_candidates;
$$;

-- Enhanced merge function
CREATE OR REPLACE FUNCTION merge_into_incident(
  p_incident_id UUID,
  p_new_affected_count INT,
  p_new_severity INT,
  p_new_latitude FLOAT DEFAULT NULL,
  p_new_longitude FLOAT DEFAULT NULL,
  p_new_summary TEXT DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql AS $$
BEGIN
  UPDATE incidents SET
    report_count = report_count + 1,
    affected_count = GREATEST(affected_count, p_new_affected_count),
    severity_score = GREATEST(severity_score, p_new_severity),
    latitude = COALESCE(latitude, p_new_latitude),
    longitude = COALESCE(longitude, p_new_longitude),
    summary = CASE
      WHEN p_new_summary IS NOT NULL AND LENGTH(p_new_summary) > LENGTH(summary)
      THEN p_new_summary
      ELSE summary
    END,
    updated_at = NOW()
  WHERE id = p_incident_id;
END;
$$;
```

### New table: fusion_log (for dashboard explainability)

```sql
CREATE TABLE fusion_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID REFERENCES raw_reports(id),
  matched_incident_id UUID REFERENCES incidents(id),
  fusion_score FLOAT NOT NULL,
  score_breakdown JSONB NOT NULL,
  -- { semantic: 0.87, geospatial: 0.92, temporal: 0.95, categorical: 1.0, entity: 0.73 }
  decision TEXT NOT NULL CHECK (decision IN ('merged', 'new_incident')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## 8. EDGE CASES & SAFEGUARDS

### 8.1 Same location, different incidents
Two car accidents at the same intersection 3 hours apart.
- Geospatial: 1.0 (same location)
- Temporal: 0.05 (3 hours → heavily decayed)
- CFS: ~0.45 → below 0.72 → correctly creates NEW incident

### 8.2 Same incident, different descriptions
Tamil voice report + Hindi text + English image description — all about the same bike crash.
- Semantic: 0.75 (different phrasing but same content after extraction)
- Geospatial: 0.95 (same area)
- Temporal: 0.98 (within 5 minutes)
- Categorical: 1.0 (both "road_accident")
- Entity: 0.80 (both mention "Anna Nagar", "2 injured")
- CFS: 0.88 → MERGE ✓

### 8.3 Related but different incidents
Fire at a building + subsequent building collapse at same location.
- Semantic: 0.55 (different events)
- Geospatial: 1.0 (same building)
- Temporal: 0.70 (20 minutes apart)
- Categorical: 0.40 (fire↔building_collapse partial credit)
- Entity: 0.60 (same location, different damage description)
- CFS: 0.63 → below 0.72 → correctly creates NEW incident
  (but the dashboard shows them geographically close — the operator can manually link if needed)

### 8.4 No coordinates available
Both reports only have text location "near Tambaram station".
- Geospatial falls back to string matching → "tambaram station" exact match → 1.0
- Other metrics proceed normally

### 8.5 First report (no candidates)
pgvector returns 0 candidates → skip scoring → create new incident immediately.

---

## 9. CLAUDE CODE IMPLEMENTATION PROMPT

```
Read PROJECT.md and this FUSION_ALGORITHM.md.

Replace the current simple dedup logic in server/src/services/dedup.ts with the
multi-metric fusion algorithm defined in FUSION_ALGORITHM.md.

Implement the following:

1. Create server/src/services/fusion.ts with:

   a. ALL scoring functions:
      - cosineSimilarity(a: number[], b: number[]): number
      - geoScore(lat1, lng1, lat2, lng2): number
      - haversineDistance(lat1, lng1, lat2, lng2): number
      - locationStringScore(loc1, loc2): number
      - temporalScore(time1, time2): number
      - categoryScore(type1, type2): number
      - entityScore(extracted1, extracted2): number
      - extractSignificantTokens(text): Set<string>

   b. computeFusionScore() — takes new report + existing incident, returns
      FusionCandidate with score and breakdown

   c. FUSION_WEIGHTS and FUSION_THRESHOLD constants

   d. recalculateSeverity() and applyConfidenceEscalation()

   All formulas are defined in this document — implement them exactly.

2. Update server/src/services/dedup.ts:

   a. findFusionCandidates(embedding: number[]): calls the new
      find_fusion_candidates RPC (wider net: threshold 0.60, last 4 hours, top 5)

   b. findBestMatch(newReport, candidates): runs computeFusionScore on each
      candidate, returns the best match above FUSION_THRESHOLD or null

   c. mergeReport(): now also passes latitude, longitude, and longer summary.
      After merge, call recalculateSeverity.

   d. storeRawReport(): unchanged

   e. storeFusionLog(): insert into fusion_log table with score breakdown

3. Update server/src/routes/reports.ts:
   - Replace the old findMatch → mergeReport flow with:
     candidates = findFusionCandidates(embedding)
     bestMatch = findBestMatch(newReportData, candidates)
     if bestMatch → merge + log fusion
     else → create new incident + log fusion
   - Include fusion_score and score_breakdown in the API response

4. Create supabase/migrations/002_fusion_algorithm.sql:
   - The find_fusion_candidates function
   - The updated merge_into_incident function
   - The fusion_log table
   - Index on fusion_log(matched_incident_id)

5. Update the GET /api/incidents response to include a new field:
   fusion_confidence: (report_count >= 3 ? 'high' : report_count >= 2 ? 'medium' : 'low')

Do NOT change any Sarvam API calls, frontend code, or streaming logic.
The types in src/types/index.ts may need updating for FusionCandidate and FusionLog.
```

---

## 10. DEMO IMPACT

This algorithm gives you 3 things the judges will love:

1. **Explainable fusion** — the dashboard can show WHY two reports merged:
   "Semantic: 87% | Location: 95% | Time: 98% | Type: 100% | Entities: 80% → Score: 88%"

2. **Robust dedup** — handles cross-language, missing coordinates, and edge cases

3. **Confidence escalation** — "3 independent reports confirm severity 8+ → auto-escalated to critical"

Show this in the demo: submit 3 overlapping reports, then click on the merged incident to see the fusion breakdown. That's research-grade engineering in a hackathon.