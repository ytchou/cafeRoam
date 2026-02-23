// PREBUILD ONLY — This file is used exclusively by scripts/prebuild/ for one-time
// data generation. Do NOT import from lib/ or app/. Production embedding workers
// should implement the IEmbeddingsProvider interface in lib/providers/embeddings/ instead.
import OpenAI from 'openai';
import { withRetry } from './retry';

const DEFAULT_MODEL = 'text-embedding-3-small';

let _client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OPENAI_API_KEY environment variable is required. Get one at https://platform.openai.com/api-keys'
      );
    }
    _client = new OpenAI({ apiKey });
  }
  return _client;
}

/**
 * Embed a single text string. Returns a 1536-dimension vector.
 */
export async function embedText(
  text: string,
  model: string = DEFAULT_MODEL
): Promise<number[]> {
  const [embedding] = await embedTexts([text], model);
  return embedding;
}

/**
 * Embed multiple texts in a single API call. Returns vectors in input order.
 * OpenAI supports up to 2048 inputs per batch.
 */
export async function embedTexts(
  texts: string[],
  model: string = DEFAULT_MODEL
): Promise<number[][]> {
  if (texts.length === 0) return [];

  const client = getClient();

  const response = await withRetry(() =>
    client.embeddings.create({ model, input: texts })
  );

  return response.data
    .sort((a, b) => a.index - b.index)
    .map((d) => d.embedding);
}
