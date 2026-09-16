/**
 * KioskHeader
 *
 * Persistent header bar displayed on Home and interaction screens.
 * Contains: logo, brand name, change-language button, start-over button.
 *
 * NOT shown on Splash or Language screens.
 */

import logoSrc from '../../assets/logo.png';
import type { KioskStrings } from '../../i18n';

interface Props {
  strings: KioskStrings;
  onChangeLanguage: () => void;
  onStartOver: () => void;
}

export function KioskHeader({ strings, onChangeLanguage, onStartOver }: Props) {
  return (
    <header
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderBottom: '2px solid #e2e8f0',
        padding: '12px 24px',
        height: '72px',
        flexShrink: 0,
      }}
    >
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <img
          src={logoSrc}
          alt="SahkaarSetu Logo"
          style={{ height: '48px', width: '48px', objectFit: 'contain' }}
        />
        <span
          style={{
            fontSize: '22px',
            fontWeight: 800,
            color: '#15803d',
            letterSpacing: '-0.5px',
          }}
        >
          {strings.brandName}
        </span>
      </div>

      {/* Controls */}
      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          onClick={onChangeLanguage}
          aria-label={strings.changeLanguage}
          style={{
            height: '48px',
            padding: '0 20px',
            backgroundColor: '#f0fdf4',
            color: '#15803d',
            border: '2px solid #86efac',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          🌐 {strings.changeLanguage}
        </button>

        <button
          onClick={onStartOver}
          aria-label={strings.promptStartOver}
          style={{
            height: '48px',
            padding: '0 20px',
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            border: '2px solid #fca5a5',
            borderRadius: '10px',
            fontSize: '16px',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          ↩ {strings.promptStartOver}
        </button>
      </div>
    </header>
  );
}
