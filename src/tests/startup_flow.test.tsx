/**
 * Startup Flow & Language Selection Tests
 *
 * Verifies:
 * 1. App launches directly into HomeScreen with zero splash delay.
 * 2. No startup "Choose Your Language" screen is shown.
 * 3. Default language is English ('en').
 * 4. "Change Language" opens 22-language modal dialog on top of HomeScreen.
 * 5. Selecting a language updates HomeScreen in-place without page transition.
 * 6. Closing the modal preserves current state on HomeScreen.
 * 7. Start Over resets directly to HomeScreen with English default.
 * 8. Inactivity timeout returns directly to HomeScreen with English default.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import React from 'react';
import App from '../App';
import { getStrings } from '../i18n';

// Mock API and SpeechSynthesis
vi.mock('../services/api', () => ({
  sendQuery: vi.fn(),
  transcribeAudio: vi.fn(),
  synthesizeSpeech: vi.fn(),
  analyzeDocument: vi.fn(),
  queryVisionDocument: vi.fn(),
  checkHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
}));

describe('Direct HomeScreen Startup & In-Place Language Selection', () => {
  const stringsEn = getStrings('en');
  const stringsHi = getStrings('hi');
  const stringsMr = getStrings('mr');

  beforeEach(() => {
    // Mock navigator.mediaDevices
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

  it('1. launches directly into HomeScreen without splash screen', () => {
    render(<App />);

    // HomeScreen greeting is immediately present
    expect(screen.getByText(stringsEn.howCanWeHelp)).toBeInTheDocument();
    expect(screen.getByTestId('sahkaarsetu-assistant')).toBeInTheDocument();

    // No splash screen indicator or loading status
    expect(screen.queryByText('सहकार से समृद्धि')).not.toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('2. does not show startup language selection screen', () => {
    render(<App />);

    // "Choose Your Language" heading must NOT be displayed on startup
    expect(screen.queryByRole('heading', { name: /choose your language/i })).not.toBeInTheDocument();
  });

  it('3. initializes with English (en) as default language', () => {
    render(<App />);

    // English strings and card labels are visible
    expect(screen.getByText(stringsEn.homeGreeting)).toBeInTheDocument();
    expect(screen.getByText(stringsEn.homeAskByVoice)).toBeInTheDocument();
    expect(screen.getByText(stringsEn.homeTypeQuestion)).toBeInTheDocument();
    expect(screen.getByText(stringsEn.homeScanDocument)).toBeInTheDocument();
    expect(screen.getByText(stringsEn.homePacsAssistance)).toBeInTheDocument();
  });

  it('4. clicking "Change Language" opens the 22-language modal over HomeScreen', () => {
    render(<App />);

    const changeLangBtn = screen.getByRole('button', { name: new RegExp(stringsEn.changeLanguage, 'i') });
    fireEvent.click(changeLangBtn);

    // Modal dialog is displayed
    const modal = screen.getByRole('dialog', { name: /choose your language/i });
    expect(modal).toBeInTheDocument();

    // Contains all 22 languages (e.g. Hindi, Marathi, Tamil, Bengali)
    expect(screen.getByRole('button', { name: /हिंदी/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /मराठी/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /தமிழ்/i })).toBeInTheDocument();
  });

  it('5. selecting a language updates HomeScreen in-place without page change', async () => {
    render(<App />);

    // Click Change Language
    const changeLangBtn = screen.getByRole('button', { name: new RegExp(stringsEn.changeLanguage, 'i') });
    fireEvent.click(changeLangBtn);

    // Pick Hindi
    const hiCard = screen.getByRole('button', { name: /हिंदी/i });
    fireEvent.click(hiCard);

    // Modal closes
    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /choose your language/i })).not.toBeInTheDocument();
    });

    // HomeScreen is updated to Hindi
    expect(screen.getByText(stringsHi.howCanWeHelp)).toBeInTheDocument();
    expect(screen.getByText(stringsHi.homeAskByVoice)).toBeInTheDocument();
    expect(screen.getByText(stringsHi.homeTypeQuestion)).toBeInTheDocument();
    expect(screen.getByTestId('sahkaarsetu-assistant')).toBeInTheDocument();
  });

  it('6. closing language modal leaves user on HomeScreen', async () => {
    render(<App />);

    const changeLangBtn = screen.getByRole('button', { name: new RegExp(stringsEn.changeLanguage, 'i') });
    fireEvent.click(changeLangBtn);

    expect(screen.getByRole('dialog', { name: /choose your language/i })).toBeInTheDocument();

    // Click close button '✕'
    const closeBtn = screen.getByRole('button', { name: /close/i });
    fireEvent.click(closeBtn);

    await waitFor(() => {
      expect(screen.queryByRole('dialog', { name: /choose your language/i })).not.toBeInTheDocument();
    });

    // Still on HomeScreen
    expect(screen.getByText(stringsEn.howCanWeHelp)).toBeInTheDocument();
    expect(screen.getByTestId('sahkaarsetu-assistant')).toBeInTheDocument();
  });

  it('7. Start Over resets directly to HomeScreen with English language', async () => {
    render(<App />);

    // Change to Marathi first
    const changeLangBtn = screen.getByRole('button', { name: new RegExp(stringsEn.changeLanguage, 'i') });
    fireEvent.click(changeLangBtn);
    fireEvent.click(screen.getByRole('button', { name: /मराठी/i }));

    expect(screen.getByText(stringsMr.howCanWeHelp)).toBeInTheDocument();

    // Click Start Over
    const startOverBtn = screen.getByRole('button', { name: new RegExp(stringsMr.promptStartOver, 'i') });
    fireEvent.click(startOverBtn);

    // Confirm dialog
    const confirmBtn = screen.getAllByRole('button', { name: new RegExp(stringsMr.promptStartOver, 'i') });
    fireEvent.click(confirmBtn[confirmBtn.length - 1]);

    // Resets directly to HomeScreen in English
    await waitFor(() => {
      expect(screen.getByText(stringsEn.howCanWeHelp)).toBeInTheDocument();
      expect(screen.getByTestId('sahkaarsetu-assistant')).toBeInTheDocument();
      expect(screen.queryByRole('heading', { name: /choose your language/i })).not.toBeInTheDocument();
    });
  });

  it('8. Inactivity timeout returns directly to HomeScreen with English language', async () => {
    vi.useFakeTimers();
    render(<App />);

    // Change to Marathi
    const changeLangBtn = screen.getByRole('button', { name: new RegExp(stringsEn.changeLanguage, 'i') });
    fireEvent.click(changeLangBtn);
    fireEvent.click(screen.getByRole('button', { name: /मराठी/i }));

    expect(screen.getByText(stringsMr.howCanWeHelp)).toBeInTheDocument();

    // Fast-forward past full 120s inactivity timeout (130s total)
    act(() => {
      vi.advanceTimersByTime(130000);
    });

    // Directly on HomeScreen in English
    expect(screen.getByText(stringsEn.howCanWeHelp)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /choose your language/i })).not.toBeInTheDocument();

    vi.useRealTimers();
  });
});
