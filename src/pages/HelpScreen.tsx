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
import { PrintModal } from '../components/kiosk/PrintModal';
import type { KioskStrings } from '../i18n';
import type { LanguageCode } from '../types';

interface Props {
  strings: KioskStrings;
  language?: LanguageCode;
  serviceAvailable: boolean;
  onBack: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
}

export function HelpScreen({
  strings,
  language = 'en',
  serviceAvailable,
  onBack,
  onChangeLanguage,
  onStartOver,
}: Props) {
  const [prepared, setPrepared] = useState(false);
  const [refCode, setRefCode] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const handleContinue = () => {
    if (!refCode) {
      setRefCode(`PACS-2026-${Math.floor(100000 + Math.random() * 900000)}`);
    }
    setPrepared(true);
  };

  return (
    <KioskShell
      strings={strings}
      serviceAvailable={serviceAvailable}
      onBack={onBack}
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
                padding: '20px',
                color: '#15803d',
                fontSize: '18px',
                fontWeight: 700,
                marginBottom: '24px',
                textAlign: 'center',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                ✅ Request prepared for PACS staff assistance.
              </div>
              {refCode && (
                <div
                  style={{
                    fontSize: '20px',
                    fontFamily: 'monospace',
                    color: '#1e3a5f',
                    backgroundColor: '#ffffff',
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: '1px solid #bbf7d0',
                    display: 'inline-block',
                    margin: '8px 0',
                  }}
                >
                  Reference: <strong>{refCode}</strong>
                </div>
              )}
              <div style={{ fontSize: '15px', color: '#166534', fontWeight: 500 }}>
                Please present this reference number or print a slip for the PACS counter.
              </div>
            </div>
          ) : null}

          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
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

            {prepared ? (
              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                style={{
                  flex: 2,
                  minHeight: '56px',
                  backgroundColor: '#1e3a5f',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  boxShadow: '0 4px 16px rgba(30, 58, 95, 0.25)',
                }}
              >
                🖨️ {strings.actionPrint}
              </button>
            ) : (
              <button
                type="button"
                onClick={handleContinue}
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
            )}
          </div>
        </div>

        {showPrintModal && (
          <PrintModal
            strings={strings}
            payload={{
              title: 'PACS Staff Assistance Slip',
              subTitle: 'Primary Agricultural Credit Society',
              referenceCode: refCode || undefined,
              guidance:
                'Citizen has requested in-person assistance at the PACS center. Please present this reference slip at the help desk.',
              category: 'PACS Assistance / Grievance',
              language: language || 'en',
              createdAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
            }}
            onClose={() => setShowPrintModal(false)}
          />
        )}
      </div>
    </KioskShell>
  );
}
