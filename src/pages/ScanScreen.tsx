/**
 * ScanScreen
 *
 * Document scanning shell (ready for future K6 integration).
 * Features:
 *   - Camera frame viewfinder placeholder
 *   - [ Open Camera ] action button
 *   - [ Upload Document ] secondary action button
 *   - [ Back ] button to return to Home
 *   - Visual state indicators (idle, active preview, captured, processing)
 */

import { useState } from 'react';
import { KioskShell } from '../components/kiosk/KioskShell';
import type { KioskStrings } from '../i18n';
import type { ScanViewState } from '../types';

interface Props {
  strings: KioskStrings;
  serviceAvailable: boolean;
  onBack: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
}

export function ScanScreen({
  strings,
  serviceAvailable,
  onBack,
  onChangeLanguage,
  onStartOver,
}: Props) {
  const [scanState, setScanState] = useState<ScanViewState>('idle');

  const handleOpenCamera = () => {
    setScanState('camera_active');
  };

  const handleCapture = () => {
    setScanState('captured');
  };

  const handleUpload = () => {
    setScanState('captured');
  };

  const handleRetake = () => {
    setScanState('idle');
  };

  return (
    <KioskShell
      strings={strings}
      serviceAvailable={serviceAvailable}
      onChangeLanguage={onChangeLanguage}
      onStartOver={onStartOver}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          width: '100%',
          maxWidth: '680px',
          margin: '0 auto',
        }}
      >
        <h2
          style={{
            fontSize: '32px',
            fontWeight: 800,
            color: '#1e3a5f',
            margin: 0,
            textAlign: 'center',
          }}
        >
          {strings.scanDocument}
        </h2>

        <p
          style={{
            fontSize: '18px',
            color: '#475569',
            margin: 0,
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          {strings.scanInstruction}
        </p>

        {/* Viewfinder Frame Container */}
        <div
          role="region"
          aria-label="Document Viewfinder"
          style={{
            width: '100%',
            height: '240px',
            backgroundColor: scanState === 'camera_active' ? '#0f172a' : '#f1f5f9',
            border: '3px dashed #94a3b8',
            borderRadius: '20px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {scanState === 'idle' && (
            <>
              <span style={{ fontSize: '48px' }} aria-hidden="true">📷</span>
              <span style={{ fontSize: '18px', color: '#64748b', fontWeight: 600 }}>
                {strings.scanInstruction}
              </span>
            </>
          )}

          {scanState === 'camera_active' && (
            <div style={{ textAlign: 'center', color: '#ffffff' }}>
              <div style={{ fontSize: '44px', marginBottom: '8px' }} aria-hidden="true">📹</div>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>
                Camera Active (Preview Placeholder)
              </p>
            </div>
          )}

          {scanState === 'captured' && (
            <div style={{ textAlign: 'center', color: '#15803d' }}>
              <div style={{ fontSize: '44px', marginBottom: '8px' }} aria-hidden="true">✅</div>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>
                Document Captured
              </p>
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div
          style={{
            display: 'flex',
            gap: '16px',
            width: '100%',
            flexWrap: 'wrap',
          }}
        >
          <button
            type="button"
            onClick={onBack}
            style={{
              flex: '1 1 120px',
              minHeight: '56px',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              border: '2px solid #cbd5e1',
              borderRadius: '14px',
              fontSize: '18px',
              fontWeight: 700,
              cursor: 'pointer',
              touchAction: 'manipulation',
            }}
          >
            ← {strings.actionBack}
          </button>

          {scanState === 'idle' && (
            <>
              <button
                type="button"
                onClick={handleOpenCamera}
                style={{
                  flex: '2 1 200px',
                  minHeight: '56px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  boxShadow: '0 4px 16px rgba(21, 128, 61, 0.25)',
                }}
              >
                📷 {strings.actionOpenCamera}
              </button>

              <button
                type="button"
                onClick={handleUpload}
                style={{
                  flex: '2 1 180px',
                  minHeight: '56px',
                  backgroundColor: '#ffffff',
                  color: '#1e3a5f',
                  border: '2px solid #cbd5e1',
                  borderRadius: '14px',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                📁 {strings.actionUploadDocument}
              </button>
            </>
          )}

          {scanState === 'camera_active' && (
            <button
              type="button"
              onClick={handleCapture}
              style={{
                flex: '3 1 240px',
                minHeight: '56px',
                backgroundColor: '#15803d',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '20px',
                fontWeight: 800,
                cursor: 'pointer',
                touchAction: 'manipulation',
                boxShadow: '0 4px 16px rgba(21, 128, 61, 0.3)',
              }}
            >
              📸 {strings.actionCapture}
            </button>
          )}

          {scanState === 'captured' && (
            <button
              type="button"
              onClick={handleRetake}
              style={{
                flex: '3 1 240px',
                minHeight: '56px',
                backgroundColor: '#ffffff',
                color: '#15803d',
                border: '2px solid #15803d',
                borderRadius: '14px',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
                touchAction: 'manipulation',
              }}
            >
              🔄 Retake Document
            </button>
          )}
        </div>
      </div>
    </KioskShell>
  );
}
