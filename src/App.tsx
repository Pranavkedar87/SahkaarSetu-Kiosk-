/**
 * App.tsx — Kiosk Application Root
 *
 * Screen routing is state-driven (no URL router needed for K1/K2 kiosk mode).
 * Session state is fully managed by KioskSessionContext.
 *
 * Flow:
 *   splash → language → home → (chat / scan — future)
 *                ↑
 *         inactivity reset
 */

import React, { useCallback } from 'react';
import { KioskSessionProvider, useKioskSession } from './context/KioskSessionContext';
import { useInactivityTimeout } from './hooks/useInactivityTimeout';
import { SplashScreen } from './pages/SplashScreen';
import { LanguageScreen } from './pages/LanguageScreen';
import { HomeScreen } from './pages/HomeScreen';
import { TimeoutWarningModal } from './components/common/TimeoutWarningModal';
import { getStrings } from './i18n';
import type { LanguageCode } from './types';

// ─── Inner app — has access to session context ────────────────────────────────

function KioskApp() {
  const {
    session,
    setLanguage,
    setScreen,
    resetSession,
  } = useKioskSession();

  const strings = getStrings(session.language);

  // Inactivity timeout — only active on home screen and later screens
  const { showWarning, resetTimer } = useInactivityTimeout({
    activeOperation: session.activeOperation,
    onTimeout: resetSession,
    enabled: session.screen === 'home' || session.screen === 'chat' || session.screen === 'scan',
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

  // ── Home actions (placeholders for K4–K6) ─────────────────────────────────
  const handleSpeak = useCallback(() => {
    console.info('[Kiosk] Speak action — K4 implementation pending');
  }, []);

  const handleType = useCallback(() => {
    console.info('[Kiosk] Type action — K5 implementation pending');
  }, []);

  const handleScan = useCallback(() => {
    console.info('[Kiosk] Scan action — K6 implementation pending');
  }, []);

  const handlePacsHelp = useCallback(() => {
    console.info('[Kiosk] PACS Help action — K7/K8 implementation pending');
  }, []);

  // ── Change language → back to language screen ──────────────────────────────
  const handleChangeLanguage = useCallback(() => {
    setScreen('language');
  }, [setScreen]);

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

    case 'home':
    default:
      content = (
        <HomeScreen
          strings={strings}
          serviceAvailable={session.serviceAvailable}
          onSpeak={handleSpeak}
          onType={handleType}
          onScan={handleScan}
          onPacsHelp={handlePacsHelp}
          onChangeLanguage={handleChangeLanguage}
          onStartOver={resetSession}
        />
      );
  }

  return (
    <>
      {content}

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
