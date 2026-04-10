// ──────────────────────────────────────────────
// EIFS — Report Ingestion Route (The Brain)
// POST /api/ingest-report
// Full pipeline: parse → AI extract → embed → dedup → store
// Ref: PROJECT.md Sections 4 and 7
// ──────────────────────────────────────────────

import { Router, Request, Response } from 'express';
import multer from 'multer';
<<<<<<< HEAD
import * as sarvam from '../services/sarvam';
import * as embeddings from '../services/embeddings';
import * as dedup from '../services/dedup';
import { ReportType, ExtractedData, IngestReportResponseWithFusion, FusionScoreBreakdown } from '../types';
=======
import exifr from 'exifr';
import * as sarvam from '../services/sarvam';
import * as moonshot from '../services/moonshot';
import * as embeddings from '../services/embeddings';
import * as dedup from '../services/dedup';
import { withRetry, isCircuitOpen } from '../services/resilience';
import { logCritical } from '../services/logger';
import { ReportType, ExtractedData, IngestReportResponseWithFusion, FusionScoreBreakdown, DedupStatus, PipelineTimings } from '../types';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY!,
);
>>>>>>> c91130b (naveeth changes)

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

<<<<<<< HEAD
=======
// ── Pipeline Constants ──────────────────────────
const PIPELINE_TIMEOUT_MS = 30000;   // 30s global (Sarvam APIs are slow)
const OPTIONAL_CUTOFF_MS = 20000;    // 20s — skip fusion/TTS after this

// ── Pipeline Timeout Error ──────────────────────
class PipelineTimeoutError extends Error {
  constructor(public stage: string, public elapsed: number) {
    super(`Pipeline timeout at ${stage} after ${elapsed}ms`);
  }
}

// ── Fusion Health Tracker (auto-disable on spike) ──
const fusionHealth = {
  recentErrors: 0,
  lastReset: Date.now(),
  disabled: false,
};

const FUSION_ERROR_THRESHOLD = 3;
const FUSION_RESET_WINDOW = 5 * 60_000;    // 5 minutes
const FUSION_DISABLE_DURATION = 2 * 60_000; // 2 minutes

function isFusionHealthy(): boolean {
  if (Date.now() - fusionHealth.lastReset > FUSION_RESET_WINDOW) {
    fusionHealth.recentErrors = 0;
    fusionHealth.lastReset = Date.now();
  }
  if (fusionHealth.disabled && Date.now() - fusionHealth.lastReset > FUSION_DISABLE_DURATION) {
    fusionHealth.disabled = false;
    fusionHealth.recentErrors = 0;
    console.log('[Pipeline] Fusion re-enabled after cooldown');
  }
  return !fusionHealth.disabled;
}

function recordFusionError(): void {
  fusionHealth.recentErrors++;
  if (fusionHealth.recentErrors >= FUSION_ERROR_THRESHOLD) {
    fusionHealth.disabled = true;
    fusionHealth.lastReset = Date.now();
    logCritical('FUSION_DISABLED', {
      reason: `${FUSION_ERROR_THRESHOLD} failures in ${FUSION_RESET_WINDOW / 1000}s`,
      disabled_for_ms: FUSION_DISABLE_DURATION,
    });
  }
}

function shouldRunStage(stage: 'required' | 'optional', pipelineStart: number): boolean {
  const elapsed = Date.now() - pipelineStart;
  if (elapsed > PIPELINE_TIMEOUT_MS) throw new PipelineTimeoutError('global', elapsed);
  if (stage === 'optional' && elapsed > OPTIONAL_CUTOFF_MS) {
    console.warn(`[Pipeline] Skipping optional stage — ${elapsed}ms elapsed (cutoff: ${OPTIONAL_CUTOFF_MS}ms)`);
    return false;
  }
  return true;
}

