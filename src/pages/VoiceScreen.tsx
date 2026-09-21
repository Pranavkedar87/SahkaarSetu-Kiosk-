/**
 * VoiceScreen
 *
 * Real Voice Interaction screen for the SahkaarSetu Kiosk.
 * End-to-end flow:
 *   1. Microphone records speech via browser MediaRecorder
 *   2. Audio Blob sent to /api/voice/transcribe (BHASHINI STT / Groq Whisper)
 *   3. Transcribed text sent to /api/query (central governed RAG / AI pipeline)
 *   4. Structured answer synthesized to speech via /api/voice/synthesize (BHASHINI TTS)
 *   5. Audio played through speaker with Replay and Stop controls
 *   6. Robust error handling with "Try Again" and "Type Instead" fallbacks
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { KioskShell } from '../components/kiosk/KioskShell';
import { PrintModal } from '../components/kiosk/PrintModal';
import { useVoiceRecorder } from '../hooks/useVoiceRecorder';
import { useAudioPlayer } from '../hooks/useAudioPlayer';
import { transcribeAudio, sendQuery, synthesizeSpeech } from '../services/api';
import type { KioskStrings } from '../i18n';
import type {
  LanguageCode,
  VoiceFlowState,
  QueryResponse,
} from '../types';

interface Props {
  strings: KioskStrings;
  language: LanguageCode;
  serviceAvailable: boolean;
  onBack: () => void;
  onTypeInstead: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
  setActiveOperation: (active: boolean) => void;
  onMessageAdded?: (userText: string, assistantText: string) => void;
}

// Strip markdown characters for clean, accessible kiosk display
function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#+\s*/g, '')
    .replace(/[*_`]/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

export function VoiceScreen({
  strings,
  language,
  serviceAvailable,
  onBack,
  onTypeInstead,
  onChangeLanguage,
  onStartOver,
  setActiveOperation,
  onMessageAdded,
}: Props) {
  const [flowState, setFlowState] = useState<VoiceFlowState>('idle');
  const [transcript, setTranscript] = useState<string>('');
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const isSubmittingRef = useRef(false);
  const sessionIdRef = useRef<string>(
    `kiosk-voice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  const audioPlayer = useAudioPlayer();

  // Reset audio playback on language change
  useEffect(() => {
    audioPlayer.stop();
  }, [language]);

  // Handle recorded audio submission
  const handleAudioCaptured = useCallback(
    async (audioBlob: Blob) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setFlowState('transcribing');
      setErrorMessage(null);

      try {
        // Step 1: Transcribe audio using backend STT
        const sttRes = await transcribeAudio(
          audioBlob,
          language,
          sessionIdRef.current
        );

        const recognizedText = (sttRes.transcript || '').trim();
        if (!recognizedText) {
          setFlowState('error');
          setErrorMessage(strings.voiceNoSpeech);
          return;
        }

        setTranscript(recognizedText);

        // Step 2: Send query to chatbot / AI brain
        setFlowState('querying');
        const queryRes = await sendQuery({
          message: recognizedText,
          language,
          session_id: sessionIdRef.current,
          response_mode: 'voice',
        });

        setQueryResponse(queryRes);

        const rawDisplay = queryRes.display_answer || queryRes.answer || '';
        const rawSpoken = queryRes.spoken_answer || rawDisplay;
        const cleanSpoken = stripMarkdown(rawSpoken);

        if (onMessageAdded) {
          onMessageAdded(recognizedText, rawDisplay);
        }

        // Step 3: Synthesize speech and play audio
        setFlowState('speaking');
        try {
          const ttsRes = await synthesizeSpeech(cleanSpoken, language, 'female');
          if (ttsRes && ttsRes.success && ttsRes.audio_content) {
            await audioPlayer.play(ttsRes.audio_content, cleanSpoken, language);
          } else {
            // Client TTS fallback
            await audioPlayer.play(null, cleanSpoken, language);
          }
        } catch (ttsErr) {
          console.warn('[VoiceScreen] TTS playback notice:', ttsErr);
          await audioPlayer.play(null, cleanSpoken, language);
        }

        setFlowState('answered');
      } catch (err: any) {
        console.error('[VoiceScreen] Processing error:', err);
        setFlowState('error');
        setErrorMessage(strings.voiceServiceUnavailable);
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [language, strings, audioPlayer, onMessageAdded]
  );

  // Sync activeOperation: pauses kiosk inactivity timer during recording, querying, and playback
  useEffect(() => {
    const isBusy =
      flowState === 'listening' ||
      flowState === 'transcribing' ||
      flowState === 'querying' ||
      flowState === 'speaking' ||
      audioPlayer.isPlaying;
    setActiveOperation?.(isBusy);
  }, [flowState, audioPlayer.isPlaying, setActiveOperation]);

  const voiceRecorder = useVoiceRecorder({
    onAudioCaptured: handleAudioCaptured,
  });

  // Start recording automatically on mount
  useEffect(() => {
    let mounted = true;
    const init = async () => {
      if (mounted) {
        const started = await voiceRecorder.startRecording();
        if (started && mounted) {
          setFlowState('listening');
        }
      }
    };
    init();

    return () => {
      mounted = false;
      voiceRecorder.cancelRecording();
      audioPlayer.stop();
      setActiveOperation?.(false);
    };
  }, []); // Run once on mount

  // Sync recorder error state
  useEffect(() => {
    if (voiceRecorder.status === 'error') {
      setFlowState('error');
      if (voiceRecorder.errorCode === 'permission_denied') {
        setErrorMessage(strings.voiceMicDenied);
      } else if (
        voiceRecorder.errorCode === 'empty' ||
        voiceRecorder.errorCode === 'too_short'
      ) {
        setErrorMessage(strings.voiceNoSpeech);
      } else {
        setErrorMessage(strings.voiceServiceUnavailable);
      }
      setActiveOperation?.(false);
    }
  }, [voiceRecorder.status, voiceRecorder.errorCode, strings, setActiveOperation]);

  // Stop recording user action
  const handleStopRecording = () => {
    voiceRecorder.stopRecording();
  };

  // Ask another question
  const handleAskAnother = async () => {
    audioPlayer.stop();
    setTranscript('');
    setQueryResponse(null);
    setErrorMessage(null);
    const started = await voiceRecorder.startRecording();
    if (started) {
      setFlowState('listening');
    }
  };

  // Replay audio
  const handlePlayAgain = () => {
    audioPlayer.playAgain();
  };

  // Stop audio playback
  const handleStopAudio = () => {
    audioPlayer.stop();
  };

  // Retry on error
  const handleRetry = async () => {
    audioPlayer.stop();
    setErrorMessage(null);
    const started = await voiceRecorder.startRecording();
    if (started) {
      setFlowState('listening');
    }
  };

  return (
    <KioskShell
      strings={strings}
      serviceAvailable={serviceAvailable}
      onBack={onBack}
      onChangeLanguage={() => {
        voiceRecorder.cancelRecording();
        audioPlayer.stop();
        onChangeLanguage();
      }}
      onStartOver={() => {
        voiceRecorder.cancelRecording();
        audioPlayer.stop();
        onStartOver();
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          width: '100%',
          maxWidth: '720px',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* State 1: LISTENING */}
        {flowState === 'listening' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '24px',
              padding: '24px 0',
            }}
          >
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#1e3a5f',
                margin: 0,
                textAlign: 'center',
              }}
            >
              {strings.stateListening}
            </h2>

            {/* Pulsing Listening Microphone button */}
            <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <span
                style={{
                  position: 'absolute',
                  width: '230px',
                  height: '230px',
                  borderRadius: '50%',
                  backgroundColor: 'rgba(21, 128, 61, 0.25)',
                  animation: 'kiosk-ripple 1.6s ease-out infinite',
                }}
                aria-hidden="true"
              />

              <button
                type="button"
                onClick={handleStopRecording}
                aria-label={strings.voiceTapToStop}
                style={{
                  position: 'relative',
                  zIndex: 1,
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  backgroundColor: '#047857',
                  border: '5px solid #34d399',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  boxShadow: '0 12px 36px rgba(0,0,0,0.25)',
                  touchAction: 'manipulation',
                }}
              >
                <span style={{ fontSize: '56px', lineHeight: 1 }} aria-hidden="true">
                  🎙️
                </span>
                <span style={{ fontSize: '18px', fontWeight: 800, textAlign: 'center' }}>
                  {strings.voiceTapToStop}
                </span>
              </button>
            </div>

            <p style={{ fontSize: '18px', color: '#64748b', fontWeight: 600, margin: 0 }}>
              {strings.pressToSpeak}
            </p>
          </div>
        )}

        {/* State 2: TRANSCRIBING / QUERYING (Processing) */}
        {(flowState === 'transcribing' || flowState === 'querying') && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              padding: '40px 0',
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: '56px' }} aria-hidden="true">
              ⏳
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a5f', margin: 0 }}>
              {flowState === 'transcribing' ? strings.stateProcessing : strings.stateProcessing}
            </h2>

            {transcript && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 24px',
                  maxWidth: '560px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 700, display: 'block' }}>
                  {strings.voiceYouSaid}:
                </span>
                <p style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', margin: '4px 0 0' }}>
                  "{transcript}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* State 3: ANSWERED / SPEAKING */}
        {(flowState === 'answered' || flowState === 'speaking') && queryResponse && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
            }}
          >
            {/* User Transcript Card */}
            {transcript && (
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  borderRadius: '14px',
                  padding: '12px 20px',
                  borderLeft: '5px solid #15803d',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  {strings.voiceYouSaid}:
                </span>
                <p style={{ fontSize: '19px', fontWeight: 600, color: '#0f172a', margin: '4px 0 0' }}>
                  "{transcript}"
                </p>
              </div>
            )}

            {/* Assistant Answer Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px 28px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                maxHeight: '360px',
                overflowY: 'auto',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#15803d' }}>
                  🏛️ {strings.voiceAnswer}
                </span>

                {/* Audio Playing Indicator / Controls */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {audioPlayer.isPlaying ? (
                    <button
                      type="button"
                      onClick={handleStopAudio}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#fef2f2',
                        color: '#dc2626',
                        border: '2px solid #f87171',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                      }}
                    >
                      ⏹ {strings.voiceStopAudio}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handlePlayAgain}
                      style={{
                        padding: '6px 14px',
                        backgroundColor: '#f0fdf4',
                        color: '#15803d',
                        border: '2px solid #86efac',
                        borderRadius: '10px',
                        fontSize: '15px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        touchAction: 'manipulation',
                      }}
                    >
                      🔊 {strings.voicePlayAgain}
                    </button>
                  )}
                </div>
              </div>

              <p
                style={{
                  fontSize: '20px',
                  lineHeight: 1.5,
                  color: '#1e293b',
                  margin: 0,
                  whiteSpace: 'pre-line',
                }}
              >
                {stripMarkdown(queryResponse.display_answer || queryResponse.answer || '')}
              </p>

              {/* Source citations if present */}
              {queryResponse.sources && queryResponse.sources.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>
                    Sources:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {queryResponse.sources.map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '13px',
                          color: '#334155',
                        }}
                      >
                        📄 {s.title || 'Official Cooperative Guideline'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleAskAnother}
                style={{
                  flex: 2,
                  minHeight: '56px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  boxShadow: '0 4px 16px rgba(21, 128, 61, 0.25)',
                }}
              >
                🎤 {strings.voiceAskAnother}
              </button>

              <button
                type="button"
                onClick={onTypeInstead}
                style={{
                  flex: 1,
                  minHeight: '56px',
                  backgroundColor: '#ffffff',
                  color: '#1e3a5f',
                  border: '2px solid #cbd5e1',
                  borderRadius: '14px',
                  fontSize: '17px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                ⌨️ {strings.voiceTypeInstead}
              </button>

              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                style={{
                  flex: 1,
                  minHeight: '56px',
                  backgroundColor: '#ffffff',
                  color: '#1e3a5f',
                  border: '2px solid #cbd5e1',
                  borderRadius: '14px',
                  fontSize: '17px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                🖨️ {strings.actionPrint}
              </button>

              <button
                type="button"
                onClick={onBack}
                style={{
                  flex: 1,
                  minHeight: '56px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '2px solid #cbd5e1',
                  borderRadius: '14px',
                  fontSize: '17px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                ← {strings.actionBack}
              </button>
            </div>

            {showPrintModal && queryResponse && (
              <PrintModal
                strings={strings}
                payload={{
                  question: transcript,
                  guidance: queryResponse.display_answer || queryResponse.answer || '',
                  language,
                  sources: queryResponse.sources?.map((s) => s.title || s.snippet || '').filter(Boolean),
                  createdAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                }}
                onClose={() => setShowPrintModal(false)}
              />
            )}
          </div>
        )}

        {/* State 4: ERROR */}
        {flowState === 'error' && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '2px solid #fecaca',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '560px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }} aria-hidden="true">
              ⚠️
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#991b1b', margin: '0 0 12px 0' }}>
              {strings.stateErrorTryAgain}
            </h3>

            <p style={{ fontSize: '18px', color: '#475569', margin: '0 0 28px 0', lineHeight: 1.4 }}>
              {errorMessage || strings.voiceServiceUnavailable}
            </p>

            <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleRetry}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  minHeight: '56px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                🔄 {strings.voiceTryAgain}
              </button>

              <button
                type="button"
                onClick={onBack}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  minHeight: '56px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '2px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                ← {strings.actionBack}
              </button>

              <button
                type="button"
                onClick={onTypeInstead}
                style={{
                  flex: 1,
                  minWidth: '140px',
                  minHeight: '56px',
                  backgroundColor: '#ffffff',
                  color: '#1e3a5f',
                  border: '2px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                ⌨️ {strings.voiceTypeInstead}
              </button>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes kiosk-ripple {
          0% {
            transform: scale(0.9);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
      `}</style>
    </KioskShell>
  );
}
