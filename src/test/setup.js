import '@testing-library/jest-dom/vitest';
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

// jsdom has no canvas: a no-op 2D context lets components render; drawing itself is tested in draw.test.js.
const noop = () => {};
const ctxStub = () => new Proxy({
  canvas: null,
  measureText: (t = '') => ({ width: String(t).length * 7 }),
  createLinearGradient: () => ({ addColorStop: noop }),
  createRadialGradient: () => ({ addColorStop: noop }),
  getImageData: () => ({ data: new Uint8ClampedArray(4) }),
}, {
  get: (t, k) => (k in t ? t[k] : noop),
  set: (t, k, v) => { t[k] = v; return true; },
});
HTMLCanvasElement.prototype.getContext = function getContext() {
  const ctx = ctxStub();
  ctx.canvas = this;
  return ctx;
};
HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,AAAA';

globalThis.ResizeObserver = class {
  constructor(cb) { this.cb = cb; }
  observe(el) { this.cb([{ target: el, contentRect: { width: 1000, height: 700 } }]); }
  unobserve() {}
  disconnect() {}
};

window.matchMedia = window.matchMedia || ((query) => ({
  matches: false, media: query, onchange: null,
  addListener: noop, removeListener: noop, addEventListener: noop, removeEventListener: noop, dispatchEvent: () => false,
}));

window.scrollTo = noop;
URL.createObjectURL = vi.fn(() => 'blob:test');
URL.revokeObjectURL = vi.fn();
