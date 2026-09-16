import '@testing-library/jest-dom';

// Mock import.meta.env for Vite
Object.defineProperty(globalThis, 'import', {
  value: {
    meta: {
      env: {
        VITE_API_BASE_URL: 'http://localhost:8000',
        VITE_KIOSK_INACTIVITY_TIMEOUT_MS: '120000',
        VITE_KIOSK_TIMEOUT_WARNING_MS: '20000',
      },
    },
  },
  writable: true,
});
