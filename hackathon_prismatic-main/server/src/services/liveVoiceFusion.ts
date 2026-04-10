// ──────────────────────────────────────────────
// EIFS — Live Voice Data Fusion Service
// Production-grade streaming STT + non-streaming
// AI dispatcher with guaranteed response delivery
// ──────────────────────────────────────────────

import { WebSocket } from 'ws';
import { v4 as uuidv4 } from 'uuid';
import axios from 'axios';
import * as sarvam from './sarvamStreaming';

// ─── Constants ──────────────────────────────

const SARVAM_CHAT_URL = 'https://api.sarvam.ai/v1/chat/completions';
const CHAT_MODEL = 'sarvam-105b';
const CHAT_TIMEOUT_MS = 10000;
const MAX_CHAT_RETRIES = 2;
const SILENCE_TIMEOUT_MS = 3000;
const TRANSCRIPT_ACCUMULATE_MS = 2000;
const MIN_AUDIO_BYTES = 8000;
const SESSION_TTL_MS = 30 * 60 * 1000;
const HISTORY_WINDOW = 8;

// ─── Types ──────────────────────────────────

export interface FusionSession {
  sessionId: string;
  ws: WebSocket;
  languageCode: string;
  detectedLanguage: string;
  stage: 'greeting' | 'listening' | 'processing' | 'idle';
  context: {
    emergencyType?: string;
    location?: string;
    latitude?: number;
    longitude?: number;
    geoAccuracy?: number;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    injuries?: string;
    peopleAffected?: number;
    lastUserMessage?: string;
    lastAgentResponse?: string;
    dispatched?: boolean;
  };
  history: Array<{ role: 'user' | 'agent'; content: string; timestamp: Date }>;
  audioBuffer: Buffer[];
  isRecording: boolean;
  isHandlingAudioEnd: boolean;
  streamingTranscriptReceived: boolean;
  silenceTimer?: NodeJS.Timeout;
  accumulateTimer?: NodeJS.Timeout;
  accumulatedTranscripts: string[];
  currentChatAbort?: AbortController;
  sttStream?: sarvam.SarvamStreamingSTT;
  partialTranscript: string;
  createdAt: Date;
  lastActivity: Date;
}

export type FusionMessage =
  | { type: 'start'; language?: string }
  | { type: 'audio_chunk'; data: string }
  | { type: 'audio_end' }
  | { type: 'interrupt' }
  | { type: 'geolocation'; latitude: number; longitude: number; accuracy?: number }
  | { type: 'ping' };

export type FusionResponse =
  | { type: 'connected'; sessionId: string }
  | { type: 'status'; status: string; stage: string }
  | { type: 'transcript'; text: string; isFinal: boolean; language: string }
  | { type: 'translation'; original: string; translated: string }
  | { type: 'agent_response_start' }
  | { type: 'agent_response_token'; token: string }
  | { type: 'agent_response_complete'; text: string; actions?: AgentAction[] }
  | { type: 'interrupted' }
  | { type: 'error'; message: string }
  | { type: 'dispatch'; incident_type: string; location: string; latitude?: number; longitude?: number }
  | { type: 'pong' };

export interface AgentAction {
  type: 'first_aid' | 'precaution' | 'emergency_number' | 'calming_exercise';
  title: string;
  content: string;
}

// ─── First Aid Knowledge Base ───────────────

