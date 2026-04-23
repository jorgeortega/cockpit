// Polyfill scrollTo for jsdom/HTMLElement to avoid "Not implemented: window.scrollTo" errors
// Runs before tests via Vitest setupFiles.

declare global {
  interface Window {
    scrollTo: (options?: any) => void;
  }
  interface HTMLElement {
    scrollTo?: (options?: any) => void;
  }
}

if (typeof window.scrollTo !== 'function') {
  window.scrollTo = function (_options?: any) {
    // no-op in jsdom environment
  };
}

if (typeof HTMLElement !== 'undefined' && !HTMLElement.prototype.scrollTo) {
  // Provide a basic implementation that updates scrollLeft/scrollTop so
  // components that rely on element.scrollTo behave in tests.
  // eslint-disable-next-line func-names
  HTMLElement.prototype.scrollTo = function (options?: any) {
    if (options && typeof options === 'object') {
      if (typeof options.left === 'number') (this as any).scrollLeft = options.left;
      if (typeof options.top === 'number') (this as any).scrollTop = options.top;
    } else if (typeof options === 'number') {
      (this as any).scrollTop = options;
    }
  };
}

export {};
