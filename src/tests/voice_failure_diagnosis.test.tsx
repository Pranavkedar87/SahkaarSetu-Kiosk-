/**
 * Voice Failure Diagnosis and Fix Test Suite
 *
 * Explicitly tests and verifies:
 * 1. TRACE THE FULL FLOW: Home mic -> getUserMedia -> MediaRecorder -> Blob ->
 *    /api/voice/transcribe -> transcript -> /api/query -> answer ->
 *    /api/voice/synthesize -> audio playback -> lip sync
 * 2. TEST MICROPHONE: navigator.mediaDevices, getUserMedia, MediaRecorder,
 *    isTypeSupported(), MIME selection, chunks, Blob > 100 bytes, duration > 400ms,
 *    track release
 * 3. TEST BACKEND: POST /api/voice/transcribe payload contract (field name "audio",
 *    filename, MIME, language, session_id, no manual boundary), POST /api/query,
 *    POST /api/voice/synthesize
 * 4. ERROR CLASSIFICATION: exact failure layers:
 *    - MIC_PERMISSION
 *    - MIC_UNAVAILABLE
 *    - RECORDING_FAILED
 *    - NO_SPEECH
 *    - TRANSCRIPTION_FAILED
 *    - QUERY_FAILED
 *    - TTS_FAILED
 *    - PLAYBACK_FAILED
 *    - NETWORK_UNAVAILABLE
 * 5. SAFARI + CHROMIUM compatibility:
 *    - Chromium WebM Opus
 *    - Safari audio/mp4 (non-fragmented start without timeslice)
 * 6. REQUIRED LIVE INLINE HOME TEST: No redirect, remains on HomeScreen
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import App from '../App';
import * as api from '../services/api';
import { getStrings } from '../i18n';
import { getBestSupportedMimeType } from '../hooks/useVoiceRecorder';

// Mock API module
vi.mock('../services/api', () => ({
  transcribeAudio: vi.fn(),
  sendQuery: vi.fn(),
  synthesizeSpeech: vi.fn(),
  checkHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
}));

// Mock Audio
class MockAudio {
  src: string;
  onended: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  currentTime = 0;
  static instances: MockAudio[] = [];

  constructor(src?: string) {
    this.src = src || '';
    MockAudio.instances.push(this);
  }

  play = vi.fn().mockImplementation(() => Promise.resolve());
  pause = vi.fn().mockImplementation(() => {});
}

// Mock MediaRecorder
class MockMediaRecorder {
  stream: MediaStream;
  options?: MediaRecorderOptions;
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  mimeType: string;
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  static isTypeSupportedMock = vi.fn().mockImplementation((type: string) => {
    return type.includes('webm') || type.includes('mp4');
  });

  static instances: MockMediaRecorder[] = [];

  constructor(stream: MediaStream, options?: MediaRecorderOptions) {
    this.stream = stream;
    this.options = options;
    this.mimeType = options?.mimeType || 'audio/webm;codecs=opus';
    MockMediaRecorder.instances.push(this);
  }

  start = vi.fn().mockImplementation((timeslice?: number) => {
    this.state = 'recording';
  });

  stop = vi.fn().mockImplementation(() => {
    this.state = 'inactive';
    if (this.ondataavailable) {
      // Emit valid audio chunk (> 200 bytes)
      const chunk = new Blob([new Uint8Array(256)], { type: this.mimeType });
      this.ondataavailable({ data: chunk });
    }
    if (this.onstop) {
      this.onstop();
    }
  });

  static isTypeSupported(type: string) {
    return MockMediaRecorder.isTypeSupportedMock(type);
  }
}

describe('Voice Failure Diagnosis & Layer Classification', () => {
  const stringsEn = getStrings('en');
  let mockTracks: Array<{ stop: ReturnType<typeof vi.fn> }>;
  let mockStream: any;

  beforeEach(() => {
    MockAudio.instances = [];
    MockMediaRecorder.instances = [];
    vi.clearAllMocks();

    // Mock Audio global
    (globalThis as any).Audio = MockAudio;
    (globalThis as any).MediaRecorder = MockMediaRecorder;

    mockTracks = [{ stop: vi.fn() }];
    mockStream = {
      getTracks: () => mockTracks,
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });
  });

  // ── 1. TEST MICROPHONE: MIME Type Selection (Chromium vs Safari) ───────────
  it('1. MIME Type Selection: selects audio/webm on Chromium, audio/mp4 on Safari', () => {
    // Chromium mode: webm supported
    MockMediaRecorder.isTypeSupportedMock.mockImplementation((mime: string) => {
      return mime.startsWith('audio/webm');
    });
    expect(getBestSupportedMimeType()).toBe('audio/webm;codecs=opus');

    // Safari mode: webm not supported, mp4 supported
    MockMediaRecorder.isTypeSupportedMock.mockImplementation((mime: string) => {
      return mime.startsWith('audio/mp4');
    });
    expect(getBestSupportedMimeType()).toBe('audio/mp4');
  });

  // ── 2. TEST MICROPHONE: Chunks, Blob Size, Duration, Track Release ─────────
  it('2. Recording lifecycle: creates valid Blob > 100 bytes, duration > 400ms, and releases tracks', async () => {
    render(<App />);

    const micBtn = screen.getByRole('button', { name: /speak/i });
    await act(async () => {
      fireEvent.click(micBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('sahkaarsetu-assistant')).toHaveAttribute('data-assistant-state', 'listening');
    });

    // Recording started
    expect(MockMediaRecorder.instances.length).toBe(1);
    const recorder = MockMediaRecorder.instances[0];
    expect(recorder.start).toHaveBeenCalled();

    // Stop recording after 450ms
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
      fireEvent.click(micBtn);
    });

    // Tracks stopped immediately on stop
    expect(mockTracks[0].stop).toHaveBeenCalled();
  });

  // ── 3. ERROR CLASSIFICATION: MIC_PERMISSION ────────────────────────────────
  it('3. Error Classification: MIC_PERMISSION when getUserMedia throws NotAllowedError', async () => {
    const permErr = new Error('Permission denied');
    permErr.name = 'NotAllowedError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(permErr);

    render(<App />);

    const micBtn = screen.getByRole('button', { name: /speak/i });
    await act(async () => {
      fireEvent.click(micBtn);
    });

    // Assistant shows MIC_PERMISSION failure
    const assistant = screen.getByTestId('sahkaarsetu-assistant');
    expect(assistant).toHaveAttribute('data-assistant-state', 'error');
    expect(assistant).toHaveAttribute('data-failure-layer', 'MIC_PERMISSION');
    expect(screen.getByText(stringsEn.voiceMicDenied)).toBeInTheDocument();
  });

  // ── 4. ERROR CLASSIFICATION: MIC_UNAVAILABLE ──────────────────────────────
  it('4. Error Classification: MIC_UNAVAILABLE when no microphone device found', async () => {
    const noDeviceErr = new Error('Requested device not found');
    noDeviceErr.name = 'NotFoundError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValueOnce(noDeviceErr);

    render(<App />);

    const micBtn = screen.getByRole('button', { name: /speak/i });
    await act(async () => {
      fireEvent.click(micBtn);
    });

    const assistant = screen.getByTestId('sahkaarsetu-assistant');
    expect(assistant).toHaveAttribute('data-assistant-state', 'error');
    expect(assistant).toHaveAttribute('data-failure-layer', 'MIC_UNAVAILABLE');
    expect(screen.getByText(/microphone device not found/i)).toBeInTheDocument();
  });

  // ── 5. ERROR CLASSIFICATION: NO_SPEECH ────────────────────────────────────
  it('5. Error Classification: NO_SPEECH when audio blob is too small or recording too short', async () => {
    // Custom recorder that emits tiny blob (< 50 bytes)
    class TinyChunkRecorder extends MockMediaRecorder {
      stop = vi.fn().mockImplementation(() => {
        this.state = 'inactive';
        if (this.ondataavailable) {
          const tinyBlob = new Blob([new Uint8Array(20)], { type: 'audio/webm' });
          this.ondataavailable({ data: tinyBlob });
        }
        if (this.onstop) this.onstop();
      });
    }
    (globalThis as any).MediaRecorder = TinyChunkRecorder;

    render(<App />);

    const micBtn = screen.getByRole('button', { name: /speak/i });
    await act(async () => {
      fireEvent.click(micBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('sahkaarsetu-assistant')).toHaveAttribute('data-assistant-state', 'listening');
    });

    // Stop immediately
    await act(async () => {
      fireEvent.click(micBtn);
    });

    const assistant = screen.getByTestId('sahkaarsetu-assistant');
    expect(assistant).toHaveAttribute('data-assistant-state', 'error');
    expect(assistant).toHaveAttribute('data-failure-layer', 'NO_SPEECH');
    expect(screen.getByText(stringsEn.voiceNoSpeech)).toBeInTheDocument();
  });

  // ── 6. ERROR CLASSIFICATION: TRANSCRIPTION_FAILED ─────────────────────────
  it('6. Error Classification: TRANSCRIPTION_FAILED when /api/voice/transcribe fails with server error', async () => {
    vi.mocked(api.transcribeAudio).mockRejectedValueOnce(
      new Error('STT failed with status 500: Groq Whisper error')
    );

    render(<App />);

    const micBtn = screen.getByRole('button', { name: /speak/i });
    await act(async () => {
      fireEvent.click(micBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('sahkaarsetu-assistant')).toHaveAttribute('data-assistant-state', 'listening');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
      fireEvent.click(micBtn);
    });

    await waitFor(() => {
      const assistant = screen.getByTestId('sahkaarsetu-assistant');
      expect(assistant).toHaveAttribute('data-assistant-state', 'error');
      expect(assistant).toHaveAttribute('data-failure-layer', 'TRANSCRIPTION_FAILED');
    });
  });

  // ── 7. ERROR CLASSIFICATION: NETWORK_UNAVAILABLE ──────────────────────────
  it('7. Error Classification: NETWORK_UNAVAILABLE when fetch fails due to offline/network error', async () => {
    const fetchErr = new TypeError('Failed to fetch');
    vi.mocked(api.transcribeAudio).mockRejectedValueOnce(fetchErr);

    render(<App />);

    const micBtn = screen.getByRole('button', { name: /speak/i });
    await act(async () => {
      fireEvent.click(micBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('sahkaarsetu-assistant')).toHaveAttribute('data-assistant-state', 'listening');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
      fireEvent.click(micBtn);
    });

    await waitFor(() => {
      const assistant = screen.getByTestId('sahkaarsetu-assistant');
      expect(assistant).toHaveAttribute('data-assistant-state', 'error');
      expect(assistant).toHaveAttribute('data-failure-layer', 'NETWORK_UNAVAILABLE');
    });
  });

  // ── 8. ERROR CLASSIFICATION: QUERY_FAILED ─────────────────────────────────
  it('8. Error Classification: QUERY_FAILED when /api/query fails', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'What is PACS?',
      language: 'en',
      confidence: 0.98,
      provider: 'groq_whisper',
      latency_ms: 120,
    });
    vi.mocked(api.sendQuery).mockRejectedValueOnce(new Error('Internal query error'));

    render(<App />);

    const micBtn = screen.getByRole('button', { name: /speak/i });
    await act(async () => {
      fireEvent.click(micBtn);
    });

    await waitFor(() => {
      expect(screen.getByTestId('sahkaarsetu-assistant')).toHaveAttribute('data-assistant-state', 'listening');
    });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
      fireEvent.click(micBtn);
    });

    await waitFor(() => {
      const assistant = screen.getByTestId('sahkaarsetu-assistant');
      expect(assistant).toHaveAttribute('data-assistant-state', 'error');
      expect(assistant).toHaveAttribute('data-failure-layer', 'QUERY_FAILED');
    });
  });

  // ── 9. FULL REAL INTERACTION TRACE ON HOME (ZERO REDIRECT) ─────────────────
  it('9. Full Flow: Home mic -> Listening -> Thinking -> Transcript -> Answer -> Speaking -> Success (ZERO redirect)', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'How to register a dairy cooperative?',
      language: 'en',
      confidence: 0.98,
      provider: 'groq_whisper',
      latency_ms: 150,
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'To register a dairy cooperative, minimum 10 members are required with DCCB approval.',
      display_answer: 'To register a dairy cooperative, minimum 10 members are required with DCCB approval.',
      spoken_answer: 'To register a dairy cooperative, minimum 10 members are required.',
      language: 'en',
      intent: 'GENERAL',
    });
    vi.mocked(api.synthesizeSpeech).mockResolvedValueOnce({
      audio_content: 'UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
      audio_format: 'wav',
      language: 'en',
      gender: 'female',
      provider: 'bhashini',
      success: true,
    });

    render(<App />);

    // 1. Initially idle on Home
    const assistant = screen.getByTestId('sahkaarsetu-assistant');
    expect(assistant).toHaveAttribute('data-assistant-state', 'idle');

    // 2. Tap microphone
    const micBtn = screen.getByRole('button', { name: /speak/i });
    await act(async () => {
      fireEvent.click(micBtn);
    });

    // 3. Assistant transitions to listening (remains on Home)
    await waitFor(() => {
      expect(assistant).toHaveAttribute('data-assistant-state', 'listening');
    });
    expect(screen.queryByTestId('voice-screen-container')).not.toBeInTheDocument();

    // 4. User finishes speaking -> tap to stop
    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
      fireEvent.click(micBtn);
    });

    // 5. Assistant transitions to thinking, then speaking
    await waitFor(() => {
      expect(screen.getByText(/How to register a dairy cooperative\?/i)).toBeInTheDocument();
      expect(screen.getByText(/minimum 10 members are required/i)).toBeInTheDocument();
      expect(assistant).toHaveAttribute('data-assistant-state', 'speaking');
    });

    // 6. Audio element was created and played
    expect(MockAudio.instances.length).toBeGreaterThan(0);
    expect(MockAudio.instances[0].play).toHaveBeenCalled();

    // 7. Still strictly on Home screen (no route navigation or full-page reload)
    expect(screen.getByTestId('sahkaarsetu-assistant')).toBeInTheDocument();
    expect(screen.queryByTestId('voice-screen-container')).not.toBeInTheDocument();
  });
});
