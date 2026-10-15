import React, { useEffect } from 'react';
import { CheckCircle2, RotateCcw } from 'lucide-react';

interface ToastProps {
  message: string;
  theme: 'dark' | 'light';
  onUndo: () => void;
  onClose: () => void;
  durationMs?: number;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  theme,
  onUndo,
  onClose,
  durationMs = 3000,
}) => {
  const isDark = theme === 'dark';

  useEffect(() => {
    const timer = setTimeout(onClose, durationMs);
    return () => clearTimeout(timer);
  }, [durationMs, onClose]);

  return (
    <div
      role="status"
      className={`animate-fade-in inline-flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium shadow-xl border backdrop-blur-md ${
        isDark
          ? 'bg-neutral-900/95 border-neutral-700 text-neutral-100'
          : 'bg-white/95 border-neutral-200 text-neutral-900'
      }`}
    >
      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
      <span>{message}</span>
      <button
        onClick={onUndo}
        className="flex items-center gap-1 text-brand-500 hover:text-brand-400 font-medium px-1.5 py-0.5 rounded hover:bg-brand-500/10 transition-colors"
      >
        <RotateCcw className="w-3 h-3" />
        <span>Undo</span>
        <kbd className="px-1 py-0.2 rounded text-[10px] font-mono border border-brand-500/30">
          ⌥Z
        </kbd>
      </button>
    </div>
  );
};
