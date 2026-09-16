/**
 * LanguageScreen
 *
 * Displays all 22 languages currently supported by the SahkaarSetu Citizen UI.
 * Uses large, touch-friendly LanguageCard components in a responsive grid.
 *
 * After language selection → navigates to Home.
 */

import { useState } from 'react';
import { LANGUAGES } from '../i18n';
import { LanguageCard } from '../components/kiosk/LanguageCard';
import type { LanguageCode } from '../types';
import logoSrc from '../assets/logo.png';

interface Props {
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
}

export function LanguageScreen({ currentLanguage, onSelectLanguage }: Props) {
  const [selected, setSelected] = useState<LanguageCode>(currentLanguage);

  const handleSelect = (code: string) => {
    const lang = code as LanguageCode;
    setSelected(lang);
    onSelectLanguage(lang);
  };

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
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '16px',
          backgroundColor: '#fff',
          borderBottom: '2px solid #e2e8f0',
          padding: '16px 24px',
          flexShrink: 0,
        }}
      >
        <img
          src={logoSrc}
          alt="SahkaarSetu"
          style={{ height: '48px', width: '48px', objectFit: 'contain' }}
        />
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: 800,
              color: '#15803d',
            }}
          >
            Choose Your Language
          </h1>
          <p style={{ margin: 0, fontSize: '16px', color: '#64748b' }}>
            अपनी भाषा चुनें • ভাষা বাছুন • மொழியை தேர்வு செய்யுங்கள்
          </p>
        </div>
      </div>

      {/* Language grid — scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '24px',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
            gap: '16px',
            maxWidth: '1200px',
            margin: '0 auto',
          }}
        >
          {LANGUAGES.map((lang) => (
            <LanguageCard
              key={lang.code}
              language={lang}
              isSelected={selected === lang.code}
              onSelect={handleSelect}
            />
          ))}
        </div>
      </div>

      {/* Footer note */}
      <div
        style={{
          padding: '12px 24px',
          backgroundColor: '#fff',
          borderTop: '1px solid #e2e8f0',
          textAlign: 'center',
          flexShrink: 0,
        }}
      >
        <p style={{ margin: 0, fontSize: '13px', color: '#94a3b8' }}>
          22 languages supported · UI language selection only · Voice/AI support depends on backend configuration
        </p>
      </div>
    </div>
  );
}
