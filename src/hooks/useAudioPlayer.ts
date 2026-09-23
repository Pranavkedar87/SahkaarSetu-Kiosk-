/**
 * useAudioPlayer Hook
 *
 * Handles speech audio playback for the SahkaarSetu Kiosk.
 * Supports:
 *   1. Base64 WAV server audio (Bhashini TTS - female voice preferred)
 *   2. Smart natural female Indian voice selection for browser window.speechSynthesis fallback
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
  activeAudioElement?: HTMLAudioElement | null;
}

// BCP-47 locale fallback map for all 22 official Indian languages + English
export const LANGUAGE_LOCALE_MAP: Record<string, string[]> = {
  en: ['en-IN', 'en-GB', 'en-US', 'en'],
  hi: ['hi-IN', 'hi'],
  mr: ['mr-IN', 'mr', 'hi-IN'], // Devanagari fallback: Hindi voices pronounce Marathi text cleanly if mr-IN is missing
  gu: ['gu-IN', 'gu', 'hi-IN'],
  bn: ['bn-IN', 'bn-BD', 'bn'],
  ta: ['ta-IN', 'ta-LK', 'ta'],
  te: ['te-IN', 'te'],
  kn: ['kn-IN', 'kn'],
  ml: ['ml-IN', 'ml'],
  pa: ['pa-IN', 'pa'],
  ur: ['ur-IN', 'ur-PK', 'ur'],
  or: ['or-IN', 'or'],
  as: ['as-IN', 'as', 'bn-IN'],
  sa: ['sa-IN', 'sa', 'hi-IN'],
  ks: ['ks-IN', 'ur-IN', 'hi-IN'],
  kok: ['kok-IN', 'mr-IN', 'hi-IN'],
  mai: ['mai-IN', 'hi-IN'],
  mni: ['mni-IN', 'bn-IN'],
  ne: ['ne-NP', 'ne-IN', 'hi-IN'],
  brx: ['brx-IN', 'as-IN', 'hi-IN'],
  sat: ['sat-IN', 'hi-IN'],
  sd: ['sd-IN', 'sd'],
};

// Female voice name signatures across macOS, iOS, Windows, Android, ChromeOS, and Chromium
export const FEMALE_VOICE_NAME_REGEX =
  /(female|woman|girl|veena|lekha|sangeeta|swara|neerja|aarohi|heera|priya|kiran|pooja|ananya|aditi|shruti|sunita|radha|samantha|victoria|karen|moira|zira|jenny|aria|sonia|ava|allison|susan|catherine|clara|हिन्दी|मराठी|বাংলা|தமிழ்|తెలుగు|ಕನ್ನಡ|മലയാളം|ગુજરાતી)/i;

// Male voice signatures to actively penalize so the voice matches the on-screen female assistant
export const MALE_VOICE_NAME_REGEX =
  /(male|man|boy|alex|rishi|madhur|manohar|fred|george|daniel|oliver|guy|david|mark|tom|bruce)/i;

/**
 * Intelligent voice selection prioritizing natural Indian female voices
 * matching the Kiosk assistant character persona.
 */
export function selectFemaleVoice(
  voices: SpeechSynthesisVoice[],
  language: string
): SpeechSynthesisVoice | null {
  if (!voices || voices.length === 0) return null;

  const normalizedLang = (language || 'en').toLowerCase().trim();
  const targetLocales =
    LANGUAGE_LOCALE_MAP[normalizedLang] || [`${normalizedLang}-in`, normalizedLang, 'en-in', 'en'];

  let bestVoice: SpeechSynthesisVoice | null = null;
  let highestScore = -Infinity;

  for (const voice of voices) {
    const vName = (voice.name || '').toLowerCase();
    const vLang = (voice.lang || '').toLowerCase().replace(/_/g, '-');
    const isExplicitFemale =
      (voice as any).gender === 'female' || (voice as any).gender === 'f';
    const isExplicitMale =
      (voice as any).gender === 'male' || (voice as any).gender === 'm';
    const hasFemaleName = FEMALE_VOICE_NAME_REGEX.test(vName);
    const hasMaleName = MALE_VOICE_NAME_REGEX.test(vName) || isExplicitMale;

    let score = 0;

    // 1. Language matching priority
    const exactLocaleIndex = targetLocales.findIndex((loc) => vLang === loc.toLowerCase());
    if (exactLocaleIndex !== -1) {
      score += 1000 - exactLocaleIndex * 150;
    } else if (vLang.startsWith(normalizedLang + '-')) {
      score += 800;
    } else if (vLang.startsWith(normalizedLang)) {
      score += 700;
    } else if (
      (normalizedLang === 'en' || normalizedLang === 'hi' || normalizedLang === 'mr') &&
      vLang.includes('in')
    ) {
      score += 300;
    } else if (vLang.startsWith('en')) {
      score += 100;
    }

    // 2. Gender weighting: strong preference for female
    if (isExplicitFemale || hasFemaleName) {
      score += 500;
    } else if (hasMaleName) {
      score -= 1000;
    }

    // 3. Indian regional bonus for authentic persona
    if (vLang.includes('-in') || vName.includes('india') || vName.includes('indian')) {
      score += 150;
    }

    // 4. Local service / performance bonus
    if (voice.localService) {
      score += 20;
    }

    if (score > highestScore) {
      highestScore = score;
      bestVoice = voice;
    }
  }

  return bestVoice;
}

