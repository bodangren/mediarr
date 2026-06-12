
import '@testing-library/jest-dom/vitest';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from '@/lib/msw/server';

// MSW is only wired when explicitly requested. The default Vitest pool can hang
// when setupServer is loaded for every test file; gating the lifecycle hooks keeps
// `npx vitest run` fast until integration tests opt-in (see P3).
if (process.env.VITEST_MSW_ENABLED === 'true') {
  beforeAll(() => { server.listen({ onUnhandledRequest: 'error' }); });
  afterEach(() => { server.resetHandlers(); });
  afterAll(() => { server.close(); });
}

// Polyfill for PointerEvent and pointer capture methods which are missing in JSDOM
// but required by Radix UI (shadcn) components.
if (typeof window !== 'undefined') {
  if (!window.PointerEvent) {
    class PointerEvent extends MouseEvent {
      constructor(type: string, params: PointerEventInit = {}) {
        super(type, params);
      }
    }
    // @ts-expect-error Polyfilling missing PointerEvent in JSDOM
    window.PointerEvent = PointerEvent;
  }

  if (!Element.prototype.hasPointerCapture) {
    Element.prototype.hasPointerCapture = function() {
      return false;
    };
  }

  if (!Element.prototype.setPointerCapture) {
    Element.prototype.setPointerCapture = function() {};
  }

  if (!Element.prototype.releasePointerCapture) {
    Element.prototype.releasePointerCapture = function() {};
  }

  if (!Element.prototype.scrollIntoView) {
    Element.prototype.scrollIntoView = function() {};
  }

  if (!window.ResizeObserver) {
    window.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
}
