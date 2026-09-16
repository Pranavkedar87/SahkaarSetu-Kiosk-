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

import type { HealthResponse } from '../types';

/** Base URL resolved from Vite environment variable at build time. */
const API_BASE_URL: string =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:8000';

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

// ─── Future voice / chat / scan endpoints ────────────────────────────────────
//
// These will be added in K4, K5, K6 respectively.
// They will call the SAME existing backend endpoints used by the Citizen app.
// No duplicate backend will be created.
//
// export async function sendQuery(…): Promise<QueryResponse>
// export async function transcribeAudio(…): Promise<TranscriptionResponse>
// export async function analyzeDocument(…): Promise<VisionAnalyzeResponse>
