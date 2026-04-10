/**
 * EIFS Fusion Compatibility Test
 * Tests: Two people report a fire at the same location → should merge into one incident.
 * 
 * Scenario 1: "Fire at MG Road, Bangalore" (Reporter 1)
 * Scenario 2: "Big fire near MG Road in Bangalore" (Reporter 2, ~30s later)
 * Expected: Report 2 merges into the incident created by Report 1.
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const API = 'http://localhost:3001';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function postTextReport(text, label) {
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`📤 ${label}: "${text}"`);
  console.log(`${'─'.repeat(60)}`);

  const form = new FormData();
  form.append('report_type', 'text');
  form.append('text_content', text);

  const start = Date.now();
  const res = await fetch(`${API}/api/ingest-report`, {
    method: 'POST',
    body: form,
  });
  const elapsed = Date.now() - start;
  const data = await res.json();

  console.log(`Status: ${res.status} (${elapsed}ms)`);
  console.log(`Success: ${data.success}`);
  console.log(`Incident ID: ${data.incident_id}`);
  console.log(`Is Merged: ${data.is_merged}`);
  console.log(`Fusion Score: ${data.fusion_score}`);
  console.log(`Dedup Status: ${data.dedup_status}`);
  
  if (data.extracted) {
    console.log(`Extracted:`);
    console.log(`  Type: ${data.extracted.incident_type}`);
    console.log(`  Location: ${data.extracted.location}`);
    console.log(`  Severity: ${data.extracted.severity_score}`);
    console.log(`  Affected: ${data.extracted.affected_count}`);
    console.log(`  Summary: ${data.extracted.summary}`);
  }

  if (data.score_breakdown) {
    console.log(`Score Breakdown:`);
    const b = data.score_breakdown;
    console.log(`  Semantic: ${b.semantic?.toFixed(3)}`);
    console.log(`  Geospatial: ${b.geospatial?.toFixed(3)}`);
    console.log(`  Temporal: ${b.temporal?.toFixed(3)}`);
    console.log(`  Categorical: ${b.categorical?.toFixed(3)}`);
    console.log(`  Entity: ${b.entity?.toFixed(3)}`);
  }

  if (data.timings) {
    console.log(`Timings: ${JSON.stringify(data.timings)}`);
  }

  return data;
}

async function getIncidents() {
  const res = await fetch(`${API}/api/incidents`);
  return res.json();
}

async function getFusionLog() {
  const res = await fetch(`${API}/api/fusion-log`);
  return res.json();
}

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  EIFS FUSION COMPATIBILITY TEST');
  console.log('  Testing: Two reports at same location → should merge');
  console.log('═══════════════════════════════════════════════════════\n');

  // Resolve ALL active incidents from previous test runs to ensure determinism
  const { data: resolved, error: resolveErr } = await supabase
    .from('incidents')
    .update({ status: 'resolved' })
    .eq('status', 'active')
    .select('id');
  if (resolveErr) {
    console.error('[Test] Resolve error:', resolveErr.message);
  } else {
    console.log(`[Test] Resolved ${resolved?.length ?? 0} active incidents from previous runs.`);
  }

  // Report 1: First person reports a fire
  const report1 = await postTextReport(
    'There is a massive fire at MG Road, Bangalore near the metro station. Many people are running. At least 10 people seem affected. The fire is spreading fast and black smoke everywhere.',
    'REPORT 1 (First reporter)'
  );

  if (!report1.success) {
    console.error('\n❌ Report 1 failed! Cannot continue test.');
    return;
  }

  // Wait 3 seconds to simulate real-world delay
  console.log('\n⏳ Waiting 3 seconds (simulating second reporter arriving)...\n');
  await new Promise(r => setTimeout(r, 3000));

  // Report 2: Second person reports the same fire
  const report2 = await postTextReport(
    'Big fire near MG Road in Bangalore, close to the metro. I can see flames and thick smoke. People are panicking. Around 15 people seem hurt or affected.',
    'REPORT 2 (Second reporter — SAME INCIDENT)'
  );

  if (!report2.success) {
    console.error('\n❌ Report 2 failed! Cannot continue test.');
    return;
  }

  // Analyze results
  console.log('\n' + '═'.repeat(60));
  console.log('  TEST RESULTS');
  console.log('═'.repeat(60));

  const sameIncident = report1.incident_id === report2.incident_id;
  const merged = report2.is_merged === true;

  console.log(`\n  Report 1 Incident: ${report1.incident_id}`);
  console.log(`  Report 2 Incident: ${report2.incident_id}`);
  console.log(`  Same Incident ID:  ${sameIncident ? '✅ YES' : '❌ NO'}`);
  console.log(`  Report 2 Merged:   ${merged ? '✅ YES' : '❌ NO'}`);
  console.log(`  Fusion Score:      ${report2.fusion_score?.toFixed(3) || 'N/A'}`);

  if (sameIncident && merged) {
    console.log('\n  🎉 FUSION TEST PASSED: Reports correctly merged into one incident!');
  } else if (report2.fusion_score && report2.fusion_score > 0.5) {
    console.log(`\n  ⚠ PARTIAL: High fusion score (${report2.fusion_score.toFixed(3)}) but threshold not met.`);
    console.log('  The reports were similar but not merged — threshold may need tuning.');
  } else {
    console.log('\n  ❌ FUSION TEST FAILED: Reports were NOT merged.');
    console.log('  This could mean the embedding/extraction pipeline needs debugging.');
  }

  // Check incidents list
  console.log('\n' + '─'.repeat(60));
  console.log('  CURRENT INCIDENTS');
  console.log('─'.repeat(60));
  const incidents = await getIncidents();
  for (const inc of incidents) {
    console.log(`  [${inc.id.slice(0, 8)}] ${inc.incident_type} | ${inc.location} | severity=${inc.severity_score} reports=${inc.report_count} affected=${inc.affected_count}`);
  }

  // Check fusion log
  console.log('\n' + '─'.repeat(60));
  console.log('  FUSION LOG (last 5)');
  console.log('─'.repeat(60));
  const flog = await getFusionLog();
  for (const entry of flog.slice(0, 5)) {
    console.log(`  [${entry.id?.slice(0, 8)}] decision=${entry.decision} score=${entry.fusion_score?.toFixed(3)} matched=${entry.matched_incident_id?.slice(0, 8) || 'none'}`);
  }

  // Test 3: Different incident — should NOT merge
  console.log('\n\n' + '═'.repeat(60));
  console.log('  TEST 2: DIFFERENT INCIDENT (should create NEW)');
  console.log('═'.repeat(60));

  const report3 = await postTextReport(
    'Major flood in Chennai near Anna Nagar. Water level is rising rapidly. 5 families stuck on rooftops. Need immediate rescue boats.',
    'REPORT 3 (Different city, different type — should NOT merge)'
  );

  if (report3.success) {
    const differentIncident = report3.incident_id !== report1.incident_id;
    const notMerged = report3.is_merged === false;
    console.log(`\n  Report 3 Incident: ${report3.incident_id}`);
    console.log(`  Different from fire: ${differentIncident ? '✅ YES' : '❌ NO'}`);
    console.log(`  Not Merged:          ${notMerged ? '✅ CORRECT' : '❌ WRONG'}`);

    if (differentIncident && notMerged) {
      console.log('\n  🎉 NEGATIVE TEST PASSED: Different incident correctly separated!');
    } else {
      console.log('\n  ❌ NEGATIVE TEST FAILED: Different incident was incorrectly merged!');
    }
  }

  // Final health check
  console.log('\n' + '─'.repeat(60));
  console.log('  HEALTH CHECK AFTER TESTS');
  console.log('─'.repeat(60));
  const health = await fetch(`${API}/health`).then(r => r.json());
  console.log(`  Status: ${health.status}`);
  console.log(`  Critical Events: ${health.recent_critical_count}`);
  console.log(`  Uptime: ${Math.floor(health.uptime)}s`);

  console.log('\n' + '═'.repeat(60));
  console.log('  ALL TESTS COMPLETE');
  console.log('═'.repeat(60) + '\n');
}

run().catch(e => console.error('TEST FATAL:', e));
