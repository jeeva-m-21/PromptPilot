import { SiteAdapter, insertTextIntoElement } from './base';

export class ClaudeAdapter implements SiteAdapter {
  readonly id = 'claude' as const;
  readonly name = 'Claude';

  matches(url: URL): boolean {
    return url.hostname === 'claude.ai';
  }

  findInput(): HTMLElement | null {
    // Claude uses ProseMirror inside contenteditable
    const selectors = [
      'div.ProseMirror[contenteditable="true"]',
      'div[contenteditable="true"][aria-label*="Claude"]',
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
    return !!document.querySelector('[data-testid*="attachment"], [aria-label*="Attachment"]');
  }
}
