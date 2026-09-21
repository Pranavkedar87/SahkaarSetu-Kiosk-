/**
 * App.tsx — Kiosk Application Root
 *
 * Screen routing is state-driven for the kiosk mode.
 * Session state is fully managed by KioskSessionContext.
 *
 * Flow:
 *   splash → language → home ⇄ (type / scan / help)
 *                ↑
 *         inactivity reset / start over confirmation
 */

import React, { useState, useCallback } from 'react';
import { KioskSessionProvider, useKioskSession } from './context/KioskSessionContext';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { SplashScreen } from './pages/SplashScreen';
import { LanguageScreen } from './pages/LanguageScreen';
import { HomeScreen } from './pages/HomeScreen';
import { TypeScreen } from './pages/TypeScreen';
import { ScanScreen } from './pages/ScanScreen';
import { HelpScreen } from './pages/HelpScreen';
import { VoiceScreen } from './pages/VoiceScreen';
import { TimeoutWarningModal } from './components/common/TimeoutWarningModal';
import { ConfirmDialog } from './components/common/ConfirmDialog';
import { getStrings } from './i18n';
import type { LanguageCode, SpeakButtonState } from './types';

// ─── Inner app — has access to session context ────────────────────────────────

function KioskApp() {
  const {
    session,
    setLanguage,
    setScreen,
    setActiveOperation,
    resetSession,
    addMessage,
  } = useKioskSession();

  const strings = getStrings(session.language);

  // Start Over confirmation modal state
  const [showConfirmStartOver, setShowConfirmStartOver] = useState(false);

  // Speak button interactive placeholder state for K3
  const [speakState] = useState<SpeakButtonState>('idle');

  // Inactivity timeout — active on all operational kiosk screens
  const isKioskActive =
    session.screen !== 'splash' && session.screen !== 'language';

  const { showWarning, resetTimer } = useInactivityTimeout({
    activeOperation: session.activeOperation,
    onTimeout: () => {
      setShowConfirmStartOver(false);
      resetSession();
    },
    enabled: isKioskActive,
  });

  // ── Splash → Language ──────────────────────────────────────────────────────
  const handleSplashReady = useCallback(() => {
    setScreen('language');
  }, [setScreen]);

  // ── Language → Home ────────────────────────────────────────────────────────
  const handleSelectLanguage = useCallback(
    (lang: LanguageCode) => {
      setLanguage(lang);
      setScreen('home');
    },
    [setLanguage, setScreen]
  );

  // ── Home actions ───────────────────────────────────────────────────────────
  // Primary Home microphone operates inline on HomeScreen (zero redirect to VoiceScreen)
  const handleSpeak = useCallback(() => {
    // Main microphone stays on HomeScreen
  }, []);

  // Voice handoff from other sub-screens (Type, Scan) routes to VoiceScreen
  const handleVoiceHandoff = useCallback(() => {
    setScreen('voice');
  }, [setScreen]);

  const handleType = useCallback(() => {
    setScreen('type');
  }, [setScreen]);

  const handleScan = useCallback(() => {
    setScreen('scan');
  }, [setScreen]);

  const handlePacsHelp = useCallback(() => {
    setScreen('help');
  }, [setScreen]);

  const handleBackToHome = useCallback(() => {
    setScreen('home');
  }, [setScreen]);

  // ── Type question submit ───────────────────────────────────────────────────
  const handleAskQuestion = useCallback(
    (question: string) => {
      addMessage({
        id: String(Date.now()),
        role: 'user',
        text: question,
        timestamp: Date.now(),
      });
      // In future K5 this routes to answer view; for K3 return to Home or maintain
      setScreen('home');
    },
    [addMessage, setScreen]
  );

  // ── Change language → back to language screen ──────────────────────────────
  const handleChangeLanguage = useCallback(() => {
    setScreen('language');
  }, [setScreen]);

  // ── Start Over confirmation ────────────────────────────────────────────────
  const handlePromptStartOver = useCallback(() => {
    setShowConfirmStartOver(true);
  }, []);

  const handleConfirmStartOver = useCallback(() => {
    setShowConfirmStartOver(false);
    resetSession();
  }, [resetSession]);

  const handleCancelStartOver = useCallback(() => {
    setShowConfirmStartOver(false);
  }, []);

  // ── Timeout warning handlers ───────────────────────────────────────────────
  const handleContinue = useCallback(() => {
    resetTimer();
  }, [resetTimer]);

  // ─── Screen routing ────────────────────────────────────────────────────────

  let content: React.ReactNode;

  switch (session.screen) {
    case 'splash':
      content = <SplashScreen onReady={handleSplashReady} />;
      break;

    case 'language':
      content = (
        <LanguageScreen
          currentLanguage={session.language}
          onSelectLanguage={handleSelectLanguage}
        />
      );
      break;

    case 'voice':
      content = (
        <VoiceScreen
          strings={strings}
          language={session.language}
          serviceAvailable={session.serviceAvailable}
          onBack={handleBackToHome}
          onTypeInstead={handleType}
          onChangeLanguage={handleChangeLanguage}
          onStartOver={handlePromptStartOver}
          setActiveOperation={setActiveOperation}
          onMessageAdded={(userText, assistantText) => {
            addMessage({
              id: String(Date.now()),
              role: 'user',
              text: userText,
              timestamp: Date.now(),
            });
            addMessage({
              id: String(Date.now() + 1),
              role: 'assistant',
              text: assistantText,
              timestamp: Date.now() + 1,
            });
          }}
        />
      );
      break;

    case 'type':
      content = (
        <TypeScreen
          strings={strings}
          language={session.language}
          serviceAvailable={session.serviceAvailable}
          onBack={handleBackToHome}
          onVoiceHandoff={handleVoiceHandoff}
          onChangeLanguage={handleChangeLanguage}
          onStartOver={handlePromptStartOver}
          setActiveOperation={setActiveOperation}
          onMessageAdded={(userText, assistantText) => {
            addMessage({
              id: String(Date.now()),
              role: 'user',
              text: userText,
              timestamp: Date.now(),
            });
            addMessage({
              id: String(Date.now() + 1),
              role: 'assistant',
              text: assistantText,
              timestamp: Date.now() + 1,
            });
          }}
        />
      );
      break;

    case 'scan':
      content = (
        <ScanScreen
          strings={strings}
          language={session.language}
          serviceAvailable={session.serviceAvailable}
          onBack={handleBackToHome}
          onVoiceHandoff={handleVoiceHandoff}
          onTypeHandoff={handleType}
          onChangeLanguage={handleChangeLanguage}
          onStartOver={handlePromptStartOver}
          setActiveOperation={setActiveOperation}
          onMessageAdded={(userText, assistantText) => {
            addMessage({
              id: String(Date.now()),
              role: 'user',
              text: userText,
              timestamp: Date.now(),
            });
            addMessage({
              id: String(Date.now() + 1),
              role: 'assistant',
              text: assistantText,
              timestamp: Date.now() + 1,
            });
          }}
        />
      );
      break;

    case 'help':
      content = (
        <HelpScreen
          strings={strings}
          language={session.language}
          serviceAvailable={session.serviceAvailable}
          onBack={handleBackToHome}
          onChangeLanguage={handleChangeLanguage}
          onStartOver={handlePromptStartOver}
        />
      );
      break;

    case 'home':
    default:
      content = (
        <HomeScreen
          strings={strings}
          serviceAvailable={session.serviceAvailable}
          speakState={speakState}
          onSpeak={handleSpeak}
          onType={handleType}
          onScan={handleScan}
          onPacsHelp={handlePacsHelp}
          onChangeLanguage={handleChangeLanguage}
          onStartOver={handlePromptStartOver}
          language={session.language}
          setActiveOperation={setActiveOperation}
          onMessageAdded={(userText, assistantText) => {
            addMessage({
              id: String(Date.now()),
              role: 'user',
              text: userText,
              timestamp: Date.now(),
            });
            addMessage({
              id: String(Date.now() + 1),
              role: 'assistant',
              text: assistantText,
              timestamp: Date.now() + 1,
            });
          }}
        />
      );
  }

  return (
    <>
      {content}

      {/* Start Over Confirmation Dialog */}
      {showConfirmStartOver && (
        <ConfirmDialog
          strings={strings}
          onConfirm={handleConfirmStartOver}
          onCancel={handleCancelStartOver}
        />
      )}

      {/* Timeout warning overlay */}
      {showWarning && (
        <TimeoutWarningModal
          strings={strings}
          onContinue={handleContinue}
          onStartOver={resetSession}
        />
      )}
    </>
  );
}

// ─── Root export with context provider ───────────────────────────────────────

export default function App() {
  return (
    <KioskSessionProvider>
      <KioskApp />
    </KioskSessionProvider>
  );
}
