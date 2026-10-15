export function detectTheme(anchorEl?: HTMLElement | null): 'dark' | 'light' {
  if (anchorEl) {
    let current: HTMLElement | null = anchorEl;
    while (current && current !== document.body) {
      const bg = window.getComputedStyle(current).backgroundColor;
      if (bg && bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent') {
        const rgb = bg.match(/\d+/g);
        if (rgb && rgb.length >= 3) {
          const r = parseInt(rgb[0], 10);
          const g = parseInt(rgb[1], 10);
          const b = parseInt(rgb[2], 10);
          // Calculate relative luminance
          const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
          return luminance < 0.5 ? 'dark' : 'light';
        }
      }
      current = current.parentElement;
    }
  }

  // Fallback to browser media query
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}