const FIRST_AID_GUIDES: Record<string, { steps: string[]; donts: string[] }> = {
  road_accident: {
    steps: [
      'Ensure the scene is safe before approaching',
      'Check for responsiveness and breathing',
      'Apply direct pressure to active bleeding',
      'Do not move the person unless they are in immediate danger',
      'Keep them warm and still',
    ],
    donts: ['Do not remove embedded objects', 'Do not give food or water', 'Do not move if spinal injury is suspected'],
  },
  fire: {
    steps: [
      'Stop, drop, and roll if clothing is on fire',
      'Cool burns under cool running water for 20 minutes',
      'Remove tight items before swelling starts',
      'Cover the burn with a clean non-stick cloth',
    ],
    donts: ['Do not use ice on burns', 'Do not apply butter, oil, or ointment', 'Do not break blisters'],
  },
  medical: {
    steps: [
      'Keep the person calm and lying down',
      'Loosen tight clothing',
      'Check breathing and pulse',
      'Place them in recovery position if unconscious and breathing',
    ],
    donts: ['Do not give medication unless prescribed', 'Do not give food or drink if unconscious'],
  },
  building_collapse: {
    steps: [
      'Cover the mouth and nose with cloth',
      'Tap on pipes or walls to signal your location',
      'Conserve energy and battery',
      'Stay still if movement may trigger more collapse',
    ],
    donts: ['Do not light matches or lighters', 'Do not shout continuously', 'Do not move unstable debris'],
  },
  flood: {
    steps: [
      'Move to higher ground immediately',
      'Avoid walking or driving through flood water',
      'Stay away from power lines and wet electrical equipment',
      'Use only safe drinking water',
    ],
    donts: ['Do not touch electrical equipment if wet', 'Do not drink flood water'],
  },
  default: {
    steps: [
      'Stay calm and assess the situation',
      'Ensure your own safety first',
      'Call emergency services: 108 or 112',
      'Follow instructions from responders',
    ],
    donts: ['Do not panic', 'Do not spread rumors', 'Do not block emergency access routes'],
  },
};

const EMERGENCY_NUMBERS = [
  { name: 'Ambulance', number: '108' },
  { name: 'National Emergency', number: '112' },
  { name: 'Fire', number: '101' },
  { name: 'Police', number: '100' },
];

// ─── Session Management ─────────────────────

const sessions = new Map<string, FusionSession>();

export function createSession(ws: WebSocket, languageCode: string = 'en-IN'): FusionSession {
  const session: FusionSession = {
    sessionId: uuidv4(),
    ws,
    languageCode,
    detectedLanguage: languageCode,
    stage: 'greeting',
    context: {},
    history: [],
    audioBuffer: [],
    isRecording: false,
    isHandlingAudioEnd: false,
    streamingTranscriptReceived: false,
    accumulatedTranscripts: [],
    partialTranscript: '',
    createdAt: new Date(),
    lastActivity: new Date(),
  };

  sessions.set(session.sessionId, session);
  console.log(`[Fusion] Session created: ${session.sessionId}, lang: ${languageCode}`);
  return session;
}

export function getSession(sessionId: string): FusionSession | undefined {
  return sessions.get(sessionId);
}

export function deleteSession(sessionId: string): void {
  const session = sessions.get(sessionId);
  if (!session) return;
  cleanupSession(session);
  sessions.delete(sessionId);
  console.log(`[Fusion] Session deleted: ${sessionId}`);
}

export function getSessionsMap(): Map<string, FusionSession> {
  return sessions;
}

export function getActiveSessionCount(): number {
  return sessions.size;
}

export function getSessionStats(): { total: number } {
  return { total: sessions.size };
}

function cleanupSession(session: FusionSession): void {
  if (session.silenceTimer) clearTimeout(session.silenceTimer);
  if (session.accumulateTimer) clearTimeout(session.accumulateTimer);
  if (session.currentChatAbort) session.currentChatAbort.abort();
  if (session.sttStream) session.sttStream.close();
  session.isRecording = false;
  session.isHandlingAudioEnd = false;
  session.streamingTranscriptReceived = false;
  session.accumulatedTranscripts = [];
}

function updateActivity(session: FusionSession): void {
  session.lastActivity = new Date();
}

// ─── Safe Message Sending ───────────────────

/**
 * Validated send — guarantees no empty text messages are ever sent.
 * This is the ONLY function that should send WebSocket messages.
 */
function send(session: FusionSession, message: FusionResponse): void {
  if (session.ws.readyState !== WebSocket.OPEN) return;

  // HARD GUARD: never send agent_response_complete with empty text
  if (message.type === 'agent_response_complete') {
    if (!message.text || !message.text.trim()) {
      console.error('[Fusion] BLOCKED: empty agent_response_complete — this is a bug');
      // Replace with fallback instead of silently dropping
      message = {
        ...message,
        text: getContextualFallback(session),
      };
    }
  }

  session.ws.send(JSON.stringify(message));
}

// ─── Message Router ─────────────────────────

export async function handleMessage(session: FusionSession, message: FusionMessage): Promise<void> {
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
        handleInterrupt(session);
        break;
      case 'geolocation':
        handleGeolocation(session, message);
        break;
      case 'ping':
        send(session, { type: 'pong' });
        break;
    }
  } catch (error: any) {
    console.error('[Fusion] Error handling message:', error);
    send(session, { type: 'error', message: error.message });
  }

  const elapsed = Date.now() - startTime;
  if (elapsed > 50) {
    console.log(`[Fusion] Message handled in ${elapsed}ms: ${message.type}`);
  }
}

