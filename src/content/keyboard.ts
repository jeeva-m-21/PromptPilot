import { SiteAdapter } from './adapters/base';

export class KeyboardManager {
  private adapter: SiteAdapter;

  constructor(adapter: SiteAdapter) {
    this.adapter = adapter;
  }

  public start() {
    window.addEventListener('keydown', this.handleKeyDown, true);
  }

  public stop() {
    window.removeEventListener('keydown', this.handleKeyDown, true);
  }

  private handleKeyDown = (e: KeyboardEvent) => {
    const trigger = (window as any).__promptpilot_trigger;
    const currentState = trigger?.getState ? trigger.getState() : 'idle';

    // 1. Alt+O (⌥O) -> Force analyze now
    if (e.altKey && !e.shiftKey && (e.key === 'o' || e.key === 'O' || e.code === 'KeyO')) {
      const text = this.adapter.getText();
      if (text.trim()) {
        e.preventDefault();
        e.stopPropagation();
        trigger?.onForceOptimize(text, false);
      }
      return;
    }

    // 2. Alt+Shift+O (⌥⇧O) -> Quick-optimize with smart defaults in one shot
    if (e.altKey && e.shiftKey && (e.key === 'o' || e.key === 'O' || e.code === 'KeyO')) {
      const text = this.adapter.getText();
      if (text.trim()) {
        e.preventDefault();
        e.stopPropagation();
        trigger?.onForceOptimize(text, true);
      }
      return;
    }

    // 3. Alt+Z (⌥Z) -> Revert to original prompt
    if (e.altKey && (e.key === 'z' || e.key === 'Z' || e.code === 'KeyZ')) {
      e.preventDefault();
      e.stopPropagation();
      trigger?.onUndo();
      return;
    }

    // If PromptPilot UI is NOT active, do not intercept any other keys
    if (currentState === 'idle') {
      return;
    }

    // 4. Escape -> Dismiss all PromptPilot surfaces
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      trigger?.dismiss();
      return;
    }

    // 5. Tab -> Accept / advance (Only intercepted when PromptPilot UI is visible)
    if (e.key === 'Tab' && !e.altKey && !e.metaKey && !e.ctrlKey) {
      const handled = trigger?.handleTabKey();
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }

    // 6. Number keys 1-4 when answering in the question tray
    if (currentState === 'asking' && ['1', '2', '3', '4'].includes(e.key)) {
      // Don't intercept if user is typing into an input field (e.g. "Other...")
      const target = e.target as HTMLElement;
      if (target && target.tagName === 'INPUT') {
        return;
      }

      const num = parseInt(e.key, 10);
      const handled = trigger?.handleNumberKey(num);
      if (handled) {
        e.preventDefault();
        e.stopPropagation();
      }
      return;
    }
  };
}
