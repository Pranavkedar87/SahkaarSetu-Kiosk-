/**
 * LanguageCard
 *
 * A large, touch-friendly card for a single language option.
 * Min touch target: 80px height.
 */

import type { Language } from '../../types';

interface Props {
  language: Language;
  isSelected: boolean;
  onSelect: (code: string) => void;
}

export function LanguageCard({ language, isSelected, onSelect }: Props) {
  const isRtl = language.rtl ?? false;

  return (
    <button
      onClick={() => onSelect(language.code)}
      aria-pressed={isSelected}
      aria-label={`${language.nativeLabel} – ${language.label}`}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '4px',
        minHeight: '80px',
        width: '100%',
        backgroundColor: isSelected ? '#f0fdf4' : '#fff',
        border: isSelected ? '2px solid #15803d' : '2px solid #e2e8f0',
        borderRadius: '12px',
        cursor: 'pointer',
        padding: '16px 12px',
        transition: 'background-color 0.15s, border-color 0.15s, transform 0.1s',
        transform: isSelected ? 'scale(1.02)' : 'scale(1)',
        boxShadow: isSelected ? '0 4px 16px rgba(21,128,61,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
      }}
    >
      {/* Native label — primary */}
      <span
        style={{
          fontSize: '20px',
          fontWeight: 700,
          color: isSelected ? '#15803d' : '#1e293b',
          lineHeight: 1.2,
          textAlign: 'center',
        }}
      >
        {language.nativeLabel}
      </span>

      {/* English label — secondary */}
      {language.code !== 'en' && (
        <span
          style={{
            fontSize: '13px',
            fontWeight: 400,
            color: '#64748b',
          }}
        >
          {language.label}
        </span>
      )}

      {isSelected && (
        <span
          aria-hidden="true"
          style={{ fontSize: '16px', color: '#15803d', marginTop: '2px' }}
        >
          ✓
        </span>
      )}
    </button>
  );
}
