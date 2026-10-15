import { AnalysisResult, Gap, PromptMode } from '../shared/types';
import {
  GAP_ANALYST_SYSTEM_PROMPT,
  buildRewriterSystemPrompt,
  buildRewriterUserPrompt,
} from './prompts';

export class LocalOpenAIClient {
  private endpoint: string;
  private model: string;
  private apiKey: string;

  constructor(endpoint: string, model: string, apiKey?: string) {
    this.endpoint = (endpoint || 'http://localhost:1234/v1').trim().replace(/\/+$/, '');
    this.model = (model || 'local-model').trim();
    this.apiKey = (apiKey || 'not-needed').trim();
  }

  async testConnection(): Promise<{ latency: number; models: string[] }> {
    const start = performance.now();
    const res = await fetch(`${this.endpoint}/models`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Local server returned ${res.status}: ${err}`);
    }

    const data = await res.json();
    const latency = Math.round(performance.now() - start);
    const models: string[] = Array.isArray(data.data)
      ? data.data.map((m: any) => m.id).filter(Boolean)
      : [];

    return { latency, models };
  }

  async analyzePrompt(prompt: string, site: string): Promise<AnalysisResult> {
    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: GAP_ANALYST_SYSTEM_PROMPT },
          {
            role: 'user',
            content: `Analyze this prompt for ${site}:\n"""\n${prompt}\n"""`,
          },
        ],
        temperature: 0.1,
        max_tokens: 1024,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Local OpenAI error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content?.trim() || '{}';

    try {
      const cleanJson = content.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);

      const gaps: Gap[] = Array.isArray(parsed.gaps)
        ? parsed.gaps.map((g: any, index: number) => ({
            id: g.id || g.type || `gap-${index}`,
            type: g.type || 'goal',
            impact: typeof g.impact === 'number' ? g.impact : 0.7,
            question: g.question || 'How would you like to refine this?',
            options:
              Array.isArray(g.options) && g.options.length > 0
                ? g.options
                : ['Default', 'Detailed', 'Concise'],
            defaultOption: g.defaultOption || (g.options?.[0] ?? 'Default'),
          }))
        : [];

      return {
        score: typeof parsed.score === 'number' ? parsed.score : 50,
        intent: parsed.intent || 'general',
        gaps,
        rawPrompt: prompt,
      };
    } catch {
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
    const systemPrompt = buildRewriterSystemPrompt(site, mode, customInstructions);
    const userPrompt = buildRewriterUserPrompt(prompt, answers);

    const response = await fetch(`${this.endpoint}/chat/completions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.3,
        stream: true,
        max_tokens: 2048,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Local OpenAI error (${response.status}): ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to read streaming response from local server.');
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
            // Keep going
          }
        }
      }
    }

    const addedTags: string[] = [];
    for (const key of Object.keys(answers)) {
      addedTags.push(key);
    }
    const lower = fullText.toLowerCase();
    if (lower.includes('format:') || lower.includes('table') || lower.includes('step-by-step')) {
      if (!addedTags.includes('format')) addedTags.push('format');
    }

    return {
      optimized: fullText.trim(),
      addedTags: addedTags.slice(0, 5),
    };
  }
}