>>>>>>> c91130b (naveeth changes)
router.post(
  '/ingest-report',
  upload.single('file'),
  async (req: Request, res: Response): Promise<void> => {
    const pipelineStart = Date.now();

<<<<<<< HEAD
=======
    // ── Pipeline timing + state tracking ──
    const timings: PipelineTimings = { total_ms: 0 };
    let stageStart = Date.now();
    let dedupStatus: DedupStatus = 'completed';

    function checkDeadline(stage: string): void {
      const elapsed = Date.now() - pipelineStart;
      if (elapsed > PIPELINE_TIMEOUT_MS) {
        throw new PipelineTimeoutError(stage, elapsed);
      }
    }

>>>>>>> c91130b (naveeth changes)
    try {
      // ── 1. Extract inputs ──────────────────────
      const report_type = req.body.report_type as ReportType;
      const text_content = req.body.text_content as string | undefined;
      const file = req.file;

      // Validate report_type
      if (!report_type || !['voice', 'text', 'image'].includes(report_type)) {
        res.status(400).json({
          success: false,
          error: 'Invalid or missing report_type. Must be "voice", "text", or "image".',
        });
        return;
      }

      // Validate required fields per type
      if (report_type === 'text' && !text_content) {
        res.status(400).json({
          success: false,
          error: 'text_content is required for text reports.',
        });
        return;
      }

      if ((report_type === 'voice' || report_type === 'image') && !file) {
        res.status(400).json({
          success: false,
          error: `file is required for ${report_type} reports.`,
        });
        return;
      }

      console.log(`\n${'═'.repeat(60)}`);
      console.log(`[Pipeline] Ingesting ${report_type} report...`);
      console.log(`${'═'.repeat(60)}`);

<<<<<<< HEAD
=======
      stageStart = Date.now();
>>>>>>> c91130b (naveeth changes)
      let processedText: string;
      let sourceLanguage: string;
      let rawContent: string | null = text_content || null;
      let extractedOverride: ExtractedData | null = null;

      // ── 2. Branch by report_type ───────────────

      switch (report_type) {
        // ── VOICE ────────────────────────────────
        case 'voice': {
<<<<<<< HEAD
          console.log('[Pipeline] → Voice path: STT (translate mode)');
          const sttResult = await sarvam.speechToText(file!.buffer, file!.originalname);
          processedText = sttResult.transcript;
          sourceLanguage = sttResult.language_code;
=======
          console.log('[Pipeline] → Voice path: Unified STT v3');
          const sttResult = await sarvam.speechToText(file!.buffer, file!.originalname);
          timings.stt_ms = Date.now() - stageStart;
          sourceLanguage = sttResult.language_code;
          // Use translated text for English processing, fall back to original
          processedText = sttResult.translatedText || sttResult.transcript;
>>>>>>> c91130b (naveeth changes)
          rawContent = sttResult.transcript;
          break;
        }

        // ── TEXT ─────────────────────────────────
        case 'text': {
          console.log('[Pipeline] → Text path: LID + translate if needed');
          
          if (text_content?.startsWith('[AUTO-DISPATCH]')) {
            console.log('[Pipeline]   Auto-dispatch fast path: skipping LID/translation/extraction');
            processedText = text_content;
            sourceLanguage = 'en-IN';
            extractedOverride = buildAutoDispatchExtractedData(text_content);
            break;
          }

          if (req.body.language) {
            console.log(`[Pipeline]   Language ${req.body.language} provided in payload, skipping LID`);
            sourceLanguage = req.body.language;
          } else {
            const lidResult = await sarvam.detectLanguage(text_content!);
            sourceLanguage = lidResult.language_code;
          }

          if (sourceLanguage !== 'en-IN' && sourceLanguage !== 'en') {
            console.log(`[Pipeline]   Language ${sourceLanguage} detected, translating to en-IN`);
            processedText = await sarvam.translate(text_content!, sourceLanguage, 'en-IN');
          } else {
            console.log('[Pipeline]   Already English, skipping translation');
            processedText = text_content!;
          }
          break;
        }

        // ── IMAGE ────────────────────────────────
        case 'image': {
<<<<<<< HEAD
          console.log('[Pipeline] → Image path: Sarvam Vision');
          const visionText = await sarvam.extractImage(file!.buffer, file!.originalname);

          processedText = `Scene description and text from image: ${visionText}`;
          sourceLanguage = 'en-IN';
          rawContent = processedText;
=======
          console.log('[Pipeline] → Image path: EXIF extraction + Dual Vision (Sarvam + Moonshot)');

          // ── Extract EXIF metadata (GPS, camera info, date) ──
          let exifData: {
            latitude?: number;
            longitude?: number;
            dateTime?: string;
            make?: string;
            model?: string;
            locationDescription?: string;
          } = {};

          try {
            const parsed = await exifr.parse(file!.buffer, {
              gps: true,
              tiff: true,
              exif: true,
              iptc: true,
            });

            if (parsed) {
              if (parsed.latitude && parsed.longitude) {
                exifData.latitude = parsed.latitude;
                exifData.longitude = parsed.longitude;
                console.log(`[EXIF] GPS found: lat=${parsed.latitude} lng=${parsed.longitude}`);
              }
              if (parsed.DateTimeOriginal || parsed.CreateDate) {
                exifData.dateTime = (parsed.DateTimeOriginal || parsed.CreateDate)?.toISOString?.()
                  || String(parsed.DateTimeOriginal || parsed.CreateDate);
                console.log(`[EXIF] Date: ${exifData.dateTime}`);
              }
              if (parsed.Make) exifData.make = parsed.Make;
              if (parsed.Model) exifData.model = parsed.Model;
              // IPTC location fields
              if (parsed.City || parsed.State || parsed.Country) {
                exifData.locationDescription = [parsed.City, parsed.State, parsed.Country]
                  .filter(Boolean).join(', ');
                console.log(`[EXIF] Location metadata: ${exifData.locationDescription}`);
              }
            } else {
              console.log('[EXIF] No metadata found in image');
            }
          } catch (exifErr: any) {
            console.warn(`[EXIF] Extraction failed (non-fatal): ${exifErr.message}`);
          }

          // ── Build EXIF context string for vision prompts ──
          const exifContext: string[] = [];
          if (exifData.latitude && exifData.longitude) {
            exifContext.push(`GPS coordinates: ${exifData.latitude.toFixed(6)}, ${exifData.longitude.toFixed(6)}`);
          }
          if (exifData.locationDescription) {
            exifContext.push(`Location from metadata: ${exifData.locationDescription}`);
          }
          if (exifData.dateTime) {
            exifContext.push(`Photo taken: ${exifData.dateTime}`);
          }
          const exifContextStr = exifContext.length > 0
            ? `\n\nImage metadata: ${exifContext.join('. ')}`
            : '';

          const results = await Promise.allSettled([
            withRetry(() => sarvam.extractImage(file!.buffer, file!.originalname), 'sarvam-vision', 1),
            isCircuitOpen('moonshot-vision')
              ? Promise.reject(new Error('Circuit open'))
              : withRetry(() => moonshot.describeScene(file!.buffer), 'moonshot-vision', 1),
          ]);

          timings.stt_ms = Date.now() - stageStart; // reuse stt_ms for image processing time

          const sarvamText = results[0].status === 'fulfilled' ? results[0].value : '';
          const moonshotText = results[1].status === 'fulfilled' ? results[1].value : '';

          if (results[0].status === 'rejected')
            console.warn(`[Pipeline] Sarvam Vision: ${results[0].reason.message}`);
          if (results[1].status === 'rejected')
            console.warn(`[Pipeline] Moonshot Vision: ${results[1].reason.message}`);

          const descriptions: string[] = [];
          if (sarvamText) descriptions.push(`Text/OCR: ${sarvamText}`);
          if (moonshotText) descriptions.push(`Scene: ${moonshotText}`);
          if (exifContextStr) descriptions.push(`Metadata: ${exifContext.join('. ')}`);

          if (descriptions.length === 0) {
            logCritical('VISION_BOTH_FAILED', {
              sarvam_error: results[0].status === 'rejected' ? results[0].reason.message : 'empty',
              moonshot_error: results[1].status === 'rejected' ? results[1].reason.message : 'empty',
            });
            res.status(422).json({
              success: false,
              error: 'Image analysis failed. Please try a clearer image or describe the situation in text.',
            });
            return;
          }

          processedText = descriptions.join('. ');
          sourceLanguage = 'en-IN';
          rawContent = processedText;

          // ── Use EXIF GPS as fallback if no device GPS provided ──
          if (exifData.latitude && exifData.longitude) {
            const deviceLat = parseFloat(req.body.latitude);
            const deviceLng = parseFloat(req.body.longitude);
            if (!Number.isFinite(deviceLat) || !Number.isFinite(deviceLng)) {
              // No device GPS — inject EXIF GPS into body so step 3b picks it up
              req.body.latitude = String(exifData.latitude);
              req.body.longitude = String(exifData.longitude);
              console.log(`[EXIF] Using image GPS as fallback (no device GPS provided)`);
            }
          }

>>>>>>> c91130b (naveeth changes)
          break;
        }

        default:
          res.status(400).json({ success: false, error: 'Unknown report_type' });
          return;
      }

      console.log(`[Pipeline] Processed text (${processedText.length} chars): "${processedText.substring(0, 120)}..."`);

      // ── 3. Entity extraction via Sarvam-30B ────
<<<<<<< HEAD
=======
      stageStart = Date.now();
      checkDeadline('extraction');
>>>>>>> c91130b (naveeth changes)
      const extracted: ExtractedData = extractedOverride
        ? extractedOverride
        : await (async () => {
            console.log('[Pipeline] → Extracting entities via Sarvam-30B...');
            return sarvam.chatCompletion(processedText, report_type);
          })();
<<<<<<< HEAD

      // ── 4. Generate embedding for dedup ────────
      console.log('[Pipeline] → Generating embedding...');
      const embedding = await embeddings.generateEmbedding(extracted.summary);

      // ── 5. Multi-Metric Fusion Deduplication ───
      console.log('[Pipeline] → Searching for fusion candidates...');
      const candidates = await dedup.findFusionCandidates(embedding);

      let incidentId: string;
      let isMerged: boolean;
      let fusionScore: number | null = null;
      let scoreBreakdown: FusionScoreBreakdown | null = null;

      const newReportData = {
        extracted,
        embedding,
        created_at: new Date(),
      };

      const bestMatch = await dedup.findBestMatch(newReportData, candidates);

      if (bestMatch) {
        // Find the matching candidate row for severity/report_count
        const matchedCandidate = candidates.find((c) => c.incident_id === bestMatch.incident_id)!;
        console.log(
          `[Pipeline] ✓ MERGED into incident ${bestMatch.incident_id} (CFS=${bestMatch.score.toFixed(3)})`
        );
        await dedup.mergeReport(
          bestMatch.incident_id,
          extracted,
          matchedCandidate.severity_score,
          matchedCandidate.report_count,
        );
        incidentId = bestMatch.incident_id;
        isMerged = true;
        fusionScore = bestMatch.score;
        scoreBreakdown = bestMatch.breakdown;
      } else {
        console.log('[Pipeline] ✓ NEW incident created');
        incidentId = await dedup.createIncident(extracted);
        isMerged = false;
      }

      // ── 6. Store raw report ────────────────────
      const processingTime = Date.now() - pipelineStart;
=======
      timings.extraction_ms = Date.now() - stageStart;

      // ── 3b. Override with device GPS if provided ──
      const gpsLat = parseFloat(req.body.latitude);
      const gpsLng = parseFloat(req.body.longitude);
      if (Number.isFinite(gpsLat) && Number.isFinite(gpsLng)) {
        extracted.latitude = gpsLat;
        extracted.longitude = gpsLng;
        console.log(`[GPS] Using device coordinates: lat=${extracted.latitude} lng=${extracted.longitude}`);
      }

      // ── 4. Generate embedding for dedup ────────
      stageStart = Date.now();
      checkDeadline('embedding');
      console.log('[Pipeline] → Generating embedding...');
      let embedding: number[];
      try {
        embedding = await withRetry(
          () => embeddings.generateEmbedding(extracted.summary),
          'openai-embeddings', 1
        );
      } catch (embErr: any) {
        logCritical('EMBEDDING_FAILED', { error: embErr.message });
        dedupStatus = 'skipped_no_embedding';
        const incidentId = await dedup.createIncident(extracted);
        const processingTime = Date.now() - pipelineStart;
        timings.embedding_ms = Date.now() - stageStart;
        timings.total_ms = processingTime;

        const reportId = await dedup.storeRawReport({
          report_type, raw_content: rawContent, file_url: null,
          extracted_data: extracted, embedding: [], incident_id: incidentId,
          source_language: sourceLanguage, processing_time_ms: processingTime,
          dedup_status: dedupStatus,
        });

        console.warn(`[Pipeline] ⚠ Embedding failed — created incident without dedup: ${incidentId}`);
        res.status(200).json({
          success: true, incident_id: incidentId, is_merged: false,
          extracted, source_language: sourceLanguage, processing_time_ms: processingTime,
          fusion_score: null, score_breakdown: null, timings, dedup_status: dedupStatus,
        });
        return;
      }
      timings.embedding_ms = Date.now() - stageStart;

      // ── 5. Multi-Metric Fusion Deduplication ───
      stageStart = Date.now();
      let incidentId: string;
      let isMerged = false;
      let fusionScore: number | null = null;
      let scoreBreakdown: FusionScoreBreakdown | null = null;

      if (shouldRunStage('optional', pipelineStart) && isFusionHealthy()) {
        try {
          checkDeadline('fusion');
          console.log('[Pipeline] → Searching for fusion candidates...');
          const candidates = await dedup.findFusionCandidates(embedding);

          const bestMatch = await dedup.findBestMatch(
            { extracted, embedding, created_at: new Date() },
            candidates,
          );

          if (bestMatch) {
            const matchedCandidate = candidates.find(c => c.incident_id === bestMatch.incident_id)!;
            await dedup.mergeReport(bestMatch.incident_id, extracted, matchedCandidate.severity_score, matchedCandidate.report_count);
            incidentId = bestMatch.incident_id;
            isMerged = true;
            fusionScore = bestMatch.score;
            scoreBreakdown = bestMatch.breakdown;
            console.log(`[Pipeline] ✓ MERGED into ${incidentId} (CFS=${bestMatch.score.toFixed(3)})`);
          } else {
            incidentId = await dedup.createIncident(extracted);
            console.log(`[Pipeline] ✓ NEW incident ${incidentId}`);
          }
        } catch (fusionError: any) {
          // ── EXPLICIT FAILURE: Don't pretend dedup worked ──
          recordFusionError();
          dedupStatus = 'skipped_error';
          incidentId = await dedup.createIncident(extracted);
          logCritical('FUSION_FAILED', {
            incident_id: incidentId,
            error: fusionError.message,
            action: 'Created new incident WITHOUT dedup — potential duplicate',
          });
        }
      } else {
        // Fusion skipped (timeout or auto-disabled)
        dedupStatus = fusionHealth.disabled ? 'skipped_error' : 'skipped_timeout';
        incidentId = await dedup.createIncident(extracted);
        if (fusionHealth.disabled) {
          console.warn('[Pipeline] Fusion auto-disabled — creating new incident without dedup');
        } else {
          console.warn('[Pipeline] Fusion skipped (pipeline > 10s) — creating new incident');
        }
      }
      timings.fusion_ms = Date.now() - stageStart;

      // ── 6. Store raw report ────────────────────
      const processingTime = Date.now() - pipelineStart;
      timings.total_ms = processingTime;
>>>>>>> c91130b (naveeth changes)

      const reportId = await dedup.storeRawReport({
        report_type,
        raw_content: rawContent,
        file_url: null,
        extracted_data: extracted,
        embedding,
        incident_id: incidentId,
        source_language: sourceLanguage,
        processing_time_ms: processingTime,
<<<<<<< HEAD
=======
        dedup_status: dedupStatus,
>>>>>>> c91130b (naveeth changes)
      });

      // ── 6b. Store fusion log for explainability ─
      await dedup.storeFusionLog(
        reportId,
        isMerged ? incidentId : null,
        fusionScore ?? 0,
        scoreBreakdown ?? { semantic: 0, geospatial: 0, temporal: 0, categorical: 0, entity: 0 },
        isMerged ? 'merged' : 'new_incident',
<<<<<<< HEAD
      );

      // ── 7. Fire-and-forget TTS for critical ────
      if (extracted.severity_score >= 8) {
        console.log(`[Pipeline] ⚠ Severity ${extracted.severity_score} >= 8 — generating voice alert`);
        console.log('[Pipeline] Voice alert generation is disabled.');
=======
        processedText,
        embedding.slice(0, 8).map(v => v.toFixed(4)).join(','),
      );

      // ── 7. Fire-and-forget TTS for critical ────
      if (shouldRunStage('optional', pipelineStart) && extracted.severity_score >= 8) {
        console.log(`[Pipeline] ⚠ Severity ${extracted.severity_score} >= 8 — generating voice alert`);
        sarvam.textToSpeech(extracted.summary, sourceLanguage).then(async (audioDataUrl) => {
          const { error } = await supabase
            .from('incidents')
            .update({ alert_audio_url: audioDataUrl })
            .eq('id', incidentId);
          if (error) console.error(`[Pipeline] TTS store failed: ${error.message}`);
          else console.log(`[Pipeline] ✓ Voice alert stored for incident ${incidentId}`);
        }).catch((err) => {
          console.error(`[Pipeline] TTS generation failed (non-fatal): ${err.message}`);
        });
>>>>>>> c91130b (naveeth changes)
      }

      // ── 8. Return response ─────────────────────
      const response: IngestReportResponseWithFusion = {
        success: true,
        incident_id: incidentId,
        is_merged: isMerged,
        extracted,
        source_language: sourceLanguage,
        processing_time_ms: processingTime,
        fusion_score: fusionScore,
        score_breakdown: scoreBreakdown,
<<<<<<< HEAD
=======
        timings,
        dedup_status: dedupStatus,
>>>>>>> c91130b (naveeth changes)
      };

      console.log(`[Pipeline] ✅ Done in ${processingTime}ms | incident=${incidentId} merged=${isMerged}`);
      console.log(`${'═'.repeat(60)}\n`);

      res.status(200).json(response);
    } catch (error: any) {
      const elapsed = Date.now() - pipelineStart;
<<<<<<< HEAD
      console.error(`[Pipeline] ❌ Failed after ${elapsed}ms: ${error.message}`);
      console.error(error.stack);

      res.status(500).json({
        success: false,
        error: 'Report processing failed',
        message: error.message,
        processing_time_ms: elapsed,
      });
=======

      if (error instanceof PipelineTimeoutError) {
        logCritical('PIPELINE_TIMEOUT', {
          stage: error.stage,
          elapsed_ms: error.elapsed,
          timeout_ms: PIPELINE_TIMEOUT_MS,
        });
        res.status(408).json({
          success: false,
          error: `Processing timed out at stage: ${error.stage}`,
          processing_time_ms: elapsed,
          partial: true,
        });
      } else {
        console.error(`[Pipeline] ❌ Failed after ${elapsed}ms: ${error.message}`);
        console.error(error.stack);
        res.status(500).json({
          success: false,
          error: 'Report processing failed',
          message: error.message,
          processing_time_ms: elapsed,
        });
      }
>>>>>>> c91130b (naveeth changes)
    }
  }
);

