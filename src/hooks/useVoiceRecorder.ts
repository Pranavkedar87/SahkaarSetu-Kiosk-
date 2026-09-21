/**
 * useVoiceRecorder Hook
 *
 * Encapsulates browser MediaRecorder and getUserMedia for Raspberry Pi & Touchscreen kiosks.
 *
 * Features:
 *   - Requests mic permission only when starting recording
 *   - Releases tracks immediately on stop or cancel
 *   - Detects empty or short recordings (<400ms or <100 bytes)
 *   - Stores audio only in transient volatile memory (no disk or localStorage)
 *   - 15-second safety cutoff to prevent runaway recording
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { VoiceFailureLayer } from '../types';

export type VoiceRecorderStatus = 'idle' | 'listening' | 'processing' | 'error';

export type VoiceRecorderErrorCode =
  | 'permission_denied'
  | 'no_device'
  | 'too_short'
  | 'empty'
  | 'unsupported'
  | 'recording_error';

export interface UseVoiceRecorderOptions {
  onAudioCaptured?: (audioBlob: Blob) => void;
  maxDurationMs?: number;
}

export interface UseVoiceRecorderReturn {
  status: VoiceRecorderStatus;
  errorCode: VoiceRecorderErrorCode | null;
  errorMessage: string | null;
  failureLayer: VoiceFailureLayer | null;
  startRecording: () => Promise<boolean>;
  stopRecording: () => void;
  cancelRecording: () => void;
  clearError: () => void;
  isSupported: boolean;
}

export function getBestSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/ogg;codecs=opus',
    'audio/mp4',
    'audio/aac',
    'audio/wav',
  ];
  for (const mime of candidateTypes) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }
  return '';
}

export function useVoiceRecorder({
  onAudioCaptured,
  maxDurationMs = 15000,
}: UseVoiceRecorderOptions = {}): UseVoiceRecorderReturn {
  const [status, setStatus] = useState<VoiceRecorderStatus>('idle');
  const [errorCode, setErrorCode] = useState<VoiceRecorderErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [failureLayer, setFailureLayer] = useState<VoiceFailureLayer | null>(null);

  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isStoppingRef = useRef<boolean>(false);

  const onAudioCapturedRef = useRef(onAudioCaptured);
  useEffect(() => {
    onAudioCapturedRef.current = onAudioCaptured;
  }, [onAudioCaptured]);

  const isSupported =
    typeof window !== 'undefined' &&
    Boolean(
      typeof navigator !== 'undefined' &&
        navigator.mediaDevices &&
        typeof navigator.mediaDevices.getUserMedia === 'function' &&
        typeof MediaRecorder !== 'undefined'
    );

  const cleanup = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }

    if (mediaStreamRef.current) {
      try {
        const tracks = mediaStreamRef.current.getTracks?.() || [];
        tracks.forEach((track) => {
          try {
            track.stop();
          } catch {
            // Ignore
          }
        });
      } catch {
        // Ignore track errors
      }
      mediaStreamRef.current = null;
    }

    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    isStoppingRef.current = false;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  const clearError = useCallback(() => {
    setErrorCode(null);
    setErrorMessage(null);
    setFailureLayer(null);
    setStatus('idle');
  }, []);

  const cancelRecording = useCallback(() => {
    cleanup();
    setStatus('idle');
    setErrorCode(null);
    setErrorMessage(null);
    setFailureLayer(null);
  }, [cleanup]);

  const stopRecording = useCallback(() => {
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }

    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state === 'recording'
    ) {
      try {
        isStoppingRef.current = true;
        setStatus('processing');
        if (typeof mediaRecorderRef.current.requestData === 'function') {
          try {
            mediaRecorderRef.current.requestData();
          } catch {
            // Ignore
          }
        }
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.warn('[VoiceRecorder] Error calling MediaRecorder.stop:', err);
        cleanup();
        setStatus('idle');
      }
    } else {
      cleanup();
      setStatus('idle');
    }
  }, [cleanup]);

  const startRecording = useCallback(async (): Promise<boolean> => {
    clearError();
    cleanup();

    if (!isSupported) {
      setStatus('error');
      setErrorCode('unsupported');
      setFailureLayer('MIC_UNAVAILABLE');
      setErrorMessage('Audio recording is not supported in this browser.');
      return false;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });

      mediaStreamRef.current = stream;
      audioChunksRef.current = [];
      startTimeRef.current = Date.now();

      const mimeType = getBestSupportedMimeType();
      const recorderOptions = mimeType ? { mimeType } : undefined;
      const mediaRecorder = new MediaRecorder(stream, recorderOptions);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onerror = (err: Event) => {
        console.error('[VoiceRecorder] MediaRecorder error:', err);
        cleanup();
        setStatus('error');
        setErrorCode('recording_error');
        setFailureLayer('RECORDING_FAILED');
        setErrorMessage('Recording failed. Please try again.');
      };

      mediaRecorder.onstop = () => {
        const duration = Date.now() - startTimeRef.current;
        const mime = mediaRecorder.mimeType || mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mime });

        // Release mic tracks immediately
        if (mediaStreamRef.current) {
          try {
            const tracks = mediaStreamRef.current.getTracks?.() || [];
            tracks.forEach((track) => {
              try {
                track.stop();
              } catch {
                // Ignore
              }
            });
          } catch {
            // Ignore
          }
          mediaStreamRef.current = null;
        }

        if (audioBlob.size < 100) {
          setStatus('error');
          setErrorCode('empty');
          setFailureLayer('NO_SPEECH');
          setErrorMessage("I couldn't hear anything. Please try again.");
          cleanup();
          return;
        }

        if (duration < 400) {
          setStatus('error');
          setErrorCode('too_short');
          setFailureLayer('NO_SPEECH');
          setErrorMessage("I couldn't hear anything. Please try again.");
          cleanup();
          return;
        }

        if (onAudioCapturedRef.current) {
          onAudioCapturedRef.current(audioBlob);
        }
      };

      // In Safari (audio/mp4), avoid timeslice to prevent fragmented moof/mdat atoms
      if (mimeType.includes('mp4')) {
        mediaRecorder.start();
      } else {
        mediaRecorder.start(250); // 250ms chunks for WebM Opus
      }
      setStatus('listening');

      // 15-second safety timer
      maxTimerRef.current = setTimeout(() => {
        console.info('[VoiceRecorder] Max duration reached, stopping automatically');
        stopRecording();
      }, maxDurationMs);

      return true;
    } catch (err: any) {
      cleanup();
      setStatus('error');

      if (
        err.name === 'NotAllowedError' ||
        err.name === 'PermissionDeniedError'
      ) {
        setErrorCode('permission_denied');
        setFailureLayer('MIC_PERMISSION');
        setErrorMessage('Microphone permission is required to use voice.');
      } else if (
        err.name === 'NotFoundError' ||
        err.name === 'DevicesNotFoundError'
      ) {
        setErrorCode('no_device');
        setFailureLayer('MIC_UNAVAILABLE');
        setErrorMessage('No microphone device found on this system.');
      } else {
        setErrorCode('recording_error');
        setFailureLayer('RECORDING_FAILED');
        setErrorMessage('Unable to access microphone. Please try again.');
      }

      return false;
    }
  }, [clearError, cleanup, isSupported, maxDurationMs, stopRecording]);

  return {
    status,
    errorCode,
    errorMessage,
    failureLayer,
    startRecording,
    stopRecording,
    cancelRecording,
    clearError,
    isSupported,
  };
}
