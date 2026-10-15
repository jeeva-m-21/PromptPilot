export interface SiteAdapter {
  readonly id: 'claude' | 'chatgpt' | 'gemini';
  readonly name: string;
  matches(url: URL): boolean;
  findInput(): HTMLElement | null;
  getText(): string;
  setText(text: string): boolean;
  getInputRect(): DOMRect | null;
  hasAttachments(): boolean;
}

/**
 * Universal text insertion strategy that preserves rich-text editor undo stack
 * and triggers input events across ProseMirror, Slate, Lexical, and React controlled inputs.
 */
export function insertTextIntoElement(el: HTMLElement, text: string): boolean {
  try {
    el.focus();

    // Strategy 1: Check if contenteditable
    if (el.isContentEditable) {
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(el);
      selection?.removeAllRanges();
      selection?.addRange(range);

      const success = document.execCommand('insertText', false, text);
      if (success) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }
    }

    // Strategy 2: Check if standard HTML textarea / input
    if (el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement) {
      const start = 0;
      const end = el.value.length;
      el.setSelectionRange(start, end);
      const success = document.execCommand('insertText', false, text);
      if (success) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      }

      // Fallback property descriptor setter for React-controlled textarea
      const proto = Object.getPrototypeOf(el);
      const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (valueSetter) {
        valueSetter.call(el, text);
      } else {
        el.value = text;
      }
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
      return true;
    }

    // Strategy 3: Synthetic paste event
    const clipboardData = new DataTransfer();
    clipboardData.setData('text/plain', text);
    const pasteEvent = new ClipboardEvent('paste', {
      bubbles: true,
      cancelable: true,
      clipboardData,
    });
    el.dispatchEvent(pasteEvent);
    return true;
  } catch (err) {
    console.error('[PromptPilot] Failed to insert text into element:', err);
    return false;
  }
}
