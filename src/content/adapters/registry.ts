import { SiteAdapter } from './base';
import { ChatGPTAdapter } from './chatgpt';
import { ClaudeAdapter } from './claude';
import { GeminiAdapter } from './gemini';

const adapters: SiteAdapter[] = [
  new ClaudeAdapter(),
  new ChatGPTAdapter(),
  new GeminiAdapter(),
];

export function getSiteAdapter(): SiteAdapter | null {
  const currentUrl = new URL(window.location.href);
  for (const adapter of adapters) {
    if (adapter.matches(currentUrl)) {
      return adapter;
    }
  }
  return null;
}