function buildAutoDispatchExtractedData(text: string): ExtractedData {
  // Use a delimiter that won't appear in GPS coords (period appears in decimals)
  const locationMatch = text.match(/Location:\s*(.+?)(?:\.\s*(?:Severity|People|Summary)|$)/i);
  const severityMatch = text.match(/Severity:\s*(.+?)(?:\.\s*(?:People|Summary|Location)|$)/i);
  const summaryMatch = text.match(/Summary:\s*(.*)$/i);
  const incidentTypeMatch = text.match(/\[AUTO-DISPATCH\]\s*([a-z_]+)/i);
  const peopleMatch = text.match(/People affected:\s*(.+?)(?:\.\s*(?:Summary|Severity|Location)|$)/i);

  const location = locationMatch?.[1]?.trim() || 'Unknown';
  const [latRaw, lngRaw] = location.split(',').map((value) => value.trim());
  const latitude = Number.isFinite(Number(latRaw)) ? Number(latRaw) : null;
  const longitude = Number.isFinite(Number(lngRaw)) ? Number(lngRaw) : null;
  const severityText = (severityMatch?.[1] || '').toLowerCase();
<<<<<<< HEAD
  const affectedCount = Number.parseInt(peopleMatch?.[1] || '0', 10);
=======
  const affectedCount = Number.parseInt(peopleMatch?.[1] || '1', 10);
>>>>>>> c91130b (naveeth changes)

  return {
    location,
    latitude,
    longitude,
    incident_type: normalizeIncidentType(incidentTypeMatch?.[1]),
<<<<<<< HEAD
    affected_count: Number.isFinite(affectedCount) ? affectedCount : 0,
=======
    affected_count: Number.isFinite(affectedCount) ? Math.max(1, affectedCount) : 1,
>>>>>>> c91130b (naveeth changes)
    severity_score: severityText.includes('critical')
      ? 9
      : severityText.includes('high')
        ? 8
        : severityText.includes('medium')
          ? 6
          : severityText.includes('low')
            ? 3
            : 7,
    summary: summaryMatch?.[1]?.trim() || text,
  };
}

function normalizeIncidentType(value?: string): ExtractedData['incident_type'] {
  switch ((value || '').toLowerCase()) {
    case 'road_accident':
    case 'fire':
    case 'flood':
    case 'building_collapse':
    case 'medical':
    case 'violence':
    case 'infrastructure':
      return value as ExtractedData['incident_type'];
    default:
      return 'other';
  }
}

export default router;
