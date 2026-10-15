import { SiteAdapter, insertTextIntoElement } from './base';

export class GeminiAdapter implements SiteAdapter {
  readonly id = 'gemini' as const;
  readonly name = 'Gemini';

  matches(url: URL): boolean {
    return url.hostname === 'gemini.google.com';
  }

  findInput(): HTMLElement | null {
    // Gemini uses rich-textarea or contenteditable div
    const selectors = [
      'rich-textarea div[contenteditable="true"]',
      'div.ql-editor[contenteditable="true"]',
      'div[contenteditable="true"][aria-label*="prompt" i]',
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
    return !!document.querySelector('mat-chip, [aria-label*="attachment" i]');
  }
}
