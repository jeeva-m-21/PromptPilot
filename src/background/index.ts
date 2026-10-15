import { FireworksClient } from './fireworks';
import {
  clearHistory,
  getHistory,
  getSettings,
  saveHistoryItem,
  saveSettings,
} from './storage';

console.log('[PromptPilot Background] Service worker initialized.');

// Handle standard one-off request-response messages
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
      case 'ANALYZE_PROMPT': {
        const settings = await getSettings();
        if (!settings.fireworksApiKey) {
          return {
            success: false,
            error: 'Please enter your Fireworks API key in PromptPilot Settings.',
          };
        }
        const client = new FireworksClient(settings.fireworksApiKey, settings.model);
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
      if (!settings.fireworksApiKey) {
        port.postMessage({
          type: 'ERROR',
          error: 'Fireworks API key is missing. Set it in PromptPilot settings.',
        });
        return;
      }

      const client = new FireworksClient(settings.fireworksApiKey, settings.model);
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
