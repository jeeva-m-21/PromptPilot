import { AnalysisResult, Gap, PromptMode } from '../shared/types';
import {
  GAP_ANALYST_SYSTEM_PROMPT,
  buildRewriterSystemPrompt,
  buildRewriterUserPrompt,
} from './prompts';

const FIREWORKS_BASE_URL = 'https://api.fireworks.ai/inference/v1';

export class FireworksClient {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model: string) {
    this.apiKey = apiKey.trim();
    this.model = model.trim();
  }

  async analyzePrompt(prompt: string, site: string): Promise<AnalysisResult> {
    if (!this.apiKey) {
      throw new Error('Fireworks API key is not configured. Please set it in PromptPilot settings.');
    }

    const response = await fetch(`${FIREWORKS_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 2048,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.1,
        response_format: { type: 'json_object' },
        messages: [
          { role: 'system', content: GAP_ANALYST_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyze this prompt for ${site}:\n"""\n${prompt}\n"""`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Fireworks API error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '{}';

    try {
      // Parse clean or extract JSON block
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const gaps: Gap[] = Array.isArray(parsed.gaps)
        ? parsed.gaps.map((g: any, index: number) => ({
            id: g.id || g.type || `gap-${index}`,
            type: g.type || 'goal',
            impact: typeof g.impact === 'number' ? g.impact : 0.7,
            question: g.question || 'How would you like to refine this?',
            options: Array.isArray(g.options) && g.options.length > 0 ? g.options : ['Default', 'Detailed', 'Concise'],
            defaultOption: g.defaultOption || (g.options?.[0] ?? 'Default'),
          }))
        : [];

      return {
        score: typeof parsed.score === 'number' ? parsed.score : 50,
        intent: parsed.intent || 'general',
        gaps,
        rawPrompt: prompt,
      };
    } catch (parseError) {
      console.error('Failed to parse Fireworks response as JSON:', content, parseError);
      return {
        score: 40,
        intent: 'general',
        gaps: [],
        rawPrompt: prompt,
      };
    }
  }

  async rewritePromptStream(
    prompt: string,
    answers: Record<string, string>,
    mode: PromptMode,
    site: string,
    customInstructions: string | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ optimized: string; addedTags: string[] }> {
    if (!this.apiKey) {
      throw new Error('Fireworks API key is not configured.');
    }

    const systemPrompt = buildRewriterSystemPrompt(site, mode, customInstructions);
    const userPrompt = buildRewriterUserPrompt(prompt, answers);

    const response = await fetch(`${FIREWORKS_BASE_URL}/chat/completions`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: 4096,
        top_k: 40,
        presence_penalty: 0,
        frequency_penalty: 0,
        temperature: 0.3,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Fireworks API error (${response.status}): ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to read streaming response from Fireworks API.');
    }

    const decoder = new TextDecoder('utf-8');
    let fullText = '';
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith(':')) continue;
        if (trimmed === 'data: [DONE]') continue;

        if (trimmed.startsWith('data: ')) {
          try {
            const json = JSON.parse(trimmed.slice(6));
            const delta = json.choices?.[0]?.delta?.content || '';
            if (delta) {
              fullText += delta;
              onChunk(delta);
            }
          } catch {
            // Partial chunk or non-JSON keep going
          }
        }
      }
    }

    // Determine what improvements were added
    const addedTags: string[] = [];
    const lower = fullText.toLowerCase();
    if (Object.keys(answers).length > 0) {
      for (const key of Object.keys(answers)) {
        addedTags.push(key);
      }
    }
    if (lower.includes('format:') || lower.includes('table') || lower.includes('step-by-step') || lower.includes('json')) {
      if (!addedTags.includes('format')) addedTags.push('format');
    }
    if (lower.includes('constraint') || lower.includes('do not') || lower.includes('limit') || lower.includes('must')) {
      if (!addedTags.includes('constraints')) addedTags.push('constraints');
    }
    if (lower.includes('act as') || lower.includes('you are a') || lower.includes('expert') || lower.includes('role')) {
      if (!addedTags.includes('role')) addedTags.push('role');
    }
    if (lower.includes('audience') || lower.includes('for beginners') || lower.includes('for engineers')) {
      if (!addedTags.includes('audience')) addedTags.push('audience');
    }

    return {
      optimized: fullText.trim(),
      addedTags: addedTags.slice(0, 5),
    };
  }
}
