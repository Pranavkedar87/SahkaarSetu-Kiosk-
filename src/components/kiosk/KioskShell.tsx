/**
 * KioskShell
 *
 * Global layout wrapper for kiosk screens (Home, Type, Scan, Help).
 * Provides:
 *   - Compact, persistent KioskHeader
 *   - Central content area optimized for 7-10.1" landscape touchscreens
 *   - Optional status / service unavailable banner
 */

import React from 'react';
import { KioskHeader } from './KioskHeader';
import { ServiceUnavailableBanner } from './ServiceUnavailableBanner';
import type { KioskStrings } from '../../i18n';

interface Props {
  strings: KioskStrings;
  serviceAvailable?: boolean;
  onChangeLanguage: () => void;
  onStartOver: () => void;
  children: React.ReactNode;
}

export function KioskShell({
  strings,
  serviceAvailable = true,
  onChangeLanguage,
  onStartOver,
  children,
}: Props) {
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
      {/* Persistent top bar */}
      <KioskHeader
        strings={strings}
        onChangeLanguage={onChangeLanguage}
        onStartOver={onStartOver}
      />

      {/* Main viewport */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px 32px',
          overflowY: 'auto',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        }}
      >
        {!serviceAvailable && (
          <div style={{ width: '100%', maxWidth: '640px', marginBottom: '16px' }}>
            <ServiceUnavailableBanner strings={strings} />
          </div>
        )}

        {children}
      </main>
    </div>
  );
}
