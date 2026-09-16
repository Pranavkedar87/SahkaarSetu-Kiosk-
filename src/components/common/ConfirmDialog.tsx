/**
 * ConfirmDialog
 *
 * An accessible confirmation modal used when the citizen triggers "Start Over".
 * Confirms intent to clear the current ephemeral session.
 */

import type { KioskStrings } from '../../i18n';

interface Props {
  strings: KioskStrings;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({ strings, onConfirm, onCancel }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '20px',
          padding: '36px 40px',
          maxWidth: '460px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.3)',
          border: '1px solid #e2e8f0',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '16px' }} aria-hidden="true">
          ⚠️
        </div>

        <h3
          id="confirm-dialog-title"
          style={{
            fontSize: '24px',
            fontWeight: 800,
            color: '#1e3a5f',
            margin: '0 0 12px 0',
          }}
        >
          {strings.startOverConfirmTitle}
        </h3>

        <p
          id="confirm-dialog-desc"
          style={{
            fontSize: '18px',
            fontWeight: 500,
            color: '#475569',
            margin: '0 0 32px 0',
            lineHeight: 1.4,
          }}
        >
          {strings.startOverConfirmDesc}
        </p>

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            type="button"
            onClick={onCancel}
            autoFocus
            style={{
              flex: 1,
              minHeight: '56px',
              backgroundColor: '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0 20px',
              touchAction: 'manipulation',
            }}
          >
            {strings.promptContinue}
          </button>

          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1,
              minHeight: '56px',
              backgroundColor: '#fef2f2',
              color: '#dc2626',
              border: '2px solid #f87171',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0 20px',
              touchAction: 'manipulation',
            }}
          >
            {strings.promptStartOver}
          </button>
        </div>
      </div>
    </div>
  );
}
