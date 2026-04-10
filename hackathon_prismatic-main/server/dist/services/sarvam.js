"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSarvamChatClient = getSarvamChatClient;
exports.speechToText = speechToText;
exports.detectLanguage = detectLanguage;
exports.translate = translate;
exports.extractImage = extractImage;
exports.chatCompletion = chatCompletion;
exports.textToSpeech = textToSpeech;
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const SARVAM_BASE_URL = 'https://api.sarvam.ai';
function getSarvamClient() {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
        throw new Error('[Sarvam] SARVAM_API_KEY is not set in environment variables');
    }
    return axios_1.default.create({
        baseURL: SARVAM_BASE_URL,
        headers: {
            'api-subscription-key': apiKey,
        },
    });
}
function getSarvamChatClient() {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
        throw new Error('[Sarvam] SARVAM_API_KEY is not set in environment variables');
    }
    return axios_1.default.create({
        baseURL: SARVAM_BASE_URL,
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'api-subscription-key': apiKey,
            'Content-Type': 'application/json',
        },
    });
}
function buildExtractionPrompt(reportType, processedText) {
    return `You are an emergency report analyzer for India. Extract structured data from this emergency report.

Report type: ${reportType}
Content: "${processedText}"

Rules:
- Location should include area name AND city
- affected_count should be 1 if not mentioned (at minimum, the reporter is affected)
- severity_score is between 1 and 10

Respond ONLY with valid JSON:
{
  "location": "specific location, city",
  "latitude": approximate_lat_or_null,
  "longitude": approximate_lng_or_null,
  "incident_type": "road_accident|fire|flood|building_collapse|medical|violence|infrastructure|other",
  "affected_count": number,
  "severity_score": 1-10,
  "summary": "one-line dedup-friendly summary under 100 chars"
}`;
}
/**
 * Unified STT using Sarvam v3 /speech-to-text endpoint.
 * - English: 1 call (transcribe) → done
 * - Non-English: 1 call (transcribe) → detect lang → 1 call (translate) → done
 * - Low confidence (< 0.4): retry with mode=translate as safety net
 * - Never uses legacy /speech-to-text-translate endpoint
 */
