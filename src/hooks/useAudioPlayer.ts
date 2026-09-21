/**
 * useAudioPlayer Hook
 *
 * Handles speech audio playback for the SahkaarSetu Kiosk.
 * Supports:
 *   1. Base64 WAV server audio (Bhashini TTS)
 *   2. Graceful browser window.speechSynthesis fallback
 *   3. Replay ("Play Again") and Stop controls
 *   4. Clean lifecycle management (stops on reset/unmount, prevents overlap)
 */

import { useState, useCallback, useRef, useEffect } from 'react';

export interface UseAudioPlayerReturn {
  isPlaying: boolean;
  play: (
    audioBase64?: string | null,
    fallbackText?: string,
    language?: string
  ) => Promise<boolean>;
  stop: () => void;
  playAgain: () => Promise<boolean>;
  hasAudio: boolean;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastParamsRef = useRef<{
    audioBase64?: string | null;
    fallbackText?: string;
    language?: string;
  } | null>(null);

  const stop = useCallback(() => {
    if (activeAudioRef.current) {
      try {
        activeAudioRef.current.pause();
        activeAudioRef.current.currentTime = 0;
      } catch {
        // Ignore pause errors
      }
      activeAudioRef.current = null;
    }

    if (
      typeof window !== 'undefined' &&
      'speechSynthesis' in window &&
      window.speechSynthesis.speaking
    ) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }

    setIsPlaying(false);
  }, []);

  // Stop on unmount
  useEffect(() => {
    return () => {
      stop();
    };
  }, [stop]);

  const play = useCallback(
    async (
      audioBase64?: string | null,
      fallbackText?: string,
      language: string = 'en'
    ): Promise<boolean> => {
      stop();

      lastParamsRef.current = { audioBase64, fallbackText, language };

      // 1. Try playing server-synthesized base64 WAV
      if (audioBase64) {
        try {
          const audio = new Audio('data:audio/wav;base64,' + audioBase64);
          activeAudioRef.current = audio;

          audio.onended = () => {
            activeAudioRef.current = null;
            setIsPlaying(false);
          };

          audio.onerror = (e) => {
            console.warn('[AudioPlayer] Base64 audio error, attempting client TTS:', e);
            activeAudioRef.current = null;
            setIsPlaying(false);
            if (fallbackText) {
              playBrowserTTS(fallbackText, language);
            }
          };

          setIsPlaying(true);
          setHasAudio(true);
          await audio.play();
          return true;
        } catch (err) {
          console.warn('[AudioPlayer] Audio play() failed (autoplay policy or decode):', err);
          setIsPlaying(false);
        }
      }

      // 2. Fall back to browser Web Speech Synthesis if available
      if (fallbackText) {
        setHasAudio(true);
        return playBrowserTTS(fallbackText, language);
      }

      return false;
    },
    [stop]
  );

  const playBrowserTTS = (text: string, language: string): boolean => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setIsPlaying(false);
      return false;
    }

    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text.slice(0, 500));
      utterance.lang = language;

      utterance.onstart = () => {
        setIsPlaying(true);
      };

      utterance.onend = () => {
        setIsPlaying(false);
      };

      utterance.onerror = (e) => {
        console.warn('[AudioPlayer] Client speech synthesis error:', e);
        setIsPlaying(false);
      };

      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err) {
      console.warn('[AudioPlayer] window.speechSynthesis error:', err);
      setIsPlaying(false);
      return false;
    }
  };

  const playAgain = useCallback(async (): Promise<boolean> => {
    if (!lastParamsRef.current) return false;
    const { audioBase64, fallbackText, language } = lastParamsRef.current;
    return play(audioBase64, fallbackText, language);
  }, [play]);

  return {
    isPlaying,
    play,
    stop,
    playAgain,
    hasAudio,
  };
}