export function useAudioPlayer(): UseAudioPlayerReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasAudio, setHasAudio] = useState(false);

  const activeAudioRef = useRef<HTMLAudioElement | null>(null);
  const cachedVoicesRef = useRef<SpeechSynthesisVoice[]>([]);
  const lastParamsRef = useRef<{
    audioBase64?: string | null;
    fallbackText?: string;
    language?: string;
  } | null>(null);

  // Initialize and listen for available browser SpeechSynthesis voices
  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    const updateVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          cachedVoicesRef.current = voices;
        }
      } catch {
        // Ignore voice query errors
      }
    };

    updateVoices();

    if (window.speechSynthesis.addEventListener) {
      window.speechSynthesis.addEventListener('voiceschanged', updateVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', updateVoices);
      };
    } else if ('onvoiceschanged' in window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = updateVoices;
      return () => {
        window.speechSynthesis.onvoiceschanged = null;
      };
    }
  }, []);

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

  const playBrowserTTS = useCallback(
    (text: string, language: string): boolean => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        setIsPlaying(false);
        return false;
      }

      try {
        window.speechSynthesis.cancel();

        // Strip markdown and emojis for clean, natural pronunciation
        const cleanText = text
          .replace(/https?:\/\/\S+/g, '')
          .replace(/[*_`~>|#]/g, '')
          .replace(/[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '')
          .trim()
          .slice(0, 600);

        const utterance = new SpeechSynthesisUtterance(cleanText);

        const normalizedLang = (language || 'en').toLowerCase().trim();
        const targetLocales =
          LANGUAGE_LOCALE_MAP[normalizedLang] || [`${normalizedLang}-IN`, normalizedLang];
        const primaryLocale = targetLocales[0];

        // Retrieve available voices (from browser or cached ref)
        let voices: SpeechSynthesisVoice[] = [];
        try {
          voices = window.speechSynthesis.getVoices();
        } catch {
          // ignore
        }
        if (!voices || voices.length === 0) {
          voices = cachedVoicesRef.current;
        }

        const selectedVoice = selectFemaleVoice(voices, language);

        if (selectedVoice) {
          utterance.voice = selectedVoice;
          utterance.lang = selectedVoice.lang || primaryLocale;
        } else {
          utterance.lang = primaryLocale;
        }

        // Female virtual assistant prosody: calm, warm, articulate Indian cadence
        utterance.rate = 0.94;
        utterance.pitch = 1.05;
        utterance.volume = 1.0;

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
    },
    []
  );

  const play = useCallback(
    async (
      audioBase64?: string | null,
      fallbackText?: string,
      language: string = 'en'
    ): Promise<boolean> => {
      stop();

      lastParamsRef.current = { audioBase64, fallbackText, language };

      // 1. Try playing server-synthesized base64 WAV (Primary Voice)
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
          activeAudioRef.current = null;
          setIsPlaying(false);
          if (fallbackText) {
            setHasAudio(true);
            return playBrowserTTS(fallbackText, language);
          }
        }
      }

      // 2. Fall back to browser Web Speech Synthesis if available (Fallback Voice)
      if (fallbackText) {
        setHasAudio(true);
        return playBrowserTTS(fallbackText, language);
      }

      return false;
    },
    [stop, playBrowserTTS]
  );

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
    activeAudioElement: activeAudioRef.current,
  };
}
