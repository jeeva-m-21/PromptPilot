import { createLLMClient } from './gateway';
import { OllamaClient } from './ollama';
import { LocalOpenAIClient } from './local_openai';
import {
  clearHistory,
  getHistory,
  getSettings,
  saveHistoryItem,
  saveSettings,
} from './storage';

console.log('[PromptPilot Background] Service worker initialized.');

// Handle standard request-response messages
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (!message || !message.type) return;

  const handleMessage = async () => {
    switch (message.type) {
      case 'GET_SETTINGS': {
        const settings = await getSettings();
        return { success: true, data: settings };
      }
      case 'SAVE_SETTINGS': {
        const updated = await saveSettings(message.payload);
        return { success: true, data: updated };
      }
      case 'GET_HISTORY': {
        const history = await getHistory();
        return { success: true, data: history };
      }
      case 'SAVE_HISTORY': {
        await saveHistoryItem(message.payload);
        return { success: true };
      }
      case 'CLEAR_HISTORY': {
        await clearHistory();
        return { success: true };
      }
      case 'TEST_PROVIDER_CONNECTION': {
        const settings = await getSettings();
        const provider = message.payload?.provider || settings.provider;

        if (provider === 'ollama') {
          const endpoint = message.payload?.endpoint || settings.ollamaEndpoint;
          const model = message.payload?.model || settings.ollamaModel;
          const client = new OllamaClient(endpoint, model);
          const result = await client.testConnection();
          return { success: true, data: result };
        } else if (provider === 'local_openai') {
          const endpoint = message.payload?.endpoint || settings.localOpenAiEndpoint;
          const model = message.payload?.model || settings.localOpenAiModel;
          const apiKey = message.payload?.apiKey || settings.localOpenAiApiKey;
          const client = new LocalOpenAIClient(endpoint, model, apiKey);
          const result = await client.testConnection();
          return { success: true, data: result };
        } else {
          // Fireworks AI
          const apiKey = message.payload?.apiKey || settings.fireworksApiKey;
          const model = message.payload?.model || settings.model;
          if (!apiKey?.trim()) {
            throw new Error('Fireworks API key is required.');
          }
          const start = performance.now();
          const res = await fetch('https://api.fireworks.ai/inference/v1/chat/completions', {
            method: 'POST',
            headers: {
              Accept: 'application/json',
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey.trim()}`,
            },
            body: JSON.stringify({
              model,
              top_k: 40,
              presence_penalty: 0,
              frequency_penalty: 0,
              messages: [{ role: 'user', content: 'Say "connected" in one word.' }],
              max_tokens: 10,
            }),
          });
          const latency = Math.round(performance.now() - start);
          if (!res.ok) {
            const err = await res.text();
            throw new Error(`Fireworks error (${res.status}): ${err}`);
          }
          return { success: true, data: { latency, models: [] } };
        }
      }
      case 'ANALYZE_PROMPT': {
        const settings = await getSettings();
        const client = createLLMClient(settings);
        const result = await client.analyzePrompt(message.payload.prompt, message.payload.site);
        return { success: true, data: result };
      }
      default:
        return { success: false, error: 'Unknown message type' };
    }
  };

  handleMessage()
    .then(sendResponse)
    .catch((err) => {
      console.error('[PromptPilot Background] Error handling message:', err);
      sendResponse({ success: false, error: err.message || 'Internal error' });
    });

  return true; // Keep message channel open for async response
});

// Handle streaming connections for prompt rewriting
chrome.runtime.onConnect.addListener((port) => {
  if (port.name !== 'promptpilot-stream') return;

  port.onMessage.addListener(async (msg) => {
    if (msg.type !== 'START_REWRITE') return;

    try {
      const settings = await getSettings();
      const client = createLLMClient(settings);
      const { prompt, answers, mode, site } = msg.payload;

      const result = await client.rewritePromptStream(
        prompt,
        answers || {},
        mode || settings.defaultMode,
        site || 'claude',
        settings.customInstructions,
        (chunk: string) => {
          port.postMessage({ type: 'CHUNK', chunk });
        }
      );

      port.postMessage({
        type: 'DONE',
        optimized: result.optimized,
        addedTags: result.addedTags,
      });
    } catch (err: any) {
      console.error('[PromptPilot Background] Rewrite streaming error:', err);
      port.postMessage({
        type: 'ERROR',
        error: err.message || 'Failed to rewrite prompt.',
      });
    }
  });
});
