import type { KioskStrings } from '../../i18n';

interface Props {
  strings: KioskStrings;
  onContinue: () => void;
  onStartOver: () => void;
}

export function TimeoutWarningModal({ strings, onContinue, onStartOver }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={strings.timeoutWarning}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.65)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <div
        style={{
          backgroundColor: '#fff',
          borderRadius: '16px',
          padding: '40px 48px',
          maxWidth: '480px',
          width: '90%',
          textAlign: 'center',
          boxShadow: '0 24px 64px rgba(0,0,0,0.3)',
        }}
      >
        {/* Icon */}
        <div style={{ fontSize: '48px', marginBottom: '16px' }} aria-hidden="true">
          ⏱️
        </div>

        {/* Message */}
        <p
          style={{
            fontSize: '22px',
            fontWeight: 600,
            color: '#1e293b',
            marginBottom: '32px',
            lineHeight: 1.4,
          }}
        >
          {strings.timeoutWarning}
        </p>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          <button
            onClick={onContinue}
            autoFocus
            style={{
              flex: 1,
              minHeight: '56px',
              backgroundColor: '#15803d',
              color: '#fff',
              border: 'none',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              padding: '0 24px',
            }}
          >
            {strings.promptContinue}
          </button>

          <button
            onClick={onStartOver}
            style={{
              flex: 1,
              minHeight: '56px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '2px solid #cbd5e1',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '0 24px',
            }}
          >
            {strings.promptStartOver}
          </button>
        </div>
      </div>
    </div>
  );
}
