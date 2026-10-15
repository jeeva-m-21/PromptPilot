import React, { useState, useEffect, useCallback, useRef } from 'react';
import { SiteAdapter } from '../adapters/base';
import { AnalysisResult, ExtensionSettings, HistoryItem, PromptMode } from '../../shared/types';
import { Chip } from './Chip';
import { QuestionTray } from './QuestionTray';
import { PreviewCard } from './PreviewCard';
import { Toast } from './Toast';
import { detectTheme } from './theme';

interface PromptPilotAppProps {
  adapter: SiteAdapter;
  settings: ExtensionSettings;
}

export type AppState =
  | 'idle'
  | 'analyzing'
  | 'chip_ready'
  | 'asking'
  | 'generating'
  | 'preview'
  | 'applied';

export const PromptPilotApp: React.FC<PromptPilotAppProps> = ({ adapter, settings }) => {
  const [state, setState] = useState<AppState>('idle');
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [optimizedText, setOptimizedText] = useState('');
  const [originalText, setOriginalText] = useState('');
  const [addedTags, setAddedTags] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const activePortRef = useRef<chrome.runtime.Port | null>(null);
  const revertHistoryRef = useRef<string | null>(null);

  // Continuously track input position & theme while UI is active
  useEffect(() => {
    let animId: number;

    const updatePosition = () => {
      const el = adapter.findInput();
      if (el) {
        const rect = adapter.getInputRect();
        if (rect) {
          setAnchorRect(rect);
        }
        setTheme(detectTheme(el));
      }
    };

    updatePosition();

    // Listen to window events
    window.addEventListener('resize', updatePosition, { passive: true });
    window.addEventListener('scroll', updatePosition, { passive: true, capture: true });

    // Observe size changes of the input box and its parent container
    const el = adapter.findInput();
    let resizeObserver: ResizeObserver | null = null;
    if (el && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        updatePosition();
      });
      resizeObserver.observe(el);
      if (el.parentElement) {
        resizeObserver.observe(el.parentElement);
      }
    }

    // While UI is active, check position on animation frames to smoothly track animated movement
    if (state !== 'idle') {
      const loop = () => {
        updatePosition();
        animId = requestAnimationFrame(loop);
      };
      animId = requestAnimationFrame(loop);
    }

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
      if (animId) {
        cancelAnimationFrame(animId);
      }
    };
  }, [adapter, state]);

  // Clean up streaming port
  const disconnectPort = useCallback(() => {
    if (activePortRef.current) {
      activePortRef.current.disconnect();
      activePortRef.current = null;
    }
  }, []);

  // Dismiss / close all PromptPilot surfaces
  const dismiss = useCallback(() => {
    disconnectPort();
    setState('idle');
  }, [disconnectPort]);

  // Start generation streaming via background service worker port
  const startRewrite = useCallback(
    (promptToRewrite: string, selectedAnswers: Record<string, string>, mode: PromptMode) => {
      disconnectPort();
      setState('preview');
      setIsStreaming(true);
      setOptimizedText('');
      setAddedTags([]);

      const port = chrome.runtime.connect({ name: 'promptpilot-stream' });
      activePortRef.current = port;

      port.onMessage.addListener((msg) => {
        if (msg.type === 'CHUNK') {
          setOptimizedText((prev) => prev + msg.chunk);
        } else if (msg.type === 'DONE') {
          setIsStreaming(false);
          setOptimizedText(msg.optimized);
          setAddedTags(msg.addedTags || []);
          disconnectPort();
        } else if (msg.type === 'ERROR') {
          setIsStreaming(false);
          setToastMessage(`Error: ${msg.error}`);
          setState('idle');
          disconnectPort();
        }
      });

      port.postMessage({
        type: 'START_REWRITE',
        payload: {
          prompt: promptToRewrite,
          answers: selectedAnswers,
          mode,
          site: adapter.id,
        },
      });
    },
    [adapter.id, disconnectPort]
  );

  // Open question tray or jump directly to rewrite
  const handleOpenTray = useCallback(() => {
    if (!analysis || analysis.gaps.length === 0) return;

    if (settings.alwaysUseDefaults) {
      // Use defaults directly
      const defaultAnswers: Record<string, string> = {};
      analysis.gaps.forEach((g) => {
        defaultAnswers[g.id] = g.defaultOption;
      });
      setAnswers(defaultAnswers);
      startRewrite(originalText, defaultAnswers, settings.defaultMode);
    } else {
      setCurrentQuestionIndex(0);
      setState('asking');
    }
  }, [analysis, settings, originalText, startRewrite]);

  // Accept and apply rewritten prompt
  const handleAccept = useCallback(() => {
    if (!optimizedText.trim()) return;

    // Store original for undo
    revertHistoryRef.current = originalText;

    const applied = adapter.setText(optimizedText);
    if (applied) {
      // Save to history
      const historyItem: HistoryItem = {
        id: `hist_${Date.now()}`,
        timestamp: Date.now(),
        site: adapter.id,
        mode: settings.defaultMode,
        original: originalText,
        optimized: optimizedText,
        answers,
        addedTags,
      };
      chrome.runtime.sendMessage({
        type: 'SAVE_HISTORY',
        payload: historyItem,
      });

      setToastMessage('Applied');
      setState('applied');
    } else {
      setToastMessage('Could not paste into input');
      setState('idle');
    }
  }, [adapter, optimizedText, originalText, answers, addedTags, settings.defaultMode]);

  // Revert / Undo action
  const handleUndo = useCallback(() => {
    if (revertHistoryRef.current !== null) {
      adapter.setText(revertHistoryRef.current);
      revertHistoryRef.current = null;
      setToastMessage('Reverted to original');
      setState('idle');
    }
  }, [adapter]);

  // Expose trigger methods to window for the input observer & keyboard manager
  useEffect(() => {
    (window as any).__promptpilot_trigger = {
      onAnalysisReady: (res: AnalysisResult, rawText: string) => {
        setAnalysis(res);
        setOriginalText(rawText);
        setCurrentQuestionIndex(0);
        setAnswers({});
        setState('chip_ready');
      },
      onForceOptimize: (rawText: string, quick: boolean) => {
        setOriginalText(rawText);
        if (quick) {
          startRewrite(rawText, {}, settings.defaultMode);
        } else {
          chrome.runtime.sendMessage(
            {
              type: 'ANALYZE_PROMPT',
              payload: { prompt: rawText, site: adapter.id },
            },
            (response) => {
              if (response?.success && response.data) {
                setAnalysis(response.data);
                if (response.data.gaps.length > 0) {
                  setCurrentQuestionIndex(0);
                  setState('asking');
                } else {
                  startRewrite(rawText, {}, settings.defaultMode);
                }
              }
            }
          );
        }
      },
      onUndo: () => handleUndo(),
      getState: () => state,
      dismiss: () => dismiss(),
      handleTabKey: () => {
        if (state === 'chip_ready') {
          handleOpenTray();
          return true;
        }
        if (state === 'asking' && analysis) {
          const currentGap = analysis.gaps[currentQuestionIndex];
          if (currentGap) {
            const chosen = answers[currentGap.id] || currentGap.defaultOption;
            const newAnswers = { ...answers, [currentGap.id]: chosen };
            setAnswers(newAnswers);

            if (currentQuestionIndex < analysis.gaps.length - 1) {
              setCurrentQuestionIndex((prev) => prev + 1);
            } else {
              startRewrite(originalText, newAnswers, settings.defaultMode);
            }
            return true;
          }
        }
        if (state === 'preview') {
          handleAccept();
          return true;
        }
        return false;
      },
      handleNumberKey: (num: number) => {
        if (state === 'asking' && analysis) {
          const currentGap = analysis.gaps[currentQuestionIndex];
          if (currentGap && currentGap.options[num - 1]) {
            const chosen = currentGap.options[num - 1];
            const newAnswers = { ...answers, [currentGap.id]: chosen };
            setAnswers(newAnswers);

            if (currentQuestionIndex < analysis.gaps.length - 1) {
              setCurrentQuestionIndex((prev) => prev + 1);
            } else {
              startRewrite(originalText, newAnswers, settings.defaultMode);
            }
            return true;
          }
        }
        return false;
      },
    };

    return () => {
      delete (window as any).__promptpilot_trigger;
    };
  }, [
    state,
    analysis,
    currentQuestionIndex,
    answers,
    originalText,
    settings,
    adapter,
    handleOpenTray,
    handleAccept,
    handleUndo,
    dismiss,
    startRewrite,
  ]);

  if (state === 'idle') return null;

  // Positioning style based on anchor input box
  const inputEl = adapter.findInput();
  if (!inputEl || !anchorRect) return null;

  const viewportHeight = window.innerHeight;
  const viewportWidth = window.innerWidth;
  const spaceBelow = viewportHeight - anchorRect.bottom;
  const spaceAbove = anchorRect.top;

  const isChip = state === 'chip_ready';
  const isToast = state === 'applied';

  // For tray & preview: if space below is under 280px (typical for bottom-pinned chat inputs), dock ABOVE!
  const placeAbove = isChip
    ? spaceBelow < 38
    : isToast
    ? spaceBelow < 60
    : spaceBelow < 280 || spaceAbove > spaceBelow + 80;

  const maxWidth = Math.min(640, viewportWidth - 32);
  const containerWidth = isChip ? 'auto' : `${Math.min(Math.max(340, anchorRect.width), maxWidth)}px`;
  const clampedLeft = Math.max(
    16,
    Math.min(anchorRect.left, viewportWidth - (isChip ? 220 : Math.min(anchorRect.width, maxWidth)) - 16)
  );

  const containerStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 2147483647,
    pointerEvents: 'none',
  };

  if (isChip) {
    const chipRight = Math.max(16, viewportWidth - anchorRect.right);
    containerStyle.right = `${chipRight}px`;
    if (placeAbove) {
      containerStyle.bottom = `${Math.max(8, viewportHeight - anchorRect.top + 8)}px`;
    } else {
      containerStyle.top = `${anchorRect.bottom + 6}px`;
    }
  } else {
    containerStyle.left = `${clampedLeft}px`;
    containerStyle.width = containerWidth;

    if (placeAbove) {
      containerStyle.bottom = `${Math.max(12, viewportHeight - anchorRect.top + 8)}px`;
      containerStyle.maxHeight = `${Math.max(200, Math.min(520, spaceAbove - 24))}px`;
    } else {
      containerStyle.top = `${anchorRect.bottom + 8}px`;
      containerStyle.maxHeight = `${Math.max(200, Math.min(520, spaceBelow - 24))}px`;
    }
  }

  return (
    <div className="promptpilot-root" style={containerStyle}>
      <div className="flex flex-col items-end w-full max-h-full overflow-y-auto promptpilot-scroll" style={{ pointerEvents: 'auto' }}>
        {state === 'chip_ready' && analysis && (
          <Chip
            gapCount={analysis.gaps.length}
            theme={theme}
            onClick={handleOpenTray}
          />
        )}

        {state === 'asking' && analysis && (
          <QuestionTray
            gaps={analysis.gaps}
            currentIndex={currentQuestionIndex}
            answers={answers}
            theme={theme}
            onSelectOption={(gapId, option) => {
              setAnswers((prev) => ({ ...prev, [gapId]: option }));
            }}
            onNext={() => {
              if (currentQuestionIndex < analysis.gaps.length - 1) {
                setCurrentQuestionIndex((prev) => prev + 1);
              } else {
                startRewrite(originalText, answers, settings.defaultMode);
              }
            }}
            onPrevious={() => {
              if (currentQuestionIndex > 0) {
                setCurrentQuestionIndex((prev) => prev - 1);
              }
            }}
            onDismiss={dismiss}
          />
        )}

        {state === 'preview' && (
          <PreviewCard
            originalText={originalText}
            optimizedText={optimizedText}
            addedTags={addedTags}
            theme={theme}
            isStreaming={isStreaming}
            onAccept={handleAccept}
            onCancel={dismiss}
          />
        )}

        {state === 'applied' && toastMessage && (
          <Toast
            message={toastMessage}
            theme={theme}
            onUndo={handleUndo}
            onClose={() => setState('idle')}
          />
        )}
      </div>
    </div>
  );
};
