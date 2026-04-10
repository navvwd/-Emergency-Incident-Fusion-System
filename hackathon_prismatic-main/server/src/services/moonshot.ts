// ──────────────────────────────────────────────
// EIFS — Moonshot Kimi Vision Service
// Scene understanding from emergency images
// Ref: PROJECT.md Sections 8 and 9
// ──────────────────────────────────────────────

import axios from 'axios';
import { Readable } from 'stream';

// Using Kimi's API URL (OpenAI payload compatible for Chat Completions)
const MOONSHOT_API_URL = 'https://api.moonshot.cn/v1/chat/completions';
const MOONSHOT_VISION_MODEL = 'moonshot-v1-8k-vision-preview';
const MOONSHOT_CHAT_MODEL = 'moonshot-v1-8k'; // Standard chat model for text

// Vision prompt — optimized for emergency scene + location extraction
const VISION_PROMPT = `Analyze this emergency image. Focus on:

1. Incident type (accident, fire, flood, collapse, medical, etc.)
2. Visible damage, injuries, or danger
3. LOCATION — this is critical. Look carefully for:
   - Street signs, road names, highway markers, mile markers
   - Building names, shop signs, hospital names, school names
   - Landmarks (temples, bridges, flyovers, railway crossings, bus stops)
   - Vehicle number plates (Indian plates indicate state/city)
   - Any text on banners, hoardings, or walls that hints at area/city
   - Terrain and surroundings (urban/rural, coastal, hilly, etc.)
4. Number of people visible or likely affected
5. Vehicles, equipment, or infrastructure involved

Be factual and concise. 2-3 sentences. Prioritize location clues — mention every sign, name, or landmark you can read.`;

/**
 * Sends an image to Moonshot Kimi Vision for scene understanding.
 * Returns a concise factual description of the emergency scene.
 */
export async function describeScene(imageBuffer: Buffer): Promise<string> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('[Moonshot] MOONSHOT_API_KEY is not set in environment variables');
  }

  const start = Date.now();

  try {
    const base64Image = imageBuffer.toString('base64');
    const dataUrl = `data:image/jpeg;base64,${base64Image}`;

    const response = await axios.post(
      MOONSHOT_API_URL,
      {
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
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const description = response.data?.choices?.[0]?.message?.content || '';

    const elapsed = Date.now() - start;
    console.log(`[Moonshot Vision] Scene described in ${elapsed}ms (${description.length} chars)`);

    return description;
  } catch (error: any) {
    const elapsed = Date.now() - start;
    const msg = error.response?.data?.error?.message || error.message;
    console.error(`[Moonshot Vision] Failed after ${elapsed}ms: ${msg}`);
    throw new Error(`[Moonshot Vision] Scene description failed: ${msg}`);
  }
}

// Chat completion callbacks
export interface ChatCallbacks {
  onToken: (token: string) => void;
  onComplete: (text: string) => void;
  onError: (error: string) => void;
}

/**
 * Streaming chat completion using Moonshot Kimi
 * Much better than Sarvam for natural conversation
 */
export async function streamChatCompletion(
  messages: Array<{ role: string; content: string }>,
  callbacks: ChatCallbacks,
  abortSignal?: AbortSignal
): Promise<void> {
  const apiKey = process.env.MOONSHOT_API_KEY;
  if (!apiKey) {
    throw new Error('[Moonshot] MOONSHOT_API_KEY is not set');
  }

  try {
    const response = await axios.post(
      MOONSHOT_API_URL,
      {
        model: MOONSHOT_CHAT_MODEL,
        messages,
        temperature: 0.3, // Lower temperature for more predictable responses
        max_tokens: 150,
        stream: true,
      },
      {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        responseType: 'stream',
        signal: abortSignal,
        timeout: 30000,
      }
    );

    return new Promise((resolve, reject) => {
      const stream = response.data as Readable;
      let buffer = '';
      let fullText = '';

      stream.on('data', (chunk: Buffer) => {
        if (abortSignal?.aborted) {
          (stream as any).destroy();
          reject(new Error('Aborted'));
          return;
        }

        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || trimmed === 'data: [DONE]') continue;

          if (trimmed.startsWith('data: ')) {
            try {
              const data = JSON.parse(trimmed.slice(6));
              const delta = data.choices?.[0]?.delta;
              const token = delta?.content;
              if (token) {
                fullText += token;
                callbacks.onToken(token);
              }
            } catch (e) {
              // Ignore parse errors for malformed chunks
            }
          }
        }
      });

      stream.on('end', () => {
        callbacks.onComplete(fullText.trim());
        resolve();
      });

      stream.on('error', (err: Error) => {
        callbacks.onError(err.message);
        reject(err);
      });

      if (abortSignal) {
        abortSignal.addEventListener('abort', () => {
          (stream as any).destroy();
          reject(new Error('Aborted'));
        }, { once: true });
      }
    });
  } catch (error: any) {
    if (error.message === 'Aborted') {
      throw new Error('Aborted');
    }
    const msg = error.response?.data?.error?.message || error.message;
    console.error('[Moonshot Chat] Failed:', msg);
    throw new Error(`Chat streaming failed: ${msg}`);
  }
}
