/**
 * Splash Screen Tests
 *
 * Verifies:
 * - Renders logo
 * - Shows brand name
 * - Shows tagline
 * - Shows kiosk subtitle
 * - Has loading indicator
 * - Calls onReady after delay
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SplashScreen } from '../pages/SplashScreen';

describe('SplashScreen', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  it('renders the brand name "SahkaarSetu"', () => {
    render(<SplashScreen onReady={() => {}} />);
    expect(screen.getByText('SahkaarSetu')).toBeInTheDocument();
  });

  it('renders Devanagari brand name "सहकारसेतू"', () => {
    render(<SplashScreen onReady={() => {}} />);
    expect(screen.getByText('सहकारसेतू')).toBeInTheDocument();
  });

  it('renders tagline "सहकार से समृद्धि"', () => {
    render(<SplashScreen onReady={() => {}} />);
    expect(screen.getByText('सहकार से समृद्धि')).toBeInTheDocument();
  });

  it('renders "Cooperative Assistance Kiosk"', () => {
    render(<SplashScreen onReady={() => {}} />);
    expect(screen.getByText('Cooperative Assistance Kiosk')).toBeInTheDocument();
  });

  it('has a loading status indicator', () => {
    render(<SplashScreen onReady={() => {}} />);
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('calls onReady after splash duration', () => {
    const onReady = vi.fn();
    render(<SplashScreen onReady={onReady} />);
    expect(onReady).not.toHaveBeenCalled();
    vi.advanceTimersByTime(2000);
    expect(onReady).toHaveBeenCalledTimes(1);
  });

  it('does not call onReady before duration', () => {
    const onReady = vi.fn();
    render(<SplashScreen onReady={onReady} />);
    vi.advanceTimersByTime(500);
    expect(onReady).not.toHaveBeenCalled();
  });
});
