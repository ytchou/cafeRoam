import '@testing-library/jest-dom/vitest';
import { beforeAll, vi } from 'vitest';

// Provide a placeholder Mapbox token so components that check for it don't
// bail out early with a non-rendering fallback, which would fail map tests.
process.env.NEXT_PUBLIC_MAPBOX_TOKEN = 'pk.test_placeholder';

// jsdom doesn't implement scrollIntoView - mock it globally for Radix UI Select
window.HTMLElement.prototype.scrollIntoView = function () {};

beforeAll(() => {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});
