import React, { useState } from 'react';
import { Gap } from '../../shared/types';
import { ArrowRight, CornerDownLeft, X } from 'lucide-react';

interface QuestionTrayProps {
  gaps: Gap[];
  currentIndex: number;
  answers: Record<string, string>;
  theme: 'dark' | 'light';
  onSelectOption: (gapId: string, option: string) => void;
  onNext: () => void;
  onPrevious: () => void;
  onDismiss: () => void;
}

export const QuestionTray: React.FC<QuestionTrayProps> = ({
  gaps,
  currentIndex,
  theme,
  onSelectOption,
  onNext,
  onPrevious: _onPrevious,
  onDismiss,
}) => {
  const currentGap = gaps[currentIndex];
  const [customValue, setCustomValue] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  if (!currentGap) return null;

  const isDark = theme === 'dark';
  const total = gaps.length;

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (customValue.trim()) {
      onSelectOption(currentGap.id, customValue.trim());
      setCustomValue('');
      setShowCustomInput(false);
      onNext();
    }
  };

  return (
    <div
      role="dialog"
      aria-label="Prompt refinement question"
      className={`animate-fade-in w-full max-w-xl rounded-xl p-3.5 shadow-xl border backdrop-blur-md transition-all duration-150 ${
        isDark
          ? 'bg-neutral-900/95 border-neutral-750 text-neutral-100'
          : 'bg-white/95 border-neutral-200 text-neutral-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-neutral-200/60 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-brand-500">
            {currentGap.type}
          </span>
          <span className="text-xs text-neutral-400">·</span>
          <h4 className="text-sm font-medium tracking-tight">
            {currentGap.question}
          </h4>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-medium text-neutral-400">
            {currentIndex + 1}/{total}
          </span>
          <button
            onClick={onDismiss}
            className="p-1 rounded-md text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/60 transition-colors"
            title="Dismiss (Esc)"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Options */}
      <div className="pt-3 pb-1">
        {!showCustomInput ? (
          <div className="flex flex-wrap gap-2">
            {currentGap.options.slice(0, 4).map((option, idx) => {
              const isDefault = option === currentGap.defaultOption;
              const keyNum = idx + 1;

              return (
                <button
                  key={option}
                  onClick={() => {
                    onSelectOption(currentGap.id, option);
                    onNext();
                  }}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-120 ${
                    isDefault
                      ? isDark
                        ? 'bg-brand-950/60 border-brand-500/50 text-brand-200 hover:bg-brand-900/80 hover:border-brand-400'
                        : 'bg-brand-50 border-brand-300 text-brand-800 hover:bg-brand-100'
                      : isDark
                      ? 'bg-neutral-800/80 border-neutral-700/80 text-neutral-200 hover:bg-neutral-700/80'
                      : 'bg-neutral-50 border-neutral-200 text-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <kbd
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                      isDark
                        ? 'bg-neutral-900 border-neutral-700 text-neutral-400 group-hover:text-neutral-200'
                        : 'bg-white border-neutral-300 text-neutral-500'
                    }`}
                  >
                    {keyNum}
                  </kbd>
                  <span>{option}</span>
                  {isDefault && (
                    <span className="text-[10px] uppercase font-semibold text-brand-500">
                      Default
                    </span>
                  )}
                </button>
              );
            })}

            {/* Other / Custom option */}
            <button
              onClick={() => setShowCustomInput(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed transition-all ${
                isDark
                  ? 'border-neutral-700 text-neutral-400 hover:text-neutral-200 hover:border-neutral-500'
                  : 'border-neutral-300 text-neutral-600 hover:text-neutral-900 hover:border-neutral-400'
              }`}
            >
              <span>Other…</span>
            </button>
          </div>
        ) : (
          <form onSubmit={handleCustomSubmit} className="flex items-center gap-2">
            <input
              type="text"
              autoFocus
              value={customValue}
              onChange={(e) => setCustomValue(e.target.value)}
              placeholder="Type custom answer..."
              className={`flex-1 px-3 py-1.5 rounded-lg text-xs border outline-none ${
                isDark
                  ? 'bg-neutral-800 border-neutral-700 text-neutral-100 focus:border-brand-500'
                  : 'bg-white border-neutral-300 text-neutral-900 focus:border-brand-500'
              }`}
            />
            <button
              type="submit"
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-brand-600 hover:bg-brand-500 text-white flex items-center gap-1"
            >
              <span>Save</span>
              <CornerDownLeft className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setShowCustomInput(false)}
              className="px-2 py-1.5 text-xs text-neutral-400 hover:text-neutral-200"
            >
              Cancel
            </button>
          </form>
        )}
      </div>

      {/* Progress Dots & Shortcuts Footer */}
      <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-neutral-200/50 dark:border-neutral-800/80 text-[11px] text-neutral-400">
        <div className="flex items-center gap-1.5">
          {gaps.map((_, i) => (
            <span
              key={i}
              className={`w-1.5 h-1.5 rounded-full transition-all ${
                i === currentIndex
                  ? 'bg-brand-500 scale-125'
                  : i < currentIndex
                  ? 'bg-brand-800 dark:bg-brand-900'
                  : 'bg-neutral-300 dark:bg-neutral-700'
              }`}
            />
          ))}
        </div>

        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.2 rounded font-mono text-[10px] bg-neutral-200/80 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400">
              Tab
            </kbd>
            <span>use default</span>
          </span>
          <span className="flex items-center gap-1">
            <kbd className="px-1 py-0.2 rounded font-mono text-[10px] bg-neutral-200/80 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-500 dark:text-neutral-400">
              Esc
            </kbd>
            <span>dismiss</span>
          </span>
          <button
            onClick={() => {
              // Auto-select default if none selected
              onSelectOption(currentGap.id, currentGap.defaultOption);
              onNext();
            }}
            className="flex items-center gap-1 text-brand-500 hover:text-brand-400 font-medium"
          >
            <span>Next</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
