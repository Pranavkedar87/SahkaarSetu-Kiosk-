/**
 * KioskShell
 *
 * Global layout wrapper for kiosk screens (Home, Type, Scan, Help).
 * Provides:
 *   - Compact, persistent KioskHeader
 *   - Central content area optimized for 7-10.1" landscape touchscreens
 *   - Optional status / service unavailable banner
 */

import React, { useState, useEffect } from 'react';
import { KioskHeader } from './KioskHeader';
import { ServiceUnavailableBanner } from './ServiceUnavailableBanner';
import { AssistanceSlip } from './AssistanceSlip';
import { getActivePrintSlip, subscribeActivePrintSlip } from '../../services/printer';
import type { PrintPayload } from '../../types';
import type { KioskStrings } from '../../i18n';

interface Props {
  strings: KioskStrings;
  serviceAvailable?: boolean;
  onBack?: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
  children: React.ReactNode;
}

export function KioskShell({
  strings,
  serviceAvailable = true,
  onBack,
  onChangeLanguage,
  onStartOver,
  children,
}: Props) {
  const [activeSlip, setActiveSlip] = useState<PrintPayload | null>(getActivePrintSlip);

  useEffect(() => {
    return subscribeActivePrintSlip(setActiveSlip);
  }, []);
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

      {/* 58mm Thermal Printable Slip (styled by @media print) */}
      <AssistanceSlip slip={activeSlip} />
    </div>
  );
}
