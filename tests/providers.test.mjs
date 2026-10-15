import test from 'node:test';
import assert from 'node:assert';
import { createLLMClient } from '../src/background/gateway.ts';
import { OllamaClient } from '../src/background/ollama.ts';
import { LocalOpenAIClient } from '../src/background/local_openai.ts';
import { DEFAULT_SETTINGS } from '../src/shared/constants.ts';

test('Gateway: instantiates OllamaClient when provider is ollama', () => {
  const client = createLLMClient({
    ...DEFAULT_SETTINGS,
    provider: 'ollama',
    ollamaEndpoint: 'http://localhost:11434',
    ollamaModel: 'llama3.2',
  });
  assert.ok(client instanceof OllamaClient, 'Expected OllamaClient instance');
});

test('Gateway: instantiates LocalOpenAIClient when provider is local_openai', () => {
  const client = createLLMClient({
    ...DEFAULT_SETTINGS,
    provider: 'local_openai',
    localOpenAiEndpoint: 'http://localhost:1234/v1',
    localOpenAiModel: 'local-model',
  });
  assert.ok(client instanceof LocalOpenAIClient, 'Expected LocalOpenAIClient instance');
});

test('Gateway: throws friendly error if Fireworks is selected without API key', () => {
  assert.throws(
    () => {
      createLLMClient({
        ...DEFAULT_SETTINGS,
        provider: 'fireworks',
        fireworksApiKey: '',
      });
    },
    /Fireworks API key is required/,
    'Expected friendly error for missing key'
  );
});

test('OllamaClient: normalizes endpoint URLs cleanly', () => {
  const client = new OllamaClient('http://localhost:11434///', 'llama3.2');
  assert.strictEqual(client['endpoint'], 'http://localhost:11434');
});
