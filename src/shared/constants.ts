import { ExtensionSettings } from './types';

export const DEFAULT_FIREWORKS_MODEL = 'accounts/fireworks/models/deepseek-v4p1-flash';

export const POPULAR_MODELS = [
  {
    id: 'accounts/fireworks/models/deepseek-v4p1-flash',
    name: 'DeepSeek 4.1 Flash (accounts/fireworks/models/deepseek-v4p1-flash)',
  },
  {
    id: 'accounts/fireworks/models/deepseek-v3',
    name: 'DeepSeek V3 (accounts/fireworks/models/deepseek-v3)',
  },
  {
    id: 'accounts/fireworks/models/deepseek-r1',
    name: 'DeepSeek R1 (accounts/fireworks/models/deepseek-r1)',
  },
];

export const DEFAULT_SETTINGS: ExtensionSettings = {
  fireworksApiKey: '',
  model: DEFAULT_FIREWORKS_MODEL,
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
