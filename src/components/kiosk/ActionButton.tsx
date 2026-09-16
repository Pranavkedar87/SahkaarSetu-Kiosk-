/**
 * ActionButton
 *
 * Reusable large-target action button for the Kiosk Home screen.
 * Variants:
 *   primary   — dominant action (Speak), large circular/pill, green
 *   secondary — supporting actions (Type, Scan)
 *   tertiary  — optional actions (PACS Help)
 */

export type ActionButtonVariant = 'primary' | 'secondary' | 'tertiary';

interface Props {
  label: string;
  icon: string;
  variant: ActionButtonVariant;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
}

const STYLES: Record<ActionButtonVariant, React.CSSProperties> = {
  primary: {
    width: '200px',
    height: '200px',
    borderRadius: '50%',
    backgroundColor: '#15803d',
    color: '#fff',
    border: '4px solid #166534',
    fontSize: '20px',
    fontWeight: 800,
    boxShadow: '0 8px 32px rgba(21,128,61,0.35)',
  },
  secondary: {
    width: '100%',
    minHeight: '80px',
    borderRadius: '16px',
    backgroundColor: '#fff',
    color: '#1e3a5f',
    border: '2px solid #cbd5e1',
    fontSize: '18px',
    fontWeight: 700,
    boxShadow: '0 2px 8px rgba(0,0,0,0.07)',
  },
  tertiary: {
    width: '100%',
    minHeight: '64px',
    borderRadius: '12px',
    backgroundColor: '#f8fafc',
    color: '#475569',
    border: '2px solid #e2e8f0',
    fontSize: '16px',
    fontWeight: 600,
  },
};

export function ActionButton({ label, icon, variant, onClick, disabled, ariaLabel }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel ?? label}
      style={{
        ...STYLES[variant],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: variant === 'primary' ? '8px' : '6px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'transform 0.1s, box-shadow 0.1s',
        userSelect: 'none',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      <span
        style={{
          fontSize: variant === 'primary' ? '48px' : '28px',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        {icon}
      </span>
      <span>{label}</span>
    </button>
  );
}
