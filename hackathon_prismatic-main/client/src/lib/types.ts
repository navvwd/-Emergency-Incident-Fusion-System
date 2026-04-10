// ──────────────────────────────────────────────
// EIFS — Frontend Shared Types
// Based on PROJECT.md Sections 6 and 7
// ──────────────────────────────────────────────

export type ReportType = 'voice' | 'text' | 'image';

export type IncidentType =
  | 'road_accident'
  | 'fire'
  | 'flood'
  | 'building_collapse'
  | 'medical'
  | 'violence'
  | 'infrastructure'
  | 'other';

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

export interface IngestReportResponse {
  success: boolean;
  incident_id: string;
  is_merged: boolean;
  extracted: ExtractedData;
  source_language: string;
  processing_time_ms: number;
}

// ─── Agent Types ─────────────────────────────

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

export interface AgentSession {
  sessionId: string;
  stage: string;
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
  languageCode: string;
}
