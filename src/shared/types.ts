export type GapType =
  | 'goal'
  | 'audience'
  | 'format'
  | 'length'
  | 'tone'
  | 'context'
  | 'reference'
  | 'constraints'
  | 'success'
  | 'persona'
  | 'scope'
  | 'conflict'
  | 'vague'
  | 'locale';

export interface Gap {
  id: string;
  type: GapType;
  impact: number; // 0..1
  question: string;
  options: string[];
  defaultOption: string;
}

export interface AnalysisResult {
  score: number;
  intent: string;
  gaps: Gap[];
  rawPrompt: string;
}

export type PromptMode = 'concise' | 'detailed' | 'code' | 'creative' | 'research';

export interface HistoryItem {
  id: string;
  timestamp: number;
  site: string;
  mode: PromptMode;
  original: string;
  optimized: string;
  answers: Record<string, string>;
  addedTags: string[];
  pinned?: boolean;
}

export type LLMProvider = 'fireworks' | 'ollama' | 'local_openai';

export interface ExtensionSettings {
  provider: LLMProvider;
  fireworksApiKey: string;
  model: string;
  // Local Ollama configuration
  ollamaEndpoint: string;
  ollamaModel: string;
  // Local LM Studio / llama.cpp OpenAI-compatible configuration
  localOpenAiEndpoint: string;
  localOpenAiModel: string;
  localOpenAiApiKey?: string;
  // General behavior
  pauseDelayMs: number; // default 1200
  sensitivity: 'quiet' | 'balanced' | 'proactive'; // quiet = 50, balanced = 35, proactive = 20
  maxQuestions: number; // default 3
  alwaysUseDefaults: boolean; // skip tray questions
  defaultMode: PromptMode;
  enabledSites: {
    claude: boolean;
    chatgpt: boolean;
    gemini: boolean;
  };
  customInstructions?: string;
}

export type ExtensionState =
  | 'idle'
  | 'typing'
  | 'analyzing'
  | 'chip_ready'
  | 'asking'
  | 'generating'
  | 'preview'
  | 'applied'
  | 'error';

export interface MessagePayloads {
  ANALYZE_PROMPT: {
    prompt: string;
    site: string;
  };
  REWRITE_PROMPT: {
    prompt: string;
    answers: Record<string, string>;
    mode: PromptMode;
    site: string;
    streamId?: string;
  };
  GET_SETTINGS: Record<string, never>;
  SAVE_SETTINGS: Partial<ExtensionSettings>;
  GET_HISTORY: Record<string, never>;
  SAVE_HISTORY: HistoryItem;
  CLEAR_HISTORY: Record<string, never>;
}

export interface StreamChunkMessage {
  type: 'STREAM_CHUNK';
  streamId: string;
  chunk: string;
  done: boolean;
  addedTags?: string[];
  error?: string;
}
