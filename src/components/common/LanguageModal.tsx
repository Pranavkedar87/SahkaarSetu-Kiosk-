/**
 * LanguageModal
 *
 * Touch-friendly modal overlay to select one of the 22 supported languages
 * directly from HomeScreen or any other active screen without full-screen navigation.
 */

import React, { useEffect } from 'react';
import { LANGUAGES } from '../../i18n';
import { LanguageCard } from '../kiosk/LanguageCard';
import type { LanguageCode } from '../../types';
import logoSrc from '../../assets/logo.png';

interface Props {
  currentLanguage: LanguageCode;
  onSelectLanguage: (lang: LanguageCode) => void;
  onClose: () => void;
}

export function LanguageModal({ currentLanguage, onSelectLanguage, onClose }: Props) {
  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSelect = (code: string) => {
    onSelectLanguage(code as LanguageCode);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Choose Your Language"
      data-testid="language-modal"
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(6px)',
        WebkitBackdropFilter: 'blur(6px)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.2s ease-out',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '1100px',
          maxHeight: '90vh',
          backgroundColor: '#f8fafc',
          borderRadius: '24px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          border: '1px solid rgba(255, 255, 255, 0.8)',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#ffffff',
            borderBottom: '2px solid #e2e8f0',
            padding: '16px 24px',
            flexShrink: 0,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <img
              src={logoSrc}
              alt="SahkaarSetu"
              style={{ height: '44px', width: '44px', objectFit: 'contain' }}
            />
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#15803d',
                  letterSpacing: '-0.02em',
                }}
              >
                Choose Your Language
              </h2>
              <p
                style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#64748b',
                  fontWeight: 500,
                }}
              >
                अपनी भाषा चुनें • ভাষা বাছুন • மொழியை தேர்வு செய்யுங்கள்
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              borderRadius: '50%',
              border: '2px solid #e2e8f0',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: '20px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.15s ease',
            }}
          >
            ✕
          </button>
        </div>

        {/* Language Grid */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '24px',
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
              gap: '14px',
              maxWidth: '1020px',
              margin: '0 auto',
            }}
          >
            {LANGUAGES.map((lang) => (
              <LanguageCard
                key={lang.code}
                language={lang}
                isSelected={currentLanguage === lang.code}
                onSelect={handleSelect}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
