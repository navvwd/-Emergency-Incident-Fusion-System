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
