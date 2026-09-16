/**
 * Inactivity Timeout Tests
 *
 * Verifies:
 * - Timer starts when enabled=true
 * - Warning shown before timeout
 * - onTimeout called after full duration
 * - Timer resets on user activity
 * - Timer suspended when activeOperation=true
 * - Timer resumes when activeOperation returns false
 * - Timer disabled when enabled=false
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInactivityTimeout } from '../hooks/useInactivityTimeout';

// Override env for tests: 5s timeout, 2s warning lead
vi.mock('../../vitest.config', () => ({}));

// We need to control the timer values. Patch import.meta.env via vitest globals.
// The hook reads from import.meta.env which Vite replaces at build time;
// in tests we use the vitest config's define option or test the behavior
// with the default values (120s / 20s). We use fake timers to control flow.

const TIMEOUT = 120000;
const WARNING_LEAD = 20000;
const WARNING_AT = TIMEOUT - WARNING_LEAD; // 100000

describe('useInactivityTimeout', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not fire when enabled=false', () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useInactivityTimeout({ activeOperation: false, onTimeout, enabled: false })
    );
    act(() => { vi.advanceTimersByTime(TIMEOUT + 1000); });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('fires onTimeout after full inactivity duration', () => {
    const onTimeout = vi.fn();
    renderHook(() =>
      useInactivityTimeout({ activeOperation: false, onTimeout, enabled: true })
    );
    act(() => { vi.advanceTimersByTime(TIMEOUT + 100); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });

  it('shows warning before timeout (at TIMEOUT - WARNING_LEAD)', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useInactivityTimeout({ activeOperation: false, onTimeout, enabled: true })
    );
    expect(result.current.showWarning).toBe(false);
    act(() => { vi.advanceTimersByTime(WARNING_AT + 100); });
    expect(result.current.showWarning).toBe(true);
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('resetTimer restarts the countdown', () => {
    const onTimeout = vi.fn();
    const { result } = renderHook(() =>
      useInactivityTimeout({ activeOperation: false, onTimeout, enabled: true })
    );
    // Advance 90 seconds
    act(() => { vi.advanceTimersByTime(90000); });
    // Reset
    act(() => { result.current.resetTimer(); });
    // Advance another 90 seconds (should NOT fire — timer was reset)
    act(() => { vi.advanceTimersByTime(90000); });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('does not fire during activeOperation', () => {
    const onTimeout = vi.fn();
    renderHook(
      ({ active }) =>
        useInactivityTimeout({ activeOperation: active, onTimeout, enabled: true }),
      { initialProps: { active: true } }
    );
    act(() => { vi.advanceTimersByTime(TIMEOUT + 1000); });
    expect(onTimeout).not.toHaveBeenCalled();
  });

  it('resumes and fires after activeOperation ends', () => {
    const onTimeout = vi.fn();
    const { rerender } = renderHook(
      ({ active }: { active: boolean }) =>
        useInactivityTimeout({ activeOperation: active, onTimeout, enabled: true }),
      { initialProps: { active: true } }
    );
    // Operation in progress — no fire
    act(() => { vi.advanceTimersByTime(TIMEOUT + 1000); });
    expect(onTimeout).not.toHaveBeenCalled();

    // Operation ends
    rerender({ active: false });
    act(() => { vi.advanceTimersByTime(TIMEOUT + 100); });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
