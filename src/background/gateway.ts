import { ExtensionSettings, AnalysisResult, PromptMode } from '../shared/types';
import { FireworksClient } from './fireworks';
import { OllamaClient } from './ollama';
import { LocalOpenAIClient } from './local_openai';

export interface LLMClient {
  analyzePrompt(prompt: string, site: string): Promise<AnalysisResult>;
  rewritePromptStream(
    prompt: string,
    answers: Record<string, string>,
    mode: PromptMode,
    site: string,
    customInstructions: string | undefined,
    onChunk: (chunk: string) => void
  ): Promise<{ optimized: string; addedTags: string[] }>;
}

export function createLLMClient(settings: ExtensionSettings): LLMClient {
  switch (settings.provider) {
    case 'ollama': {
      return new OllamaClient(settings.ollamaEndpoint, settings.ollamaModel);
    }
    case 'local_openai': {
      return new LocalOpenAIClient(
        settings.localOpenAiEndpoint,
        settings.localOpenAiModel,
        settings.localOpenAiApiKey
      );
    }
    case 'fireworks':
    default: {
      if (!settings.fireworksApiKey?.trim()) {
        throw new Error('Fireworks API key is required. Set it in PromptPilot settings.');
      }
      return new FireworksClient(settings.fireworksApiKey, settings.model);
    }
  }
}
