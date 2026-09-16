// ─────────────────────────────────────────────────────────────────────────────
// Language types
// Exact language list from the SahkaarSetu Citizen UI (SIH26088-Cooperative-AI)
// ─────────────────────────────────────────────────────────────────────────────

export type LanguageCode =
  | 'hi'   // Hindi
  | 'en'   // English
  | 'mr'   // Marathi
  | 'gu'   // Gujarati
  | 'bn'   // Bengali
  | 'ta'   // Tamil
  | 'te'   // Telugu
  | 'kn'   // Kannada
  | 'ml'   // Malayalam
  | 'pa'   // Punjabi
  | 'or'   // Odia
  | 'as'   // Assamese
  | 'ur'   // Urdu
  | 'sa'   // Sanskrit
  | 'ks'   // Kashmiri
  | 'kok'  // Konkani
  | 'mai'  // Maithili
  | 'mni'  // Manipuri
  | 'ne'   // Nepali
  | 'brx'  // Bodo
  | 'sat'  // Santali
  | 'sd';  // Sindhi

export interface Language {
  code: LanguageCode;
  /** English label */
  label: string;
  /** Label in the native script */
  nativeLabel: string;
  /** Whether the script is right-to-left */
  rtl?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// Kiosk screen / navigation
// ─────────────────────────────────────────────────────────────────────────────

export type KioskScreen = 'splash' | 'language' | 'home' | 'chat' | 'scan';

// ─────────────────────────────────────────────────────────────────────────────
// Session
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ephemeral in-memory kiosk session.
 * NEVER persisted to localStorage, sessionStorage, or IndexedDB.
 */
export interface KioskSession {
  language: LanguageCode;
  screen: KioskScreen;
  /**
   * When true an active operation (voice, API call, TTS, scan, print) is in
   * progress. The inactivity timer MUST be suspended while this is true.
   */
  activeOperation: boolean;
  /** Conversation messages for the current citizen. Cleared on session reset. */
  messages: ChatMessage[];
  /** Document context for the current scan session. Cleared on reset. */
  documentContext: DocumentContext | null;
  /** Whether the service is reachable. */
  serviceAvailable: boolean;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: number;
}

export interface DocumentContext {
  /** Browser object-URL of the captured image (revoked on reset). */
  imageObjectUrl: string | null;
  /** Gemini vision analysis result text. */
  analysisText: string | null;
  documentType: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Hardware placeholder states
// ─────────────────────────────────────────────────────────────────────────────

export type MicrophoneState = 'idle' | 'listening' | 'processing' | 'error';
export type CameraState = 'closed' | 'active' | 'captured' | 'error';
export type PhysicalButtonState = 'pressed' | 'released';
export type PrinterState = 'ready' | 'printing' | 'paper_out' | 'error';

// ─────────────────────────────────────────────────────────────────────────────
// API
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiError {
  status: number;
  message: string;
}

export interface HealthResponse {
  status: 'ok' | 'degraded';
  timestamp: string;
}