async function speechToText(audioBuffer, fileName) {
    const start = Date.now();
    const client = getSarvamClient();
    const contentType = fileName.endsWith('.wav') ? 'audio/wav' : 'audio/webm';
    try {
        // ── Step 1: Transcribe in source language (works for ALL languages) ──
        const form = new form_data_1.default();
        form.append('file', audioBuffer, { filename: fileName, contentType });
        form.append('model', 'saaras:v3');
        form.append('mode', 'transcribe');
        const response = await client.post('/speech-to-text', form, {
            headers: {
                ...form.getHeaders(),
                'api-subscription-key': process.env.SARVAM_API_KEY,
            },
            timeout: 8000,
        });
        let transcript = (response.data.transcript || '').trim();
        const langCode = response.data.language_code || 'en-IN';
        const confidence = response.data.language_confidence
            ?? response.data.language_probability ?? null;
        let translatedText;
        // ── Guardrail: Low confidence → retry with mode=translate ──
        if (transcript && confidence !== null && confidence < 0.4) {
            console.warn(`[Sarvam STT] Low confidence (${confidence.toFixed(2)}), retrying with mode=translate`);
            try {
                const form2 = new form_data_1.default();
                form2.append('file', audioBuffer, { filename: fileName, contentType });
                form2.append('model', 'saaras:v3');
                form2.append('mode', 'translate');
                const r2 = await client.post('/speech-to-text', form2, {
                    headers: { ...form2.getHeaders(), 'api-subscription-key': process.env.SARVAM_API_KEY },
                    timeout: 8000,
                });
                const altTranscript = (r2.data.transcript || '').trim();
                // Quality gate: accept only if longer AND has real words AND not repetitive
                const altWords = altTranscript.split(/\s+/).filter((w) => w.length > 1);
                const uniqueRatio = altWords.length > 0 ? new Set(altWords).size / altWords.length : 0;
                if (altTranscript.length > transcript.length &&
                    altWords.length >= 3 &&
                    uniqueRatio >= 0.5) {
                    console.log(`[Sarvam STT] Translate mode accepted: ${altWords.length} words, ${uniqueRatio.toFixed(2)} unique ratio`);
                    transcript = altTranscript;
                    translatedText = altTranscript; // Already in English
                }
            }
            catch {
                // Non-fatal — continue with original transcript
            }
        }
        // ── Non-English → translate to English ──
        if (transcript && !langCode.startsWith('en') && !translatedText) {
            try {
                translatedText = await translate(transcript, langCode, 'en-IN');
            }
            catch (err) {
                console.warn(`[Sarvam STT] Translation failed (non-fatal): ${err.message}`);
            }
        }
        // ── Log language info ──
        const elapsed = Date.now() - start;
        console.log(`[Sarvam STT] Done in ${elapsed}ms | lang=${langCode} conf=${confidence?.toFixed(2) ?? 'N/A'} chars=${transcript.length}`);
        return {
            transcript,
            language_code: langCode,
            language_confidence: confidence,
            translatedText,
        };
    }
    catch (error) {
        const elapsed = Date.now() - start;
        const msg = error.response?.data?.message || error.response?.data?.error || error.message;
        console.error(`[Sarvam STT] Failed after ${elapsed}ms: ${msg}`);
        throw new Error(`[Sarvam STT] Speech-to-text failed: ${msg}`);
    }
}
async function detectLanguage(text) {
    const start = Date.now();
    const client = getSarvamClient();
    try {
        const response = await client.post('/text-lid', { input: text });
        const elapsed = Date.now() - start;
        console.log(`[Sarvam LID] Detected ${response.data.language_code} in ${elapsed}ms`);
        return {
            language_code: response.data.language_code,
            script_code: response.data.script_code,
        };
    }
    catch (error) {
        const elapsed = Date.now() - start;
        const msg = error.response?.data?.message || error.response?.data?.error || error.message;
        console.error(`[Sarvam LID] Failed after ${elapsed}ms: ${msg}`);
        throw new Error(`[Sarvam LID] Language identification failed: ${msg}`);
    }
}
async function translate(text, sourceLang, targetLang) {
    const start = Date.now();
    const client = getSarvamClient();
    try {
        const response = await client.post('/translate', {
            input: text,
            source_language_code: sourceLang,
            target_language_code: targetLang,
        });
        const elapsed = Date.now() - start;
        console.log(`[Sarvam Translate] ${sourceLang} -> ${targetLang} in ${elapsed}ms`);
        return response.data.translated_text;
    }
    catch (error) {
        const elapsed = Date.now() - start;
        const msg = error.response?.data?.message || error.response?.data?.error || error.message;
        console.error(`[Sarvam Translate] Failed after ${elapsed}ms: ${msg}`);
        throw new Error(`[Sarvam Translate] Translation failed (${sourceLang} -> ${targetLang}): ${msg}`);
    }
}
async function extractImage(imageBuffer, fileName) {
    const start = Date.now();
    try {
        const base64Image = imageBuffer.toString('base64');
        const mimeType = fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
        const client = getSarvamChatClient();
        const response = await client.post('/v1/chat/completions', {
            model: 'sarvam-105b',
            messages: [
                {
                    role: 'system',
                    content: 'You are an OCR and image text extraction system. Extract all visible text and signage. If text is in an Indian language, also provide English translation.',
                },
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Extract all text visible in this image.' },
                        { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64Image}` } },
                    ],
                },
            ],
            temperature: 0.1,
            max_tokens: 2048,
        });
        const msg = response.data.choices?.[0]?.message;
        const extractedText = msg?.content || msg?.reasoning_content || '';
        const elapsed = Date.now() - start;
        console.log(`[Sarvam Vision] Extracted ${extractedText.length} chars in ${elapsed}ms`);
        return extractedText;
    }
    catch (error) {
        const elapsed = Date.now() - start;
        const msg = error.response?.data?.message || error.response?.data?.error?.message || error.message;
        console.error(`[Sarvam Vision] Failed after ${elapsed}ms: ${msg}`);
        throw new Error(`[Sarvam Vision] Image extraction failed: ${msg}`);
    }
}
async function chatCompletion(text, reportType) {
    const start = Date.now();
    const client = getSarvamChatClient();
    const systemPrompt = buildExtractionPrompt(reportType, text);
    async function attempt(retryCount) {
        try {
            const response = await client.post('/v1/chat/completions', {
                model: 'sarvam-105b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: text },
                ],
                temperature: 0.1,
            });
            const msg = response.data.choices?.[0]?.message;
            const rawContent = msg?.content || msg?.reasoning_content;
            if (!rawContent) {
                throw new Error('Empty response from Sarvam chat');
            }
            const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
            const parsed = JSON.parse(cleaned);
            if (!parsed.location || !parsed.incident_type || !parsed.summary) {
                throw new Error('Missing required fields in extracted data');
            }
            parsed.severity_score = Math.max(1, Math.min(10, parsed.severity_score));
            parsed.affected_count = Math.max(1, parsed.affected_count ?? 1);
            return parsed;
        }
        catch (error) {
            if (retryCount < 1) {
                console.warn(`[Sarvam Chat] JSON parse failed, retrying (attempt ${retryCount + 2})`);
                return attempt(retryCount + 1);
            }
            throw error;
        }
    }
    try {
        const result = await attempt(0);
        const elapsed = Date.now() - start;
        console.log(`[Sarvam Chat] Extracted in ${elapsed}ms | type=${result.incident_type} severity=${result.severity_score}`);
        return result;
    }
    catch (error) {
        const elapsed = Date.now() - start;
        const msg = error.response?.data?.message || error.response?.data?.error?.message || error.message;
        console.error(`[Sarvam Chat] Failed after ${elapsed}ms: ${msg}`);
        throw new Error(`[Sarvam Chat] Entity extraction failed: ${msg}`);
    }
}
/**
 * Text-to-Speech using Sarvam Bulbul v3.
 * Returns base64 data URL (data:audio/wav;base64,...)
 * Fire-and-forget safe — caller catches errors.
 */
async function textToSpeech(text, languageCode = 'en-IN', speaker = 'aditya') {
    const start = Date.now();
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey)
        throw new Error('[Sarvam TTS] SARVAM_API_KEY not set');
    // Truncate to avoid TTS timeouts on long text
    const truncated = text.length > 200 ? text.slice(0, 200) + '...' : text;
    try {
        const response = await axios_1.default.post(`${SARVAM_BASE_URL}/text-to-speech`, {
            inputs: [truncated],
            target_language_code: languageCode,
            speaker,
            model: 'bulbul:v3',
        }, {
            headers: {
                'api-subscription-key': apiKey,
                'Content-Type': 'application/json',
            },
            timeout: 10000,
        });
        const audioBase64 = response.data?.audios?.[0];
        if (!audioBase64)
            throw new Error('Empty audio response from TTS');
        const elapsed = Date.now() - start;
        console.log(`[Sarvam TTS] Generated in ${elapsed}ms | lang=${languageCode}`);
        return `data:audio/wav;base64,${audioBase64}`;
    }
    catch (error) {
        const elapsed = Date.now() - start;
        const msg = error.response?.data?.message || error.message;
        console.error(`[Sarvam TTS] Failed after ${elapsed}ms: ${msg}`);
        throw new Error(`[Sarvam TTS] Text-to-speech failed: ${msg}`);
    }
}
//# sourceMappingURL=sarvam.js.map