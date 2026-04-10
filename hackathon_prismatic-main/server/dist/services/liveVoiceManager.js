"use strict";
// ──────────────────────────────────────────────
// EIFS — Live Voice Conversation Manager
// Real-time bidirectional audio streaming with AI
// Like Gemini Live / ChatGPT Voice Mode
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.createLiveSession = createLiveSession;
exports.getLiveSession = getLiveSession;
exports.deleteLiveSession = deleteLiveSession;
exports.updateSessionActivity = updateSessionActivity;
exports.sendToClient = sendToClient;
exports.handleMessage = handleMessage;
exports.getActiveSessionCount = getActiveSessionCount;
const ws_1 = require("ws");
const uuid_1 = require("uuid");
const sarvam = __importStar(require("./sarvam"));
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
            'Cover face with hands while rolling',
            'Cool burns under cool running water for 20 minutes',
            'Remove tight items before swelling occurs',
            'Cover burn with sterile non-stick bandage',
        ],
        donts: [
            'Do not use ice on burns',
            'Do not apply butter, oil, or ointments',
            'Do not break blisters',
        ],
    },
    medical: {
        steps: [
            'Keep the person calm and lying down',
            'Loosen tight clothing',
            'Check for breathing and pulse',
            'If unconscious, place in recovery position',
            'Note symptoms and time of onset',
        ],
        donts: [
            'Do not give medication unless prescribed',
            'Do not give food or drink if unconscious',
            'Do not leave them alone',
        ],
    },
    building_collapse: {
        steps: [
            'Cover mouth and nose with cloth',
            'Tap on pipes or walls to signal location',
            'Conserve energy and phone battery',
            'Stay near heavy furniture that may create air pockets',
        ],
        donts: [
            'Do not light matches or lighters',
            'Do not shout continuously - tap instead',
            'Do not move debris that may cause further collapse',
        ],
    },
    flood: {
        steps: [
            'Move to highest ground or floor immediately',
            'Avoid walking or driving through flood waters',
            'Stay away from power lines and electrical wires',
            'Boil water before drinking if trapped',
        ],
        donts: [
            'Do not touch electrical equipment if wet',
            'Do not drink flood water',
            'Do not return home until authorities say it is safe',
        ],
    },
    default: {
        steps: [
            'Stay calm and assess the situation',
            'Ensure your own safety first',
            'Check for injuries on yourself and others',
            'Call emergency services: 108 or 112',
            'Follow instructions from authorities',
        ],
        donts: [
            'Do not panic',
            'Do not spread rumors',
            'Do not block emergency routes',
        ],
    },
};
const EMERGENCY_NUMBERS = [
    { name: 'Ambulance', number: '108' },
    { name: 'National Emergency', number: '112' },
    { name: 'Fire', number: '101' },
    { name: 'Police', number: '100' },
];
// ─── In-Memory Session Store ─────────────────
const sessions = new Map();
// ─── Session Management ──────────────────────
function createLiveSession(ws, languageCode = 'en-IN') {
    const session = {
        sessionId: (0, uuid_1.v4)(),
        ws,
        languageCode,
        stage: 'greeting',
        context: {},
        history: [],
        audioBuffer: [],
        isRecording: false,
        createdAt: new Date(),
        lastActivity: new Date(),
    };
    sessions.set(session.sessionId, session);
    return session;
}
function getLiveSession(sessionId) {
    return sessions.get(sessionId);
}
function deleteLiveSession(sessionId) {
    const session = sessions.get(sessionId);
    if (session) {
        if (session.silenceTimer) {
            clearTimeout(session.silenceTimer);
        }
        sessions.delete(sessionId);
    }
}
function updateSessionActivity(session) {
    session.lastActivity = new Date();
}
// ─── Send Message to Client ──────────────────
function sendToClient(session, message) {
    if (session.ws.readyState === ws_1.WebSocket.OPEN) {
        session.ws.send(JSON.stringify(message));
    }
}
// ─── Handle Incoming Messages ────────────────
async function handleMessage(session, message) {
    try {
        switch (message.type) {
            case 'start':
                await handleStart(session, message.language);
                break;
            case 'audio':
                await handleAudioChunk(session, message.data);
                break;
            case 'stop':
                await handleStop(session);
                break;
            case 'interrupt':
                handleInterrupt(session);
                break;
            case 'ping':
                sendToClient(session, { type: 'pong' });
                break;
        }
    }
    catch (error) {
        console.error('[LiveVoice] Error handling message:', error);
        sendToClient(session, { type: 'error', message: error.message });
    }
}
// ─── Start Live Session ──────────────────────
async function handleStart(session, language) {
    if (language) {
        session.languageCode = language;
    }
    session.stage = 'greeting';
    session.isRecording = true;
    session.audioBuffer = [];
    sendToClient(session, {
        type: 'status',
        status: 'Session started. Listening...',
        stage: session.stage,
    });
    // Send greeting message
    const greeting = "Hello, I'm your Emergency Response Assistant. I'm here to help you. Please tell me what emergency you're facing.";
    // Add to history
    session.history.push({
        role: 'agent',
        content: greeting,
        timestamp: new Date(),
    });
    // Send text response
    sendToClient(session, {
        type: 'agent_response',
        text: greeting,
        actions: [{
                type: 'calming_exercise',
                title: 'Take a Deep Breath',
                content: 'Breathe in for 4 seconds, hold for 4, breathe out for 4.',
            }],
    });
    // Generate and send audio
    try {
        const audioBuffer = await sarvam.textToSpeech(greeting, session.languageCode);
        session.stage = 'idle';
        sendToClient(session, {
            type: 'audio',
            data: audioBuffer.toString('base64'),
        });
        sendToClient(session, {
            type: 'status',
            status: 'Listening...',
            stage: 'listening',
        });
    }
    catch (error) {
        console.error('[LiveVoice] TTS failed:', error);
    }
    updateSessionActivity(session);
}
// ─── Handle Audio Chunk ──────────────────────
async function handleAudioChunk(session, base64Data) {
    if (!session.isRecording)
        return;
    // Add chunk to buffer
    const chunk = Buffer.from(base64Data, 'base64');
    session.audioBuffer.push(chunk);
    // Reset silence timer
    if (session.silenceTimer) {
        clearTimeout(session.silenceTimer);
    }
    // Set new silence timer - process after 1.5 seconds of silence
    session.silenceTimer = setTimeout(async () => {
        await processBufferedAudio(session);
    }, 1500);
    updateSessionActivity(session);
}
// ─── Process Buffered Audio ──────────────────
async function processBufferedAudio(session) {
    if (session.audioBuffer.length === 0)
        return;
    session.stage = 'processing';
    session.isRecording = false;
    sendToClient(session, {
        type: 'status',
        status: 'Processing...',
        stage: 'processing',
    });
    try {
        // Combine audio chunks
        const combinedAudio = Buffer.concat(session.audioBuffer);
        session.audioBuffer = [];
        // Skip if audio is too short (less than 0.5 seconds at 16kHz)
        if (combinedAudio.length < 16000) {
            session.isRecording = true;
            session.stage = 'listening';
            sendToClient(session, {
                type: 'status',
                status: 'Listening...',
                stage: 'listening',
            });
            return;
        }
        // Convert to speech
        const sttResult = await sarvam.speechToText(combinedAudio, 'voice.webm');
        const transcript = sttResult.transcript;
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
        // Update language if detected
        session.languageCode = sttResult.language_code;
        // Send transcript to client
        sendToClient(session, {
            type: 'transcript',
            text: transcript,
            isFinal: true,
        });
        // Process with AI
        await processWithAI(session, transcript);
    }
    catch (error) {
        console.error('[LiveVoice] Processing failed:', error);
        sendToClient(session, {
            type: 'error',
            message: 'Failed to process audio. Please try again.',
        });
        session.isRecording = true;
        session.stage = 'listening';
        sendToClient(session, {
            type: 'status',
            status: 'Listening...',
            stage: 'listening',
        });
    }
}
// ─── Process with AI ─────────────────────────
async function processWithAI(session, userMessage) {
    // Add to history
    session.history.push({
        role: 'user',
        content: userMessage,
        timestamp: new Date(),
    });
    session.context.lastUserMessage = userMessage;
    // Extract context
    extractContext(session, userMessage);
    // Generate response
    const response = await generateAIResponse(session, userMessage);
    // Add to history
    session.history.push({
        role: 'agent',
        content: response.text,
        timestamp: new Date(),
    });
    session.context.lastAgentResponse = response.text;
    // Send text response
    const actions = generateActions(session);
    sendToClient(session, {
        type: 'agent_response',
        text: response.text,
        actions,
    });
    // Generate and stream audio
    session.stage = 'speaking';
    sendToClient(session, {
        type: 'status',
        status: 'Speaking...',
        stage: 'speaking',
    });
    try {
        const audioBuffer = await sarvam.textToSpeech(response.text, session.languageCode);
        sendToClient(session, {
            type: 'audio',
            data: audioBuffer.toString('base64'),
        });
        // Wait a bit then start listening again
        setTimeout(() => {
            if (session.ws.readyState === ws_1.WebSocket.OPEN) {
                session.stage = 'listening';
                session.isRecording = true;
                sendToClient(session, {
                    type: 'status',
                    status: 'Listening...',
                    stage: 'listening',
                });
            }
        }, 500);
    }
    catch (error) {
        console.error('[LiveVoice] TTS failed:', error);
        session.stage = 'listening';
        session.isRecording = true;
        sendToClient(session, {
            type: 'status',
            status: 'Listening...',
            stage: 'listening',
        });
    }
    // Update stage
    updateStage(session);
    updateSessionActivity(session);
}
// ─── Handle Stop ─────────────────────────────
async function handleStop(session) {
    session.isRecording = false;
    if (session.silenceTimer) {
        clearTimeout(session.silenceTimer);
    }
    // Process any remaining audio
    if (session.audioBuffer.length > 0) {
        await processBufferedAudio(session);
    }
}
// ─── Handle Interrupt ────────────────────────
function handleInterrupt(session) {
    // Stop current audio playback on client side
    session.stage = 'listening';
    session.isRecording = true;
    session.audioBuffer = [];
    if (session.silenceTimer) {
        clearTimeout(session.silenceTimer);
    }
    sendToClient(session, {
        type: 'status',
        status: 'Interrupted. Listening...',
        stage: 'listening',
    });
}
// ─── Context Extraction ──────────────────────
function extractContext(session, message) {
    const lowerMsg = message.toLowerCase();
    const ctx = session.context;
    // Emergency type detection
    if (!ctx.emergencyType) {
        if (lowerMsg.includes('fire') || lowerMsg.includes('burn') || lowerMsg.includes('flame')) {
            ctx.emergencyType = 'fire';
        }
        else if (lowerMsg.includes('accident') || lowerMsg.includes('crash') || lowerMsg.includes('collision') || lowerMsg.includes('car') || lowerMsg.includes('bike')) {
            ctx.emergencyType = 'road_accident';
        }
        else if (lowerMsg.includes('flood') || lowerMsg.includes('water') || lowerMsg.includes('drowning') || lowerMsg.includes('rain')) {
            ctx.emergencyType = 'flood';
        }
        else if (lowerMsg.includes('collapse') || lowerMsg.includes('building') || lowerMsg.includes('fall') || lowerMsg.includes('structure')) {
            ctx.emergencyType = 'building_collapse';
        }
        else if (lowerMsg.includes('medical') || lowerMsg.includes('heart') || lowerMsg.includes('breathing') || lowerMsg.includes('unconscious') || lowerMsg.includes('pain')) {
            ctx.emergencyType = 'medical';
        }
    }
    // Location extraction
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
    // People affected
    if (!ctx.peopleAffected) {
        const numberMatch = message.match(/(\d+)\s*(people|persons|individuals|victims|injured|hurt)/i);
        if (numberMatch) {
            ctx.peopleAffected = parseInt(numberMatch[1], 10);
        }
    }
    // Severity detection
    if (!ctx.severity) {
        if (lowerMsg.includes('critical') || lowerMsg.includes('dying') || lowerMsg.includes('death') || lowerMsg.includes('severe') || lowerMsg.includes('serious')) {
            ctx.severity = 'critical';
        }
        else if (lowerMsg.includes('bad') || lowerMsg.includes('major') || lowerMsg.includes('badly')) {
            ctx.severity = 'high';
        }
        else if (lowerMsg.includes('minor') || lowerMsg.includes('small') || lowerMsg.includes('okay') || lowerMsg.includes('fine')) {
            ctx.severity = 'low';
        }
    }
}
// ─── Generate AI Response ────────────────────
async function generateAIResponse(session, userMessage) {
    const stageInstructions = {
        greeting: `You're starting an emergency conversation. Be warm, professional, and calming. Acknowledge their situation and ask one clear follow-up question.`,
        listening: `You're listening to the emergency details. Show empathy, acknowledge what they said, and guide them to provide the most important information (location, injuries, severity).`,
        processing: `You're processing the emergency information. Be reassuring and provide clear next steps.`,
    };
    const history = session.history
        .slice(-6)
        .map((h) => `${h.role === 'user' ? 'User' : 'Agent'}: ${h.content}`)
        .join('\n');
    const context = JSON.stringify(session.context);
    const prompt = `${stageInstructions[session.stage] || stageInstructions.greeting}

Current context: ${context}

Recent conversation:
${history}

User just said: "${userMessage}"

Respond as the Emergency AI Agent. Be concise (2-4 sentences), empathetic, and actionable. Focus on helping them stay calm while gathering critical information.`;
    try {
        const client = (await Promise.resolve().then(() => __importStar(require('./sarvam')))).getSarvamChatClient();
        const response = await client.post('/v1/chat/completions', {
            model: 'sarvam-30b',
            messages: [
                {
                    role: 'system',
                    content: 'You are an Emergency Response AI Agent. Your tone is calm, empathetic, and professional. Keep responses brief for voice delivery. You help people through emergencies by gathering information and providing first aid guidance.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.7,
            max_tokens: 2048,
        });
        const msg = response.data.choices?.[0]?.message;
        return {
            text: msg?.content || msg?.reasoning_content || getFallbackResponse(),
        };
    }
    catch (error) {
        console.error('[LiveVoice] AI generation failed:', error);
        return { text: getFallbackResponse() };
    }
}
// ─── Fallback Response ───────────────────────
function getFallbackResponse() {
    const fallbacks = [
        "I'm here to help. Can you tell me more about what's happening?",
        "I understand this is difficult. Stay calm, and let's work through this together.",
        "Thank you for that information. Can you tell me your exact location?",
        "Help is available. Let me guide you through the next steps.",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}
// ─── Generate Actions ────────────────────────
function generateActions(session) {
    const actions = [];
    const ctx = session.context;
    // Add calming exercise for early stages
    if (session.history.length < 4) {
        actions.push({
            type: 'calming_exercise',
            title: 'Take a Deep Breath',
            content: 'Breathe in for 4 seconds, hold for 4, breathe out for 4. Repeat 3 times.',
        });
    }
    // Add first aid when we have emergency type
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
    // Always show emergency numbers
    actions.push({
        type: 'emergency_number',
        title: 'Emergency Contacts',
        content: EMERGENCY_NUMBERS.map((e) => `${e.name}: ${e.number}`).join('\n'),
    });
    return actions;
}
// ─── Stage Progression ───────────────────────
function updateStage(session) {
    const historyLength = session.history.length;
    if (historyLength < 3) {
        session.stage = 'greeting';
    }
    else if (historyLength < 6) {
        session.stage = 'listening';
    }
    else {
        session.stage = 'processing';
    }
}
// ─── Cleanup Old Sessions ────────────────────
setInterval(() => {
    const now = Date.now();
    const maxAge = 30 * 60 * 1000; // 30 minutes
    for (const [id, session] of sessions.entries()) {
        if (now - session.lastActivity.getTime() > maxAge) {
            if (session.ws.readyState === ws_1.WebSocket.OPEN) {
                session.ws.close(1000, 'Session timeout');
            }
            sessions.delete(id);
        }
    }
}, 5 * 60 * 1000); // Check every 5 minutes
// ─── Get Session Count ───────────────────────
function getActiveSessionCount() {
    return sessions.size;
}
//# sourceMappingURL=liveVoiceManager.js.map