/// <reference types="vite/client" />

// Allow importing PNG/SVG/image files as URLs
declare module '*.png' {
  const url: string;
  export default url;
}
declare module '*.svg' {
  const url: string;
  export default url;
}
declare module '*.jpg' {
  const url: string;
  export default url;
}
declare module '*.webp' {
  const url: string;
  export default url;
}

// Vite exposes import.meta.env — this extends the ImportMeta interface
// (already provided by vite/client, but listed here for clarity)
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  readonly VITE_KIOSK_INACTIVITY_TIMEOUT_MS: string;
  readonly VITE_KIOSK_TIMEOUT_WARNING_MS: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
