"use strict";
// ──────────────────────────────────────────────
// EIFS — Report Ingestion Route (The Brain)
// POST /api/ingest-report
// Full pipeline: parse → AI extract → embed → dedup → store
// Ref: PROJECT.md Sections 4 and 7
// ──────────────────────────────────────────────
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const sarvam = __importStar(require("../services/sarvam"));
const moonshot = __importStar(require("../services/moonshot"));
const embeddings = __importStar(require("../services/embeddings"));
const dedup = __importStar(require("../services/dedup"));
<<<<<<< HEAD
=======
const resilience_1 = require("../services/resilience");
const logger_1 = require("../services/logger");
const supabase_js_1 = require("@supabase/supabase-js");
const supabase = (0, supabase_js_1.createClient)(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY);
>>>>>>> c91130b (naveeth changes)
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
const router = (0, express_1.Router)();
<<<<<<< HEAD
router.post('/ingest-report', upload.single('file'), async (req, res) => {
    const pipelineStart = Date.now();
=======
// ── Pipeline Constants ──────────────────────────
const PIPELINE_TIMEOUT_MS = 30000; // 30s global (Sarvam APIs are slow)
const OPTIONAL_CUTOFF_MS = 20000; // 20s — skip fusion/TTS after this
// ── Pipeline Timeout Error ──────────────────────
class PipelineTimeoutError extends Error {
    constructor(stage, elapsed) {
        super(`Pipeline timeout at ${stage} after ${elapsed}ms`);
        this.stage = stage;
        this.elapsed = elapsed;
    }
}
// ── Fusion Health Tracker (auto-disable on spike) ──
const fusionHealth = {
    recentErrors: 0,
    lastReset: Date.now(),
    disabled: false,
};
const FUSION_ERROR_THRESHOLD = 3;
const FUSION_RESET_WINDOW = 5 * 60000; // 5 minutes
const FUSION_DISABLE_DURATION = 2 * 60000; // 2 minutes
function isFusionHealthy() {
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
function recordFusionError() {
    fusionHealth.recentErrors++;
    if (fusionHealth.recentErrors >= FUSION_ERROR_THRESHOLD) {
        fusionHealth.disabled = true;
        fusionHealth.lastReset = Date.now();
        (0, logger_1.logCritical)('FUSION_DISABLED', {
            reason: `${FUSION_ERROR_THRESHOLD} failures in ${FUSION_RESET_WINDOW / 1000}s`,
            disabled_for_ms: FUSION_DISABLE_DURATION,
        });
    }
}
function shouldRunStage(stage, pipelineStart) {
    const elapsed = Date.now() - pipelineStart;
    if (elapsed > PIPELINE_TIMEOUT_MS)
        throw new PipelineTimeoutError('global', elapsed);
    if (stage === 'optional' && elapsed > OPTIONAL_CUTOFF_MS) {
        console.warn(`[Pipeline] Skipping optional stage — ${elapsed}ms elapsed (cutoff: ${OPTIONAL_CUTOFF_MS}ms)`);
        return false;
    }
    return true;
}
router.post('/ingest-report', upload.single('file'), async (req, res) => {
    const pipelineStart = Date.now();
    // ── Pipeline timing + state tracking ──
    const timings = { total_ms: 0 };
    let stageStart = Date.now();
    let dedupStatus = 'completed';
    function checkDeadline(stage) {
        const elapsed = Date.now() - pipelineStart;
        if (elapsed > PIPELINE_TIMEOUT_MS) {
            throw new PipelineTimeoutError(stage, elapsed);
        }
    }
>>>>>>> c91130b (naveeth changes)
    try {
        // ── 1. Extract inputs ──────────────────────
        const report_type = req.body.report_type;
        const text_content = req.body.text_content;
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
        let processedText;
        let sourceLanguage;
        let rawContent = text_content || null;
        let extractedOverride = null;
        // ── 2. Branch by report_type ───────────────
        switch (report_type) {
            // ── VOICE ────────────────────────────────
            case 'voice': {
<<<<<<< HEAD
                console.log('[Pipeline] → Voice path: STT (translate mode)');
                const sttResult = await sarvam.speechToText(file.buffer, file.originalname);
                processedText = sttResult.transcript;
                sourceLanguage = sttResult.language_code;
=======
                console.log('[Pipeline] → Voice path: Unified STT v3');
                const sttResult = await sarvam.speechToText(file.buffer, file.originalname);
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
                }
                else {
                    const lidResult = await sarvam.detectLanguage(text_content);
                    sourceLanguage = lidResult.language_code;
                }
                if (sourceLanguage !== 'en-IN' && sourceLanguage !== 'en') {
                    console.log(`[Pipeline]   Language ${sourceLanguage} detected, translating to en-IN`);
                    processedText = await sarvam.translate(text_content, sourceLanguage, 'en-IN');
                }
                else {
                    console.log('[Pipeline]   Already English, skipping translation');
                    processedText = text_content;
                }
                break;
            }
            // ── IMAGE ────────────────────────────────
            case 'image': {
<<<<<<< HEAD
                console.log('[Pipeline] → Image path: Sarvam Vision + Moonshot Vision (parallel)');
                const [visionText, sceneDesc] = await Promise.all([
                    sarvam.extractImage(file.buffer, file.originalname),
                    moonshot.describeScene(file.buffer),
                ]);
                processedText = `Signage/Text in image: ${visionText}. Scene description: ${sceneDesc}`;
=======
                console.log('[Pipeline] → Image path: Dual Vision (Sarvam + Moonshot)');
                const results = await Promise.allSettled([
                    (0, resilience_1.withRetry)(() => sarvam.extractImage(file.buffer, file.originalname), 'sarvam-vision', 1),
                    (0, resilience_1.isCircuitOpen)('moonshot-vision')
                        ? Promise.reject(new Error('Circuit open'))
                        : (0, resilience_1.withRetry)(() => moonshot.describeScene(file.buffer), 'moonshot-vision', 1),
                ]);
                timings.stt_ms = Date.now() - stageStart; // reuse stt_ms for image processing time
                const sarvamText = results[0].status === 'fulfilled' ? results[0].value : '';
                const moonshotText = results[1].status === 'fulfilled' ? results[1].value : '';
                if (results[0].status === 'rejected')
                    console.warn(`[Pipeline] Sarvam Vision: ${results[0].reason.message}`);
                if (results[1].status === 'rejected')
                    console.warn(`[Pipeline] Moonshot Vision: ${results[1].reason.message}`);
                const descriptions = [];
                if (sarvamText)
                    descriptions.push(`Text/OCR: ${sarvamText}`);
                if (moonshotText)
                    descriptions.push(`Scene: ${moonshotText}`);
                if (descriptions.length === 0) {
                    (0, logger_1.logCritical)('VISION_BOTH_FAILED', {
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
>>>>>>> c91130b (naveeth changes)
                sourceLanguage = 'en-IN';
                rawContent = processedText;
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
        const extracted = extractedOverride
            ? extractedOverride
            : await (async () => {
                console.log('[Pipeline] → Extracting entities via Sarvam-30B...');
                return sarvam.chatCompletion(processedText, report_type);
            })();
<<<<<<< HEAD
        // ── 4. Generate embedding for dedup ────────
        console.log('[Pipeline] → Generating embedding...');
        const embedding = await embeddings.generateEmbedding(extracted.summary);
        // ── 5. Deduplication ───────────────────────
        console.log('[Pipeline] → Searching for duplicate incidents...');
        const match = await dedup.findMatch(embedding);
        let incidentId;
        let isMerged;
        if (match) {
            console.log(`[Pipeline] ✓ MERGED into existing incident ${match.incident_id} (similarity=${match.similarity.toFixed(3)})`);
            await dedup.mergeReport(match.incident_id, extracted);
            incidentId = match.incident_id;
            isMerged = true;
        }
        else {
            console.log('[Pipeline] ✓ NEW incident created');
            incidentId = await dedup.createIncident(extracted);
            isMerged = false;
        }
        // ── 6. Store raw report ────────────────────
        const processingTime = Date.now() - pipelineStart;
        await dedup.storeRawReport({
=======
        timings.extraction_ms = Date.now() - stageStart;
        // ── 4. Generate embedding for dedup ────────
        stageStart = Date.now();
        checkDeadline('embedding');
        console.log('[Pipeline] → Generating embedding...');
        let embedding;
        try {
            embedding = await (0, resilience_1.withRetry)(() => embeddings.generateEmbedding(extracted.summary), 'openai-embeddings', 1);
        }
        catch (embErr) {
            (0, logger_1.logCritical)('EMBEDDING_FAILED', { error: embErr.message });
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
        let incidentId;
        let isMerged = false;
        let fusionScore = null;
        let scoreBreakdown = null;
        if (shouldRunStage('optional', pipelineStart) && isFusionHealthy()) {
            try {
                checkDeadline('fusion');
                console.log('[Pipeline] → Searching for fusion candidates...');
                const candidates = await dedup.findFusionCandidates(embedding);
                const bestMatch = await dedup.findBestMatch({ extracted, embedding, created_at: new Date() }, candidates);
                if (bestMatch) {
                    const matchedCandidate = candidates.find(c => c.incident_id === bestMatch.incident_id);
                    await dedup.mergeReport(bestMatch.incident_id, extracted, matchedCandidate.severity_score, matchedCandidate.report_count);
                    incidentId = bestMatch.incident_id;
                    isMerged = true;
                    fusionScore = bestMatch.score;
                    scoreBreakdown = bestMatch.breakdown;
                    console.log(`[Pipeline] ✓ MERGED into ${incidentId} (CFS=${bestMatch.score.toFixed(3)})`);
                }
                else {
                    incidentId = await dedup.createIncident(extracted);
                    console.log(`[Pipeline] ✓ NEW incident ${incidentId}`);
                }
            }
            catch (fusionError) {
                // ── EXPLICIT FAILURE: Don't pretend dedup worked ──
                recordFusionError();
                dedupStatus = 'skipped_error';
                incidentId = await dedup.createIncident(extracted);
                (0, logger_1.logCritical)('FUSION_FAILED', {
                    incident_id: incidentId,
                    error: fusionError.message,
                    action: 'Created new incident WITHOUT dedup — potential duplicate',
                });
            }
        }
        else {
            // Fusion skipped (timeout or auto-disabled)
            dedupStatus = fusionHealth.disabled ? 'skipped_error' : 'skipped_timeout';
            incidentId = await dedup.createIncident(extracted);
            if (fusionHealth.disabled) {
                console.warn('[Pipeline] Fusion auto-disabled — creating new incident without dedup');
            }
            else {
                console.warn('[Pipeline] Fusion skipped (pipeline > 10s) — creating new incident');
            }
        }
        timings.fusion_ms = Date.now() - stageStart;
        // ── 6. Store raw report ────────────────────
        const processingTime = Date.now() - pipelineStart;
        timings.total_ms = processingTime;
        const reportId = await dedup.storeRawReport({
>>>>>>> c91130b (naveeth changes)
            report_type,
            raw_content: rawContent,
            file_url: null,
            extracted_data: extracted,
            embedding,
            incident_id: incidentId,
            source_language: sourceLanguage,
            processing_time_ms: processingTime,
<<<<<<< HEAD
        });
        // ── 7. Fire-and-forget TTS for critical ────
        if (extracted.severity_score >= 8) {
            console.log(`[Pipeline] ⚠ Severity ${extracted.severity_score} >= 8 — generating voice alert`);
            console.log('[Pipeline] Voice alert generation is disabled.');
=======
            dedup_status: dedupStatus,
        });
        // ── 6b. Store fusion log for explainability ─
        await dedup.storeFusionLog(reportId, isMerged ? incidentId : null, fusionScore ?? 0, scoreBreakdown ?? { semantic: 0, geospatial: 0, temporal: 0, categorical: 0, entity: 0 }, isMerged ? 'merged' : 'new_incident', processedText, embedding.slice(0, 8).map(v => v.toFixed(4)).join(','));
        // ── 7. Fire-and-forget TTS for critical ────
        if (shouldRunStage('optional', pipelineStart) && extracted.severity_score >= 8) {
            console.log(`[Pipeline] ⚠ Severity ${extracted.severity_score} >= 8 — generating voice alert`);
            sarvam.textToSpeech(extracted.summary, sourceLanguage).then(async (audioDataUrl) => {
                const { error } = await supabase
                    .from('incidents')
                    .update({ alert_audio_url: audioDataUrl })
                    .eq('id', incidentId);
                if (error)
                    console.error(`[Pipeline] TTS store failed: ${error.message}`);
                else
                    console.log(`[Pipeline] ✓ Voice alert stored for incident ${incidentId}`);
            }).catch((err) => {
                console.error(`[Pipeline] TTS generation failed (non-fatal): ${err.message}`);
            });
>>>>>>> c91130b (naveeth changes)
        }
        // ── 8. Return response ─────────────────────
        const response = {
            success: true,
            incident_id: incidentId,
            is_merged: isMerged,
            extracted,
            source_language: sourceLanguage,
            processing_time_ms: processingTime,
<<<<<<< HEAD
=======
            fusion_score: fusionScore,
            score_breakdown: scoreBreakdown,
            timings,
            dedup_status: dedupStatus,
>>>>>>> c91130b (naveeth changes)
        };
        console.log(`[Pipeline] ✅ Done in ${processingTime}ms | incident=${incidentId} merged=${isMerged}`);
        console.log(`${'═'.repeat(60)}\n`);
        res.status(200).json(response);
    }
    catch (error) {
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
    }
});
function buildAutoDispatchExtractedData(text) {
    const locationMatch = text.match(/Location:\s*([^.]*)/i);
    const severityMatch = text.match(/Severity:\s*([^.]*)/i);
    const summaryMatch = text.match(/Summary:\s*(.*)$/i);
    const incidentTypeMatch = text.match(/\[AUTO-DISPATCH\]\s*([a-z_]+)/i);
    const peopleMatch = text.match(/People affected:\s*([^.]*)/i);
=======
        if (error instanceof PipelineTimeoutError) {
            (0, logger_1.logCritical)('PIPELINE_TIMEOUT', {
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
        }
        else {
            console.error(`[Pipeline] ❌ Failed after ${elapsed}ms: ${error.message}`);
            console.error(error.stack);
            res.status(500).json({
                success: false,
                error: 'Report processing failed',
                message: error.message,
                processing_time_ms: elapsed,
            });
        }
    }
});
function buildAutoDispatchExtractedData(text) {
    // Use a delimiter that won't appear in GPS coords (period appears in decimals)
    const locationMatch = text.match(/Location:\s*(.+?)(?:\.\s*(?:Severity|People|Summary)|$)/i);
    const severityMatch = text.match(/Severity:\s*(.+?)(?:\.\s*(?:People|Summary|Location)|$)/i);
    const summaryMatch = text.match(/Summary:\s*(.*)$/i);
    const incidentTypeMatch = text.match(/\[AUTO-DISPATCH\]\s*([a-z_]+)/i);
    const peopleMatch = text.match(/People affected:\s*(.+?)(?:\.\s*(?:Summary|Severity|Location)|$)/i);
>>>>>>> c91130b (naveeth changes)
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
function normalizeIncidentType(value) {
    switch ((value || '').toLowerCase()) {
        case 'road_accident':
        case 'fire':
        case 'flood':
        case 'building_collapse':
        case 'medical':
        case 'violence':
        case 'infrastructure':
            return value;
        default:
            return 'other';
    }
}
exports.default = router;
//# sourceMappingURL=reports.js.map