// ─── Session Start ──────────────────────────

async function handleStart(session: FusionSession, language?: string): Promise<void> {
  if (language) {
    session.languageCode = language;
    session.detectedLanguage = language;
  }

  session.stage = 'greeting';
  session.isRecording = true;
  session.audioBuffer = [];
  session.partialTranscript = '';

  send(session, { type: 'status', status: 'Starting session...', stage: 'greeting' });

  // Connect streaming STT
  try {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) throw new Error('SARVAM_API_KEY not set');

    session.sttStream = new sarvam.SarvamStreamingSTT(
      apiKey,
      {
        onTranscript: (text, isFinal, lang) => {
          session.partialTranscript = text;
          if (text.trim()) {
            session.streamingTranscriptReceived = true;
          }

          send(session, { type: 'transcript', text, isFinal, language: lang });

          if (isFinal && text.trim()) {
            // Accumulate final transcript segments instead of processing immediately.
            // This prevents a new AI response on every brief pause.
            session.accumulatedTranscripts.push(text.trim());
            session.audioBuffer = [];

            // Reset the accumulate timer — only process after sustained silence
            if (session.accumulateTimer) clearTimeout(session.accumulateTimer);
            session.accumulateTimer = setTimeout(() => {
              if (session.accumulatedTranscripts.length > 0) {
                const fullTranscript = session.accumulatedTranscripts.join(' ');
                session.accumulatedTranscripts = [];
                session.isRecording = false;
                void handleFinalTranscript(session, fullTranscript, lang);
              }
            }, TRANSCRIPT_ACCUMULATE_MS);
          }
        },
        onTranslation: (original, translated) => {
          send(session, { type: 'translation', original, translated });
          session.context.lastUserMessage = translated;
        },
        onError: (error) => {
          console.error('[Fusion] STT stream error:', error);
        },
        onConnected: () => {
          console.log('[Fusion] Streaming STT connected');
        },
      },
      session.languageCode,
    );

    await session.sttStream.connect();
  } catch (err: any) {
    const isNetworkError = err?.code === 'ENOTFOUND' || err?.message?.includes('ENOTFOUND');
    if (isNetworkError) {
      console.warn('[Fusion] Network unreachable, retrying STT connection in 3s...');
      send(session, { type: 'error', message: 'Network issue detected, reconnecting...' });
      // Retry once after a short delay
      setTimeout(async () => {
        try {
          if (session.sttStream) {
            await session.sttStream.connect();
            console.log('[Fusion] STT reconnected on retry');
          }
        } catch {
          console.warn('[Fusion] STT retry also failed, using batch mode');
        }
      }, 3000);
    } else {
      console.warn('[Fusion] Streaming STT failed, will use batch mode:', err);
    }
  }

  // Send greeting
  const greetings: Record<string, string> = {
    'en-IN': "Hey, I'm right here with you. What's going on?",
    'hi-IN': 'Main yahan hoon. Kya ho raha hai?',
    'ta-IN': 'Naan inge irukken. Enna nadakkuthu?',
    'te-IN': 'Nenu ikada unnanu. Em jarugutundi?',
  };

  const greeting = greetings[session.languageCode] || greetings['en-IN'];
  session.history.push({ role: 'agent', content: greeting, timestamp: new Date() });
  session.context.lastAgentResponse = greeting;

  send(session, { type: 'agent_response_start' });
  send(session, { type: 'agent_response_complete', text: greeting });

  session.stage = 'listening';
  send(session, { type: 'status', status: 'Listening...', stage: 'listening' });
  updateActivity(session);
}

// ─── Audio Handling ─────────────────────────

async function handleAudioChunk(session: FusionSession, base64Data: string): Promise<void> {
  if (!session.isRecording) return;

  const chunk = Buffer.from(base64Data, 'base64');
  if (session.audioBuffer.length === 0) {
    session.partialTranscript = '';
    session.streamingTranscriptReceived = false;
  }
  session.audioBuffer.push(chunk);

  if (session.sttStream?.isReady()) {
    session.sttStream.sendAudioChunk(chunk);
  }

  // Reset silence timer — only trigger processing after sustained silence
  if (session.silenceTimer) clearTimeout(session.silenceTimer);
  session.silenceTimer = setTimeout(async () => {
    await handleAudioEnd(session);
  }, SILENCE_TIMEOUT_MS);

  updateActivity(session);
}

