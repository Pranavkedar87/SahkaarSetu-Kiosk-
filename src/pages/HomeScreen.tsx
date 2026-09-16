/**
 * HomeScreen
 *
 * The primary kiosk home. Clean, minimal, ATM-inspired.
 *
 * Layout:
 *   - Persistent KioskHeader (logo + change-language + start-over)
 *   - Central "How can we help you?" message
 *   - Dominant 🎤 SPEAK button (primary action)
 *   - Secondary: ⌨️ TYPE and 📷 SCAN DOCUMENT
 *   - Tertiary: 🏛️ GET HELP FROM PACS
 *   - Optional: ServiceUnavailableBanner when backend is unreachable
 *
 * No: sidebar · profile · settings · admin · login · dashboard
 */

import { KioskHeader } from '../components/kiosk/KioskHeader';
import { ActionButton } from '../components/kiosk/ActionButton';
import { ServiceUnavailableBanner } from '../components/kiosk/ServiceUnavailableBanner';
import type { KioskStrings } from '../i18n';

interface Props {
  strings: KioskStrings;
  serviceAvailable: boolean;
  onSpeak: () => void;
  onType: () => void;
  onScan: () => void;
  onPacsHelp: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
}

export function HomeScreen({
  strings,
  serviceAvailable,
  onSpeak,
  onType,
  onScan,
  onPacsHelp,
  onChangeLanguage,
  onStartOver,
}: Props) {
  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#f8fafc',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Header */}
      <KioskHeader
        strings={strings}
        onChangeLanguage={onChangeLanguage}
        onStartOver={onStartOver}
      />

      {/* Main content */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 32px',
          gap: '28px',
          overflowY: 'auto',
          overflowX: 'hidden',
        }}
      >
        {/* Service unavailable banner */}
        {!serviceAvailable && (
          <div style={{ width: '100%', maxWidth: '600px' }}>
            <ServiceUnavailableBanner strings={strings} />
          </div>
        )}

        {/* Greeting */}
        <h2
          style={{
            fontSize: '32px',
            fontWeight: 700,
            color: '#1e3a5f',
            margin: 0,
            textAlign: 'center',
          }}
        >
          {strings.howCanWeHelp}
        </h2>

        {/* PRIMARY: Speak button */}
        <ActionButton
          label={strings.actionSpeak}
          icon="🎤"
          variant="primary"
          onClick={onSpeak}
          ariaLabel={strings.pressToSpeak}
        />

        {/* SECONDARY: Type + Scan side by side */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            width: '100%',
            maxWidth: '500px',
          }}
        >
          <ActionButton
            label={strings.actionType}
            icon="⌨️"
            variant="secondary"
            onClick={onType}
          />
          <ActionButton
            label={strings.actionScan}
            icon="📷"
            variant="secondary"
            onClick={onScan}
          />
        </div>

        {/* TERTIARY: PACS Help */}
        <div style={{ width: '100%', maxWidth: '500px' }}>
          <ActionButton
            label={strings.actionHelpPacs}
            icon="🏛️"
            variant="tertiary"
            onClick={onPacsHelp}
          />
        </div>
      </main>
    </div>
  );
}
