/**
 * TypeScreen
 *
 * Touchscreen text input screen (shell for future K5).
 * Features:
 *   - Large high-contrast touch input area
 *   - [ Ask ] primary submit button
 *   - [ Back ] navigation button to return to Kiosk Home
 */

import { useState } from 'react';
import { KioskShell } from '../components/kiosk/KioskShell';
import type { KioskStrings } from '../i18n';

interface Props {
  strings: KioskStrings;
  serviceAvailable: boolean;
  onAsk: (question: string) => void;
  onBack: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
}

export function TypeScreen({
  strings,
  serviceAvailable,
  onAsk,
  onBack,
  onChangeLanguage,
  onStartOver,
}: Props) {
  const [question, setQuestion] = useState('');

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (question.trim()) {
      onAsk(question.trim());
    }
  };

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
          maxWidth: '680px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#1e3a5f',
            margin: 0,
            textAlign: 'center',
          }}
        >
          {strings.howCanWeHelp}
        </h2>

        <form
          onSubmit={handleSubmit}
          style={{
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder={strings.typeQuestion}
            aria-label={strings.typeQuestion}
            rows={4}
            style={{
              width: '100%',
              padding: '20px',
              fontSize: '22px',
              fontFamily: 'inherit',
              borderRadius: '16px',
              border: '2px solid #cbd5e1',
              boxSizing: 'border-box',
              outline: 'none',
              resize: 'none',
              backgroundColor: '#ffffff',
              color: '#0f172a',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
            }}
          />

          <div
            style={{
              display: 'flex',
              gap: '16px',
              width: '100%',
            }}
          >
            <button
              type="button"
              onClick={onBack}
              style={{
                flex: 1,
                minHeight: '60px',
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
              type="submit"
              disabled={!question.trim()}
              style={{
                flex: 2,
                minHeight: '60px',
                backgroundColor: question.trim() ? '#15803d' : '#94a3b8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '20px',
                fontWeight: 800,
                cursor: question.trim() ? 'pointer' : 'not-allowed',
                touchAction: 'manipulation',
                boxShadow: question.trim() ? '0 4px 16px rgba(21, 128, 61, 0.3)' : 'none',
              }}
            >
              {strings.actionAsk} →
            </button>
          </div>
        </form>
      </div>
    </KioskShell>
  );
}
