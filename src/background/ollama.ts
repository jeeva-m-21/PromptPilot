import { AnalysisResult, Gap, PromptMode } from '../shared/types';
import {
  GAP_ANALYST_SYSTEM_PROMPT,
  buildRewriterSystemPrompt,
  buildRewriterUserPrompt,
} from './prompts';

export class OllamaClient {
  private endpoint: string;
  private model: string;

  constructor(endpoint: string, model: string) {
    // Normalize endpoint URL: remove trailing slashes
    this.endpoint = (endpoint || 'http://localhost:11434').trim().replace(/\/+$/, '');
    this.model = (model || 'llama3.2').trim();
  }

  async testConnection(): Promise<{ latency: number; models: string[] }> {
    const start = performance.now();
    const res = await fetch(`${this.endpoint}/api/tags`, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Ollama server returned ${res.status}: ${err}`);
    }

    const data = await res.json();
    const latency = Math.round(performance.now() - start);
    const models: string[] = Array.isArray(data.models)
      ? data.models.map((m: any) => m.name || m.model).filter(Boolean)
      : [];

    return { latency, models };
  }

  async analyzePrompt(prompt: string, site: string): Promise<AnalysisResult> {
    const response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        stream: false,
        format: 'json',
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
      throw new Error(`Ollama error (${response.status}): ${errText}`);
    }

    const data = await response.json();
    const content = data.message?.content?.trim() || '{}';

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

    const response = await fetch(`${this.endpoint}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        stream: true,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Ollama error (${response.status}): ${errText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('Failed to read streaming response from Ollama.');
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
        if (!trimmed) continue;
        try {
          const json = JSON.parse(trimmed);
          const chunk = json.message?.content || '';
          if (chunk) {
            fullText += chunk;
            onChunk(chunk);
          }
        } catch {
          // Incomplete chunk line
        }
      }
    }

    // Determine added improvements
    const addedTags: string[] = [];
    const lower = fullText.toLowerCase();
    for (const key of Object.keys(answers)) {
      addedTags.push(key);
    }
    if (lower.includes('format:') || lower.includes('table') || lower.includes('step-by-step') || lower.includes('json')) {
      if (!addedTags.includes('format')) addedTags.push('format');
    }
    if (lower.includes('constraint') || lower.includes('do not') || lower.includes('limit')) {
      if (!addedTags.includes('constraints')) addedTags.push('constraints');
    }
    if (lower.includes('act as') || lower.includes('expert') || lower.includes('role')) {
      if (!addedTags.includes('role')) addedTags.push('role');
    }

    return {
      optimized: fullText.trim(),
      addedTags: addedTags.slice(0, 5),
    };
  }
}
