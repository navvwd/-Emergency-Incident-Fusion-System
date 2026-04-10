// ──────────────────────────────────────────────
// EIFS — Deduplication Service (Fusion v2)
// Multi-metric fusion matching, merging,
// and raw report storage via Supabase
// Ref: Fusion_algorithm.md
// ──────────────────────────────────────────────

import { supabase } from '../lib/supabase';
import {
  ExtractedData,
  FusionCandidate,
  FusionCandidateRow,
  FusionScoreBreakdown,
  StoreRawReportParams,
} from '../types';
import {
  computeFusionScore,
  buildCandidateForScoring,
  recalculateSeverity,
  applyConfidenceEscalation,
<<<<<<< HEAD
  FUSION_THRESHOLD,
} from './fusion';

=======
  normalizeLocation,
  FUSION_THRESHOLD,
} from './fusion';

// ─── 0. Deduplicate Candidates ─────────────

function dedupeCandidates(candidates: FusionCandidateRow[]): FusionCandidateRow[] {
  const seen = new Map<string, FusionCandidateRow>();
  for (const c of candidates) {
    const key = `${c.incident_type}:${normalizeLocation(c.location)}`;
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, c);
    } else {
      const cTime = new Date(c.updated_at).getTime();
      const eTime = new Date(existing.updated_at).getTime();
      if (cTime > eTime || c.report_count > existing.report_count) {
        seen.set(key, c);
      }
    }
  }
  return Array.from(seen.values());
}

>>>>>>> c91130b (naveeth changes)
// ─── 1. Find Fusion Candidates ──────────────

/**
 * Wide-net candidate retrieval using pgvector.
 * Lower threshold (0.60) + 4-hour window + top 5 candidates.
 * The real decision is made by multi-metric scoring in findBestMatch.
 */
