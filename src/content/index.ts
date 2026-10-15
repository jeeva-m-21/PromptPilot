import React from 'react';
import { createRoot } from 'react-dom/client';
import { getSiteAdapter } from './adapters/registry';
import { InputObserver } from './observer';
import { KeyboardManager } from './keyboard';
import { PromptPilotApp } from './ui/PromptPilotApp';
import { DEFAULT_SETTINGS } from '../shared/constants';
import { ExtensionSettings } from '../shared/types';
import styles from './ui/styles.css?inline';

async function bootstrap() {
  const adapter = getSiteAdapter();
  if (!adapter) {
    return;
  }

  console.log(`[PromptPilot] Initialized on ${adapter.name} (${adapter.id})`);

  // Fetch initial settings from background service worker
  let settings: ExtensionSettings = DEFAULT_SETTINGS;
  try {
    const res = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
    if (res?.success && res.data) {
      settings = res.data;
    }
  } catch (err) {
    console.warn('[PromptPilot] Could not load stored settings, using defaults.', err);
  }

  // Create isolated Shadow DOM host container
  const hostEl = document.createElement('div');
  hostEl.id = 'promptpilot-shadow-host';
  document.body.appendChild(hostEl);

  const shadowRoot = hostEl.attachShadow({ mode: 'open' });

  // Inject scoped styles into Shadow DOM
  const styleEl = document.createElement('style');
  styleEl.textContent = styles;
  shadowRoot.appendChild(styleEl);

  // Mount React App inside Shadow DOM
  const appContainer = document.createElement('div');
  shadowRoot.appendChild(appContainer);

  const root = createRoot(appContainer);
  root.render(
    React.createElement(PromptPilotApp, {
      adapter,
      settings,
    })
  );

  // Initialize background observers and keyboard interceptors
  const observer = new InputObserver(adapter, settings);
  observer.start();

  const keyboard = new KeyboardManager(adapter);
  keyboard.start();

  // Listen for settings changes dispatched from popup or options page
  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'local' && changes.promptpilot_settings?.newValue) {
      const updated = changes.promptpilot_settings.newValue as ExtensionSettings;
      observer.updateSettings(updated);
      root.render(
        React.createElement(PromptPilotApp, {
          adapter,
          settings: updated,
        })
      );
    }
  });
}

// Start when document is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bootstrap);
} else {
  bootstrap();
}
