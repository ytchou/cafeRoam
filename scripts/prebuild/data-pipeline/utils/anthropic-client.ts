import Anthropic from '@anthropic-ai/sdk';
import { withRetry } from './retry';

// Model ID map — update these if the API rejects them.
// Check https://docs.anthropic.com/en/docs/about-claude/models for current IDs.
export const MODELS = {
  sonnet: 'claude-sonnet-4-6-20250514',
  haiku: 'claude-haiku-4-5-20251001',
} as const;

export type ModelAlias = keyof typeof MODELS;

let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error(
        'ANTHROPIC_API_KEY environment variable is required. Get one at https://console.anthropic.com/'
      );
    }
    _client = new Anthropic({ apiKey });
  }
  return _client;
}

export interface ToolCallResult<T = unknown> {
  input: T;
  usage: { inputTokens: number; outputTokens: number };
}

/**
 * Call Claude with forced tool use for structured output extraction.
 * Returns the parsed tool input (structured data) from Claude's response.
 */
export async function callClaudeWithTool<T>(options: {
  model?: string;
  systemPrompt: string;
  userMessage: string;
  tool: Anthropic.Tool;
  maxTokens?: number;
}): Promise<ToolCallResult<T>> {
  const client = getClient();

  const response = await withRetry(() =>
    client.messages.create({
      model: options.model ?? MODELS.sonnet,
      max_tokens: options.maxTokens ?? 8192,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userMessage }],
      tools: [options.tool],
      tool_choice: { type: 'tool', name: options.tool.name },
    })
  );

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === 'tool_use'
  );

  if (!toolUse) {
    throw new Error(
      `Claude did not return a tool_use block. stop_reason: ${response.stop_reason}`
    );
  }

  return {
    input: toolUse.input as T,
    usage: {
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
    },
  };
}
