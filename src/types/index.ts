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

export type KioskScreen = 'splash' | 'language' | 'home' | 'voice' | 'type' | 'scan' | 'help' | 'chat';

export type SpeakButtonState = 'idle' | 'listening' | 'processing' | 'error';

export type VoiceFailureLayer =
  | 'MIC_PERMISSION'
  | 'MIC_UNAVAILABLE'
  | 'RECORDING_FAILED'
  | 'NO_SPEECH'
  | 'TRANSCRIPTION_FAILED'
  | 'QUERY_FAILED'
  | 'TTS_FAILED'
  | 'PLAYBACK_FAILED'
  | 'NETWORK_UNAVAILABLE';

export type ScanViewState =
  | 'idle'
  | 'camera_active'
  | 'captured'
  | 'processing'
  | 'analyzed'
  | 'asking'
  | 'error';

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

export interface SourceItem {
  title?: string;
  snippet?: string;
  url?: string;
  source_url?: string | null;
  document_type?: string | null;
}

export interface QueryRequest {
  message: string;
  language: string;
  session_id?: string;
  response_mode?: string;
}

export interface QueryResponse {
  answer: string;
  display_answer?: string;
  spoken_answer?: string;
  language?: string;
  intent?: string;
  source?: string;
  sources?: SourceItem[];
  suggested_followups?: Array<{ label: string; query: string }>;
  next_action?: string | null;
  session_id?: string;
  conversation_id?: string;
  grounding_status?: string;
}

export interface TranscribeResponse {
  transcript: string;
  language: string;
  confidence?: number;
  provider?: string;
  latency_ms?: number;
}

export interface SynthesizeResponse {
  audio_content?: string | null;
  audio_format?: string;
  language?: string;
  gender?: string;
  provider?: string;
  success: boolean;
}

export type VoiceFlowState =
  | 'idle'
  | 'listening'
  | 'transcribing'
  | 'querying'
  | 'speaking'
  | 'answered'
  | 'error';

// ─── Vision / Document Types (K6) ─────────────────────────────────────────────

export type DocumentType =
  | 'PMFBY_POLICY'
  | 'LAND_RECORD_7_12'
  | 'COOPERATIVE_NOTICE'
  | 'PACS_MEMBERSHIP_FORM'
  | 'SUBSIDY_LETTER'
  | 'FERTILIZER_RECEIPT'
  | 'LOAN_PASSBOOK'
  | 'IDENTITY_DOCUMENT'
  | 'UNKNOWN';

export type ReadabilityStatus =
  | 'CLEAR'
  | 'BLURRY'
  | 'CROPPED'
  | 'POOR_LIGHTING';

export interface VisionAnalyzeResponse {
  success: boolean;
  document_type: DocumentType | string;
  readability: ReadabilityStatus | string;
  detected_language?: string;
  key_fields?: Record<string, string | null>;
  document_summary?: string | null;
  suggested_questions?: string[];
  has_sensitive_pii?: boolean;
  refusal_reason?: string | null;
  processing_time_ms?: number;
}

export interface VisionQueryRequest {
  extracted_text: string;
  language: string;
  session_id?: string | null;
  device_id?: string | null;
}

export type ScanFlowState = ScanViewState;

// ─── Thermal Printer Types (K7) ───────────────────────────────────────────────

export type PrinterStatus =
  | 'ready'
  | 'offline'
  | 'unavailable'
  | 'printing'
  | 'error';

export interface PrintPayload {
  title?: string;
  subTitle?: string;
  question?: string;
  guidance: string;
  referenceCode?: string;
  pacsName?: string;
  village?: string;
  category?: string;
  language: string;
  createdAt?: string;
  sources?: string[];
  disclaimer?: string;
  qrPayload?: string;
}

export interface PrintResult {
  success: boolean;
  error?: string;
  via: 'thermal' | 'browser';
}

export interface ThermalPrinterInterface {
  isAvailable(): Promise<boolean>;
  getStatus(): Promise<PrinterStatus>;
  printSlip(payload: PrintPayload): Promise<PrintResult>;
  cancel?(): void;
}

