import React from 'react';
import { Sparkles } from 'lucide-react';

interface ChipProps {
  gapCount: number;
  theme: 'dark' | 'light';
  onClick: () => void;
}

export const Chip: React.FC<ChipProps> = ({ gapCount, theme, onClick }) => {
  const isDark = theme === 'dark';

  return (
    <div
      onClick={onClick}
      role="status"
      aria-label="Prompt suggestions available, press Tab to review"
      className={`animate-fade-in inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer transition-all duration-150 shadow-sm border ${
        isDark
          ? 'bg-neutral-800/95 text-neutral-200 border-neutral-700/80 hover:bg-neutral-750 hover:border-neutral-600'
          : 'bg-white/95 text-neutral-750 border-neutral-200/90 hover:bg-neutral-50 hover:border-neutral-300'
      }`}
    >
      <Sparkles className="w-3.5 h-3.5 text-brand-500 flex-shrink-0 animate-pulse" />
      <span>{gapCount} {gapCount === 1 ? 'gap' : 'gaps'} detected</span>
      <span className={`px-1 py-0.2 rounded text-[10px] font-mono border ${
        isDark ? 'bg-neutral-900 border-neutral-700 text-neutral-400' : 'bg-neutral-100 border-neutral-300 text-neutral-500'
      }`}>
        Tab
      </span>
      <span className="text-[11px] opacity-80">to refine</span>
    </div>
  );
};
