"use strict";
// ──────────────────────────────────────────────
// EIFS — Live Voice Manager LIVE
// Gemini Live–style full-duplex streaming
// TRUE real-time: WebSocket STT + WS TTS + Streaming Chat
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
exports.createLiveSession = createLiveSession;
exports.getLiveSession = getLiveSession;
exports.deleteLiveSession = deleteLiveSession;
exports.getSessionsMap = getSessionsMap;
exports.getActiveSessionCount = getActiveSessionCount;
exports.getSessionStats = getSessionStats;
exports.handleMessage = handleMessage;
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const axios_1 = __importDefault(require("axios"));
const sarvam = __importStar(require("./sarvam"));
const SARVAM_BASE_URL = 'https://api.sarvam.ai';
const SARVAM_WS_URL = 'wss://api.sarvam.ai';
// ─── First Aid Knowledge Base ────────────────
const FIRST_AID_GUIDES = {
    road_accident: {
        steps: [
            'Ensure the scene is safe before approaching',
            'Check for responsiveness - tap shoulders and shout',
            'If unconscious but breathing, place in recovery position',
            'Apply direct pressure to bleeding wounds with clean cloth',
            'Do not move the person unless in immediate danger',
            'Keep them warm with a blanket or jacket',
        ],
        donts: [
            'Do not remove embedded objects',
            'Do not give food or water',
            'Do not move if spinal injury suspected',
        ],
    },
    fire: {
        steps: [
            'Stop, Drop, and Roll if clothes are on fire',
            'Cool burns under cool running water for 20 minutes',
            'Remove tight items before swelling occurs',
            'Cover burn with sterile non-stick bandage',
        ],
        donts: ['Do not use ice on burns', 'Do not apply butter or oil', 'Do not break blisters'],
    },
    medical: {
        steps: [
            'Keep the person calm and lying down',
            'Loosen tight clothing',
            'Check for breathing and pulse',
            'If unconscious, place in recovery position',
        ],
        donts: [
            'Do not give medication unless prescribed',
            'Do not give food or drink if unconscious',
            'Do not leave them alone',
        ],
    },
    flood: {
        steps: [
            'Move to highest ground or floor immediately',
            'Avoid walking or driving through flood waters',
            'Stay away from power lines',
            'Boil water before drinking if trapped',
        ],
        donts: [
            'Do not touch electrical equipment if wet',
            'Do not drink flood water',
            'Do not return until authorities say safe',
        ],
    },
    building_collapse: {
        steps: [
            'Cover mouth and nose with cloth',
            'Tap on pipes or walls to signal location',
            'Conserve energy and phone battery',
            'Stay near heavy furniture for air pockets',
        ],
        donts: [
            'Do not light matches or lighters',
            'Do not shout continuously - tap instead',
            'Do not move debris that may cause further collapse',
        ],
    },
    default: {
        steps: [
            'Stay calm and assess the situation',
            'Ensure your own safety first',
            'Check for injuries on yourself and others',
            'Call emergency services: 108 or 112',
        ],
        donts: ['Do not panic', 'Do not spread rumors', 'Do not block emergency routes'],
    },
};
const EMERGENCY_NUMBERS = [
    { name: 'Ambulance', number: '108' },
    { name: 'National Emergency', number: '112' },
    { name: 'Fire', number: '101' },
    { name: 'Police', number: '100' },
];
// ─── Language Config ─────────────────────────
const LANGUAGE_CONFIG = {
    'en-IN': { speaker: 'aditya', name: 'English' },
    'hi-IN': { speaker: 'amit', name: 'Hindi' },
    'bn-IN': { speaker: 'advait', name: 'Bengali' },
    'kn-IN': { speaker: 'mani', name: 'Kannada' },
    'ml-IN': { speaker: 'mohit', name: 'Malayalam' },
    'mr-IN': { speaker: 'manan', name: 'Marathi' },
    'od-IN': { speaker: 'advait', name: 'Odia' },
    'pa-IN': { speaker: 'priya', name: 'Punjabi' },
    'ta-IN': { speaker: 'tarun', name: 'Tamil' },
    'te-IN': { speaker: 'tanya', name: 'Telugu' },
    'gu-IN': { speaker: 'gokul', name: 'Gujarati' },
};
function normalizeLanguageCode(code) {
    const normalized = code.toLowerCase().replace('_', '-');
    if (LANGUAGE_CONFIG[normalized])
        return normalized;
    if (normalized.startsWith('en'))
        return 'en-IN';
    if (normalized.startsWith('hi'))
        return 'hi-IN';
    if (normalized.startsWith('ta'))
        return 'ta-IN';
    if (normalized.startsWith('te'))
        return 'te-IN';
    if (normalized.startsWith('kn'))
        return 'kn-IN';
    if (normalized.startsWith('ml'))
        return 'ml-IN';
    if (normalized.startsWith('bn'))
        return 'bn-IN';
    if (normalized.startsWith('mr'))
        return 'mr-IN';
    if (normalized.startsWith('gu'))
        return 'gu-IN';
    if (normalized.startsWith('pa'))
        return 'pa-IN';
    return 'en-IN';
}
// ─── In-Memory Session Store ─────────────────
const sessions = new Map();
// ─── Session Management ──────────────────────
function createLiveSession(ws, languageCode = 'en-IN') {
    const session = {
        sessionId: (0, uuid_1.v4)(),
        ws,
        languageCode: normalizeLanguageCode(languageCode),
        detectedLanguage: normalizeLanguageCode(languageCode),
        stage: 'idle',
        context: {},
        history: [],
        audioBuffer: [],
        isRecording: false,
        ttsWs: null,
        ttsReady: false,
        ttsQueue: [],
        ttsProcessing: false,
        isSpeaking: false,
        interruptRequested: false,
        createdAt: new Date(),
        lastActivity: new Date(),
        messageCount: 0,
    };
    sessions.set(session.sessionId, session);
    console.log(`[LiveMode] Session created: ${session.sessionId}, lang: ${languageCode}`);
    return session;
}
function getLiveSession(id) {
    return sessions.get(id);
}
function deleteLiveSession(id) {
    const session = sessions.get(id);
    if (session) {
        cleanupSession(session);
        sessions.delete(id);
        console.log(`[LiveMode] Session deleted: ${id}`);
    }
}
function cleanupSession(session) {
    if (session.silenceTimer)
        clearTimeout(session.silenceTimer);
    if (session.currentAbort)
        session.currentAbort.abort();
    closeTTSWebSocket(session);
    session.isRecording = false;
    session.isSpeaking = false;
}
function getSessionsMap() {
    return sessions;
}
function getActiveSessionCount() {
    return sessions.size;
}
function getSessionStats() {
    const byStage = {};
    for (const session of sessions.values()) {
        byStage[session.stage] = (byStage[session.stage] || 0) + 1;
    }
    return { total: sessions.size, byStage };
}
// ─── Send Message to Client ──────────────────
function sendToClient(session, message) {
    if (session.ws.readyState === ws_1.WebSocket.OPEN) {
        session.ws.send(JSON.stringify(message));
    }
}
// ─── TTS WebSocket Management ────────────────
async function ensureTTSWebSocket(session) {
    if (session.ttsWs && session.ttsReady)
        return;
    return new Promise((resolve, reject) => {
        const apiKey = process.env.SARVAM_API_KEY;
        if (!apiKey) {
            reject(new Error('SARVAM_API_KEY not set'));
            return;
        }
        const langConfig = LANGUAGE_CONFIG[session.detectedLanguage] || LANGUAGE_CONFIG['en-IN'];
        const wsUrl = `${SARVAM_WS_URL}/text-to-speech/ws`;
        console.log(`[LiveMode TTS WS] Connecting to ${wsUrl}`);
        const ttsWs = new ws_1.WebSocket(wsUrl, {
            headers: {
                'api-subscription-key': apiKey,
            },
        });
        session.ttsWs = ttsWs;
        ttsWs.on('open', () => {
            console.log(`[LiveMode TTS WS] Connected`);
            // Send config message
            const config = {
                type: 'config',
                target_language_code: session.detectedLanguage,
                speaker: langConfig.speaker,
                model: 'bulbul:v3',
                send_completion_event: true,
            };
            ttsWs.send(JSON.stringify(config));
            session.ttsReady = true;
            resolve();
        });
        ttsWs.on('message', (data) => {
            try {
                // Try parsing as JSON first (control messages)
                const msg = JSON.parse(data.toString());
                if (msg.type === 'completion') {
                    // TTS for this text is complete
                    session.ttsProcessing = false;
                    processTTSQueue(session);
                }
                else if (msg.type === 'error') {
                    console.error('[LiveMode TTS WS] Error:', msg.message);
                }
            }
            catch {
                // Binary data = audio chunk - forward to client immediately
                if (session.interruptRequested)
                    return;
                const base64 = data.toString('base64');
                sendToClient(session, {
                    type: 'audio_chunk',
                    data: base64,
                    format: 'wav',
                });
            }
        });
        ttsWs.on('error', (err) => {
            console.error('[LiveMode TTS WS] Error:', err.message);
            session.ttsReady = false;
            reject(err);
        });
        ttsWs.on('close', () => {
            console.log('[LiveMode TTS WS] Closed');
            session.ttsReady = false;
            session.ttsWs = null;
        });
        // Timeout
        setTimeout(() => {
            if (!session.ttsReady) {
                reject(new Error('TTS WebSocket connection timeout'));
            }
        }, 10000);
    });
}
function closeTTSWebSocket(session) {
    if (session.ttsWs) {
        try {
            session.ttsWs.close();
        }
        catch { }
        session.ttsWs = null;
        session.ttsReady = false;
    }
}
async function sendTextToTTS(session, text) {
    session.ttsQueue.push(text);
    await processTTSQueue(session);
}
async function processTTSQueue(session) {
    if (session.ttsProcessing || session.ttsQueue.length === 0 || session.interruptRequested)
        return;
    session.ttsProcessing = true;
    const text = session.ttsQueue.shift();
    try {
        // Try WebSocket TTS first
        await ensureTTSWebSocket(session);
        if (session.ttsWs && session.ttsReady) {
            // Send text via WebSocket for streaming audio
            session.ttsWs.send(JSON.stringify({
                type: 'text',
                text: text,
            }));
            // Send flush to trigger audio generation
            session.ttsWs.send(JSON.stringify({ type: 'flush' }));
            return;
        }
    }
    catch (err) {
        console.warn('[LiveMode] TTS WS failed, falling back to REST:', err);
    }
    // Fallback: REST TTS with streaming
    try {
        await streamTTSRest(session, text);
    }
    catch (err) {
        console.error('[LiveMode] REST TTS also failed:', err);
    }
    session.ttsProcessing = false;
    processTTSQueue(session);
}
async function streamTTSRest(session, text) {
    if (session.interruptRequested)
        return;
    try {
        const audioBuffer = await sarvam.textToSpeech(text, session.detectedLanguage);
        if (session.interruptRequested)
            return;
        sendToClient(session, {
            type: 'audio_chunk',
            data: audioBuffer.toString('base64'),
            format: 'mp3',
        });
    }
    catch (err) {
        console.error('[LiveMode REST TTS] Failed:', err);
    }
}
// ─── Handle Incoming Messages ────────────────
async function handleMessage(session, message) {
    const startTime = Date.now();
    try {
        switch (message.type) {
            case 'start':
                await handleStart(session, message.language);
                break;
            case 'audio_chunk':
                await handleAudioChunk(session, message.data);
                break;
            case 'audio_end':
                await handleAudioEnd(session);
                break;
            case 'interrupt':
                await handleInterrupt(session);
                break;
            case 'ping':
                sendToClient(session, { type: 'pong' });
                break;
        }
    }
    catch (error) {
        console.error('[LiveMode] Error handling message:', error);
        sendToClient(session, { type: 'error', message: error.message });
    }
    const elapsed = Date.now() - startTime;
    if (elapsed > 100) {
        console.log(`[LiveMode] Message handled in ${elapsed}ms: ${message.type}`);
    }
}
// ─── Start Session ───────────────────────────
async function handleStart(session, language) {
    if (language) {
        session.languageCode = normalizeLanguageCode(language);
        session.detectedLanguage = normalizeLanguageCode(language);
    }
    session.stage = 'greeting';
    session.isRecording = true;
    session.audioBuffer = [];
    session.messageCount = 0;
    sendToClient(session, {
        type: 'status',
        status: 'Session started',
        stage: 'greeting',
    });
    // Greeting in selected language
    const greetings = {
        'en-IN': "Hello, I'm your Emergency Response Assistant. Please tell me what emergency you're facing.",
        'hi-IN': 'नमस्ते, मैं आपका आपातकालीन सहायक हूँ। कृपया बताएं कि आप किस आपात स्थिति का सामना कर रहे हैं।',
        'ta-IN': 'வணக்கம், நான் உங்கள் அவசர உதவி உதவியாளர். நீங்கள் எந்த அவசரநிலையை எதிர்கொள்கிறீர்கள் என்பதைச் சொல்லுங்கள்.',
        'te-IN': 'హలో, నేను మీ అత్యవసర స్పందన సహాయకుడిని. మీరు ఎదుర్కొంటున్న అత్యవసర పరిస్థితిని దయచేసి చెప్పండి.',
        'kn-IN': 'ನಮಸ್ಕಾರ, ನಾನು ನಿಮ್ಮ ತುರ್ತು ಪ್ರತಿಕ್ರಿಯೆ ಸಹಾಯಕ. ದಯವಿಟ್ಟು ನೀವು ಎದುರಿಸುತ್ತಿರುವ ತುರ್ತು ಪರಿಸ್ಥಿತಿಯನ್ನು ಹೇಳಿ.',
        'ml-IN': 'ഹലോ, ഞാൻ നിങ്ങളുടെ അടിയന്തര പ്രതികരണ സഹായി ആണ്. നിങ്ങൾ അഭിമുഖീകരിക്കുന്ന അടിയന്തര സാഹചര്യം ദയവായി പറയുക.',
        'bn-IN': 'হ্যালো, আমি আপনার জরুরী সহায়তা সহায়ক। দয়া করে বলুন আপনি কোন জরুরী পরিস্থিতির সম্মুখীন হচ্ছেন।',
        'mr-IN': 'नमस्कार, मी तुमचा आपत्कालीन प्रतिसाद सहाय्यक आहे. कृपया सांगा की तुम्ही कोणत्या आपत्कालीन परिस्थितीला सामोरे जात आहात.',
        'gu-IN': 'નમસ્તે, હું તમારો કટોકટી પ્રતિસાદ સહાયક છું. કૃપા કરીને કહો કે તમે કઈ કટોકટીની સ્થિતિનો સામનો કરી રહ્યા છો.',
    };
    const greeting = greetings[session.languageCode] || greetings['en-IN'];
    session.history.push({ role: 'agent', content: greeting, timestamp: new Date() });
    // Send text response immediately
    sendToClient(session, {
        type: 'agent_response',
        text: greeting,
        actions: [
            {
                type: 'calming_exercise',
                title: 'Take a Deep Breath',
                content: 'Breathe in for 4 seconds, hold for 4, breathe out for 4.',
            },
        ],
    });
    // Generate and stream audio
    session.stage = 'speaking';
    session.isSpeaking = true;
    sendToClient(session, {
        type: 'status',
        status: 'Speaking...',
        stage: 'speaking',
    });
    try {
        await streamAudioSentences(session, greeting);
    }
    catch (err) {
        console.error('[LiveMode] Greeting TTS failed:', err);
    }
    if (!session.interruptRequested) {
        session.stage = 'listening';
        session.isSpeaking = false;
        session.isRecording = true;
        sendToClient(session, {
            type: 'status',
            status: 'Listening...',
            stage: 'listening',
        });
    }
    session.lastActivity = new Date();
}
// ─── Handle Audio Chunk ──────────────────────
async function handleAudioChunk(session, base64Data) {
    if (!session.isRecording)
        return;
    const chunk = Buffer.from(base64Data, 'base64');
    session.audioBuffer.push(chunk);
    // Cap buffer at ~30 seconds
    const currentSize = session.audioBuffer.reduce((sum, buf) => sum + buf.length, 0);
    if (currentSize > 16000 * 2 * 30) {
        await processBufferedAudio(session);
        session.audioBuffer = [];
    }
    // Reset silence timer - 1.5s for natural pauses
    if (session.silenceTimer)
        clearTimeout(session.silenceTimer);
    session.silenceTimer = setTimeout(async () => {
        await handleAudioEnd(session);
    }, 1500);
    session.lastActivity = new Date();
}
// ─── Handle Audio End ────────────────────────
async function handleAudioEnd(session) {
    if (session.audioBuffer.length === 0)
        return;
    session.isRecording = false;
    if (session.silenceTimer)
        clearTimeout(session.silenceTimer);
    await processBufferedAudio(session);
}
// ─── Process Buffered Audio ──────────────────
async function processBufferedAudio(session) {
    if (session.audioBuffer.length === 0)
        return;
    session.stage = 'processing';
    const startTime = Date.now();
    sendToClient(session, {
        type: 'status',
        status: 'Processing...',
        stage: 'processing',
    });
    try {
        const combinedAudio = Buffer.concat(session.audioBuffer);
        session.audioBuffer = [];
        // Skip very short audio
        if (combinedAudio.length < 9600) {
            session.isRecording = true;
            session.stage = 'listening';
            sendToClient(session, { type: 'status', status: 'Listening...', stage: 'listening' });
            return;
        }
        // STT with translation
        const sttResult = await sarvam.speechToText(combinedAudio, 'voice.webm');
        const transcript = sttResult.transcript;
        const detectedLang = sttResult.language_code;
        if (!transcript || transcript.trim().length === 0) {
            session.isRecording = true;
            session.stage = 'listening';
            sendToClient(session, {
                type: 'status',
                status: "I didn't catch that. Please speak again.",
                stage: 'listening',
            });
            return;
        }
        session.detectedLanguage = detectedLang;
        // Translate if needed
        let translatedText = transcript;
        if (detectedLang !== 'en-IN' && detectedLang !== 'en') {
            try {
                translatedText = await sarvam.translate(transcript, detectedLang, 'en-IN');
            }
            catch {
                translatedText = transcript;
            }
        }
        // Send transcript to client
        sendToClient(session, {
            type: 'transcript',
            text: transcript,
            translatedText: translatedText !== transcript ? translatedText : undefined,
            isFinal: true,
            language: detectedLang,
        });
        const processingTime = Date.now() - startTime;
        console.log(`[LiveMode] STT+Translate: ${processingTime}ms`);
        // Process with AI using STREAMING
        await processWithStreamingAI(session, transcript, translatedText);
    }
    catch (error) {
        console.error('[LiveMode] Processing failed:', error);
        sendToClient(session, { type: 'error', message: 'Failed to process audio.' });
        session.isRecording = true;
        session.stage = 'listening';
        sendToClient(session, { type: 'status', status: 'Listening...', stage: 'listening' });
    }
}
// ─── Process with Streaming AI ───────────────
async function processWithStreamingAI(session, originalMessage, translatedMessage) {
    const startTime = Date.now();
    session.history.push({
        role: 'user',
        content: originalMessage,
        translatedContent: translatedMessage,
        timestamp: new Date(),
    });
    session.context.lastUserMessage = originalMessage;
    session.context.translatedMessage = translatedMessage;
    extractContext(session, translatedMessage);
    session.stage = 'speaking';
    session.isSpeaking = true;
    session.interruptRequested = false;
    sendToClient(session, { type: 'status', status: 'Thinking...', stage: 'processing' });
    const abort = new AbortController();
    session.currentAbort = abort;
    try {
        // Stream AI response token by token
        let fullResponse = '';
        let sentenceBuffer = '';
        let sentencesSent = [];
        let firstTokenTime = null;
        // Send the text response to client as it streams
        sendToClient(session, { type: 'agent_response_start' });
        const history = session.history
            .slice(-6)
            .map((h) => `${h.role === 'user' ? 'User' : 'Agent'}: ${h.translatedContent || h.content}`)
            .join('\n');
        const contextStr = JSON.stringify(session.context);
        const prompt = `Current context: ${contextStr}

Recent conversation:
${history}

User just said: "${translatedMessage}"

Respond as the Emergency AI Agent. Be concise (2-3 sentences max), empathetic, and actionable. Focus on helping them stay calm while gathering critical information. Keep it short for natural voice delivery.`;
        const apiKey = process.env.SARVAM_API_KEY;
        const response = await axios_1.default.post(`${SARVAM_BASE_URL}/v1/chat/completions`, {
            model: 'sarvam-105b',
            messages: [
                {
                    role: 'system',
                    content: 'You are an Emergency Response AI Agent. Your tone is calm, empathetic, and professional. Keep responses VERY brief (2-3 sentences) for voice delivery. Help people through emergencies by gathering information and providing first aid guidance.',
                },
                { role: 'user', content: prompt },
            ],
            temperature: 0.7,
            max_tokens: 2048,
            stream: true,
        }, {
            headers: {
                Authorization: `Bearer ${apiKey}`,
                'api-subscription-key': apiKey,
                'Content-Type': 'application/json',
            },
            responseType: 'stream',
            signal: abort.signal,
        });
        const stream = response.data;
        let buffer = '';
        await new Promise((resolve, reject) => {
            stream.on('data', (chunk) => {
                if (session.interruptRequested || abort.signal.aborted) {
                    stream.destroy();
                    resolve();
                    return;
                }
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
                                if (!firstTokenTime) {
                                    firstTokenTime = Date.now();
                                    console.log(`[LiveMode] First token in ${firstTokenTime - startTime}ms`);
                                }
                                fullResponse += token;
                                sentenceBuffer += token;
                                // Stream text token to client
                                sendToClient(session, {
                                    type: 'agent_token',
                                    token: token,
                                });
                                // Check if we have a complete sentence to TTS
                                const sentenceEnd = sentenceBuffer.match(/[.!?।]\s*/);
                                if (sentenceEnd && sentenceBuffer.trim().length >= 20) {
                                    const sentence = sentenceBuffer.trim();
                                    sentenceBuffer = '';
                                    sentencesSent.push(sentence);
                                    // Start TTS for this sentence immediately (don't await)
                                    triggerSentenceTTS(session, sentence).catch((err) => console.error('[LiveMode] Sentence TTS error:', err));
                                }
                            }
                        }
                        catch { }
                    }
                }
            });
            stream.on('end', () => resolve());
            stream.on('error', (err) => {
                if (err.message !== 'Aborted')
                    reject(err);
                else
                    resolve();
            });
        });
        // Handle remaining text in buffer
        if (sentenceBuffer.trim().length > 0 && !session.interruptRequested) {
            const remaining = sentenceBuffer.trim();
            sentencesSent.push(remaining);
            await triggerSentenceTTS(session, remaining);
        }
        // If streaming failed or returned empty, use fallback
        if (!fullResponse) {
            fullResponse = getFallbackResponse();
        }
        // Translate response if needed
        let finalResponse = fullResponse;
        if (session.detectedLanguage !== 'en-IN' && session.detectedLanguage !== 'en') {
            try {
                finalResponse = await sarvam.translate(fullResponse, 'en-IN', session.detectedLanguage);
            }
            catch {
                finalResponse = fullResponse;
            }
        }
        // Send complete response
        const actions = generateActions(session);
        sendToClient(session, {
            type: 'agent_response',
            text: finalResponse,
            originalText: fullResponse,
            actions,
        });
        session.history.push({
            role: 'agent',
            content: finalResponse,
            translatedContent: fullResponse,
            timestamp: new Date(),
        });
        session.context.lastAgentResponse = finalResponse;
        // If response was in non-English and TTS was done in English, redo in target language
        if (finalResponse !== fullResponse && !session.interruptRequested) {
            // Send audio for translated version
            sendToClient(session, { type: 'status', status: 'Speaking...', stage: 'speaking' });
            await streamAudioSentences(session, finalResponse);
        }
        sendToClient(session, { type: 'audio_end' });
    }
    catch (error) {
        if (error.message !== 'Aborted' && !session.interruptRequested) {
            console.error('[LiveMode] AI streaming failed:', error);
            // Fallback to non-streaming
            const fallback = getFallbackResponse();
            sendToClient(session, { type: 'agent_response', text: fallback });
            await streamAudioSentences(session, fallback);
            sendToClient(session, { type: 'audio_end' });
        }
    }
    // Move to listening state
    if (!session.interruptRequested && session.ws.readyState === ws_1.WebSocket.OPEN) {
        session.stage = 'listening';
        session.isSpeaking = false;
        session.isRecording = true;
        sendToClient(session, { type: 'status', status: 'Listening...', stage: 'listening' });
    }
    session.lastActivity = new Date();
    const totalTime = Date.now() - startTime;
    console.log(`[LiveMode] Full processing: ${totalTime}ms`);
}
// ─── TTS for Individual Sentences ────────────
async function triggerSentenceTTS(session, text) {
    if (session.interruptRequested)
        return;
    session.isSpeaking = true;
    sendToClient(session, { type: 'status', status: 'Speaking...', stage: 'speaking' });
    try {
        // For English responses, try WebSocket TTS first, then fall back to REST
        await sendTextToTTS(session, text);
    }
    catch (err) {
        console.error('[LiveMode] Sentence TTS failed:', err);
        // Fallback to standard REST TTS
        await streamTTSRest(session, text);
    }
}
// ─── Stream Audio via Sentences ──────────────
async function streamAudioSentences(session, text) {
    const sentences = sarvam.splitIntoSentences(text);
    console.log(`[LiveMode] Streaming ${sentences.length} sentence(s) as audio`);
    for (const sentence of sentences) {
        if (session.interruptRequested)
            return;
        try {
            // Try streaming TTS first
            try {
                await sarvam.textToSpeechStream(sentence, session.detectedLanguage, (chunk) => {
                    if (session.interruptRequested)
                        return;
                    sendToClient(session, {
                        type: 'audio_chunk',
                        data: chunk.toString('base64'),
                        format: 'mp3',
                    });
                }, session.currentAbort?.signal);
            }
            catch {
                // Fallback to standard TTS
                const audioBuffer = await sarvam.textToSpeech(sentence, session.detectedLanguage);
                if (session.interruptRequested)
                    return;
                sendToClient(session, {
                    type: 'audio_chunk',
                    data: audioBuffer.toString('base64'),
                    format: 'mp3',
                });
            }
        }
        catch (err) {
            if (err.message === 'Interrupted')
                return;
            console.error('[LiveMode] Sentence TTS failed:', err);
        }
    }
}
// ─── Handle Interrupt ────────────────────────
async function handleInterrupt(session) {
    console.log(`[LiveMode] Interrupt for session ${session.sessionId}`);
    session.interruptRequested = true;
    session.isSpeaking = false;
    session.ttsQueue = [];
    session.ttsProcessing = false;
    if (session.currentAbort) {
        session.currentAbort.abort();
        session.currentAbort = undefined;
    }
    session.audioBuffer = [];
    session.stage = 'listening';
    session.isRecording = true;
    session.interruptRequested = false;
    if (session.silenceTimer)
        clearTimeout(session.silenceTimer);
    sendToClient(session, { type: 'interrupted' });
    sendToClient(session, { type: 'status', status: 'Listening...', stage: 'listening' });
}
// ─── Context Extraction ──────────────────────
function extractContext(session, message) {
    const lowerMsg = message.toLowerCase();
    const ctx = session.context;
    if (!ctx.emergencyType) {
        if (lowerMsg.includes('fire') || lowerMsg.includes('burn') || lowerMsg.includes('flame'))
            ctx.emergencyType = 'fire';
        else if (lowerMsg.includes('accident') ||
            lowerMsg.includes('crash') ||
            lowerMsg.includes('collision') ||
            lowerMsg.includes('car') ||
            lowerMsg.includes('bike'))
            ctx.emergencyType = 'road_accident';
        else if (lowerMsg.includes('flood') ||
            lowerMsg.includes('water') ||
            lowerMsg.includes('drowning'))
            ctx.emergencyType = 'flood';
        else if (lowerMsg.includes('collapse') || lowerMsg.includes('building'))
            ctx.emergencyType = 'building_collapse';
        else if (lowerMsg.includes('medical') ||
            lowerMsg.includes('heart') ||
            lowerMsg.includes('breathing') ||
            lowerMsg.includes('unconscious') ||
            lowerMsg.includes('pain'))
            ctx.emergencyType = 'medical';
    }
    if (!ctx.location) {
        const locationPatterns = [
            /at\s+([^.!,]+)/i,
            /in\s+([^.!,]+)/i,
            /near\s+([^.!,]+)/i,
            /location[\s:is]+([^.!,]+)/i,
            /([\w\s]+(?:road|street|avenue|highway|junction|signal|market|mall|hospital|school))/i,
        ];
        for (const pattern of locationPatterns) {
            const match = message.match(pattern);
            if (match) {
                ctx.location = match[1].trim();
                break;
            }
        }
    }
    if (!ctx.peopleAffected) {
        const numberMatch = message.match(/(\d+)\s*(people|persons|individuals|victims|injured|hurt)/i);
        if (numberMatch)
            ctx.peopleAffected = parseInt(numberMatch[1], 10);
    }
    if (!ctx.severity) {
        if (lowerMsg.includes('critical') ||
            lowerMsg.includes('dying') ||
            lowerMsg.includes('death') ||
            lowerMsg.includes('severe'))
            ctx.severity = 'critical';
        else if (lowerMsg.includes('bad') || lowerMsg.includes('major'))
            ctx.severity = 'high';
        else if (lowerMsg.includes('minor') || lowerMsg.includes('small') || lowerMsg.includes('okay'))
            ctx.severity = 'low';
    }
}
// ─── Generate Actions ────────────────────────
function generateActions(session) {
    const actions = [];
    const ctx = session.context;
    if (session.history.length < 4) {
        actions.push({
            type: 'calming_exercise',
            title: 'Take a Deep Breath',
            content: 'Breathe in for 4 seconds, hold for 4, breathe out for 4. Repeat 3 times.',
        });
    }
    if (ctx.emergencyType) {
        const guide = FIRST_AID_GUIDES[ctx.emergencyType] || FIRST_AID_GUIDES.default;
        actions.push({
            type: 'first_aid',
            title: 'Immediate First Aid',
            content: guide.steps.slice(0, 4).join('\n'),
        });
        actions.push({
            type: 'precaution',
            title: 'Important Precautions',
            content: guide.donts.slice(0, 3).join('\n'),
        });
    }
    actions.push({
        type: 'emergency_number',
        title: 'Emergency Contacts',
        content: EMERGENCY_NUMBERS.map((e) => `${e.name}: ${e.number}`).join('\n'),
    });
    return actions;
}
// ─── Fallback Response ───────────────────────
function getFallbackResponse() {
    const fallbacks = [
        "I'm here to help. Can you tell me more about what's happening?",
        "I understand this is difficult. Stay calm, and let's work through this together.",
        'Thank you for that information. Can you tell me your exact location?',
        'Help is available. Let me guide you through the next steps.',
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
// ─── Cleanup Old Sessions ────────────────────
setInterval(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000;
    for (const [id, session] of sessions.entries()) {
        if (now - session.lastActivity.getTime() > maxAge) {
            console.log(`[LiveMode] Cleaning up expired session: ${id}`);
            if (session.ws.readyState === ws_1.WebSocket.OPEN) {
                session.ws.close(1000, 'Session timeout');
            }
            cleanupSession(session);
            sessions.delete(id);
        }
    }
}, 5 * 60 * 1000);
//# sourceMappingURL=liveVoiceManagerLive.js.map