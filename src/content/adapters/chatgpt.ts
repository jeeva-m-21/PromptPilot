import { SiteAdapter, insertTextIntoElement } from './base';

export class ChatGPTAdapter implements SiteAdapter {
  readonly id = 'chatgpt' as const;
  readonly name = 'ChatGPT';

  matches(url: URL): boolean {
    return url.hostname === 'chatgpt.com' || url.hostname === 'chat.openai.com';
  }

  findInput(): HTMLElement | null {
    // ChatGPT prompt input uses contenteditable div with id "prompt-textarea" or textarea
    const selectors = [
      '#prompt-textarea',
      'div[contenteditable="true"][data-placeholder]',
      'textarea[data-id="root"]',
      'div[contenteditable="true"]',
    ];

    for (const sel of selectors) {
      const el = document.querySelector<HTMLElement>(sel);
      if (el && el.offsetParent !== null) {
        return el;
      }
    }
    return null;
  }

  getText(): string {
    const el = this.findInput();
    if (!el) return '';
    if (el instanceof HTMLTextAreaElement) {
      return el.value.trim();
    }
    return el.innerText?.trim() || '';
  }

  setText(text: string): boolean {
    const el = this.findInput();
    if (!el) return false;
    return insertTextIntoElement(el, text);
  }

  getInputRect(): DOMRect | null {
    const el = this.findInput();
    return el ? el.getBoundingClientRect() : null;
  }

  hasAttachments(): boolean {
    return !!document.querySelector('[data-testid*="file"], [aria-label*="Attached file"]');
  }
}