async function handleAudioEnd(session: FusionSession): Promise<void> {
  if (session.stage === 'processing') return;
  if (session.isHandlingAudioEnd) return;
  session.isHandlingAudioEnd = true;

  try {
    if (session.audioBuffer.length === 0) {
      resumeListening(session);
      return;
    }

    session.isRecording = false;
    if (session.silenceTimer) clearTimeout(session.silenceTimer);

    // Try to use streaming transcript if available
    if (session.sttStream?.isReady()) {
      session.sttStream.flushAudio();
      await sleep(100);

      // Check if we have accumulated transcripts waiting to be processed
      const hasAccumulated = session.accumulatedTranscripts.length > 0;
      const hasPartial = session.streamingTranscriptReceived && session.partialTranscript.trim();

      if (hasAccumulated || hasPartial) {
        // Cancel the accumulate timer — process everything now
        if (session.accumulateTimer) clearTimeout(session.accumulateTimer);

        const parts = [...session.accumulatedTranscripts];
        if (hasPartial && !parts.includes(session.partialTranscript.trim())) {
          parts.push(session.partialTranscript.trim());
        }
        const fullTranscript = parts.join(' ');
        session.accumulatedTranscripts = [];

        if (fullTranscript.trim()) {
          send(session, {
            type: 'transcript',
            text: fullTranscript,
            isFinal: true,
            language: session.detectedLanguage || session.languageCode,
          });
          await handleFinalTranscript(session, fullTranscript, session.detectedLanguage || session.languageCode);
          session.audioBuffer = [];
          session.partialTranscript = '';
          session.streamingTranscriptReceived = false;
          return;
        }
      }
    }

    // Fallback: batch STT
    await processAudioBatch(session);
    session.audioBuffer = [];
    session.partialTranscript = '';
    session.streamingTranscriptReceived = false;
  } finally {
    session.isHandlingAudioEnd = false;
  }
}

async function processAudioBatch(session: FusionSession): Promise<void> {
  session.stage = 'processing';
  send(session, { type: 'status', status: 'Processing...', stage: 'processing' });

  try {
    const combinedAudio = Buffer.concat(session.audioBuffer);

    if (combinedAudio.length < MIN_AUDIO_BYTES) {
      resumeListening(session);
      return;
    }

    const wavAudio = pcm16ToWav(combinedAudio, 16000, 1);
    const result = await sarvam.speechToTextTranslate(wavAudio, 'voice.wav', session.languageCode, 'audio/wav');

    if (!result.transcript.trim()) {
      resumeListening(session);
      send(session, { type: 'status', status: "I didn't catch that. Please speak again.", stage: 'listening' });
      return;
    }

    send(session, { type: 'transcript', text: result.transcript, isFinal: true, language: result.language });

    if (result.translatedText && result.translatedText !== result.transcript) {
      send(session, { type: 'translation', original: result.transcript, translated: result.translatedText });
    }

    await handleFinalTranscript(session, result.translatedText || result.transcript, result.language);
  } catch (error: any) {
    const isNetworkError = error?.code === 'ENOTFOUND' || error?.message?.includes('ENOTFOUND');
    console.error('[Fusion] Batch STT failed:', error?.message || error);

    if (isNetworkError) {
      send(session, { type: 'error', message: 'Network unavailable. Check your internet connection and try again.' });
    } else {
      send(session, { type: 'error', message: 'Failed to process audio. Please try again.' });
    }
    resumeListening(session);
  }
}

// ─── Transcript → AI Response ───────────────

async function handleFinalTranscript(session: FusionSession, transcript: string, language: string): Promise<void> {
  if (language && language !== 'unknown') {
    session.detectedLanguage = language;
    session.languageCode = language;
  }

  session.context.lastUserMessage = transcript;
  extractContext(session, transcript);
  session.history.push({ role: 'user', content: transcript, timestamp: new Date() });

  await processWithAI(session);
}

