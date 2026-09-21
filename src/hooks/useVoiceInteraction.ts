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
 *
 * Fully preserves K4 capabilities with zero duplicated voice logic.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import { useVoiceRecorder } from './useVoiceRecorder';
import { useAudioPlayer } from './useAudioPlayer';
import { useLipSync } from './useLipSync';
import { transcribeAudio, sendQuery, synthesizeSpeech } from '../services/api';
import type { KioskStrings } from '../i18n';
import type { LanguageCode, QueryResponse } from '../types';
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
  isPlaying: boolean;
  startListening: () => Promise<boolean>;
  stopListening: () => Promise<void>;
  stopAudio: () => void;
  replayAudio: () => Promise<void>;
  reset: () => void;
}

// Strip markdown characters for clean, accessible display
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

  const isSubmittingRef = useRef(false);
  const sessionIdRef = useRef<string>(
    `kiosk-voice-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  const audioPlayer = useAudioPlayer();
  const mouthOpen = useLipSync({
    isPlaying: audioPlayer.isPlaying,
    audioElement: audioPlayer.activeAudioElement,
  });

  // Stop audio and reset if language changes
  useEffect(() => {
    audioPlayer.stop();
  }, [language]);

  // Sync state when audio finishes
  useEffect(() => {
    if (state === 'speaking' && !audioPlayer.isPlaying) {
      setState('success');
    }
  }, [state, audioPlayer.isPlaying]);

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

      try {
        // Step 1: STT Transcription
        const sttRes = await transcribeAudio(
          audioBlob,
          language,
          sessionIdRef.current
        );

        const recognizedText = (sttRes.transcript || '').trim();
        if (!recognizedText) {
          setState('error');
          setErrorMessage(strings.voiceNoSpeech || 'Could not hear any speech. Please try again.');
          return;
        }

        setUserTranscript(recognizedText);

        // Step 2: Central governed RAG Query
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

        setDisplayAnswer(rawDisplay);

        if (onMessageAdded) {
          onMessageAdded(recognizedText, rawDisplay);
        }

        // Step 3: TTS Speech Synthesis & Playback
        setState('speaking');
        try {
          const ttsRes = await synthesizeSpeech(cleanSpoken, language, 'female');
          if (ttsRes && ttsRes.success && ttsRes.audio_content) {
            await audioPlayer.play(ttsRes.audio_content, cleanSpoken, language);
          } else {
            // Client SpeechSynthesis fallback
            await audioPlayer.play(null, cleanSpoken, language);
          }
        } catch (ttsErr) {
          console.warn('[useVoiceInteraction] TTS fallback:', ttsErr);
          await audioPlayer.play(null, cleanSpoken, language);
        }
      } catch (err: any) {
        console.error('[useVoiceInteraction] Error:', err);
        setState('error');
        setErrorMessage(strings.voiceServiceUnavailable || 'Service temporarily unavailable. Please try again.');
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [language, strings, audioPlayer, onMessageAdded]
  );

  const voiceRecorder = useVoiceRecorder({
    onAudioCaptured: handleAudioCaptured,
  });

  // Sync recorder errors
  useEffect(() => {
    if (voiceRecorder.status === 'error') {
      setState('error');
      if (voiceRecorder.errorCode === 'permission_denied') {
        setErrorMessage(strings.voiceMicDenied || 'Microphone access was denied. Please allow microphone permissions.');
      } else if (
        voiceRecorder.errorCode === 'empty' ||
        voiceRecorder.errorCode === 'too_short'
      ) {
        setErrorMessage(strings.voiceNoSpeech || 'Could not hear any speech. Please try again.');
      } else {
        setErrorMessage(strings.voiceServiceUnavailable || 'Service temporarily unavailable.');
      }
    }
  }, [voiceRecorder.status, voiceRecorder.errorCode, strings]);

  const startListening = useCallback(async () => {
    audioPlayer.stop();
    setErrorMessage(null);
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
    setState('success');
  }, [audioPlayer]);

  const replayAudio = useCallback(async () => {
    setState('speaking');
    await audioPlayer.playAgain();
  }, [audioPlayer]);

  const reset = useCallback(() => {
    voiceRecorder.cancelRecording();
    audioPlayer.stop();
    setState('idle');
    setUserTranscript('');
    setDisplayAnswer('');
    setQueryResponse(null);
    setErrorMessage(null);
    setActiveOperation?.(false);
  }, [voiceRecorder, audioPlayer, setActiveOperation]);

  return {
    state,
    mouthOpen,
    userTranscript,
    displayAnswer,
    errorMessage,
    isPlaying: audioPlayer.isPlaying,
    startListening,
    stopListening,
    stopAudio,
    replayAudio,
    reset,
  };
}
