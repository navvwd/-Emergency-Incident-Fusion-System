// ──────────────────────────────────────────────
// EIFS — Multi-Metric Fusion Scoring Engine
// Weighted composite scoring across 5 dimensions:
// semantic, geospatial, temporal, categorical, entity
// Ref: Fusion_algorithm.md
// ──────────────────────────────────────────────

import { ExtractedData, FusionCandidate, FusionScoreBreakdown, FusionCandidateRow } from '../types';

// ─── Constants (configurable via env) ──────────────────────

export const FUSION_WEIGHTS = {
  semantic:    parseFloat(process.env.FUSION_W_SEMANTIC || '0.30'),
  geospatial:  parseFloat(process.env.FUSION_W_GEO || '0.25'),
  temporal:    parseFloat(process.env.FUSION_W_TEMPORAL || '0.20'),
  categorical: parseFloat(process.env.FUSION_W_CATEGORY || '0.15'),
  entity:      parseFloat(process.env.FUSION_W_ENTITY || '0.10'),
};

export const FUSION_THRESHOLD = parseFloat(process.env.FUSION_THRESHOLD || '0.72');

// Hard per-dimension gates — prevent false positives
const FUSION_GATES = {
  semantic:    parseFloat(process.env.FUSION_GATE_SEMANTIC || '0.40'),
  categorical: parseFloat(process.env.FUSION_GATE_CATEGORY || '0.50'),
};

const CATEGORY_SIMILARITY: Record<string, Record<string, number>> = {
  'road_accident':     { 'road_accident': 1.0, 'medical': 0.3 },
  'fire':              { 'fire': 1.0, 'building_collapse': 0.4, 'infrastructure': 0.3 },
  'flood':             { 'flood': 1.0, 'infrastructure': 0.3 },
  'building_collapse': { 'building_collapse': 1.0, 'fire': 0.4, 'infrastructure': 0.5 },
  'medical':           { 'medical': 1.0, 'road_accident': 0.3 },
  'violence':          { 'violence': 1.0 },
  'infrastructure':    { 'infrastructure': 1.0, 'building_collapse': 0.5, 'flood': 0.3, 'fire': 0.3 },
  'other':             { 'other': 1.0 },
};

const STOP_WORDS = new Set([
  'the', 'a', 'an', 'in', 'at', 'on', 'near', 'to', 'of', 'and', 'is', 'was',
  'were', 'are', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did',
  'people', 'person', 'injured', 'reported', 'accident', 'incident',
]);

// ─── 1. Semantic Similarity ─────────────────

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom === 0 ? 0 : dot / denom;
}

// ─── 2. Geospatial Proximity ────────────────

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // Earth radius in km
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function geoScore(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const distanceKm = haversineDistance(lat1, lng1, lat2, lng2);
  const DECAY_RATE = 0.5; // km — distance at which score ≈ 0.5
  return Math.exp(-distanceKm / DECAY_RATE);
}

export function normalizeLocation(loc: string): string {
  return loc
    .toLowerCase()
    .replace(/\b(near|close to|beside|opposite|behind|next to|in front of)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function locationStringScore(loc1: string, loc2: string): number {
  const norm1 = normalizeLocation(loc1);
  const norm2 = normalizeLocation(loc2);

  if (norm1 === norm2) return 1.0;
  if (norm1.includes(norm2) || norm2.includes(norm1)) return 0.85;

  const tokens1 = new Set(norm1.split(/\s+/));
  const tokens2 = new Set(norm2.split(/\s+/));
  const intersection = new Set([...tokens1].filter((t) => tokens2.has(t)));
  const union = new Set([...tokens1, ...tokens2]);
  return union.size === 0 ? 0 : intersection.size / union.size;
}

// ─── 3. Temporal Proximity ──────────────────

export function temporalScore(time1: Date, time2: Date): number {
  const diffMinutes = Math.abs(time1.getTime() - time2.getTime()) / (1000 * 60);
  const HALF_LIFE_MINUTES = 30;
  return Math.exp(-0.693 * diffMinutes / HALF_LIFE_MINUTES);
}

// ─── 4. Categorical Match ───────────────────

export function categoryScore(type1: string, type2: string): number {
  if (type1 === type2) return 1.0;
  return CATEGORY_SIMILARITY[type1]?.[type2] ?? 0.0;
}

// ─── 5. Entity Overlap ─────────────────────

export function extractSignificantTokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((t) => t.length > 2 && !STOP_WORDS.has(t))
  );
}

