/**
 * HelpScreen
 *
 * PACS assistance and staff handoff entry screen (shell for future K7/K8).
 * Features:
 *   - Clear, dignified public-service informational card
 *   - [ Continue ] primary action
 *   - [ Back ] navigation button to return to Home
 */

import { useState } from 'react';
import { KioskShell } from '../components/kiosk/KioskShell';
import type { KioskStrings } from '../i18n';

interface Props {
  strings: KioskStrings;
  serviceAvailable: boolean;
  onBack: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
}

export function HelpScreen({
  strings,
  serviceAvailable,
  onBack,
  onChangeLanguage,
  onStartOver,
}: Props) {
  const [prepared, setPrepared] = useState(false);

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
          gap: '24px',
          width: '100%',
          maxWidth: '640px',
          margin: '0 auto',
        }}
      >
        <div
          style={{
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '2px solid #e2e8f0',
            padding: '36px 32px',
            textAlign: 'center',
            boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: '56px', marginBottom: '16px' }} aria-hidden="true">
            🏛️
          </div>

          <h2
            style={{
              fontSize: '30px',
              fontWeight: 800,
              color: '#1e3a5f',
              margin: '0 0 12px 0',
            }}
          >
            {strings.needHelpTitle}
          </h2>

          <p
            style={{
              fontSize: '19px',
              color: '#475569',
              margin: '0 0 28px 0',
              lineHeight: 1.5,
              fontWeight: 500,
            }}
          >
            {strings.needHelpDesc}
          </p>

          {prepared ? (
            <div
              style={{
                backgroundColor: '#f0fdf4',
                border: '2px solid #86efac',
                borderRadius: '12px',
                padding: '16px',
                color: '#15803d',
                fontSize: '18px',
                fontWeight: 700,
                marginBottom: '16px',
              }}
            >
              ✅ Request prepared for PACS staff assistance.
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
            }}
          >
            <button
              type="button"
              onClick={onBack}
              style={{
                flex: 1,
                minHeight: '56px',
                backgroundColor: '#f1f5f9',
                color: '#334155',
                border: '2px solid #cbd5e1',
                borderRadius: '14px',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              ← {strings.actionBack}
            </button>

            <button
              type="button"
              onClick={() => setPrepared(true)}
              style={{
                flex: 2,
                minHeight: '56px',
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '18px',
                fontWeight: 800,
                cursor: 'pointer',
                touchAction: 'manipulation',
                boxShadow: '0 4px 16px rgba(21, 128, 61, 0.25)',
              }}
            >
              {strings.promptContinue} →
            </button>
          </div>
        </div>
      </div>
    </KioskShell>
  );
}
