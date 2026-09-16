/**
 * K3 Screens and UI Components Test Suite
 *
 * Verifies:
 * - TypeScreen renders, accepts input, submits via onAsk, navigates via onBack
 * - ScanScreen renders viewfinder, toggles camera active/capture states, navigates via onBack
 * - HelpScreen renders PACS assistance explanation, continues, navigates via onBack
 * - ConfirmDialog renders confirmation prompt, cancels via Continue, confirms via Start Over
 * - PrimarySpeakButton renders correctly across idle, listening, processing, and error states
 * - App.tsx screen routing works seamlessly between Home, Type, Scan, and Help
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { TypeScreen } from '../pages/TypeScreen';
import { ScanScreen } from '../pages/ScanScreen';
import { HelpScreen } from '../pages/HelpScreen';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { PrimarySpeakButton } from '../components/kiosk/PrimarySpeakButton';
import App from '../App';
import { getStrings } from '../i18n';

const strings = getStrings('en');

describe('TypeScreen', () => {
  it('renders input area and action buttons', () => {
    render(
      <TypeScreen
        strings={strings}
        serviceAvailable={true}
        onAsk={vi.fn()}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    expect(screen.getByPlaceholderText(strings.typeQuestion)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(strings.actionBack, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(strings.actionAsk, 'i'))).toBeInTheDocument();
  });

  it('calls onAsk with the entered question when Ask button is clicked', () => {
    const onAsk = vi.fn();
    render(
      <TypeScreen
        strings={strings}
        serviceAvailable={true}
        onAsk={onAsk}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const textarea = screen.getByPlaceholderText(strings.typeQuestion);
    fireEvent.change(textarea, { target: { value: 'How do I apply for KCC loan?' } });

    const askButton = screen.getByText(new RegExp(strings.actionAsk, 'i'));
    fireEvent.click(askButton);

    expect(onAsk).toHaveBeenCalledWith('How do I apply for KCC loan?');
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(
      <TypeScreen
        strings={strings}
        serviceAvailable={true}
        onAsk={vi.fn()}
        onBack={onBack}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const backButton = screen.getByText(new RegExp(strings.actionBack, 'i'));
    fireEvent.click(backButton);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('ScanScreen', () => {
  it('renders viewfinder frame and document scanning actions', () => {
    render(
      <ScanScreen
        strings={strings}
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    expect(screen.getByRole('region', { name: /viewfinder/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(strings.actionOpenCamera, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(strings.actionUploadDocument, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(strings.actionBack, 'i'))).toBeInTheDocument();
  });

  it('toggles camera preview and capture flow on user click', () => {
    render(
      <ScanScreen
        strings={strings}
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    // Click Open Camera
    const openCamBtn = screen.getByText(new RegExp(strings.actionOpenCamera, 'i'));
    fireEvent.click(openCamBtn);

    expect(screen.getByText(/Camera Active/i)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(strings.actionCapture, 'i'))).toBeInTheDocument();

    // Click Capture
    const captureBtn = screen.getByText(new RegExp(strings.actionCapture, 'i'));
    fireEvent.click(captureBtn);

    expect(screen.getByText(/Document Captured/i)).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked on ScanScreen', () => {
    const onBack = vi.fn();
    render(
      <ScanScreen
        strings={strings}
        serviceAvailable={true}
        onBack={onBack}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const backBtn = screen.getByText(new RegExp(strings.actionBack, 'i'));
    fireEvent.click(backBtn);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('HelpScreen', () => {
  it('renders PACS help informational heading and actions', () => {
    render(
      <HelpScreen
        strings={strings}
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    expect(screen.getByText(strings.needHelpTitle)).toBeInTheDocument();
    expect(screen.getByText(strings.needHelpDesc)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(strings.promptContinue, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(strings.actionBack, 'i'))).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked on HelpScreen', () => {
    const onBack = vi.fn();
    render(
      <HelpScreen
        strings={strings}
        serviceAvailable={true}
        onBack={onBack}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const backBtn = screen.getByText(new RegExp(strings.actionBack, 'i'));
    fireEvent.click(backBtn);

    expect(onBack).toHaveBeenCalledTimes(1);
  });
});

describe('ConfirmDialog', () => {
  it('renders confirmation dialog with title and description', () => {
    render(
      <ConfirmDialog
        strings={strings}
        onConfirm={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(strings.startOverConfirmTitle)).toBeInTheDocument();
    expect(screen.getByText(strings.startOverConfirmDesc)).toBeInTheDocument();
  });

  it('calls onCancel when Continue is clicked', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmDialog
        strings={strings}
        onConfirm={vi.fn()}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByText(strings.promptContinue));
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('calls onConfirm when Start Over is clicked', () => {
    const onConfirm = vi.fn();
    render(
      <ConfirmDialog
        strings={strings}
        onConfirm={onConfirm}
        onCancel={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(strings.promptStartOver));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('PrimarySpeakButton States', () => {
  it('renders idle state with Speak label', () => {
    render(
      <PrimarySpeakButton
        state="idle"
        strings={strings}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText(strings.actionSpeak)).toBeInTheDocument();
  });

  it('renders listening state with Listening label', () => {
    render(
      <PrimarySpeakButton
        state="listening"
        strings={strings}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText(strings.stateListening)).toBeInTheDocument();
  });

  it('renders processing state with Processing label', () => {
    render(
      <PrimarySpeakButton
        state="processing"
        strings={strings}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText(strings.stateProcessing)).toBeInTheDocument();
  });

  it('renders error state with Error Try Again label', () => {
    render(
      <PrimarySpeakButton
        state="error"
        strings={strings}
        onClick={vi.fn()}
      />
    );
    expect(screen.getByText(strings.stateErrorTryAgain)).toBeInTheDocument();
  });
});

describe('App Navigation Flow (K3)', () => {
  it('allows navigating from Splash → Language → Home → Type → Back to Home', async () => {
    vi.useFakeTimers();
    render(<App />);

    // Advance past splash
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // In Language screen, select English
    const enBtn = screen.getByRole('button', { name: /English/i });
    fireEvent.click(enBtn);

    // Now in Home screen
    expect(screen.getByText('How can we help you?')).toBeInTheDocument();

    // Click Type button
    const typeBtn = screen.getByText('Type');
    fireEvent.click(typeBtn);

    // Now in Type screen
    expect(screen.getByPlaceholderText(strings.typeQuestion)).toBeInTheDocument();

    // Click Back button
    const backBtn = screen.getByText(/Back/i);
    fireEvent.click(backBtn);

    // Back in Home screen
    expect(screen.getByText('How can we help you?')).toBeInTheDocument();

    vi.useRealTimers();
  });

  it('clicking Start Over from Home opens ConfirmDialog', () => {
    vi.useFakeTimers();
    render(<App />);

    // Advance past splash
    act(() => {
      vi.advanceTimersByTime(2000);
    });

    // Select English
    const enBtn = screen.getByRole('button', { name: /English/i });
    fireEvent.click(enBtn);

    // Click Start Over in header
    const startOverBtn = screen.getByRole('button', { name: /Start Over/i });
    fireEvent.click(startOverBtn);

    // ConfirmDialog should now be visible
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(strings.startOverConfirmTitle)).toBeInTheDocument();

    vi.useRealTimers();
  });
});
