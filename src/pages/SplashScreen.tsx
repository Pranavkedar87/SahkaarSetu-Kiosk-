/**
 * SplashScreen
 *
 * Lightweight branding screen shown on initial load.
 * Auto-advances to language selection after a short delay.
 *
 * Shows:
 *   - SahkaarSetu logo
 *   - Brand name (English + Hindi)
 *   - Tagline
 *   - Kiosk subtitle
 *   - Loading indicator
 */

import { useEffect } from 'react';
import logoSrc from '../assets/logo.png';

interface Props {
  onReady: () => void;
}

const SPLASH_DURATION_MS = 1800;

export function SplashScreen({ onReady }: Props) {
  useEffect(() => {
    const timer = setTimeout(onReady, SPLASH_DURATION_MS);
    return () => clearTimeout(timer);
  }, [onReady]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f0fdf4',
        gap: '20px',
        padding: '32px',
        boxSizing: 'border-box',
        overflow: 'hidden',
      }}
    >
      {/* Logo */}
      <img
        src={logoSrc}
        alt="SahkaarSetu Logo"
        style={{
          width: '140px',
          height: '140px',
          objectFit: 'contain',
          borderRadius: '50%',
          boxShadow: '0 8px 32px rgba(21,128,61,0.2)',
        }}
      />

      {/* Brand name */}
      <div style={{ textAlign: 'center' }}>
        <h1
          style={{
            fontSize: '40px',
            fontWeight: 800,
            color: '#15803d',
            margin: 0,
            letterSpacing: '-1px',
          }}
        >
          SahkaarSetu
        </h1>
        <p
          style={{
            fontSize: '28px',
            fontWeight: 700,
            color: '#166534',
            margin: '4px 0 0',
          }}
        >
          सहकारसेतू
        </p>
      </div>

      {/* Tagline */}
      <p
        style={{
          fontSize: '20px',
          fontWeight: 500,
          color: '#1e3a5f',
          margin: 0,
          textAlign: 'center',
        }}
      >
        सहकार से समृद्धि
      </p>

      {/* Subtitle */}
      <p
        style={{
          fontSize: '16px',
          fontWeight: 400,
          color: '#475569',
          margin: 0,
          letterSpacing: '0.5px',
          textTransform: 'uppercase',
        }}
      >
        Cooperative Assistance Kiosk
      </p>

      {/* Loading indicator */}
      <div
        role="status"
        aria-label="Loading"
        style={{
          marginTop: '24px',
          display: 'flex',
          gap: '8px',
        }}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: '#15803d',
              display: 'inline-block',
              animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { opacity: 0.2; transform: scale(0.8); }
          40% { opacity: 1; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
}
