// ──────────────────────────────────────────────
// EIFS — OpenAI Embeddings Service
// Text embeddings for deduplication via cosine similarity
// Ref: PROJECT.md Section 8
// ──────────────────────────────────────────────

import axios from 'axios';

const OPENAI_API_URL = 'https://api.openai.com/v1/embeddings';
const EMBEDDING_MODEL = 'text-embedding-3-small';

/**
 * Generates a 1536-dimension embedding vector for the given text.
 * Used for deduplication: similar incidents produce similar embeddings.
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('[Embeddings] OPENAI_API_KEY is not set in environment variables');
  }

  const start = Date.now();

  try {
    const response = await axios.post(
      OPENAI_API_URL,
      {
        model: EMBEDDING_MODEL,
        input: text,
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    const embedding: number[] = response.data?.data?.[0]?.embedding;

    if (!embedding || embedding.length === 0) {
      throw new Error('Empty embedding returned from OpenAI');
    }

    const elapsed = Date.now() - start;
    console.log(`[Embeddings] Generated ${embedding.length}-dim vector in ${elapsed}ms`);

    return embedding;
  } catch (error: any) {
    const elapsed = Date.now() - start;
    const msg = error.response?.data?.error?.message || error.message;
    console.error(`[Embeddings] Failed after ${elapsed}ms: ${msg}`);
    throw new Error(`[Embeddings] Embedding generation failed: ${msg}`);
  }
}
