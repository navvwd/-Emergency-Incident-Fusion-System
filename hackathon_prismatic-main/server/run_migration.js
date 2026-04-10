const { Client } = require('pg');

const client = new Client({
  host: 'db.bnnplgvwayiuwjextxxe.supabase.co',
  port: 5432,
  database: 'postgres',
  user: 'postgres',
  password: 'peacefulcolden5@ysosirius.com',
  ssl: { rejectUnauthorized: false },
});

async function main() {
  try {
    console.log('Connecting to ORIGINAL Supabase PostgreSQL...');
    await client.connect();
    console.log('Connected!\n');

    // 1: find_fusion_candidates_v1
    console.log('[1/6] Creating find_fusion_candidates_v1...');
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION find_fusion_candidates_v1(
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
            i.location, i.latitude, i.longitude, i.incident_type,
            i.affected_count, i.severity_score, i.summary, i.report_count,
            i.created_at, i.updated_at
          FROM raw_reports r
          JOIN incidents i ON r.incident_id = i.id
          WHERE r.incident_id IS NOT NULL
            AND i.status = 'active'
            AND i.created_at >= NOW() - INTERVAL '1 hour' * time_window_hours
            AND 1 - (r.embedding <=> query_embedding) > semantic_threshold
          ORDER BY i.id, (1 - (r.embedding <=> query_embedding)) DESC
          LIMIT max_candidates;
        $$;
      `);
      console.log('  ✅ find_fusion_candidates_v1 created\n');
    } catch (e) {
      console.log('  ❌ ' + e.message + '\n');
    }

    // 2: merge_into_incident_v2
    console.log('[2/6] Creating merge_into_incident_v2...');
    try {
      await client.query(`
        CREATE OR REPLACE FUNCTION merge_into_incident_v2(
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
              WHEN p_new_summary IS NOT NULL
                   AND LENGTH(p_new_summary) > LENGTH(summary)
              THEN p_new_summary ELSE summary
            END,
            updated_at = NOW()
          WHERE id = p_incident_id;
        END;
        $$;
      `);
      console.log('  ✅ merge_into_incident_v2 created\n');
    } catch (e) {
      console.log('  ❌ ' + e.message + '\n');
    }

    // 3: fusion_log table
    console.log('[3/6] Creating/updating fusion_log table...');
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS fusion_log (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          report_id UUID REFERENCES raw_reports(id),
          matched_incident_id UUID REFERENCES incidents(id),
          fusion_score FLOAT NOT NULL,
          score_breakdown JSONB NOT NULL,
          decision TEXT NOT NULL CHECK (decision IN ('merged', 'new_incident')),
          input_text TEXT,
          embedding_hash TEXT,
          manual_label TEXT DEFAULT NULL,
          created_at TIMESTAMPTZ DEFAULT now()
        );
      `);
      // Add columns if they don't exist (table might have been created without them)
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fusion_log' AND column_name='input_text') THEN
            ALTER TABLE fusion_log ADD COLUMN input_text TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fusion_log' AND column_name='embedding_hash') THEN
            ALTER TABLE fusion_log ADD COLUMN embedding_hash TEXT;
          END IF;
          IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='fusion_log' AND column_name='manual_label') THEN
            ALTER TABLE fusion_log ADD COLUMN manual_label TEXT DEFAULT NULL;
          END IF;
        END $$;
      `);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_fusion_log_incident ON fusion_log(matched_incident_id);`);
      await client.query(`CREATE INDEX IF NOT EXISTS idx_fusion_log_report ON fusion_log(report_id);`);
      console.log('  ✅ fusion_log table + columns + indexes OK\n');
    } catch (e) {
      console.log('  ❌ ' + e.message + '\n');
    }

    // 4: dedup_status column
    console.log('[4/6] Adding dedup_status column to raw_reports...');
    try {
      await client.query(`
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_name = 'raw_reports' AND column_name = 'dedup_status'
          ) THEN
            ALTER TABLE raw_reports
              ADD COLUMN dedup_status TEXT
              DEFAULT 'completed'
              CHECK (dedup_status IN ('completed', 'skipped_error', 'skipped_timeout', 'skipped_no_embedding'));
          END IF;
        END $$;
      `);
      console.log('  ✅ dedup_status column added\n');
    } catch (e) {
      console.log('  ❌ ' + e.message + '\n');
    }

    // 5: Enable realtime on fusion_log
    console.log('[5/6] Enabling realtime on fusion_log...');
    try {
      await client.query(`ALTER PUBLICATION supabase_realtime ADD TABLE fusion_log;`);
      console.log('  ✅ Realtime enabled\n');
    } catch (e) {
      if (e.message.includes('already')) {
        console.log('  ✅ Already enabled\n');
      } else {
        console.log('  ⚠ ' + e.message + ' (non-fatal)\n');
      }
    }

    // 6: Reload PostgREST schema cache
    console.log('[6/6] Reloading PostgREST schema cache...');
    try {
      await client.query(`NOTIFY pgrst, 'reload schema';`);
      console.log('  ✅ Schema cache reload signal sent\n');
    } catch (e) {
      console.log('  ⚠ ' + e.message + ' (non-fatal)\n');
    }

    // Verify
    console.log('=== Post-migration verification ===\n');
    const { rows: fns } = await client.query(`
      SELECT routine_name FROM information_schema.routines
      WHERE routine_schema = 'public'
        AND routine_name IN ('find_fusion_candidates_v1', 'merge_into_incident_v2', 'merge_into_incident', 'match_reports')
      ORDER BY routine_name;
    `);
    console.log('Functions:', fns.map(r => r.routine_name).join(', '));

    const { rows: tbls } = await client.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name IN ('incidents', 'raw_reports', 'fusion_log')
      ORDER BY table_name;
    `);
    console.log('Tables:', tbls.map(r => r.table_name).join(', '));

    const { rows: cols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'raw_reports' AND column_name = 'dedup_status';
    `);
    console.log('dedup_status:', cols.length > 0 ? 'EXISTS ✅' : 'MISSING ❌');

    const { rows: flcols } = await client.query(`
      SELECT column_name FROM information_schema.columns
      WHERE table_name = 'fusion_log' AND column_name IN ('input_text', 'embedding_hash', 'manual_label')
      ORDER BY column_name;
    `);
    console.log('fusion_log columns:', flcols.map(r => r.column_name).join(', '));

    console.log('\n✅ ORIGINAL DB migration complete!');
  } catch (e) {
    console.error('FATAL:', e.message);
  } finally {
    await client.end();
  }
}

main();
