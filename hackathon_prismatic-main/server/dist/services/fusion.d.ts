import { ExtractedData, FusionCandidate, FusionCandidateRow } from '../types';
export declare const FUSION_WEIGHTS: {
    semantic: number;
    geospatial: number;
    temporal: number;
    categorical: number;
    entity: number;
};
export declare const FUSION_THRESHOLD: number;
export declare function cosineSimilarity(a: number[], b: number[]): number;
export declare function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number;
export declare function geoScore(lat1: number, lng1: number, lat2: number, lng2: number): number;
export declare function normalizeLocation(loc: string): string;
export declare function locationStringScore(loc1: string, loc2: string): number;
export declare function temporalScore(time1: Date, time2: Date): number;
export declare function categoryScore(type1: string, type2: string): number;
export declare function extractSignificantTokens(text: string): Set<string>;
export declare function entityScore(extracted1: ExtractedData, extracted2: ExtractedData): number;
export declare function computeFusionScore(newReport: {
    extracted: ExtractedData;
    embedding: number[];
    created_at: Date;
}, existingIncident: {
    extracted: ExtractedData;
    embedding: number[];
    created_at: Date;
    latitude: number | null;
    longitude: number | null;
}): FusionCandidate;
export declare function recalculateSeverity(existingSeverity: number, existingReportCount: number, newSeverity: number): number;
export declare function applyConfidenceEscalation(currentSeverity: number, _reportCount: number, allSeverities: number[]): number;
export declare function buildCandidateForScoring(row: FusionCandidateRow, candidateEmbedding: number[]): {
    extracted: ExtractedData;
    embedding: number[];
    created_at: Date;
    latitude: number | null;
    longitude: number | null;
};
//# sourceMappingURL=fusion.d.ts.map