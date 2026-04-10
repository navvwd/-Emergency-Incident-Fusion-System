"use strict";
// ──────────────────────────────────────────────
// EIFS — Moonshot Kimi Vision Service
// Scene understanding from emergency images
// Ref: PROJECT.md Sections 8 and 9
// ──────────────────────────────────────────────
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.describeScene = describeScene;
exports.streamChatCompletion = streamChatCompletion;
const axios_1 = __importDefault(require("axios"));
// Using Kimi's API URL (OpenAI payload compatible for Chat Completions)
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const MOONSHOT_VISION_MODEL = 'moonshot-v1-8k-vision-preview';
const MOONSHOT_CHAT_MODEL = 'moonshot-v1-8k'; // Standard chat model for text
// Vision prompt from PROJECT.md Section 9
const VISION_PROMPT = `You are analyzing an emergency report image. Describe what you see in terms of:
1. What type of incident is shown (accident, fire, flood, etc.)
2. Visible damage or injuries
3. Location clues (street signs, landmarks, building names)
4. Estimated number of people affected
5. Any vehicles, equipment, or infrastructure involved

Be factual and concise. 2-3 sentences max.`;
/**
 * Sends an image to Moonshot Kimi Vision for scene understanding.
 * Returns a concise factual description of the emergency scene.
 */
async function describeScene(imageBuffer) {
    const apiKey = process.env.MOONSHOT_API_KEY;
    if (!apiKey) {
        throw new Error('[Moonshot] MOONSHOT_API_KEY is not set in environment variables');
    }
    const start = Date.now();
    try {
        const base64Image = imageBuffer.toString('base64');
        const dataUrl = `data:image/jpeg;base64,${base64Image}`;
        const response = await axios_1.default.post(MOONSHOT_API_URL, {
            model: MOONSHOT_VISION_MODEL,
            max_tokens: 300,
            messages: [
                {
                    role: 'user',
                    content: [
                        {
                            type: 'text',
                            text: VISION_PROMPT,
                        },
                        {
                            type: 'image_url',
                            image_url: {
                                url: dataUrl
                            }
                        }
                    ],
                },
            ],
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
        });
        const description = response.data?.choices?.[0]?.message?.content || '';
        const elapsed = Date.now() - start;
        console.log(`[Moonshot Vision] Scene described in ${elapsed}ms (${description.length} chars)`);
        return description;
    }
    catch (error) {
        const elapsed = Date.now() - start;
        const msg = error.response?.data?.error?.message || error.message;
        console.error(`[Moonshot Vision] Failed after ${elapsed}ms: ${msg}`);
        throw new Error(`[Moonshot Vision] Scene description failed: ${msg}`);
    }
}
/**
 * Streaming chat completion using Moonshot Kimi
 * Much better than Sarvam for natural conversation
 */
async function streamChatCompletion(messages, callbacks, abortSignal) {
    const apiKey = process.env.MOONSHOT_API_KEY;
    if (!apiKey) {
        throw new Error('[Moonshot] MOONSHOT_API_KEY is not set');
    }
    try {
        const response = await axios_1.default.post(MOONSHOT_API_URL, {
            model: MOONSHOT_CHAT_MODEL,
            messages,
            temperature: 0.3, // Lower temperature for more predictable responses
            max_tokens: 150,
            stream: true,
        }, {
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
            },
            responseType: 'stream',
            signal: abortSignal,
            timeout: 30000,
        });
        return new Promise((resolve, reject) => {
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
                            const delta = data.choices?.[0]?.delta;
                            const token = delta?.content;
                            if (token) {
                                fullText += token;
                                callbacks.onToken(token);
                            }
                        }
                        catch (e) {
                            // Ignore parse errors for malformed chunks
                        }
                    }
                }
            });
            stream.on('end', () => {
                callbacks.onComplete(fullText.trim());
                resolve();
            });
            stream.on('error', (err) => {
                callbacks.onError(err.message);
                reject(err);
            });
            if (abortSignal) {
                abortSignal.addEventListener('abort', () => {
                    stream.destroy();
                    reject(new Error('Aborted'));
                }, { once: true });
            }
        });
    }
    catch (error) {
        if (error.message === 'Aborted') {
            throw new Error('Aborted');
        }
        const msg = error.response?.data?.error?.message || error.message;
        console.error('[Moonshot Chat] Failed:', msg);
        throw new Error(`Chat streaming failed: ${msg}`);
    }
}
//# sourceMappingURL=moonshot.js.map