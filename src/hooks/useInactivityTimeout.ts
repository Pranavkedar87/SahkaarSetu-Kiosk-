/**
 * useInactivityTimeout
 *
 * Implements the 2-minute inactivity timeout required for the kiosk.
 *
 * Behavior:
 *   1. Resets on meaningful user activity: touch, click, keyboard, scroll.
 *   2. Suspends countdown while `activeOperation` is true.
 *   3. Shows a warning dialog `VITE_KIOSK_TIMEOUT_WARNING_MS` ms before timeout.
 *   4. On timeout: calls `onTimeout()` (which resets the session).
 *
 * Configuration (from .env):
 *   VITE_KIOSK_INACTIVITY_TIMEOUT_MS  default: 120000 (2 min)
 *   VITE_KIOSK_TIMEOUT_WARNING_MS     default: 20000  (20 sec)
 */

import { useEffect, useRef, useCallback, useState } from 'react';

const TIMEOUT_MS = Number(
  (import.meta.env.VITE_KIOSK_INACTIVITY_TIMEOUT_MS as string | undefined) ?? 120000
);
const WARNING_MS = Number(
  (import.meta.env.VITE_KIOSK_TIMEOUT_WARNING_MS as string | undefined) ?? 20000
);

export interface InactivityState {
  /** Whether the warning dialog should be visible. */
  showWarning: boolean;
  /** Reset the inactivity timer (e.g. user presses "Continue"). */
  resetTimer: () => void;
}

interface Options {
  /** When true the countdown is suspended. */
  activeOperation: boolean;
  /** Called when the timeout elapses without user interaction. */
  onTimeout: () => void;
  /** Whether to actually run the timer (set false on splash/language screens). */
  enabled: boolean;
}

export function useInactivityTimeout({
  activeOperation,
  onTimeout,
  enabled,
}: Options): InactivityState {
  const [showWarning, setShowWarning] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const warningRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeOpRef = useRef(activeOperation);
  const enabledRef = useRef(enabled);
  const onTimeoutRef = useRef(onTimeout);

  // Keep refs fresh on every render
  activeOpRef.current = activeOperation;
  enabledRef.current = enabled;
  onTimeoutRef.current = onTimeout;

  const clearTimers = useCallback(() => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (warningRef.current) clearTimeout(warningRef.current);
    timeoutRef.current = null;
    warningRef.current = null;
  }, []);

  const startTimers = useCallback(() => {
    clearTimers();
    setShowWarning(false);

    if (!enabledRef.current || activeOpRef.current) return;

    // Show warning before timeout
    warningRef.current = setTimeout(() => {
      if (!activeOpRef.current && enabledRef.current) {
        setShowWarning(true);
      }
    }, TIMEOUT_MS - WARNING_MS);

    // Fire timeout
    timeoutRef.current = setTimeout(() => {
      if (!activeOpRef.current && enabledRef.current) {
        setShowWarning(false);
        onTimeoutRef.current();
      }
    }, TIMEOUT_MS);
  }, [clearTimers]);

  const resetTimer = useCallback(() => {
    startTimers();
  }, [startTimers]);

  // Activity event listener
  useEffect(() => {
    if (!enabled) {
      clearTimers();
      setShowWarning(false);
      return;
    }

    startTimers();

    const ACTIVITY_EVENTS = [
      'touchstart',
      'pointerdown',
      'click',
      'keydown',
      'scroll',
      'mousemove',
    ] as const;

    const handleActivity = () => {
      if (enabledRef.current && !activeOpRef.current) {
        startTimers();
      }
    };

    ACTIVITY_EVENTS.forEach((e) => {
      window.addEventListener(e, handleActivity, { passive: true });
    });

    return () => {
      clearTimers();
      ACTIVITY_EVENTS.forEach((e) => {
        window.removeEventListener(e, handleActivity);
      });
    };
  }, [enabled, startTimers, clearTimers]);

  // Suspend timer when active operation starts; resume when it ends
  useEffect(() => {
    if (activeOperation) {
      // Pause
      clearTimers();
      setShowWarning(false);
    } else if (enabled) {
      // Resume
      startTimers();
    }
  }, [activeOperation, enabled, clearTimers, startTimers]);

  return { showWarning, resetTimer };
}