export async function findFusionCandidates(
  embedding: number[]
): Promise<FusionCandidateRow[]> {
  const start = Date.now();

  try {
<<<<<<< HEAD
    const { data, error } = await supabase.rpc('find_fusion_candidates', {
=======
    // Try versioned function first
    const { data, error } = await supabase.rpc('find_fusion_candidates_v1', {
>>>>>>> c91130b (naveeth changes)
      query_embedding: JSON.stringify(embedding),
      semantic_threshold: 0.60,
      time_window_hours: 4,
      max_candidates: 5,
    });

    if (error) {
<<<<<<< HEAD
=======
      // Fallback: use original match_reports + manual incident join
      if (error.message.includes('find_fusion_candidates_v1')) {
        throw new Error(
          '[Fusion] RPC find_fusion_candidates_v1 not deployed. Run supabase/migrations/002_fusion_algorithm.sql before testing.'
        );
      }
>>>>>>> c91130b (naveeth changes)
      throw new Error(error.message);
    }

    const elapsed = Date.now() - start;
    console.log(
      `[Fusion] Found ${data?.length ?? 0} candidates in ${elapsed}ms (threshold=0.60, window=4h)`
    );

    return (data ?? []) as FusionCandidateRow[];
  } catch (error: any) {
    const elapsed = Date.now() - start;
    console.error(`[Fusion] findFusionCandidates failed after ${elapsed}ms: ${error.message}`);
    throw new Error(`[Fusion] Candidate retrieval failed: ${error.message}`);
  }
}

<<<<<<< HEAD
=======
/**
 * Fallback candidate retrieval using the original match_reports function.
 * Used when find_fusion_candidates_v1 hasn't been deployed yet.
 */
async function findCandidatesFallback(
  embedding: number[]
): Promise<FusionCandidateRow[]> {
  const start = Date.now();

  // Step 1: Get matching incident IDs from the original function (lower threshold)
  const { data: matches, error: matchErr } = await supabase.rpc('match_reports', {
    query_embedding: JSON.stringify(embedding),
    threshold: 0.55,
    max_results: 5,
  });

  if (matchErr) throw new Error(matchErr.message);
  if (!matches || matches.length === 0) {
    console.log(`[Fusion/Fallback] No candidates in ${Date.now() - start}ms`);
    return [];
  }

  // Step 2: Fetch full incident data for matched IDs
  const incidentIds = matches.map((m: any) => m.incident_id);
  const { data: incidents, error: incErr } = await supabase
    .from('incidents')
    .select('*')
    .in('id', incidentIds)
    .eq('status', 'active');

  if (incErr) throw new Error(incErr.message);

  const elapsed = Date.now() - start;
  console.log(`[Fusion/Fallback] Found ${incidents?.length ?? 0} candidates in ${elapsed}ms`);

  // Map to FusionCandidateRow format
  return (incidents ?? []).map((inc: any) => {
    const match = matches.find((m: any) => m.incident_id === inc.id);
    return {
      incident_id: inc.id,
      semantic_similarity: match?.similarity ?? 0,
      location: inc.location,
      latitude: inc.latitude,
      longitude: inc.longitude,
      incident_type: inc.incident_type,
      affected_count: inc.affected_count,
      severity_score: inc.severity_score,
      summary: inc.summary,
      report_count: inc.report_count,
      created_at: inc.created_at,
      updated_at: inc.updated_at,
    } as FusionCandidateRow;
  });
}

>>>>>>> c91130b (naveeth changes)
// ─── 2. Find Best Match via Multi-Metric Fusion ─

/**
 * Scores each candidate across 5 dimensions and returns
 * the best match above FUSION_THRESHOLD, or null.
 */
export async function findBestMatch(
  newReport: {
    extracted: ExtractedData;
    embedding: number[];
    created_at: Date;
  },
  candidates: FusionCandidateRow[],
): Promise<FusionCandidate | null> {
  if (candidates.length === 0) return null;

<<<<<<< HEAD
=======
  candidates = dedupeCandidates(candidates);

>>>>>>> c91130b (naveeth changes)
  let bestMatch: FusionCandidate | null = null;

  for (const candidate of candidates) {
    // Use the semantic_similarity from pgvector as a proxy —
    // we don't have the candidate's raw embedding, so we build
    // a scoring object using the candidate row data directly.
    // The semantic score comes from the DB query result.
    const candidateData = buildCandidateForScoring(candidate, []);

    const result = computeFusionScore(newReport, candidateData);
    // Override semantic score with the DB-computed value (more accurate)
    result.breakdown.semantic = candidate.semantic_similarity;
    // Recompute total with corrected semantic
    result.score =
      0.30 * result.breakdown.semantic +
      0.25 * result.breakdown.geospatial +
      0.20 * result.breakdown.temporal +
      0.15 * result.breakdown.categorical +
      0.10 * result.breakdown.entity;
    result.incident_id = candidate.incident_id;

    console.log(
      `[Fusion] Candidate ${candidate.incident_id}: CFS=${result.score.toFixed(3)} ` +
      `[sem=${result.breakdown.semantic.toFixed(2)} geo=${result.breakdown.geospatial.toFixed(2)} ` +
      `tmp=${result.breakdown.temporal.toFixed(2)} cat=${result.breakdown.categorical.toFixed(2)} ` +
      `ent=${result.breakdown.entity.toFixed(2)}]`
    );

    if (result.score >= FUSION_THRESHOLD) {
      if (!bestMatch || result.score > bestMatch.score) {
        bestMatch = result;
      }
    }
  }

  if (bestMatch) {
<<<<<<< HEAD
=======
    const { data: duplicates } = await supabase
      .from('incidents')
      .select('id, location')
      .eq('incident_type', newReport.extracted.incident_type)
      .eq('status', 'active')
      .neq('id', bestMatch.incident_id);

    const sameLoc = (duplicates ?? []).filter(d =>
      normalizeLocation(d.location ?? '') === normalizeLocation(newReport.extracted.location)
    );
    if (sameLoc.length > 0) {
      console.error(
        `[Fusion] CANONICALIZATION WARNING: ${sameLoc.length} other active incident(s) exist for ` +
        `${newReport.extracted.incident_type} at ${newReport.extracted.location}. IDs: ${sameLoc.map(d => d.id).join(', ')}`
      );
    }

>>>>>>> c91130b (naveeth changes)
    console.log(
      `[Fusion] Best match: ${bestMatch.incident_id} (CFS=${bestMatch.score.toFixed(3)}) — MERGE`
    );
  } else {
    console.log(`[Fusion] No candidate above threshold ${FUSION_THRESHOLD} — NEW incident`);
  }

  return bestMatch;
}

// ─── 3. Create New Incident ──────────────────

export async function createIncident(data: ExtractedData): Promise<string> {
  const start = Date.now();

  try {
    const { data: inserted, error } = await supabase
      .from('incidents')
      .insert({
        location: data.location,
        latitude: data.latitude,
        longitude: data.longitude,
        incident_type: data.incident_type,
        affected_count: data.affected_count,
        severity_score: data.severity_score,
        summary: data.summary,
        status: 'active',
        report_count: 1,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    const elapsed = Date.now() - start;
    console.log(
      `[Fusion] New incident created in ${elapsed}ms | id=${inserted.id} type=${data.incident_type} severity=${data.severity_score}`
    );

    return inserted.id;
  } catch (error: any) {
    const elapsed = Date.now() - start;
    console.error(`[Fusion] createIncident failed after ${elapsed}ms: ${error.message}`);
    throw new Error(`[Fusion] Failed to create incident: ${error.message}`);
  }
}

// ─── 4. Merge Into Existing Incident ─────────

/**
 * Enhanced merge: passes lat/lng, longer summary, and recalculates severity.
 */
export async function mergeReport(
  incidentId: string,
  data: ExtractedData,
  existingSeverity: number,
  existingReportCount: number,
): Promise<void> {
  const start = Date.now();

  try {
    // Recalculate severity using weighted average
    const newSeverity = recalculateSeverity(existingSeverity, existingReportCount, data.severity_score);

<<<<<<< HEAD
    const { error } = await supabase.rpc('merge_into_incident', {
=======
    let { error } = await supabase.rpc('merge_into_incident_v2', {
>>>>>>> c91130b (naveeth changes)
      p_incident_id: incidentId,
      p_new_affected_count: data.affected_count,
      p_new_severity: newSeverity,
      p_new_latitude: data.latitude,
      p_new_longitude: data.longitude,
      p_new_summary: data.summary,
    });

<<<<<<< HEAD
=======
    // Fallback: use original 3-param merge if v2 doesn't exist
    if (error && error.message.includes('merge_into_incident_v2')) {
      console.warn('[Fusion] v2 merge not found — falling back to original merge_into_incident');
      const fallback = await supabase.rpc('merge_into_incident', {
        p_incident_id: incidentId,
        p_new_affected_count: data.affected_count,
        p_new_severity: newSeverity,
      });
      error = fallback.error;
    }

>>>>>>> c91130b (naveeth changes)
    if (error) {
      throw new Error(error.message);
    }

    // Check confidence escalation (need all severities for this incident)
    const { data: reports } = await supabase
      .from('raw_reports')
      .select('extracted_data')
      .eq('incident_id', incidentId);

    if (reports && reports.length > 0) {
      const allSeverities = reports
        .map((r: any) => r.extracted_data?.severity_score)
        .filter((s: any): s is number => typeof s === 'number');
      allSeverities.push(data.severity_score);

      const escalated = applyConfidenceEscalation(newSeverity, existingReportCount + 1, allSeverities);
      if (escalated !== newSeverity) {
        console.log(`[Fusion] Confidence escalation: ${newSeverity} → ${escalated} (${allSeverities.length} reports with high severity)`);
        await supabase
          .from('incidents')
          .update({ severity_score: escalated })
          .eq('id', incidentId);
      }
    }

    const elapsed = Date.now() - start;
    console.log(`[Fusion] Merged into incident ${incidentId} in ${elapsed}ms`);
  } catch (error: any) {
    const elapsed = Date.now() - start;
    console.error(`[Fusion] mergeReport failed after ${elapsed}ms: ${error.message}`);
    throw new Error(`[Fusion] Failed to merge report into incident: ${error.message}`);
  }
}

// ─── 5. Store Raw Report ─────────────────────

export async function storeRawReport(params: StoreRawReportParams): Promise<string> {
  const start = Date.now();

  try {
<<<<<<< HEAD
    const { data, error } = await supabase
      .from('raw_reports')
      .insert({
        report_type: params.report_type,
        raw_content: params.raw_content,
        file_url: params.file_url,
        extracted_data: params.extracted_data,
        embedding: JSON.stringify(params.embedding),
        incident_id: params.incident_id,
        source_language: params.source_language,
        processing_time_ms: params.processing_time_ms,
      })
      .select('id')
      .single();

    if (error) {
      throw new Error(error.message);
=======
    const insertPayload: Record<string, any> = {
      report_type: params.report_type,
      raw_content: params.raw_content,
      file_url: params.file_url,
      extracted_data: params.extracted_data,
      embedding: JSON.stringify(params.embedding),
      incident_id: params.incident_id,
      source_language: params.source_language,
      processing_time_ms: params.processing_time_ms,
    };

    // Try with dedup_status, fall back without if column doesn't exist
    if (params.dedup_status) {
      insertPayload.dedup_status = params.dedup_status;
    }

    let { data, error } = await supabase
      .from('raw_reports')
      .insert(insertPayload)
      .select('id')
      .single();

    // Graceful fallback: if dedup_status column doesn't exist, retry without it
    if (error && error.message.includes('dedup_status')) {
      console.warn('[Fusion] dedup_status column not found — retrying without it');
      delete insertPayload.dedup_status;
      const retry = await supabase
        .from('raw_reports')
        .insert(insertPayload)
        .select('id')
        .single();
      data = retry.data;
      error = retry.error;
    }

    if (error || !data) {
      throw new Error(error?.message ?? 'No data returned');
>>>>>>> c91130b (naveeth changes)
    }

    const elapsed = Date.now() - start;
    console.log(
      `[Fusion] Raw report stored in ${elapsed}ms | type=${params.report_type} incident=${params.incident_id}`
    );

    return data.id;
  } catch (error: any) {
    const elapsed = Date.now() - start;
    console.error(`[Fusion] storeRawReport failed after ${elapsed}ms: ${error.message}`);
    throw new Error(`[Fusion] Failed to store raw report: ${error.message}`);
  }
}

// ─── 6. Store Fusion Log ─────────────────────

export async function storeFusionLog(
  reportId: string,
  matchedIncidentId: string | null,
  fusionScore: number,
  scoreBreakdown: FusionScoreBreakdown,
  decision: 'merged' | 'new_incident',
<<<<<<< HEAD
): Promise<void> {
  try {
    const { error } = await supabase.from('fusion_log').insert({
=======
  inputText?: string,
  embeddingHash?: string,
): Promise<void> {
  try {
    const fullPayload: Record<string, any> = {
>>>>>>> c91130b (naveeth changes)
      report_id: reportId,
      matched_incident_id: matchedIncidentId,
      fusion_score: fusionScore,
      score_breakdown: scoreBreakdown,
      decision,
<<<<<<< HEAD
    });
=======
      input_text: inputText || null,
      embedding_hash: embeddingHash || null,
    };

    let { error } = await supabase.from('fusion_log').insert(fullPayload);

    // Graceful fallback: if new columns don't exist, retry with minimal fields
    if (error && (error.message.includes('input_text') || error.message.includes('embedding_hash'))) {
      console.warn('[Fusion] fusion_log missing optional columns — retrying with minimal fields');
      const minPayload = {
        report_id: reportId,
        matched_incident_id: matchedIncidentId,
        fusion_score: fusionScore,
        score_breakdown: scoreBreakdown,
        decision,
      };
      const retry = await supabase.from('fusion_log').insert(minPayload);
      error = retry.error;
    }
>>>>>>> c91130b (naveeth changes)

    if (error) {
      console.error(`[Fusion] Failed to store fusion log: ${error.message}`);
      // Non-fatal — don't throw, just log
    }
  } catch (error: any) {
    console.error(`[Fusion] storeFusionLog error: ${error.message}`);
  }
}
