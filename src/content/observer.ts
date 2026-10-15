import { SiteAdapter } from './adapters/base';
import { ExtensionSettings } from '../shared/types';
import { SENSITIVITY_THRESHOLDS } from '../shared/constants';
import { analyzePromptTier1 } from './heuristics/scorer';

export class InputObserver {
  private adapter: SiteAdapter;
  private settings: ExtensionSettings;
  private debounceTimer: number | null = null;
  private lastAnalyzedText = '';
  private isAnalyzing = false;
  private mutationObserver: MutationObserver | null = null;

  constructor(adapter: SiteAdapter, settings: ExtensionSettings) {
    this.adapter = adapter;
    this.settings = settings;
  }

  public start() {
    this.attachListeners();

    // Use MutationObserver to re-attach if SPA navigation switches input container
    this.mutationObserver = new MutationObserver(() => {
      this.attachListeners();
    });

    this.mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  public stop() {
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.mutationObserver) {
      this.mutationObserver.disconnect();
      this.mutationObserver = null;
    }
  }

  public updateSettings(newSettings: ExtensionSettings) {
    this.settings = newSettings;
  }

  private attachListeners() {
    const el = this.adapter.findInput();
    if (!el || (el as any).__promptpilot_attached) return;

    (el as any).__promptpilot_attached = true;

    el.addEventListener('input', () => this.handleInput());
    el.addEventListener('paste', () => this.handleInput());
  }

  private handleInput() {
    if (this.debounceTimer) {
      window.clearTimeout(this.debounceTimer);
    }

    const currentText = this.adapter.getText();

    // If empty or text drastically changed back to empty, dismiss
    if (!currentText.trim()) {
      (window as any).__promptpilot_trigger?.dismiss();
      this.lastAnalyzedText = '';
      return;
    }

    // Schedule Tier 1 + Tier 2 checks on user pause
    this.debounceTimer = window.setTimeout(() => {
      this.evaluateInput(currentText);
    }, this.settings.pauseDelayMs);
  }

  private async evaluateInput(text: string) {
    if (text === this.lastAnalyzedText || this.isAnalyzing) return;

    // Check if current site is enabled
    const siteKey = this.adapter.id as keyof ExtensionSettings['enabledSites'];
    if (this.settings.enabledSites && !this.settings.enabledSites[siteKey]) {
      return;
    }

    // Tier 1 local heuristic check
    const tier1 = analyzePromptTier1(text, this.adapter.hasAttachments());
    const threshold = SENSITIVITY_THRESHOLDS[this.settings.sensitivity] || 35;

    // Principle 2: "Silent unless useful"
    if (tier1.score < threshold) {
      return;
    }

    this.isAnalyzing = true;
    this.lastAnalyzedText = text;

    try {
      // Call Tier 2 Fireworks LLM gap analysis via background
      chrome.runtime.sendMessage(
        {
          type: 'ANALYZE_PROMPT',
          payload: {
            prompt: text,
            site: this.adapter.id,
          },
        },
        (response) => {
          this.isAnalyzing = false;
          if (response?.success && response.data) {
            const analysisResult = response.data;
            if (analysisResult.gaps && analysisResult.gaps.length > 0) {
              (window as any).__promptpilot_trigger?.onAnalysisReady(
                analysisResult,
                text
              );
            }
          }
        }
      );
    } catch (err) {
      this.isAnalyzing = false;
      console.error('[PromptPilot Observer] Tier 2 analysis error:', err);
    }
  }
}
