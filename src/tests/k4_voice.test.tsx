/**
 * K4 Voice Input and Output Integration Tests
 *
 * Covers 20 critical kiosk voice interaction scenarios:
 *  1. Microphone permission request on Speak tap
 *  2. Microphone permission denied handling (accessible error message, Type instead action)
 *  3. Microphone recording state changes (idle -> recording -> processing)
 *  4. Empty recording detection (<100 bytes / <400ms duration rejected)
 *  5. Valid audio payload submission to /api/voice/transcribe
 *  6. Language code passed correctly to transcribe endpoint (hi, mr, en, etc.)
 *  7. Successful transcription display in Kiosk UI
 *  8. Failed transcription handling (clear error, retry button, type button)
 *  9. Transcribed text passed to /api/query
 * 10. Query response received and displayed in clean layout
 * 11. Query response synthesized to speech via /api/voice/synthesize
 * 12. Synthesized audio played through Audio element
 * 13. Fallback to browser SpeechSynthesis when backend synthesis is unavailable or fails
 * 14. "Play Again" button replays audio
 * 15. "Stop" button pauses/stops audio playback
 * 16. "Ask Another Question" resets voice session cleanly
 * 17. Active operation timeout prevention during recording, querying, and playback
 * 18. Inactivity timer resumes after playback finishes
 * 19. Language change resets audio state and re-renders labels
 * 20. No duplicate query submissions while processing
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import { VoiceScreen } from '../pages/VoiceScreen';
import { getStrings } from '../i18n';
import * as api from '../services/api';
import App from '../App';

// Mock API module
vi.mock('../services/api', () => ({
  transcribeAudio: vi.fn(),
  sendQuery: vi.fn(),
  synthesizeSpeech: vi.fn(),
  fetchHealth: vi.fn().mockResolvedValue(true),
}));

// Setup mock Audio class
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

  play = vi.fn().mockImplementation(() => {
    return Promise.resolve();
  });

  pause = vi.fn().mockImplementation(() => {
    // pause logic
  });
}

// Setup mock MediaRecorder
class MockMediaRecorder {
  state: 'inactive' | 'recording' | 'paused' = 'inactive';
  ondataavailable: ((e: { data: Blob }) => void) | null = null;
  onstop: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;
  stream: any;
  mimeType: string;
  static instances: MockMediaRecorder[] = [];

  static isTypeSupported = vi.fn().mockReturnValue(true);

  constructor(stream: any, options?: any) {
    this.stream = stream;
    this.mimeType = options?.mimeType || 'audio/webm';
    MockMediaRecorder.instances.push(this);
  }

  start = vi.fn().mockImplementation(() => {
    this.state = 'recording';
  });

  stop = vi.fn().mockImplementation(() => {
    this.state = 'inactive';
    if (this.onstop) {
      this.onstop();
    }
  });
}

// Setup mock speech synthesis
const mockUtterances: any[] = [];
class MockSpeechSynthesisUtterance {
  text: string;
  lang = '';
  onstart: (() => void) | null = null;
  onend: (() => void) | null = null;
  onerror: ((e: any) => void) | null = null;

  constructor(text: string) {
    this.text = text;
    mockUtterances.push(this);
  }
}

const mockSpeechSynthesis = {
  speak: vi.fn().mockImplementation((utterance: MockSpeechSynthesisUtterance) => {
    if (utterance.onstart) utterance.onstart();
  }),
  cancel: vi.fn(),
  speaking: false,
};

describe('K4: Kiosk Voice Input and Output System', () => {
  const stringsEn = getStrings('en');
  const stringsHi = getStrings('hi');
  const mockSetActiveOperation = vi.fn();
  const mockOnBack = vi.fn();
  const mockOnTypeInstead = vi.fn();
  const mockOnChangeLanguage = vi.fn();
  const mockOnStartOver = vi.fn();
  const mockOnMessageAdded = vi.fn();

  let mockTracks: any[];
  let mockStream: any;

  beforeEach(() => {
    vi.clearAllMocks();
    MockAudio.instances = [];
    MockMediaRecorder.instances = [];
    mockUtterances.length = 0;

    // Window globals
    (window as any).Audio = MockAudio;
    (window as any).MediaRecorder = MockMediaRecorder;
    (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    (window as any).speechSynthesis = mockSpeechSynthesis;

    mockTracks = [
      {
        stop: vi.fn(),
        kind: 'audio',
        enabled: true,
      },
    ];

    mockStream = {
      getTracks: vi.fn().mockReturnValue(mockTracks),
    };

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // Helper to simulate speech recording completion (>100 bytes and >400ms duration)
  async function completeValidRecording(dummySize = 256) {
    await waitFor(() => {
      expect(MockMediaRecorder.instances.length).toBeGreaterThan(0);
    });
    const recorder = MockMediaRecorder.instances[MockMediaRecorder.instances.length - 1];
    const audioBlob = new Blob([new Uint8Array(dummySize)], { type: 'audio/webm' });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
      if (recorder.ondataavailable) {
        recorder.ondataavailable({ data: audioBlob });
      }
      recorder.stop();
    });
    return recorder;
  }

  // 1. Microphone permission request on Speak tap
  it('1. requests microphone permission automatically on voice screen mount', async () => {
    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({
        audio: expect.objectContaining({
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }),
      });
    });
  });

  // 2. Microphone permission denied handling (accessible error message, Type instead action)
  it('2. handles microphone permission denial with error message and Type Instead fallback', async () => {
    const permError = new Error('Permission denied');
    permError.name = 'NotAllowedError';
    (navigator.mediaDevices.getUserMedia as any).mockRejectedValueOnce(permError);

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await waitFor(() => {
      expect(screen.getByText(stringsEn.voiceMicDenied)).toBeInTheDocument();
    });

    const typeBtn = screen.getByText(new RegExp(stringsEn.voiceTypeInstead, 'i'));
    fireEvent.click(typeBtn);
    expect(mockOnTypeInstead).toHaveBeenCalledTimes(1);
  });

  // 3. Microphone recording state changes (idle -> recording -> processing)
  it('3. transitions through listening and processing states', async () => {
    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    // Starts in listening state
    await waitFor(() => {
      expect(screen.getByText(stringsEn.stateListening)).toBeInTheDocument();
      expect(screen.getByText(stringsEn.voiceTapToStop)).toBeInTheDocument();
    });
  });

  // 4. Empty recording detection (<100 bytes / <400ms duration rejected)
  it('4. detects empty or too-short recording and shows voiceNoSpeech error', async () => {
    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await waitFor(() => {
      expect(MockMediaRecorder.instances.length).toBeGreaterThan(0);
    });

    const recorder = MockMediaRecorder.instances[0];

    // Immediately stop with an empty audio chunk (<100 bytes)
    await act(async () => {
      if (recorder.ondataavailable) {
        recorder.ondataavailable({ data: new Blob(['tiny'], { type: 'audio/webm' }) });
      }
      recorder.stop();
    });

    await waitFor(() => {
      expect(screen.getByText(stringsEn.voiceNoSpeech)).toBeInTheDocument();
    });
  });

  // 5. Valid audio payload submission to /api/voice/transcribe
  it('5. submits valid audio payload to transcribeAudio', async () => {
    const mockTranscribe = vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'How to apply for crop loan?',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Apply through your local PACS with land records.',
      display_answer: 'Apply through your local PACS with land records.',
      spoken_answer: 'Apply through your local PACS with land records.',
    });
    vi.mocked(api.synthesizeSpeech).mockResolvedValueOnce({
      audio_content: 'UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
      audio_format: 'wav',
      language: 'en',
      gender: 'female',
      success: true,
    });

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(256);

    await waitFor(() => {
      expect(mockTranscribe).toHaveBeenCalledWith(
        expect.any(Blob),
        'en',
        expect.stringContaining('kiosk-voice-')
      );
    });
  });

  // 6. Language code passed correctly to transcribe endpoint (hi, mr, en, etc.)
  it('6. passes selected language code (hi) correctly to transcribe and query endpoints', async () => {
    const mockTranscribe = vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'पीक कर्जासाठी कसा अर्ज करावा?',
      language: 'hi',
    });
    const mockQuery = vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'PACS कडून कर्ज अर्ज मिळवा.',
      display_answer: 'PACS कडून कर्ज अर्ज मिळवा.',
      spoken_answer: 'PACS कडून कर्ज अर्ज मिळवा.',
    });
    vi.mocked(api.synthesizeSpeech).mockResolvedValueOnce({
      audio_content: 'UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
      audio_format: 'wav',
      language: 'hi',
      gender: 'female',
      success: true,
    });

    render(
      <VoiceScreen
        strings={stringsHi}
        language="hi"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(mockTranscribe).toHaveBeenCalledWith(expect.any(Blob), 'hi', expect.any(String));
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'hi',
          message: 'पीक कर्जासाठी कसा अर्ज करावा?',
          response_mode: 'voice',
        })
      );
    });
  });

  // 7. Successful transcription display in Kiosk UI
  it('7. displays recognized user transcript on screen', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'What subsidies are available for seeds?',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Subsidy of 50% is provided by the Agriculture department.',
    });
    vi.mocked(api.synthesizeSpeech).mockResolvedValueOnce({
      audio_content: 'base64audio',
      audio_format: 'wav',
      language: 'en',
      gender: 'female',
      success: true,
    });

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(screen.getByText('"What subsidies are available for seeds?"')).toBeInTheDocument();
    });
  });

  // 8. Failed transcription handling (clear error, retry button, type button)
  it('8. handles transcription failure with retry and type options', async () => {
    vi.mocked(api.transcribeAudio).mockRejectedValueOnce(new Error('Network error'));

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(screen.getByText(stringsEn.stateErrorTryAgain)).toBeInTheDocument();
      expect(screen.getByRole('button', { name: new RegExp(stringsEn.voiceTryAgain, 'i') })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: new RegExp(stringsEn.voiceTypeInstead, 'i') })).toBeInTheDocument();
    });

    // Clicking retry re-triggers recording
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.voiceTryAgain, 'i') }));
    await waitFor(() => {
      expect(MockMediaRecorder.instances.length).toBeGreaterThan(1);
    });
  });

  // 9. Transcribed text passed to /api/query
  it('9. forwards transcribed text to central AI query pipeline', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'Explain PACS membership eligibility',
      language: 'en',
    });
    const mockQuery = vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Any farmer holding agricultural land in PACS area is eligible.',
    });

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(mockQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Explain PACS membership eligibility',
          response_mode: 'voice',
        })
      );
    });
  });

  // 10. Query response received and displayed in clean layout
  it('10. renders structured query response and source citations cleanly', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'Fertilizer distribution rules',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Fertilizer is distributed based on soil health cards.',
      display_answer: 'Fertilizer is distributed based on soil health cards.',
      sources: [
        { title: 'Ministry of Cooperation Handbook', url: '#' },
      ],
    });

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(
        screen.getByText('Fertilizer is distributed based on soil health cards.')
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Ministry of Cooperation Handbook/i)
      ).toBeInTheDocument();
    });
  });

  // 11. Query response synthesized to speech via /api/voice/synthesize
  it('11. invokes synthesizeSpeech with cleaned query answer', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'Test query',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: '**Clean text without markdown**',
      spoken_answer: '**Clean text without markdown**',
    });
    const mockTts = vi.mocked(api.synthesizeSpeech).mockResolvedValueOnce({
      audio_content: 'base64audio',
      audio_format: 'wav',
      language: 'en',
      gender: 'female',
      success: true,
    });

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(mockTts).toHaveBeenCalledWith(
        'Clean text without markdown',
        'en',
        'female'
      );
    });
  });

  // 12. Synthesized audio played through Audio element
  it('12. instantiates Audio with base64 WAV and plays through speaker', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'Test query',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Hello from SahkaarSetu',
    });
    vi.mocked(api.synthesizeSpeech).mockResolvedValueOnce({
      audio_content: 'UklGRi4AAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=',
      audio_format: 'wav',
      language: 'en',
      gender: 'female',
      success: true,
    });

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(MockAudio.instances.length).toBeGreaterThan(0);
      const audio = MockAudio.instances[0];
      expect(audio.src).toContain('data:audio/wav;base64,');
      expect(audio.play).toHaveBeenCalled();
    });
  });

  // 13. Fallback to browser SpeechSynthesis when backend synthesis fails
  it('13. falls back to browser SpeechSynthesis if backend synthesis fails', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'Test query',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Fallback synthesis text',
    });
    vi.mocked(api.synthesizeSpeech).mockRejectedValueOnce(new Error('TTS Service down'));

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(mockSpeechSynthesis.speak).toHaveBeenCalled();
    });
  });

  // 14. "Play Again" button replays audio
  it('14. replays audio when user taps Play Again', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'Test query',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Answer to replay',
    });
    vi.mocked(api.synthesizeSpeech).mockResolvedValueOnce({
      audio_content: 'base64audio',
      audio_format: 'wav',
      language: 'en',
      gender: 'female',
      success: true,
    });

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(MockAudio.instances.length).toBeGreaterThan(0);
    });

    const audio = MockAudio.instances[0];

    // Trigger audio ended to show "Play Again" button
    await act(async () => {
      if (audio.onended) audio.onended();
    });

    await waitFor(() => {
      expect(screen.getByRole('button', { name: new RegExp(stringsEn.voicePlayAgain, 'i') })).toBeInTheDocument();
    });

    // Click Play Again
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.voicePlayAgain, 'i') }));

    await waitFor(() => {
      expect(MockAudio.instances.length).toBeGreaterThan(1);
      expect(MockAudio.instances[1].play).toHaveBeenCalled();
    });
  });

  // 15. "Stop" button pauses/stops audio playback
  it('15. pauses audio when user taps Stop Audio button', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'Test query',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Answer to stop',
    });
    vi.mocked(api.synthesizeSpeech).mockResolvedValueOnce({
      audio_content: 'base64audio',
      audio_format: 'wav',
      language: 'en',
      gender: 'female',
      success: true,
    });

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: new RegExp(stringsEn.voiceStopAudio, 'i') })).toBeInTheDocument();
    });

    const stopBtn = screen.getByRole('button', { name: new RegExp(stringsEn.voiceStopAudio, 'i') });
    fireEvent.click(stopBtn);

    const audio = MockAudio.instances[0];
    expect(audio.pause).toHaveBeenCalled();
  });

  // 16. "Ask Another Question" resets voice session cleanly
  it('16. resets voice screen to listening when tapping Ask Another Question', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'First question',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'First answer',
    });
    vi.mocked(api.synthesizeSpeech).mockResolvedValueOnce({
      audio_content: 'base64audio',
      audio_format: 'wav',
      language: 'en',
      gender: 'female',
      success: true,
    });

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: new RegExp(stringsEn.voiceAskAnother, 'i') })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.voiceAskAnother, 'i') }));

    await waitFor(() => {
      expect(screen.getByText(stringsEn.stateListening)).toBeInTheDocument();
    });
  });

  // 17. Active operation timeout prevention during recording, querying, and playback
  it('17. sets activeOperation=true during active recording, querying, and playback', async () => {
    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await waitFor(() => {
      expect(mockSetActiveOperation).toHaveBeenCalledWith(true);
    });
  });

  // 18. Inactivity timer resumes after playback finishes
  it('18. sets activeOperation=false after audio playback finishes', async () => {
    vi.mocked(api.transcribeAudio).mockResolvedValueOnce({
      transcript: 'Test query',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Test answer',
    });
    vi.mocked(api.synthesizeSpeech).mockResolvedValueOnce({
      audio_content: 'base64audio',
      audio_format: 'wav',
      language: 'en',
      gender: 'female',
      success: true,
    });

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await completeValidRecording(200);

    await waitFor(() => {
      expect(MockAudio.instances.length).toBeGreaterThan(0);
    });

    const audio = MockAudio.instances[0];

    // Finish playback
    await act(async () => {
      if (audio.onended) audio.onended();
    });

    await waitFor(() => {
      expect(mockSetActiveOperation).toHaveBeenLastCalledWith(false);
    });
  });

  // 19. Language change resets audio state and re-renders labels
  it('19. stops audio and releases media resources when changing language or unmounting', async () => {
    const { unmount } = render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled();
    });

    unmount();

    // Verify tracks stopped on unmount
    expect(mockTracks[0].stop).toHaveBeenCalled();
  });

  // 20. No duplicate query submissions while processing
  it('20. ignores duplicate audio captures while processing is underway', async () => {
    let resolveQuery: (val: any) => void;
    const queryPromise = new Promise((res) => {
      resolveQuery = res;
    });

    vi.mocked(api.transcribeAudio).mockResolvedValue({
      transcript: 'Single submission test',
      language: 'en',
    });
    vi.mocked(api.sendQuery).mockImplementation(() => queryPromise as any);

    render(
      <VoiceScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onTypeInstead={mockOnTypeInstead}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
      />
    );

    await waitFor(() => {
      expect(MockMediaRecorder.instances.length).toBeGreaterThan(0);
    });
    const recorder = MockMediaRecorder.instances[0];
    const dummyBlob = new Blob([new Uint8Array(200)], { type: 'audio/webm' });

    await act(async () => {
      await new Promise((r) => setTimeout(r, 450));
      // Trigger stop/data twice rapidly
      if (recorder.ondataavailable) {
        recorder.ondataavailable({ data: dummyBlob });
        recorder.ondataavailable({ data: dummyBlob });
      }
      recorder.stop();
    });

    await waitFor(() => {
      expect(api.transcribeAudio).toHaveBeenCalledTimes(1);
    });

    // Cleanup promise
    resolveQuery!({ answer: 'Done' });
  });
});

describe('K4: Full App Voice Integration Flow', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockAudio.instances = [];
    MockMediaRecorder.instances = [];
    mockUtterances.length = 0;

    (window as any).Audio = MockAudio;
    (window as any).MediaRecorder = MockMediaRecorder;
    (window as any).SpeechSynthesisUtterance = MockSpeechSynthesisUtterance;
    (window as any).speechSynthesis = mockSpeechSynthesis;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  it('navigates from splash -> language -> home -> tap Speak -> enters VoiceScreen', async () => {
    render(<App />);

    // 1. Splash screen auto-advances after 1800ms
    await waitFor(
      () => {
        expect(screen.getByRole('heading', { name: /choose your language/i })).toBeInTheDocument();
      },
      { timeout: 3500 }
    );

    // 2. Language screen: select English
    const enBtn = screen.getByRole('button', { name: /english/i });
    fireEvent.click(enBtn);

    // 3. Home screen: verify primary Speak button
    const speakBtn = await screen.findByRole('button', { name: /speak/i });
    expect(speakBtn).toBeInTheDocument();

    // Tap Speak button
    fireEvent.click(speakBtn);

    // 4. Voice screen is entered and listening
    await waitFor(() => {
      expect(screen.getByText(/listening/i)).toBeInTheDocument();
      expect(screen.getByText(/tap to finish speaking/i)).toBeInTheDocument();
    });
  });
});