// ─── AI Response Generation ─────────────────
//
// Architecture: Non-streaming chat completion.
// For 1-sentence dispatcher responses, streaming adds
// complexity (SSE parsing, abort races, empty streams)
// without UX benefit. A single HTTP call is more reliable.
//

async function processWithAI(session: FusionSession): Promise<void> {
  // Guard against concurrent AI calls
  if (session.stage === 'processing') {
    console.warn('[Fusion] Already processing, skipping duplicate');
    return;
  }

  const startTime = Date.now();
  session.stage = 'processing';
  send(session, { type: 'status', status: 'Thinking...', stage: 'processing' });

  // Cancel any in-flight request
  if (session.currentChatAbort) {
    session.currentChatAbort.abort();
  }
  session.currentChatAbort = new AbortController();

  let responseText = '';

  try {
    responseText = await dispatcherChat(session);
  } catch (error: any) {
    if (isAbortError(error)) {
      // User interrupted mid-generation — silently resume listening
      resumeListening(session);
      return;
    }
    console.error('[Fusion] All chat attempts failed:', error.message);
  } finally {
    session.currentChatAbort = undefined;
  }

  // Clean up repetition artifacts
  responseText = cleanRepeatedText(responseText.trim());

  // GUARANTEE: never send empty response
  if (responseText.length < 3) {
    responseText = getContextualFallback(session);
    console.log(`[Fusion] Using fallback: "${responseText}"`);
  }

  // Record in history
  session.context.lastAgentResponse = responseText;
  session.history.push({ role: 'agent', content: responseText, timestamp: new Date() });

  // Deliver to client — send() has its own empty guard as safety net
  send(session, { type: 'agent_response_start' });
  send(session, {
    type: 'agent_response_complete',
    text: responseText,
    actions: generateActions(session),
  });

  resumeListening(session);
  console.log(`[Fusion] Response in ${Date.now() - startTime}ms: "${responseText}"`);
}

/**
 * Non-streaming Sarvam chat with retry.
 * Returns the AI response text, or empty string on total failure.
 */
async function dispatcherChat(session: FusionSession): Promise<string> {
  const apiKey = process.env.SARVAM_API_KEY;
  if (!apiKey) throw new Error('SARVAM_API_KEY not set');

  const messages = [
    { role: 'system', content: buildSystemPrompt(session) },
    ...session.history.slice(-HISTORY_WINDOW).map((item) => ({
      role: item.role === 'agent' ? 'assistant' : 'user',
      content: item.content,
    })),
  ];

  for (let attempt = 1; attempt <= MAX_CHAT_RETRIES; attempt++) {
    try {
      const response = await axios.post(
        SARVAM_CHAT_URL,
        {
          model: CHAT_MODEL,
          messages,
          temperature: 0.7,
          max_tokens: 40,
          frequency_penalty: 1.5,
          presence_penalty: 0.3,
          reasoning_effort: 'low',
        },
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'api-subscription-key': apiKey,
            'Content-Type': 'application/json',
          },
          timeout: CHAT_TIMEOUT_MS,
          signal: session.currentChatAbort?.signal,
        },
      );

      const msg = response.data?.choices?.[0]?.message;
      const text = (msg?.content || msg?.reasoning_content || '').trim();

      if (text && text.length >= 3) {
        return text;
      }

      console.warn(`[Fusion] Chat attempt ${attempt}/${MAX_CHAT_RETRIES}: empty response`);
    } catch (error: any) {
      if (isAbortError(error)) throw error;
      console.error(`[Fusion] Chat attempt ${attempt}/${MAX_CHAT_RETRIES}: ${error.message}`);
      if (attempt < MAX_CHAT_RETRIES) {
        await sleep(300 * attempt);
      }
    }
  }

  return '';
}

// ─── Interrupt Handling ─────────────────────

function handleInterrupt(session: FusionSession): void {
  console.log(`[Fusion] Interrupt for ${session.sessionId}`);

  if (session.currentChatAbort) {
    session.currentChatAbort.abort();
    session.currentChatAbort = undefined;
  }
  if (session.accumulateTimer) clearTimeout(session.accumulateTimer);

  session.isHandlingAudioEnd = false;
  session.audioBuffer = [];
  session.partialTranscript = '';
  session.streamingTranscriptReceived = false;
  session.accumulatedTranscripts = [];

  send(session, { type: 'interrupted' });
  resumeListening(session);
}

// ─── Geolocation & Auto-Dispatch ────────────

