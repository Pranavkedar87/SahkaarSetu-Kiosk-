/**
 * useVoiceInteraction.ts
 *
 * Unified, reusable Voice Interaction hook powering the interactive
 * talking AI assistant experience on the SahkaarSetu Kiosk Home Screen.
 *
 * Orchestrates:
 *   - useVoiceRecorder (MediaRecorder microphone capture)
 *   - transcribeAudio (/api/voice/transcribe STT)
 *   - sendQuery (/api/query governed AI brain)
 *   - synthesizeSpeech (/api/voice/synthesize TTS)
 *   - useAudioPlayer (audio playback + fallback speech synthesis)
 *   - useLipSync (real-time Web Audio amplitude analysis)
 *   - Interactive clarification conversation (conversational follow-up & auto-listen)
 *
 * Fully preserves K4 capabilities with zero duplicated voice logic.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceRecorder } from './useVoiceRecorder';
import { useAudioPlayer } from './useAudioPlayer';
import { useLipSync } from './useLipSync';
import { transcribeAudio, sendQuery, synthesizeSpeech } from '../services/api';
import {
  detectClarification,
  buildClarificationContextQuery,
  type ClarificationSessionContext,
} from '../services/clarificationDetector';
import type { KioskStrings } from '../i18n';
import type { LanguageCode, QueryResponse, VoiceFailureLayer } from '../types';
import type { AssistantState } from '../components/kiosk/SahkaarSetuAssistant';

export interface UseVoiceInteractionOptions {
  language: LanguageCode;
  strings: KioskStrings;
  setActiveOperation?: (active: boolean) => void;
  onMessageAdded?: (userText: string, assistantText: string) => void;
}

export interface UseVoiceInteractionReturn {
  state: AssistantState;
  mouthOpen: number;
  userTranscript: string;
  displayAnswer: string;
  errorMessage: string | null;
  failureLayer: VoiceFailureLayer | null;
  isPlaying: boolean;
  clarificationContext: ClarificationSessionContext | null;
  awaitingClarificationGesture: boolean;
  startListeningForClarification: () => Promise<boolean>;
  startListening: () => Promise<boolean>;
  stopListening: () => Promise<void>;
  stopAudio: () => void;
  replayAudio: () => Promise<void>;
  reset: () => void;
}

// Strip markdown characters and emojis for clean, accessible spoken audio
function stripMarkdown(text: string): string {
  if (!text) return '';
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#+\s*/g, '')
    .replace(/[*_`~>|]/g, '')
    .replace(/^\s*[-*+]\s+/gm, '')
    .replace(/^\s*\d+\.\s+/gm, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function useVoiceInteraction({
  language,
  strings,
  setActiveOperation,
  onMessageAdded,
}: UseVoiceInteractionOptions): UseVoiceInteractionReturn {
  const [state, setState] = useState<AssistantState>('idle');
  const [userTranscript, setUserTranscript] = useState<string>('');
  const [displayAnswer, setDisplayAnswer] = useState<string>('');
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failureLayer, setFailureLayer] = useState<VoiceFailureLayer | null>(null);

  // Conversational clarification states
  const [clarificationContext, setClarificationContext] = useState<ClarificationSessionContext | null>(null);
  const [awaitingClarificationGesture, setAwaitingClarificationGesture] = useState<boolean>(false);
  const pendingClarificationRef = useRef<ClarificationSessionContext | null>(null);
  const autoListenTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const isSubmittingRef = useRef(false);
  const sessionIdRef = useRef<string>(
    `kiosk-voice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  const audioPlayer = useAudioPlayer();
  const mouthOpen = useLipSync({
    isPlaying: audioPlayer.isPlaying,
    audioElement: audioPlayer.activeAudioElement,
  });

  // Stop audio and reset clarification if language changes
  useEffect(() => {
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    pendingClarificationRef.current = null;
    setClarificationContext(null);
    setAwaitingClarificationGesture(false);
    audioPlayer.stop();
  }, [language]);

  // Pause inactivity timeout when voice interaction is active
  useEffect(() => {
    const isBusy =
      state === 'listening' ||
      state === 'thinking' ||
      state === 'speaking' ||
      audioPlayer.isPlaying;
    setActiveOperation?.(isBusy);
  }, [state, audioPlayer.isPlaying, setActiveOperation]);

  // Handle audio recorded from microphone
  const handleAudioCaptured = useCallback(
    async (audioBlob: Blob) => {
      if (isSubmittingRef.current) return;
      isSubmittingRef.current = true;
      setState('thinking');
      setErrorMessage(null);
      setFailureLayer(null);

      // Verify Blob size
      if (!audioBlob || audioBlob.size < 100) {
        setState('error');
        setFailureLayer('NO_SPEECH');
        setErrorMessage(strings.voiceNoSpeech || 'Could not hear any speech. Please try again.');
        isSubmittingRef.current = false;
        return;
      }

      let recognizedText = '';

      // ── Step 1: STT Transcription ─────────────────────────────────────────
      try {
        const sttRes = await transcribeAudio(
          audioBlob,
          language,
          sessionIdRef.current
        );
        recognizedText = (sttRes.transcript || '').trim();
      } catch (sttErr: any) {
        console.error('[useVoiceInteraction] Transcription failed:', sttErr);
        setState('error');
        if (
          !navigator.onLine ||
          sttErr.name === 'AbortError' ||
          sttErr.message?.includes('Failed to fetch') ||
          sttErr.message?.includes('Load failed') ||
          sttErr.message?.includes('NetworkError') ||
          sttErr.message?.includes('offline')
        ) {
          setFailureLayer('NETWORK_UNAVAILABLE');
          setErrorMessage(strings.voiceServiceUnavailable || 'Network connection unavailable. Please check your connection or type your question.');
        } else {
          setFailureLayer('TRANSCRIPTION_FAILED');
          setErrorMessage(strings.stateErrorTryAgain || 'Could not understand audio. Please try speaking again or type your question.');
        }
        isSubmittingRef.current = false;
        return;
      }

      // Check for empty or noise-only transcript (e.g. "." or "Thank you." from Whisper hallucination on silence)
      if (
        !recognizedText ||
        recognizedText === '.' ||
        recognizedText === '...' ||
        recognizedText.toLowerCase() === 'thank you.' ||
        recognizedText.toLowerCase() === 'thank you'
      ) {
        setState('error');
        setFailureLayer('NO_SPEECH');
        setErrorMessage(strings.voiceNoSpeech || 'Could not hear any speech. Please speak clearly and try again.');
        isSubmittingRef.current = false;
        return;
      }

      setUserTranscript(recognizedText);

      // Determine query payload: if answering clarification, compile contextual question
      let messageToSend = recognizedText;
      let isFollowUpClarification = false;

      if (pendingClarificationRef.current) {
        messageToSend = buildClarificationContextQuery(
          pendingClarificationRef.current.originalQuestion,
          recognizedText,
          pendingClarificationRef.current.type
        );
        isFollowUpClarification = true;
        pendingClarificationRef.current = null;
        setClarificationContext(null);
        setAwaitingClarificationGesture(false);
      }

      // ── Step 2: Central governed RAG Query ─────────────────────────────────
      let queryRes: QueryResponse;
      try {
        queryRes = await sendQuery({
          message: messageToSend,
          language,
          session_id: sessionIdRef.current,
          response_mode: 'voice',
        });
      } catch (queryErr: any) {
        console.error('[useVoiceInteraction] Query failed:', queryErr);
        setState('error');
        if (
          !navigator.onLine ||
          queryErr.name === 'AbortError' ||
          queryErr.message?.includes('Failed to fetch') ||
          queryErr.message?.includes('Load failed') ||
          queryErr.message?.includes('NetworkError')
        ) {
          setFailureLayer('NETWORK_UNAVAILABLE');
          setErrorMessage(strings.voiceServiceUnavailable || 'Network connection unavailable. Please check your connection or type your question.');
        } else {
          setFailureLayer('QUERY_FAILED');
          setErrorMessage(strings.stateErrorTryAgain || 'Unable to process question. Please try asking again or type your question.');
        }
        isSubmittingRef.current = false;
        return;
      }

      setQueryResponse(queryRes);
      const rawDisplay = queryRes.display_answer || queryRes.answer || '';
      const rawSpoken = queryRes.spoken_answer || rawDisplay;
      const cleanSpoken = stripMarkdown(rawSpoken);

      setDisplayAnswer(rawDisplay);

      if (onMessageAdded) {
        onMessageAdded(recognizedText, rawDisplay);
      }

      // Check if this response asks a clarification question (only if not already completing a clarification)
      const clarificationMatch = detectClarification(rawDisplay || rawSpoken, queryRes.intent);
      if (clarificationMatch && clarificationMatch.isClarification && !isFollowUpClarification) {
        const sessionCtx: ClarificationSessionContext = {
          type: clarificationMatch.type,
          originalQuestion: recognizedText,
          clarificationPrompt: rawDisplay || rawSpoken,
        };
        pendingClarificationRef.current = sessionCtx;
        setClarificationContext(sessionCtx);
      }

      // ── Step 3: TTS Speech Synthesis & Playback ────────────────────────────
      setState('speaking');
      try {
        let played = false;
        try {
          const ttsRes = await synthesizeSpeech(cleanSpoken, language, 'female');
          if (ttsRes && ttsRes.success && ttsRes.audio_content) {
            await audioPlayer.play(ttsRes.audio_content, cleanSpoken, language);
            played = true;
          }
        } catch (ttsErr) {
          console.warn('[useVoiceInteraction] Server TTS failed, falling back to browser speech synthesis:', ttsErr);
        }

        if (!played) {
          // Client SpeechSynthesis fallback
          await audioPlayer.play(null, cleanSpoken, language);
        }
      } catch (playbackErr) {
        console.warn('[useVoiceInteraction] Playback failed:', playbackErr);
        setFailureLayer('PLAYBACK_FAILED');
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [language, strings, audioPlayer, onMessageAdded]
  );

  const voiceRecorder = useVoiceRecorder({
    onAudioCaptured: handleAudioCaptured,
  });

  // Sync state when audio finishes: auto-listen if awaiting clarification
  useEffect(() => {
    if (state === 'speaking' && !audioPlayer.isPlaying) {
      if (pendingClarificationRef.current) {
        if (autoListenTimerRef.current) clearTimeout(autoListenTimerRef.current);
        autoListenTimerRef.current = setTimeout(async () => {
          try {
            setState('listening');
            const started = await voiceRecorder.startRecording();
            if (started) {
              setAwaitingClarificationGesture(false);
            } else {
              setAwaitingClarificationGesture(true);
            }
          } catch {
            setAwaitingClarificationGesture(true);
          }
        }, 400);
      } else {
        setState('success');
      }
    }
  }, [state, audioPlayer.isPlaying, voiceRecorder]);

  // Sync recorder errors
  useEffect(() => {
    if (voiceRecorder.status === 'error') {
      setState('error');
      const layer = voiceRecorder.failureLayer || (
        voiceRecorder.errorCode === 'permission_denied'
          ? 'MIC_PERMISSION'
          : voiceRecorder.errorCode === 'no_device' || voiceRecorder.errorCode === 'unsupported'
          ? 'MIC_UNAVAILABLE'
          : voiceRecorder.errorCode === 'empty' || voiceRecorder.errorCode === 'too_short'
          ? 'NO_SPEECH'
          : 'RECORDING_FAILED'
      );
      setFailureLayer(layer);

      if (layer === 'MIC_PERMISSION') {
        setErrorMessage(strings.voiceMicDenied || 'Microphone access was denied. Please allow microphone permissions.');
      } else if (layer === 'MIC_UNAVAILABLE') {
        setErrorMessage('Microphone device not found or unavailable.');
      } else if (layer === 'NO_SPEECH') {
        setErrorMessage(strings.voiceNoSpeech || 'Could not hear any speech. Please try again.');
      } else {
        setErrorMessage('Audio recording failed. Please try again.');
      }
    }
  }, [voiceRecorder.status, voiceRecorder.errorCode, voiceRecorder.failureLayer, strings]);

  const startListening = useCallback(async () => {
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    audioPlayer.stop();
    setErrorMessage(null);
    setFailureLayer(null);
    const started = await voiceRecorder.startRecording();
    if (started) {
      setState('listening');
      return true;
    }
    return false;
  }, [audioPlayer, voiceRecorder]);

  const stopListening = useCallback(async () => {
    await voiceRecorder.stopRecording();
  }, [voiceRecorder]);

  const stopAudio = useCallback(() => {
    audioPlayer.stop();
    if (pendingClarificationRef.current) {
      setState('listening');
      setAwaitingClarificationGesture(true);
    } else {
      setState('success');
    }
  }, [audioPlayer]);

  const replayAudio = useCallback(async () => {
    setState('speaking');
    await audioPlayer.playAgain();
  }, [audioPlayer]);

  // Explicit user gesture to answer clarification question if auto-listen was blocked
  const startListeningForClarification = useCallback(async () => {
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    setAwaitingClarificationGesture(false);
    audioPlayer.stop();
    setErrorMessage(null);
    setFailureLayer(null);
    const started = await voiceRecorder.startRecording();
    if (started) {
      setState('listening');
      return true;
    }
    return false;
  }, [audioPlayer, voiceRecorder]);

  const reset = useCallback(() => {
    if (autoListenTimerRef.current) {
      clearTimeout(autoListenTimerRef.current);
      autoListenTimerRef.current = null;
    }
    pendingClarificationRef.current = null;
    setClarificationContext(null);
    setAwaitingClarificationGesture(false);
    voiceRecorder.cancelRecording();
    audioPlayer.stop();
    setState('idle');
    setUserTranscript('');
    setDisplayAnswer('');
    setQueryResponse(null);
    setErrorMessage(null);
    setFailureLayer(null);
    setActiveOperation?.(false);
  }, [voiceRecorder, audioPlayer, setActiveOperation]);

  return {
    state,
    mouthOpen,
    userTranscript,
    displayAnswer,
    errorMessage,
    failureLayer,
    isPlaying: audioPlayer.isPlaying,
    clarificationContext,
    awaitingClarificationGesture,
    startListeningForClarification,
    startListening,
    stopListening,
    stopAudio,
    replayAudio,
    reset,
  };
}