export function entityScore(extracted1: ExtractedData, extracted2: ExtractedData): number {
  let score = 0;
  let factors = 0;

  // 1. Location keyword overlap
  const locTokens1 = extractSignificantTokens(extracted1.location);
  const locTokens2 = extractSignificantTokens(extracted2.location);
  if (locTokens1.size > 0 && locTokens2.size > 0) {
    const intersection = new Set([...locTokens1].filter((t) => locTokens2.has(t)));
    const union = new Set([...locTokens1, ...locTokens2]);
    score += intersection.size / union.size;
    factors++;
  }

  // 2. Affected count proximity
  if (extracted1.affected_count > 0 && extracted2.affected_count > 0) {
    const maxCount = Math.max(extracted1.affected_count, extracted2.affected_count);
    const minCount = Math.min(extracted1.affected_count, extracted2.affected_count);
    score += minCount / maxCount;
    factors++;
  }

  // 3. Summary keyword overlap
  const sumTokens1 = extractSignificantTokens(extracted1.summary);
  const sumTokens2 = extractSignificantTokens(extracted2.summary);
  if (sumTokens1.size > 0 && sumTokens2.size > 0) {
    const intersection = new Set([...sumTokens1].filter((t) => sumTokens2.has(t)));
    const union = new Set([...sumTokens1, ...sumTokens2]);
    score += intersection.size / union.size;
    factors++;
  }

  return factors > 0 ? score / factors : 0;
}

// ─── Composite Fusion Score ─────────────────

export function computeFusionScore(
  newReport: {
    extracted: ExtractedData;
    embedding: number[];
    created_at: Date;
  },
  existingIncident: {
    extracted: ExtractedData;
    embedding: number[];
    created_at: Date;
    latitude: number | null;
    longitude: number | null;
  },
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

  const breakdown = { semantic, geospatial, temporal, categorical, entity };

  // ── Hard gates: NEVER merge if critical dimensions are too low ──
  let gatedScore = score;
  if (semantic < FUSION_GATES.semantic) {
    console.log(`[Fusion] GATE: semantic ${semantic.toFixed(3)} < ${FUSION_GATES.semantic} → blocked`);
    gatedScore = 0;
  }
  if (categorical < FUSION_GATES.categorical) {
    console.log(`[Fusion] GATE: categorical ${categorical.toFixed(3)} < ${FUSION_GATES.categorical} → blocked`);
    gatedScore = 0;
  }

  // Debug logging
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Fusion] Score: sem=${semantic.toFixed(3)} geo=${geospatial.toFixed(3)} tmp=${temporal.toFixed(3)} cat=${categorical.toFixed(3)} ent=${entity.toFixed(3)} → CFS=${gatedScore.toFixed(3)}`);
  }

  return {
    incident_id: '', // filled by caller
    score: gatedScore,
    breakdown,
  };
}

// ─── Severity Recalculation ─────────────────

export function recalculateSeverity(
  existingSeverity: number,
  existingReportCount: number,
  newSeverity: number,
): number {
  const existingWeight = existingReportCount;
  const newWeight = 1;
  const totalWeight = existingWeight + newWeight;

  const weightedSeverity =
    (existingSeverity * existingWeight + newSeverity * newWeight) / totalWeight;

  return Math.min(10, Math.max(1, Math.round(weightedSeverity)));
}

export function applyConfidenceEscalation(
  currentSeverity: number,
  _reportCount: number,
  allSeverities: number[],
): number {
  const highSeverityCount = allSeverities.filter((s) => s >= 8).length;

  if (highSeverityCount >= 3 && currentSeverity < 9) {
    return 9;
  }

  return currentSeverity;
}

// ─── Helper: Build candidate for scoring ────

export function buildCandidateForScoring(
  row: FusionCandidateRow,
  candidateEmbedding: number[],
): {
  extracted: ExtractedData;
  embedding: number[];
  created_at: Date;
  latitude: number | null;
  longitude: number | null;
} {
  return {
    extracted: {
      location: row.location,
      latitude: row.latitude,
      longitude: row.longitude,
      incident_type: row.incident_type as ExtractedData['incident_type'],
      affected_count: row.affected_count,
      severity_score: row.severity_score,
      summary: row.summary,
    },
    embedding: candidateEmbedding,
    created_at: new Date(row.created_at),
    latitude: row.latitude,
    longitude: row.longitude,
  };
}
