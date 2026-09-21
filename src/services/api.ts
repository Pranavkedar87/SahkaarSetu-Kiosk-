/**
 * API Service Foundation
 *
 * All requests to the SahkaarSetu FastAPI backend go through this module.
 *
 * SECURITY:
 *   - Only VITE_API_BASE_URL is used. It is a public URL.
 *   - No API keys (Gemini, BHASHINI, Supabase) are placed in this file
 *     or anywhere in the frontend bundle.
 *   - All AI/database calls are proxied through the existing FastAPI backend.
 */

import type {
  HealthResponse,
  QueryRequest,
  QueryResponse,
  TranscribeResponse,
  SynthesizeResponse,
  VisionAnalyzeResponse,
  VisionQueryRequest,
} from '../types';

const DEFAULT_PROD_URL = 'https://sih26088-cooperative-ai.onrender.com';

function resolveApiBaseUrl(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim();

  // If in browser on an HTTPS origin (like GitHub Pages or production web),
  // never use insecure http://localhost as browsers strictly block mixed content.
  if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
    if (!envUrl || envUrl.startsWith('http://localhost') || envUrl.startsWith('http://127.0.0.1') || envUrl.startsWith('http:')) {
      return DEFAULT_PROD_URL;
    }
  }

  // If in browser on a remote hostname (e.g. *.github.io, custom domain),
  // do not point to localhost.
  if (
    typeof window !== 'undefined' &&
    window.location.hostname &&
    window.location.hostname !== 'localhost' &&
    window.location.hostname !== '127.0.0.1'
  ) {
    if (!envUrl || envUrl.includes('localhost') || envUrl.includes('127.0.0.1')) {
      return DEFAULT_PROD_URL;
    }
  }

  return envUrl || DEFAULT_PROD_URL;
}

/** Base URL resolved from Vite environment variable at build time, with secure live backend fallback. */
const API_BASE_URL: string = resolveApiBaseUrl();

export { API_BASE_URL };

// ─── Low-level helpers ────────────────────────────────────────────────────────

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {}, signal } = opts;

  const init: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    signal,
  };

  if (body !== undefined) {
    init.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${path}`, init);

  if (!response.ok) {
    const text = await response.text().catch(() => 'Unknown error');
    const error = new Error(`API ${response.status}: ${text}`);
    (error as Error & { status: number }).status = response.status;
    throw error;
  }

  return response.json() as Promise<T>;
}

// ─── Health check ─────────────────────────────────────────────────────────────

/**
 * Lightweight health check against the existing FastAPI backend.
 * Used to determine service availability state on the kiosk home screen.
 */
export async function checkHealth(signal?: AbortSignal): Promise<HealthResponse> {
  return request<HealthResponse>('/health', { signal });
}

// ─── Voice: Audio Transcription (STT) ────────────────────────────────────────

export async function transcribeAudio(
  audioBlob: Blob,
  language: string,
  sessionId?: string,
  signal?: AbortSignal
): Promise<TranscribeResponse> {
  const typeStr = (audioBlob.type || '').toLowerCase();
  let filename = 'speech.webm';
  if (typeStr.includes('mp4') || typeStr.includes('m4a')) {
    filename = 'speech.mp4';
  } else if (typeStr.includes('wav')) {
    filename = 'speech.wav';
  } else if (typeStr.includes('ogg')) {
    filename = 'speech.ogg';
  }

  const formData = new FormData();
  formData.append('audio', audioBlob, filename);
  formData.append('language', language);
  if (sessionId) {
    formData.append('session_id', sessionId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for Render cold-start

  try {
    const res = await fetch(`${API_BASE_URL}/api/voice/transcribe`, {
      method: 'POST',
      body: formData,
      signal: signal ?? controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Audio transcription failed' }));
      throw new Error(errData.detail || `STT failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Audio transcription timed out or backend is offline');
    }
    throw err;
  }
}

export async function sendQuery(
  requestData: QueryRequest,
  signal?: AbortSignal
): Promise<QueryResponse> {
  const maxAttempts = 2;
  let attempts = 0;

  while (attempts < maxAttempts) {
    attempts++;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const res = await fetch(`${API_BASE_URL}/api/query`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: requestData.message,
          language: requestData.language,
          session_id: requestData.session_id,
          response_mode: requestData.response_mode || 'text',
        }),
        signal: signal ?? controller.signal,
      });

      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }

      const errData = await res.json().catch(() => ({ detail: 'Query failed' }));
      if (attempts >= maxAttempts) {
        throw new Error(errData.detail || `Query failed with status ${res.status}`);
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (attempts >= maxAttempts) {
        if (err.name === 'AbortError') {
          throw new Error('Query request timed out');
        }
        throw err;
      }
      // Pause briefly before retrying in case cold backend is booting
      await new Promise((r) => setTimeout(r, 1500));
    }
  }

  throw new Error('Query request failed');
}

// ─── Voice: Speech Synthesis (TTS) ───────────────────────────────────────────

export async function synthesizeSpeech(
  text: string,
  language: string,
  gender: string = 'female',
  signal?: AbortSignal
): Promise<SynthesizeResponse | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    const res = await fetch(`${API_BASE_URL}/api/voice/synthesize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: text.slice(0, 800),
        language,
        gender,
      }),
      signal: signal ?? controller.signal,
    });

    clearTimeout(timeoutId);

    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    console.warn('[TTS] Synthesis failed or timed out:', err);
  }
  return null;
}

// ─── Vision: Document Analysis (K6) ──────────────────────────────────────────

export async function analyzeDocument(
  fileBlob: Blob,
  language: string,
  sessionId?: string,
  signal?: AbortSignal
): Promise<VisionAnalyzeResponse> {
  const formData = new FormData();
  let filename = 'document.jpg';
  const typeStr = (fileBlob.type || '').toLowerCase();
  if (typeStr.includes('png')) {
    filename = 'document.png';
  } else if (typeStr.includes('webp')) {
    filename = 'document.webp';
  }
  formData.append('file', fileBlob, filename);
  formData.append('language', language);
  if (sessionId) {
    formData.append('session_id', sessionId);
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 45000); // 45s timeout for multimodal Gemini

  try {
    const res = await fetch(`${API_BASE_URL}/api/vision/analyze`, {
      method: 'POST',
      body: formData,
      signal: signal ?? controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Document analysis failed' }));
      throw new Error(errData.detail || `Analysis failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Document analysis timed out');
    }
    throw err;
  }
}

// ─── Vision: Document Q&A Query (K6) ─────────────────────────────────────────

export async function queryVisionDocument(
  req: VisionQueryRequest,
  signal?: AbortSignal
): Promise<QueryResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 35000);

  try {
    const res = await fetch(`${API_BASE_URL}/api/vision/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
      signal: signal ?? controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: 'Vision query failed' }));
      throw new Error(errData.detail || `Vision query failed with status ${res.status}`);
    }

    return await res.json();
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Vision query request timed out');
    }
    throw err;
  }
}
