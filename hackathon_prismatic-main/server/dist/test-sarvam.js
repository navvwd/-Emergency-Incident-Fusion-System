"use strict";
// ──────────────────────────────────────────────
// EIFS — Sarvam AI End-to-End Test Suite
// Tests all 7 Sarvam API integrations
// Run: npx tsx src/test-sarvam.ts
// ──────────────────────────────────────────────
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const sarvam_1 = require("./services/sarvam");
const SARVAM_BASE_URL = 'https://api.sarvam.ai';
const API_KEY = process.env.SARVAM_API_KEY;
const results = [];
async function runTest(name, fn) {
    const start = Date.now();
    try {
        const details = await fn();
        const duration = Date.now() - start;
        results.push({ name, passed: true, duration, details });
        console.log(`  ✓ ${name} (${duration}ms) — ${details}`);
    }
    catch (error) {
        const duration = Date.now() - start;
        const msg = error.response?.data?.error?.message || error.response?.data?.message || error.message;
        results.push({ name, passed: false, duration, error: msg });
        console.log(`  ✗ ${name} (${duration}ms) — ${msg}`);
    }
}
// ─── 1. Test Language Identification ────────
async function testLanguageIdentification() {
    const response = await axios_1.default.post(`${SARVAM_BASE_URL}/text-lid`, { input: 'नमस्ते, मैं एक आपातकालीन स्थिति में हूँ' }, { headers: { 'api-subscription-key': API_KEY } });
    const { language_code, script_code } = response.data;
    if (!language_code)
        throw new Error('No language_code in response');
    return `Detected: ${language_code} (${script_code})`;
}
// ─── 2. Test Translation ────────────────────
async function testTranslation() {
    const response = await axios_1.default.post(`${SARVAM_BASE_URL}/translate`, {
        input: 'There is a fire at the market near MG Road',
        source_language_code: 'en-IN',
        target_language_code: 'hi-IN',
    }, {
        headers: {
            'api-subscription-key': API_KEY,
            'Content-Type': 'application/json',
        },
    });
    const translated = response.data.translated_text;
    if (!translated)
        throw new Error('No translated_text in response');
    return `EN→HI: "${translated.substring(0, 60)}..."`;
}
// ─── 3. Test Chat Completion (sarvam-30b) ───
async function testChatCompletion30B() {
    const client = (0, sarvam_1.getSarvamChatClient)();
    const response = await client.post('/v1/chat/completions', {
        model: 'sarvam-30b',
        messages: [
            { role: 'system', content: 'You are an emergency response assistant. Be concise.' },
            { role: 'user', content: 'What are the first aid steps for a minor burn?' },
        ],
        temperature: 0.2,
        max_tokens: 2048,
    });
    const msg = response.data.choices?.[0]?.message;
    const content = msg?.content || msg?.reasoning_content;
    if (!content)
        throw new Error('No content in response');
    return `sarvam-30b: "${content.substring(0, 80)}..."`;
}
// ─── 4. Test Chat Completion (sarvam-105b) ──
async function testChatCompletion105B() {
    const client = (0, sarvam_1.getSarvamChatClient)();
    const response = await client.post('/v1/chat/completions', {
        model: 'sarvam-105b',
        messages: [
            { role: 'system', content: 'You are an emergency response assistant. Be concise.' },
            { role: 'user', content: 'Someone is having a heart attack. What should I do immediately?' },
        ],
        temperature: 0.2,
        max_tokens: 2048,
    });
    const msg = response.data.choices?.[0]?.message;
    const content = msg?.content || msg?.reasoning_content;
    if (!content)
        throw new Error('No content in response');
    return `sarvam-105b: "${content.substring(0, 80)}..."`;
}
// ─── 5. Test Chat Completion Streaming ──────
async function testChatCompletionStreaming() {
    const client = (0, sarvam_1.getSarvamChatClient)();
    const response = await client.post('/v1/chat/completions', {
        model: 'sarvam-105b',
        messages: [
            { role: 'system', content: 'Reply briefly.' },
            { role: 'user', content: 'Say hello in Hindi.' },
        ],
        temperature: 0.2,
        max_tokens: 2048,
        stream: true,
    }, { responseType: 'stream' });
    let fullText = '';
    let tokenCount = 0;
    return new Promise((resolve, reject) => {
        const stream = response.data;
        let buffer = '';
        stream.on('data', (chunk) => {
            buffer += chunk.toString();
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed || trimmed === 'data: [DONE]')
                    continue;
                if (trimmed.startsWith('data: ')) {
                    try {
                        const data = JSON.parse(trimmed.slice(6));
                        const token = data.choices?.[0]?.delta?.content;
                        if (token) {
                            fullText += token;
                            tokenCount++;
                        }
                    }
                    catch { }
                }
            }
        });
        stream.on('end', () => {
            if (tokenCount === 0)
                reject(new Error('No tokens received'));
            resolve(`${tokenCount} tokens streamed: "${fullText.substring(0, 60)}..."`);
        });
        stream.on('error', reject);
    });
}
// ─── 6. Test Text-to-Speech (Bulbul v3) ─────
async function testTTS() {
    const response = await axios_1.default.post(`${SARVAM_BASE_URL}/text-to-speech`, {
        text: 'Stay calm. Help is on the way.',
        target_language_code: 'en-IN',
        speaker: 'aditya',
        model: 'bulbul:v3',
    }, {
        headers: {
            'api-subscription-key': API_KEY,
            'Content-Type': 'application/json',
        },
    });
    const audio = response.data.audios?.[0];
    if (!audio)
        throw new Error('No audio in response');
    const audioBytes = Buffer.from(audio, 'base64').length;
    return `Generated ${audioBytes} bytes of audio (base64)`;
}
// ─── 7. Test TTS Hindi ──────────────────────
async function testTTSHindi() {
    const response = await axios_1.default.post(`${SARVAM_BASE_URL}/text-to-speech`, {
        text: 'शांत रहिए, मदद आ रही है।',
        target_language_code: 'hi-IN',
        speaker: 'amit',
        model: 'bulbul:v3',
    }, {
        headers: {
            'api-subscription-key': API_KEY,
            'Content-Type': 'application/json',
        },
    });
    const audio = response.data.audios?.[0];
    if (!audio)
        throw new Error('No audio in response');
    const audioBytes = Buffer.from(audio, 'base64').length;
    return `Hindi TTS: ${audioBytes} bytes`;
}
// ─── 8. Test TTS Streaming ──────────────────
async function testTTSStreaming() {
    const response = await axios_1.default.post(`${SARVAM_BASE_URL}/text-to-speech/stream`, {
        text: 'I am your emergency response assistant. Please stay calm and tell me what happened.',
        target_language_code: 'en-IN',
        speaker: 'aditya',
        model: 'bulbul:v3',
        output_audio_codec: 'mp3',
    }, {
        headers: {
            'api-subscription-key': API_KEY,
            'Content-Type': 'application/json',
        },
        responseType: 'stream',
        timeout: 30000,
    });
    let totalBytes = 0;
    let chunkCount = 0;
    return new Promise((resolve, reject) => {
        const stream = response.data;
        stream.on('data', (chunk) => {
            totalBytes += chunk.length;
            chunkCount++;
        });
        stream.on('end', () => {
            if (totalBytes === 0)
                reject(new Error('No audio data received'));
            resolve(`${chunkCount} chunks, ${totalBytes} bytes total`);
        });
        stream.on('error', reject);
    });
}
// ─── 9. Test Speech-to-Text (with synthetic audio) ──
async function testSTT() {
    // Generate a short TTS audio first, then feed it back to STT
    const ttsResponse = await axios_1.default.post(`${SARVAM_BASE_URL}/text-to-speech`, {
        text: 'There is a fire at the market',
        target_language_code: 'en-IN',
        speaker: 'aditya',
        model: 'bulbul:v3',
        output_audio_codec: 'mp3',
    }, {
        headers: {
            'api-subscription-key': API_KEY,
            'Content-Type': 'application/json',
        },
    });
    const audioBase64 = ttsResponse.data.audios?.[0];
    if (!audioBase64)
        throw new Error('TTS failed — cannot test STT');
    const audioBuffer = Buffer.from(audioBase64, 'base64');
    const form = new form_data_1.default();
    form.append('file', audioBuffer, { filename: 'test.mp3', contentType: 'audio/mp3' });
    form.append('model', 'saaras:v2.5');
    const sttResponse = await axios_1.default.post(`${SARVAM_BASE_URL}/speech-to-text-translate`, form, {
        headers: {
            ...form.getHeaders(),
            'api-subscription-key': API_KEY,
        },
    });
    const { transcript, language_code } = sttResponse.data;
    if (!transcript)
        throw new Error('No transcript in response');
    return `STT: "${transcript}" (lang: ${language_code})`;
}
// ─── 10. Test Full Pipeline: Text → Extract → TTS ──
async function testFullPipeline() {
    const client = (0, sarvam_1.getSarvamChatClient)();
    // Step 1: Entity extraction via chat
    const extractionPrompt = `You are an emergency report analyzer for India. Extract structured data from this report.
Content: "Major fire at Sarojini Nagar market, Delhi. 3 shops burning, 5 people injured, fire brigade called."

Respond ONLY with valid JSON:
{
  "location": "specific location, city",
  "latitude": null,
  "longitude": null,
  "incident_type": "road_accident|fire|flood|building_collapse|medical|violence|infrastructure|other",
  "affected_count": 0,
  "severity_score": 1,
  "summary": "one-line summary"
}`;
    const chatResponse = await client.post('/v1/chat/completions', {
        model: 'sarvam-30b',
        messages: [
            { role: 'system', content: extractionPrompt },
            { role: 'user', content: 'Major fire at Sarojini Nagar market, Delhi. 3 shops burning, 5 people injured.' },
        ],
        temperature: 0.1,
    });
    const rawContent = chatResponse.data.choices?.[0]?.message?.content;
    if (!rawContent)
        throw new Error('No extraction response');
    // Clean and parse
    const cleaned = rawContent.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
    const extracted = JSON.parse(cleaned);
    // Step 2: Generate TTS alert
    const ttsResponse = await axios_1.default.post(`${SARVAM_BASE_URL}/text-to-speech`, {
        text: `Alert: ${extracted.summary}. Severity: ${extracted.severity_score} out of 10.`,
        target_language_code: 'en-IN',
        speaker: 'aditya',
        model: 'bulbul:v3',
    }, {
        headers: {
            'api-subscription-key': API_KEY,
            'Content-Type': 'application/json',
        },
    });
    const audioBytes = Buffer.from(ttsResponse.data.audios[0], 'base64').length;
    return `Extracted: type=${extracted.incident_type}, severity=${extracted.severity_score}, location="${extracted.location}" | Alert audio: ${audioBytes} bytes`;
}
// ─── 11. Test Multilingual Pipeline ─────────
async function testMultilingualPipeline() {
    // Step 1: Detect language
    const lidResponse = await axios_1.default.post(`${SARVAM_BASE_URL}/text-lid`, { input: 'यहां बाजार में आग लगी है, 5 लोग घायल हैं' }, { headers: { 'api-subscription-key': API_KEY } });
    const detectedLang = lidResponse.data.language_code;
    // Step 2: Translate to English
    const translateResponse = await axios_1.default.post(`${SARVAM_BASE_URL}/translate`, {
        input: 'यहां बाजार में आग लगी है, 5 लोग घायल हैं',
        source_language_code: detectedLang,
        target_language_code: 'en-IN',
    }, {
        headers: {
            'api-subscription-key': API_KEY,
            'Content-Type': 'application/json',
        },
    });
    const englishText = translateResponse.data.translated_text;
    // Step 3: Generate response
    const client = (0, sarvam_1.getSarvamChatClient)();
    const chatResponse = await client.post('/v1/chat/completions', {
        model: 'sarvam-105b',
        messages: [
            { role: 'system', content: 'You are an emergency assistant. Be brief (1-2 sentences).' },
            { role: 'user', content: englishText },
        ],
        temperature: 0.7,
        max_tokens: 2048,
    });
    const aiMsg = chatResponse.data.choices?.[0]?.message;
    const aiResponse = aiMsg?.content || aiMsg?.reasoning_content || '';
    // Step 4: Translate response back to Hindi
    const backTranslation = await axios_1.default.post(`${SARVAM_BASE_URL}/translate`, {
        input: aiResponse,
        source_language_code: 'en-IN',
        target_language_code: detectedLang,
    }, {
        headers: {
            'api-subscription-key': API_KEY,
            'Content-Type': 'application/json',
        },
    });
    const hindiResponse = backTranslation.data.translated_text;
    // Step 5: Generate Hindi TTS
    const ttsResponse = await axios_1.default.post(`${SARVAM_BASE_URL}/text-to-speech`, {
        text: hindiResponse,
        target_language_code: detectedLang,
        speaker: 'amit',
        model: 'bulbul:v3',
    }, {
        headers: {
            'api-subscription-key': API_KEY,
            'Content-Type': 'application/json',
        },
    });
    const audioBytes = Buffer.from(ttsResponse.data.audios[0], 'base64').length;
    return `${detectedLang} → EN: "${englishText.substring(0, 40)}..." → AI → ${detectedLang}: "${hindiResponse.substring(0, 40)}..." → TTS: ${audioBytes} bytes`;
}
// ─── Run All Tests ──────────────────────────
async function main() {
    console.log('');
    console.log('═══════════════════════════════════════════════');
    console.log('  EIFS — Sarvam AI End-to-End Test Suite');
    console.log('═══════════════════════════════════════════════');
    console.log('');
    // Pre-flight checks
    if (!API_KEY) {
        console.error('  ✗ SARVAM_API_KEY not set in .env');
        process.exit(1);
    }
    console.log(`  API Key: ${API_KEY.substring(0, 8)}...${API_KEY.substring(API_KEY.length - 4)}`);
    console.log('');
    // ─── Text APIs ────────────────────────────
    console.log('── Text APIs ──────────────────────────────');
    await runTest('Language Identification (LID)', testLanguageIdentification);
    await runTest('Translation (EN → HI)', testTranslation);
    console.log('');
    // ─── Chat APIs ────────────────────────────
    console.log('── Chat Completion APIs ───────────────────');
    await runTest('Chat: sarvam-30b', testChatCompletion30B);
    await runTest('Chat: sarvam-105b', testChatCompletion105B);
    await runTest('Chat: Streaming (sarvam-105b)', testChatCompletionStreaming);
    console.log('');
    // ─── Speech APIs ──────────────────────────
    console.log('── Speech APIs ────────────────────────────');
    await runTest('TTS: English (bulbul:v3)', testTTS);
    await runTest('TTS: Hindi (bulbul:v3)', testTTSHindi);
    await runTest('TTS: Streaming (bulbul:v3)', testTTSStreaming);
    await runTest('STT: Speech-to-Text-Translate (saaras:v2.5)', testSTT);
    console.log('');
    // ─── Integration Tests ────────────────────
    console.log('── Integration Tests ──────────────────────');
    await runTest('Full Pipeline: Text → Extract → TTS', testFullPipeline);
    await runTest('Multilingual: HI → EN → AI → HI → TTS', testMultilingualPipeline);
    console.log('');
    // ─── Summary ──────────────────────────────
    console.log('═══════════════════════════════════════════════');
    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;
    const totalTime = results.reduce((sum, r) => sum + r.duration, 0);
    console.log(`  Results: ${passed} passed, ${failed} failed (${totalTime}ms total)`);
    if (failed > 0) {
        console.log('');
        console.log('  Failed tests:');
        results
            .filter((r) => !r.passed)
            .forEach((r) => console.log(`    ✗ ${r.name}: ${r.error}`));
    }
    console.log('═══════════════════════════════════════════════');
    console.log('');
    process.exit(failed > 0 ? 1 : 0);
}
main().catch((err) => {
    console.error('Test suite crashed:', err);
    process.exit(1);
});
//# sourceMappingURL=test-sarvam.js.map