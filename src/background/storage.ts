import { DEFAULT_SETTINGS, STORAGE_KEYS } from '../shared/constants';
import { ExtensionSettings, HistoryItem } from '../shared/types';

export async function getSettings(): Promise<ExtensionSettings> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
  const settings: ExtensionSettings = {
    ...DEFAULT_SETTINGS,
    ...(result[STORAGE_KEYS.SETTINGS] || {}),
  };

  // Auto-migrate legacy model name if present
  if (settings.model === 'accounts/fireworks/models/deepseek-v4-flash') {
    settings.model = 'accounts/fireworks/models/deepseek-v4p1-flash';
    await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
  }

  return settings;
}

export async function saveSettings(updates: Partial<ExtensionSettings>): Promise<ExtensionSettings> {
  const current = await getSettings();
  const updated = { ...current, ...updates };
  await chrome.storage.local.set({ [STORAGE_KEYS.SETTINGS]: updated });
  return updated;
}

export async function getHistory(): Promise<HistoryItem[]> {
  const result = await chrome.storage.local.get(STORAGE_KEYS.HISTORY);
  return (result[STORAGE_KEYS.HISTORY] as HistoryItem[]) || [];
}

export async function saveHistoryItem(item: HistoryItem): Promise<void> {
  const history = await getHistory();
  // Keep up to 100 recent prompt items
  const updated = [item, ...history.filter((h) => h.id !== item.id)].slice(0, 100);
  await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: updated });
}

export async function clearHistory(): Promise<void> {
  await chrome.storage.local.set({ [STORAGE_KEYS.HISTORY]: [] });
}