function handleGeolocation(session: FusionSession, message: { latitude: number; longitude: number; accuracy?: number }): void {
  session.context.latitude = message.latitude;
  session.context.longitude = message.longitude;
  session.context.geoAccuracy = message.accuracy;
  session.context.location = `${message.latitude.toFixed(6)}, ${message.longitude.toFixed(6)}`;

  if (session.context.emergencyType && !session.context.dispatched) {
    void autoDispatch(session);
  }
}

async function autoDispatch(session: FusionSession): Promise<void> {
  if (session.context.dispatched) return;
  session.context.dispatched = true;

  const incidentType = session.context.emergencyType || 'other';
  const location = session.context.location || 'Unknown';

  send(session, {
    type: 'dispatch',
    incident_type: incidentType,
    location,
    latitude: session.context.latitude,
    longitude: session.context.longitude,
  });

  // Fire-and-forget ingest
  void (async () => {
    try {
      const serverPort = process.env.PORT || 3001;
      const response = await fetch(`http://localhost:${serverPort}/api/ingest-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          report_type: 'text',
          text_content:
            `[AUTO-DISPATCH] ${incidentType} emergency reported via live voice. ` +
            `Location: ${location}. ` +
            `Severity: ${session.context.severity || 'unknown'}. ` +
            `People affected: ${session.context.peopleAffected || 'unknown'}. ` +
            `Summary: ${session.context.lastUserMessage || 'Emergency reported via voice assistant.'}`,
          language: 'en-IN',
        }),
      });

      if (!response.ok) {
        console.error(`[Fusion] Report ingest failed: ${response.status}`);
      }
    } catch (err) {
      console.error('[Fusion] Failed to auto-dispatch report:', err);
    }
  })();
}

// ─── Context Extraction ─────────────────────

function extractContext(session: FusionSession, message: string): void {
  const lowerMsg = message.toLowerCase();
  const ctx = session.context;
  const hadEmergencyType = !!ctx.emergencyType;

  if (!ctx.emergencyType) {
    if (lowerMsg.includes('fire') || lowerMsg.includes('burn') || lowerMsg.includes('aag')) {
      ctx.emergencyType = 'fire';
    } else if (lowerMsg.includes('accident') || lowerMsg.includes('crash') || lowerMsg.includes('collision')) {
      ctx.emergencyType = 'road_accident';
    } else if (lowerMsg.includes('flood') || lowerMsg.includes('water') || lowerMsg.includes('drowning') || lowerMsg.includes('stuck in') || lowerMsg.includes('thanni')) {
      ctx.emergencyType = 'flood';
    } else if (lowerMsg.includes('collapse') || lowerMsg.includes('building') || lowerMsg.includes('fall')) {
      ctx.emergencyType = 'building_collapse';
    } else if (lowerMsg.includes('medical') || lowerMsg.includes('heart') || lowerMsg.includes('breathing') || lowerMsg.includes('unconscious')) {
      ctx.emergencyType = 'medical';
    } else if (lowerMsg.includes('violence') || lowerMsg.includes('attack') || lowerMsg.includes('fight') || lowerMsg.includes('stab') || lowerMsg.includes('shoot')) {
      ctx.emergencyType = 'violence';
    }
  }

  if (!ctx.peopleAffected) {
    const numberMatch = message.match(/(\d+)\s*(people|persons|individuals|victims|injured|hurt)/i);
    if (numberMatch) {
      ctx.peopleAffected = parseInt(numberMatch[1], 10);
    }
  }

  if (!ctx.severity) {
    if (lowerMsg.includes('critical') || lowerMsg.includes('dying') || lowerMsg.includes('death') || lowerMsg.includes('severe')) {
      ctx.severity = 'critical';
    } else if (lowerMsg.includes('bad') || lowerMsg.includes('major') || lowerMsg.includes('badly')) {
      ctx.severity = 'high';
    } else if (lowerMsg.includes('minor') || lowerMsg.includes('small') || lowerMsg.includes('okay')) {
      ctx.severity = 'low';
    }
  }

  if (!hadEmergencyType && ctx.emergencyType && ctx.latitude && !ctx.dispatched) {
    void autoDispatch(session);
  }
}

// ─── System Prompt ──────────────────────────

function buildSystemPrompt(session: FusionSession): string {
  const ctx = session.context;

  const situationParts: string[] = [];
  if (ctx.emergencyType) situationParts.push(`This is a ${ctx.emergencyType.replace('_', ' ')}.`);
  if (ctx.severity) situationParts.push(`Severity: ${ctx.severity}.`);
  if (ctx.dispatched) situationParts.push(`Help has been dispatched.`);
  if (ctx.latitude) situationParts.push(`GPS location tracked.`);
  const situation = situationParts.length > 0
    ? `\n\nCurrent situation: ${situationParts.join(' ')}`
    : '';

  return `You are Priya, a 911 emergency dispatcher in Chennai on a live phone call. You sound like a real, caring person — not a robot or an AI. You use casual language and contractions.${situation}

RULES:
- ONE short sentence only. Under 15 words.
- Sound human. Use contractions like I'm, you're, don't, we've.
- Never use lists, bullet points, markdown, or formal words.
- Never repeat any word more than once.
- Never explain what you are doing.

Here is how you speak:

Caller: "There's a fire in my building"
Priya: "Get out of there right now, is anyone else inside?"

Caller: "I'm stuck in water and I'm scared"
Priya: "Okay hold on, can you grab onto something stable?"

Caller: "Please send someone to help me"
Priya: "They're already on the way, just stay with me."

Caller: "I don't know what to do"
Priya: "That's alright, I'll walk you through this."

Caller: "There's been an accident on the road"
Priya: "Is anyone hurt? Can you see how many people?"

Now respond to the caller as Priya:`;
}

// ─── Utilities ──────────────────────────────

function resumeListening(session: FusionSession): void {
  session.stage = 'listening';
  session.isRecording = true;
  send(session, { type: 'status', status: 'Listening...', stage: 'listening' });
}

function isAbortError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
  const normalized = message.toLowerCase();
  return ['aborted', 'aborterror', 'canceled', 'cancelled'].some((t) => normalized.includes(t));
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function cleanRepeatedText(text: string): string {
  if (!text) return '';
  const words = text.split(/[\s,]+/).filter(Boolean);
  if (words.length < 3) return text;

  // Find where trailing repetition starts
  const lastWord = words[words.length - 1].toLowerCase();
  let cutoff = words.length;
  for (let i = words.length - 2; i >= 0; i--) {
    if (words[i].toLowerCase() === lastWord) {
      cutoff = i;
    } else {
      break;
    }
  }

  if (cutoff < words.length - 1) {
    return words.slice(0, cutoff + 1).join(' ');
  }
  return text;
}

function getContextualFallback(session?: FusionSession): string {
  if (!session?.context.emergencyType) {
    const fallbacks = [
      "Tell me what's happening, I'm right here.",
      "I'm listening, what's going on around you?",
      "Okay take a breath and tell me what happened.",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  if (session.context.dispatched) {
    const fallbacks = [
      "Help is on the way, just stay where you are.",
      "We've sent someone, hang tight okay?",
      "Stay put, help should reach you any minute.",
    ];
    return fallbacks[Math.floor(Math.random() * fallbacks.length)];
  }

  const fallbacks = [
    "Are you hurt? Is anyone else with you?",
    "Okay, are you somewhere safe right now?",
    "Can you tell me exactly where you are?",
  ];
  return fallbacks[Math.floor(Math.random() * fallbacks.length)];
}

function pcm16ToWav(pcmData: Buffer, sampleRate: number, channels: number): Buffer {
  const bitsPerSample = 16;
  const byteRate = sampleRate * channels * (bitsPerSample / 8);
  const blockAlign = channels * (bitsPerSample / 8);
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcmData.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcmData.length, 40);

  return Buffer.concat([header, pcmData]);
}

function generateActions(session: FusionSession): AgentAction[] {
  const actions: AgentAction[] = [];
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
    content: EMERGENCY_NUMBERS.map((item) => `${item.name}: ${item.number}`).join('\n'),
  });

  return actions;
}

// ─── Session Cleanup Timer ──────────────────

setInterval(() => {
  const now = Date.now();
  for (const [id, session] of sessions.entries()) {
    if (now - session.lastActivity.getTime() > SESSION_TTL_MS) {
      if (session.ws.readyState === WebSocket.OPEN) {
        session.ws.close(1000, 'Session timeout');
      }
      cleanupSession(session);
      sessions.delete(id);
    }
  }
}, 5 * 60 * 1000);
