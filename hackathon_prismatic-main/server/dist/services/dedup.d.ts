<<<<<<< HEAD
import { ExtractedData, DedupMatch, StoreRawReportParams } from '../types';
/**
 * Searches existing reports for a cosine-similarity match above threshold.
 * Uses the `match_reports` RPC function (pgvector).
 * Returns the best match or null if no duplicates found.
 */
export declare function findMatch(embedding: number[]): Promise<DedupMatch | null>;
/**
 * Inserts a new incident into the incidents table.
 * Returns the UUID of the newly created incident.
 */
export declare function createIncident(data: ExtractedData): Promise<string>;
/**
 * Calls the `merge_into_incident` RPC function to bump report_count,
 * take the max of affected_count and severity_score, and touch updated_at.
 */
export declare function mergeReport(incidentId: string, data: ExtractedData): Promise<void>;
/**
 * Inserts the raw report record with its embedding vector,
 * extracted data, and link to the parent incident.
 */
export declare function storeRawReport(params: StoreRawReportParams): Promise<void>;
=======
import { ExtractedData, FusionCandidate, FusionCandidateRow, FusionScoreBreakdown, StoreRawReportParams } from '../types';
/**
 * Wide-net candidate retrieval using pgvector.
 * Lower threshold (0.60) + 4-hour window + top 5 candidates.
 * The real decision is made by multi-metric scoring in findBestMatch.
 */
export declare function findFusionCandidates(embedding: number[]): Promise<FusionCandidateRow[]>;
/**
 * Scores each candidate across 5 dimensions and returns
 * the best match above FUSION_THRESHOLD, or null.
 */
export declare function findBestMatch(newReport: {
    extracted: ExtractedData;
    embedding: number[];
    created_at: Date;
}, candidates: FusionCandidateRow[]): Promise<FusionCandidate | null>;
export declare function createIncident(data: ExtractedData): Promise<string>;
/**
 * Enhanced merge: passes lat/lng, longer summary, and recalculates severity.
 */
export declare function mergeReport(incidentId: string, data: ExtractedData, existingSeverity: number, existingReportCount: number): Promise<void>;
export declare function storeRawReport(params: StoreRawReportParams): Promise<string>;
export declare function storeFusionLog(reportId: string, matchedIncidentId: string | null, fusionScore: number, scoreBreakdown: FusionScoreBreakdown, decision: 'merged' | 'new_incident', inputText?: string, embeddingHash?: string): Promise<void>;
>>>>>>> c91130b (naveeth changes)
//# sourceMappingURL=dedup.d.ts.map