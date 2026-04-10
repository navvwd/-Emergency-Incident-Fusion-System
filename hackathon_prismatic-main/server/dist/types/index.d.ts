export type ReportType = 'voice' | 'text' | 'image';
export type IncidentType = 'road_accident' | 'fire' | 'flood' | 'building_collapse' | 'medical' | 'violence' | 'infrastructure' | 'other';
export type IncidentStatus = 'active' | 'resolved' | 'monitoring';
export interface Incident {
    id: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    incident_type: IncidentType;
    affected_count: number;
    severity_score: number;
    status: IncidentStatus;
    report_count: number;
    summary: string;
    alert_audio_url: string | null;
    created_at: string;
    updated_at: string;
}
export interface RawReport {
    id: string;
    report_type: ReportType;
    raw_content: string | null;
    file_url: string | null;
    extracted_data: ExtractedData | null;
    embedding: number[] | null;
    incident_id: string | null;
    source_language: string;
    processing_time_ms: number | null;
    created_at: string;
}
export interface ExtractedData {
    location: string;
    latitude: number | null;
    longitude: number | null;
    incident_type: IncidentType;
    affected_count: number;
    severity_score: number;
    summary: string;
}
/** Saaras v3 Speech-to-Text response (unified /speech-to-text endpoint) */
export interface SarvamSTTResponse {
    transcript: string;
    language_code: string;
    /** Called language_probability in some response variants */
    language_confidence: number | null;
    /** English translation (populated only for non-English transcripts) */
    translatedText?: string;
}
/** Language Identification response */
export interface SarvamLIDResponse {
    language_code: string;
    script_code: string;
}
/** Mayura Translation response */
export interface SarvamTranslateResponse {
    translated_text: string;
}
/** Sarvam Chat Completion response (sarvam-30b, sarvam-105b) */
export interface SarvamChatResponse {
    choices: Array<{
        finish_reason: string;
        message: {
            content: string | null;
            reasoning_content?: string | null;
            role: string;
        };
    }>;
    usage?: {
        completion_tokens: number;
        prompt_tokens: number;
        total_tokens: number;
    };
}
/** Sarvam Vision / Document Intelligence response */
export interface SarvamVisionResponse {
    extracted_text: string;
    tables: unknown[];
    visual_elements: unknown[];
}
/** Bulbul v3 Text-to-Speech response — returns raw audio buffer */
export interface IngestReportResponse {
    success: boolean;
    incident_id: string;
    is_merged: boolean;
    extracted: ExtractedData;
    source_language: string;
    processing_time_ms: number;
}
export interface DedupMatch {
    incident_id: string;
    similarity: number;
}
export type DedupStatus = 'completed' | 'skipped_error' | 'skipped_timeout' | 'skipped_no_embedding';
export interface StoreRawReportParams {
    report_type: ReportType;
    raw_content: string | null;
    file_url: string | null;
    extracted_data: ExtractedData;
    embedding: number[];
    incident_id: string;
    source_language: string;
    processing_time_ms: number;
    dedup_status?: DedupStatus;
}
export interface FusionScoreBreakdown {
    semantic: number;
    geospatial: number;
    temporal: number;
    categorical: number;
    entity: number;
}
export interface FusionCandidate {
    incident_id: string;
    score: number;
    breakdown: FusionScoreBreakdown;
}
export interface FusionCandidateRow {
    incident_id: string;
    semantic_similarity: number;
    location: string;
    latitude: number | null;
    longitude: number | null;
    incident_type: string;
    affected_count: number;
    severity_score: number;
    summary: string;
    report_count: number;
    created_at: string;
    updated_at: string;
}
export interface FusionLog {
    id: string;
    report_id: string;
    matched_incident_id: string | null;
    fusion_score: number;
    score_breakdown: FusionScoreBreakdown;
    decision: 'merged' | 'new_incident';
    input_text?: string;
    embedding_hash?: string;
    manual_label?: 'correct' | 'incorrect' | null;
    created_at: string;
}
export interface PipelineTimings {
    stt_ms?: number;
    translation_ms?: number;
    extraction_ms?: number;
    embedding_ms?: number;
    fusion_ms?: number;
    total_ms: number;
}
export interface IngestReportResponseWithFusion extends IngestReportResponse {
    fusion_score: number | null;
    score_breakdown: FusionScoreBreakdown | null;
    timings?: PipelineTimings;
    dedup_status?: DedupStatus;
}
export interface AgentSession {
    sessionId: string;
    userId?: string;
    languageCode: string;
    stage: 'greeting' | 'assessing' | 'gathering' | 'advice' | 'closing';
    context: {
        emergencyType?: string;
        location?: string;
        severity?: 'low' | 'medium' | 'high' | 'critical';
        injuries?: string;
        peopleAffected?: number;
    };
    history: Array<{
        role: 'user' | 'agent';
        content: string;
        timestamp: string;
    }>;
    createdAt: string;
    lastActivity: string;
}
export interface AgentAction {
    type: 'first_aid' | 'precaution' | 'emergency_number' | 'calming_exercise';
    title: string;
    content: string;
}
export interface AgentResponse {
    text: string;
    transcript?: string;
    actions?: AgentAction[];
    sessionId: string;
    stage: string;
}
export interface AgentChatRequest {
    sessionId: string;
    message: string;
}
export interface AgentVoiceRequest {
    sessionId?: string;
    audio: Blob;
}
//# sourceMappingURL=index.d.ts.map