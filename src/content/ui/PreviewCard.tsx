import React, { useState } from 'react';
import { diffWords } from 'diff';
import { Check, Sparkles, X, Edit3 } from 'lucide-react';

interface PreviewCardProps {
  originalText: string;
  optimizedText: string;
  addedTags: string[];
  theme: 'dark' | 'light';
  isStreaming: boolean;
  onAccept: () => void;
  onCancel: () => void;
  onEdit?: () => void;
}

export const PreviewCard: React.FC<PreviewCardProps> = ({
  originalText,
  optimizedText,
  addedTags,
  theme,
  isStreaming,
  onAccept,
  onCancel,
}) => {
  const [viewMode, setViewMode] = useState<'diff' | 'clean'>('diff');
  const [isEditing, setIsEditing] = useState(false);
  const [editableText, setEditableText] = useState(optimizedText);

  const isDark = theme === 'dark';

  // Compute word-level diff
  const diffParts = viewMode === 'diff' ? diffWords(originalText, isEditing ? editableText : optimizedText) : [];

  return (
    <div
      role="dialog"
      aria-label="Prompt optimization preview"
      className={`animate-fade-in w-full max-w-2xl rounded-xl p-4 shadow-2xl border backdrop-blur-md transition-all duration-150 ${
        isDark
          ? 'bg-neutral-900/95 border-neutral-750 text-neutral-100'
          : 'bg-white/95 border-neutral-200 text-neutral-900'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-neutral-200/60 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-brand-500" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">
            Optimized Prompt
          </h3>
          {isStreaming && (
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] bg-brand-500/10 text-brand-500 border border-brand-500/20 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-ping" />
              Streaming…
            </span>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 p-0.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-100/80 dark:bg-neutral-800/80 text-xs">
          <button
            onClick={() => {
              setViewMode('diff');
              setIsEditing(false);
            }}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              viewMode === 'diff' && !isEditing
                ? isDark ? 'bg-neutral-700 text-neutral-100 shadow-sm' : 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Diff
          </button>
          <button
            onClick={() => {
              setViewMode('clean');
              setIsEditing(false);
            }}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors ${
              viewMode === 'clean' && !isEditing
                ? isDark ? 'bg-neutral-700 text-neutral-100 shadow-sm' : 'bg-white text-neutral-900 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Clean
          </button>
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`px-2 py-0.5 rounded-md font-medium transition-colors flex items-center gap-1 ${
              isEditing
                ? isDark ? 'bg-brand-600 text-white shadow-sm' : 'bg-brand-600 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Edit</span>
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="py-3">
        {isEditing ? (
          <textarea
            value={editableText}
            onChange={(e) => setEditableText(e.target.value)}
            className={`w-full h-36 p-3 text-xs font-mono rounded-lg border outline-none resize-none promptpilot-scroll ${
              isDark
                ? 'bg-neutral-800 border-neutral-750 text-neutral-100 focus:border-brand-500'
                : 'bg-neutral-50 border-neutral-200 text-neutral-900 focus:border-brand-500'
            }`}
          />
        ) : (
          <div
            className={`max-h-48 overflow-y-auto p-3 text-xs leading-relaxed rounded-lg border promptpilot-scroll ${
              isDark
                ? 'bg-neutral-950/60 border-neutral-800/80 text-neutral-200'
                : 'bg-neutral-50/80 border-neutral-200/80 text-neutral-800'
            }`}
          >
            {viewMode === 'clean' ? (
              <p className="whitespace-pre-wrap">{optimizedText}</p>
            ) : (
              <p className="whitespace-pre-wrap">
                {diffParts.map((part, index) => {
                  if (part.added) {
                    return (
                      <span
                        key={index}
                        className="bg-emerald-500/20 text-emerald-400 border-b border-emerald-500/40 px-0.5 rounded-sm font-medium"
                      >
                        {part.value}
                      </span>
                    );
                  }
                  if (part.removed) {
                    return (
                      <span
                        key={index}
                        className="line-through opacity-40 text-rose-400 px-0.5"
                      >
                        {part.value}
                      </span>
                    );
                  }
                  return <span key={index}>{part.value}</span>;
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Added Dimensions Tags */}
      {addedTags.length > 0 && (
        <div className="flex items-center gap-1.5 pb-2 flex-wrap">
          <span className="text-[11px] font-semibold text-neutral-400">Added:</span>
          {addedTags.map((tag) => (
            <span
              key={tag}
              className={`px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                isDark
                  ? 'bg-brand-950/60 border-brand-800/60 text-brand-300'
                  : 'bg-brand-50 border-brand-200 text-brand-700'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer Controls */}
      <div className="flex items-center justify-between pt-2.5 border-t border-neutral-200/60 dark:border-neutral-800 text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onAccept()}
            className="px-3.5 py-1.5 rounded-lg font-medium bg-brand-600 hover:bg-brand-500 text-white shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Accept</span>
            <kbd className="px-1 py-0.2 rounded text-[10px] font-mono bg-brand-700 border border-brand-600 text-brand-100">
              Tab
            </kbd>
          </button>
          <button
            onClick={onCancel}
            className="px-3 py-1.5 rounded-lg font-medium text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/40 transition-colors flex items-center gap-1"
          >
            <X className="w-3.5 h-3.5" />
            <span>Keep original</span>
            <kbd className="px-1 py-0.2 rounded text-[10px] font-mono bg-neutral-800 border border-neutral-700 text-neutral-400">
              Esc
            </kbd>
          </button>
        </div>

        <div className="text-[11px] text-neutral-400 flex items-center gap-2">
          <span>Undo anytime:</span>
          <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-neutral-200 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300">
            ⌥Z
          </kbd>
        </div>
      </div>
    </div>
  );
};
