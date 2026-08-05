import { afterEach, vi } from 'vitest';

// jsdom does not implement navigator.geolocation; stub it so hooks can be tested.
Object.defineProperty(navigator, 'geolocation', {
  value: {
    getCurrentPosition: vi.fn(),
    watchPosition: vi.fn(),
    clearWatch: vi.fn(),
  },
  configurable: true,
  writable: true,
});

// Stub fetch so tests can queue up mock responses without network access.
vi.stubGlobal('fetch', vi.fn());

afterEach(() => {
  vi.clearAllMocks();
});
