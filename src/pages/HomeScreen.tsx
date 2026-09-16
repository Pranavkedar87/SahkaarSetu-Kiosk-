/**
 * HomeScreen
 *
 * Polished K3 main kiosk dashboard.
 *
 * Visual hierarchy:
 *   1. "How can we help you?" greeting
 *   2. Visually dominant PrimarySpeakButton (180-220px)
 *   3. Secondary Action Buttons: Type (⌨️) & Scan Document (📷)
 *   4. Tertiary Action Button: Get Help from PACS (🏛️)
 */

import { KioskShell } from '../components/kiosk/KioskShell';
import { PrimarySpeakButton } from '../components/kiosk/PrimarySpeakButton';
import { ActionButton } from '../components/kiosk/ActionButton';
import type { KioskStrings } from '../i18n';
import type { SpeakButtonState } from '../types';

interface Props {
  strings: KioskStrings;
  serviceAvailable: boolean;
  speakState?: SpeakButtonState;
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
  speakState = 'idle',
  onSpeak,
  onType,
  onScan,
  onPacsHelp,
  onChangeLanguage,
  onStartOver,
}: Props) {
  return (
    <KioskShell
      strings={strings}
      serviceAvailable={serviceAvailable}
      onChangeLanguage={onChangeLanguage}
      onStartOver={onStartOver}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '24px',
          width: '100%',
          maxWidth: '720px',
          margin: '0 auto',
        }}
      >
        {/* Main Greeting */}
        <h2
          style={{
            fontSize: '34px',
            fontWeight: 800,
            color: '#1e3a5f',
            margin: 0,
            textAlign: 'center',
            letterSpacing: '-0.5px',
          }}
        >
          {strings.howCanWeHelp}
        </h2>

        {/* 1. Visually Dominant Primary Speak Action */}
        <div style={{ padding: '8px 0' }}>
          <PrimarySpeakButton
            state={speakState}
            strings={strings}
            onClick={onSpeak}
          />
        </div>

        {/* 2. Secondary Actions Grid: Type & Scan */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            width: '100%',
            maxWidth: '480px',
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

        {/* 3. Tertiary Action: Help from PACS */}
        <div style={{ width: '100%', maxWidth: '480px' }}>
          <ActionButton
            label={strings.actionHelpPacs}
            icon="🏛️"
            variant="tertiary"
            onClick={onPacsHelp}
          />
        </div>
      </div>
    </KioskShell>
  );
}
