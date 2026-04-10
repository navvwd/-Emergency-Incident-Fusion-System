"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SarvamStreamingSTT = void 0;
exports.streamChatCompletion = streamChatCompletion;
exports.speechToTextTranslate = speechToTextTranslate;
const ws_1 = __importDefault(require("ws"));
const axios_1 = __importDefault(require("axios"));
const form_data_1 = __importDefault(require("form-data"));
const SARVAM_BASE_URL = 'https://api.sarvam.ai';
const SARVAM_WS_URL = 'wss://api.sarvam.ai';
const ABORT_ERROR_MESSAGES = ['aborted', 'aborterror', 'canceled', 'cancelled'];
const LANGUAGE_CONFIG = {
    'en-IN': { sttCode: 'en-IN', name: 'English' },
    'hi-IN': { sttCode: 'hi-IN', name: 'Hindi' },
    'bn-IN': { sttCode: 'bn-IN', name: 'Bengali' },
    'kn-IN': { sttCode: 'kn-IN', name: 'Kannada' },
    'ml-IN': { sttCode: 'ml-IN', name: 'Malayalam' },
    'mr-IN': { sttCode: 'mr-IN', name: 'Marathi' },
    'od-IN': { sttCode: 'od-IN', name: 'Odia' },
    'pa-IN': { sttCode: 'pa-IN', name: 'Punjabi' },
    'ta-IN': { sttCode: 'ta-IN', name: 'Tamil' },
    'te-IN': { sttCode: 'te-IN', name: 'Telugu' },
    'gu-IN': { sttCode: 'gu-IN', name: 'Gujarati' },
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
function isAbortLikeError(error) {
    const message = error instanceof Error ? error.message : typeof error === 'string' ? error : '';
    const normalized = message.toLowerCase();
    return ABORT_ERROR_MESSAGES.some((token) => normalized.includes(token));
}
class SarvamStreamingSTT {
    constructor(apiKey, callbacks, targetLanguage = 'en-IN') {
        this.ws = null;
        this.isConnected = false;
        this.isClosed = false;
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = 5;
        this.reconnectTimer = null;
        this.apiKey = apiKey;
        this.callbacks = callbacks;
        this.targetLanguage = targetLanguage;
    }
    isReady() {
        return this.isConnected;
    }
    scheduleReconnect() {
        if (this.isClosed || this.reconnectAttempts >= this.maxReconnectAttempts)
            return;
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 10000);
        this.reconnectAttempts++;
        console.log(`[Sarvam STT WS] Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts})`);
        this.reconnectTimer = setTimeout(async () => {
            try {
                await this.connect();
                this.reconnectAttempts = 0;
                console.log('[Sarvam STT WS] Reconnected successfully');
            }
            catch (err) {
                console.error('[Sarvam STT WS] Reconnect failed:', err.message);
                this.scheduleReconnect();
            }
        }, delay);
    }
    connect() {
        return new Promise((resolve, reject) => {
            const langConfig = LANGUAGE_CONFIG[normalizeLanguageCode(this.targetLanguage)];
            const wsUrl = `${SARVAM_WS_URL}/speech-to-text/ws?language-code=${langConfig.sttCode}` +
                '&model=saaras:v3&mode=translate&sample_rate=16000' +
                '&input_audio_codec=pcm_s16le&vad_signals=true&flush_signal=true&high_vad_sensitivity=false';
            this.ws = new ws_1.default(wsUrl, {
                headers: {
                    'Api-Subscription-Key': this.apiKey,
                },
            });
            this.ws.on('open', () => {
                this.isConnected = true;
                this.callbacks.onConnected();
                resolve();
            });
            this.ws.on('message', (data) => {
                try {
                    const message = JSON.parse(data.toString());
                    this.handleMessage(message);
                }
                catch (error) {
                    console.error('[Sarvam STT WS] Failed to parse message:', error);
                }
            });
            this.ws.on('error', (error) => {
                console.error('[Sarvam STT WS] Connection error:', error.message || error);
                this.callbacks.onError(error.message || 'WebSocket connection error');
                reject(error);
            });
            this.ws.on('close', (code, reason) => {
                console.log(`[Sarvam STT WS] Closed: code=${code} reason=${reason?.toString() || 'none'}`);
                this.isConnected = false;
                // Auto-reconnect on unexpected closure
                if (!this.isClosed && code !== 1000) {
                    this.scheduleReconnect();
                }
            });
        });
    }
    handleMessage(message) {
        const type = String(message?.type || '').toLowerCase();
        if (type === 'speech_start' || type === 'speech_end' || type === 'events')
            return;
        if (type === 'transcript') {
            const transcript = message.text || message.transcript || '';
            const language = message.language_code || message.language || this.targetLanguage;
            if (transcript) {
                this.callbacks.onTranscript(transcript, true, language);
            }
            return;
        }
        if (type === 'translation') {
            const translatedText = message.text || message.translation || '';
            const originalText = message.original_text || '';
            const language = message.language_code || message.language || this.targetLanguage;
            if (translatedText) {
                this.callbacks.onTranslation(originalText, translatedText, language);
            }
            return;
        }
        if (message.type === 'data') {
            const transcript = message.data?.transcript || '';
            const language = message.data?.language_code || this.targetLanguage;
            const isFinal = Boolean(message.data?.is_final || message.data?.speech_final || message.data?.final);
            if (transcript) {
                this.callbacks.onTranscript(transcript, isFinal, language);
            }
            return;
        }
        if (message.type === 'error') {
            this.callbacks.onError(message.data?.message || message.message || 'Unknown error');
        }
    }
    sendAudioChunk(audioChunk) {
        if (!this.isConnected || !this.ws || this.ws.readyState !== ws_1.default.OPEN)
            return;
        try {
            this.ws.send(JSON.stringify({
                audio: {
                    data: audioChunk.toString('base64'),
                    sample_rate: '16000',
                    encoding: 'audio/wav',
                },
            }));
        }
        catch {
            // Ignore send errors — reconnect will handle recovery
        }
    }
    flushAudio() {
        if (!this.isConnected || !this.ws || this.ws.readyState !== ws_1.default.OPEN)
            return;
        // Send an empty audio chunk to trigger final transcription
        try {
            this.ws.send(JSON.stringify({
                audio: {
                    data: '',
                    sample_rate: '16000',
                    encoding: 'audio/wav',
                },
            }));
        }
        catch {
            // Ignore send errors during flush
        }
    }
    close() {
        this.isClosed = true;
        if (this.reconnectTimer) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }
        if (this.ws) {
            try {
                if (this.isConnected) {
                    this.flushAudio();
                }
                // Only close if the WebSocket is OPEN or CONNECTING
                if (this.ws.readyState === ws_1.default.OPEN || this.ws.readyState === ws_1.default.CONNECTING) {
                    this.ws.close(1000, 'Client closed');
                }
            }
            catch {
                // Ignore errors during cleanup
            }
            this.ws = null;
        }
        this.isConnected = false;
    }
}
exports.SarvamStreamingSTT = SarvamStreamingSTT;
async function streamChatCompletion(messages, callbacks, abortSignal) {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
        throw new Error('SARVAM_API_KEY not set');
    }
    try {
        try {
            const response = await axios_1.default.post(`${SARVAM_BASE_URL}/v1/chat/completions`, {
                model: 'sarvam-105b',
                messages,
                temperature: 0.5,
                max_tokens: 60,
                frequency_penalty: 1.2,
                stream: true,
            }, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'api-subscription-key': apiKey,
                    'Content-Type': 'application/json',
                },
                responseType: 'stream',
                signal: abortSignal,
            });
            return await new Promise((resolve, reject) => {
                const stream = response.data;
                let buffer = '';
                let fullText = '';
                stream.on('data', (chunk) => {
                    if (abortSignal?.aborted) {
                        stream.destroy();
                        reject(new Error('Aborted'));
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
                                    fullText += token;
                                    callbacks.onToken(token);
                                }
                            }
                            catch {
                                // Ignore malformed chunks.
                            }
                        }
                    }
                });
                stream.on('end', async () => {
                    const trimmedText = fullText.trim();
                    if (trimmedText) {
                        callbacks.onComplete(trimmedText);
                        resolve();
                        return;
                    }
                    try {
                        const fallbackResponse = await axios_1.default.post(`${SARVAM_BASE_URL}/v1/chat/completions`, {
                            model: 'sarvam-105b',
                            messages,
                            temperature: 0.5,
                            max_tokens: 60,
                            frequency_penalty: 1.2,
                        }, {
                            headers: {
                                Authorization: `Bearer ${apiKey}`,
                                'api-subscription-key': apiKey,
                                'Content-Type': 'application/json',
                            },
                            signal: abortSignal,
                        });
                        const msg = fallbackResponse.data?.choices?.[0]?.message;
                        const fallbackText = (msg?.content || msg?.reasoning_content || '').trim();
                        if (!fallbackText) {
                            reject(new Error('Empty response from Sarvam chat'));
                            return;
                        }
                        callbacks.onToken(fallbackText);
                        callbacks.onComplete(fallbackText);
                        resolve();
                    }
                    catch (fallbackError) {
                        reject(fallbackError);
                    }
                });
                stream.on('error', (error) => {
                    if (isAbortLikeError(error)) {
                        reject(new Error('Aborted'));
                        return;
                    }
                    callbacks.onError(error.message);
                    reject(error);
                });
            });
        }
        catch (streamError) {
            if (streamError.message === 'Aborted' || abortSignal?.aborted || isAbortLikeError(streamError)) {
                throw new Error('Aborted');
            }
            const response = await axios_1.default.post(`${SARVAM_BASE_URL}/v1/chat/completions`, {
                model: 'sarvam-105b',
                messages,
                temperature: 0.2,
                max_tokens: 60,
                frequency_penalty: 1.2,
            }, {
                headers: {
                    Authorization: `Bearer ${apiKey}`,
                    'api-subscription-key': apiKey,
                    'Content-Type': 'application/json',
                },
                signal: abortSignal,
            });
            const msg = response.data?.choices?.[0]?.message;
            const fullText = (msg?.content || msg?.reasoning_content || '').trim();
            if (!fullText) {
                throw new Error('Empty response from Sarvam chat');
            }
            callbacks.onToken(fullText);
            callbacks.onComplete(fullText);
        }
    }
    catch (error) {
        if (error.message === 'Aborted' || isAbortLikeError(error)) {
            throw new Error('Aborted');
        }
        const msg = error.response?.data?.message || error.message;
        callbacks.onError(msg);
        throw new Error(`Chat streaming failed: ${msg}`);
    }
}
async function speechToTextTranslate(audioBuffer, fileName = 'audio.webm', sourceLanguage, contentType = 'audio/webm') {
    const apiKey = process.env.SARVAM_API_KEY;
    if (!apiKey) {
        throw new Error('SARVAM_API_KEY not set');
    }
    const form = new form_data_1.default();
    form.append('file', audioBuffer, {
        filename: fileName,
        contentType,
    });
    form.append('model', 'saaras:v3');
    form.append('mode', 'transcribe');
    if (sourceLanguage) {
        form.append('language_code', normalizeLanguageCode(sourceLanguage));
    }
    const response = await axios_1.default.post(`${SARVAM_BASE_URL}/speech-to-text-translate`, form, {
        headers: {
            ...form.getHeaders(),
            'api-subscription-key': apiKey,
        },
    });
    return {
        transcript: response.data.transcript || '',
        translatedText: response.data.translated_text || response.data.transcript || '',
        language: response.data.language_code || 'en-IN',
        confidence: response.data.language_probability || 0.9,
    };
}
//# sourceMappingURL=sarvamStreaming.js.map