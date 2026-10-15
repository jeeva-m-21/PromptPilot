import { ExtensionSettings } from './types';

export const DEFAULT_FIREWORKS_MODEL = 'accounts/fireworks/models/deepseek-v4p1-flash';

export const POPULAR_FIREWORKS_MODELS = [
  {
    id: 'accounts/fireworks/models/deepseek-v4p1-flash',
    name: 'DeepSeek 4.1 Flash (Fast & Efficient)',
  },
  {
    id: 'accounts/fireworks/models/deepseek-v3',
    name: 'DeepSeek V3 (High Capability)',
  },
  {
    id: 'accounts/fireworks/models/deepseek-r1',
    name: 'DeepSeek R1 (Deep Reasoning)',
  },
];

export const POPULAR_OLLAMA_MODELS = [
  { id: 'llama3.2', name: 'Llama 3.2 (Default recommended)' },
  { id: 'deepseek-r1:1.5b', name: 'DeepSeek R1 1.5B (Fast reasoning)' },
  { id: 'deepseek-r1:7b', name: 'DeepSeek R1 7B (High accuracy reasoning)' },
  { id: 'qwen2.5:latest', name: 'Qwen 2.5 (High instruction following)' },
  { id: 'mistral:latest', name: 'Mistral 7B' },
  { id: 'llama3.1:8b', name: 'Llama 3.1 8B' },
];

export const POPULAR_MODELS = POPULAR_FIREWORKS_MODELS;

export const DEFAULT_SETTINGS: ExtensionSettings = {
  provider: 'fireworks',
  fireworksApiKey: '',
  model: DEFAULT_FIREWORKS_MODEL,
  ollamaEndpoint: 'http://localhost:11434',
  ollamaModel: 'llama3.2',
  localOpenAiEndpoint: 'http://localhost:1234/v1',
  localOpenAiModel: 'local-model',
  localOpenAiApiKey: '',
  pauseDelayMs: 1200,
  sensitivity: 'balanced',
  maxQuestions: 3,
  alwaysUseDefaults: false,
  defaultMode: 'detailed',
  enabledSites: {
    claude: true,
    chatgpt: true,
    gemini: true,
  },
  customInstructions: '',
};

export const SENSITIVITY_THRESHOLDS = {
  proactive: 20,
  balanced: 35,
  quiet: 50,
} as const;

export const STORAGE_KEYS = {
  SETTINGS: 'promptpilot_settings',
  HISTORY: 'promptpilot_history',
} as const;
