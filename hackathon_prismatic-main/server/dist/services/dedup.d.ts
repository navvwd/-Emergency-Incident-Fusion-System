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
//# sourceMappingURL=dedup.d.ts.map