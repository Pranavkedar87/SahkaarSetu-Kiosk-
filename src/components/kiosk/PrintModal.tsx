/**
 * PrintModal.tsx (K7)
 *
 * Touchscreen dialog displaying printing status, hardware status,
 * success confirmation, privacy notices, or retry options.
 */

import React, { useState, useEffect } from 'react';
import type { KioskStrings } from '../../i18n';
import type { PrintPayload, PrinterStatus } from '../../types';
import { printerService } from '../../services/printer';

interface Props {
  strings: KioskStrings;
  payload: PrintPayload;
  onClose: () => void;
}

export const PrintModal: React.FC<Props> = ({ strings, payload, onClose }) => {
  const [status, setStatus] = useState<'printing' | 'success' | 'failure' | 'privacy_refusal'>('printing');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [hwStatus, setHwStatus] = useState<PrinterStatus>('unavailable');

  const executePrint = async () => {
    setStatus('printing');
    setErrorMessage('');

    // Check hardware status
    try {
      const hws = await printerService.getHardwareStatus();
      setHwStatus(hws);
    } catch {
      setHwStatus('unavailable');
    }

    const res = await printerService.printAssistanceSlip(payload);

    if (res.success) {
      setStatus('success');
    } else {
      if (res.error?.toLowerCase().includes('privacy')) {
        setStatus('privacy_refusal');
        setErrorMessage(res.error);
      } else {
        setStatus('failure');
        setErrorMessage(res.error || strings.printFailed);
      }
    }
  };

  useEffect(() => {
    executePrint();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getHwStatusLabel = () => {
    if (hwStatus === 'ready') return strings.printStatusReady;
    if (hwStatus === 'unavailable' || hwStatus === 'offline') return strings.printStatusUnavailable;
    return strings.printStatusChecking;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={strings.actionPrint}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
        padding: '16px',
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '24px',
          padding: '32px 28px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.3)',
          boxSizing: 'border-box',
        }}
      >
        {/* State: Printing / Processing */}
        {status === 'printing' && (
          <div>
            <div style={{ fontSize: '48px', marginBottom: '12px' }} aria-hidden="true">
              🖨️
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#1e3a5f', margin: '0 0 8px 0' }}>
              {strings.actionPrint}…
            </h3>
            <p style={{ fontSize: '16px', color: '#475569', margin: '0 0 16px 0' }}>
              Formatting 58mm thermal assistance slip…
            </p>
            <div
              style={{
                display: 'inline-block',
                width: '36px',
                height: '36px',
                border: '4px solid #e2e8f0',
                borderTopColor: '#15803d',
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
              }}
            />
          </div>
        )}

        {/* State: Success */}
        {status === 'success' && (
          <div>
            <div style={{ fontSize: '52px', marginBottom: '12px' }} aria-hidden="true">
              ✅
            </div>
            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#15803d', margin: '0 0 8px 0' }}>
              {strings.printReady}
            </h3>
            <p style={{ fontSize: '16px', color: '#475569', margin: '0 0 20px 0', lineHeight: 1.5 }}>
              {strings.printKeepingSlipNotice}
            </p>
            <div
              style={{
                display: 'inline-block',
                backgroundColor: '#f1f5f9',
                color: '#475569',
                fontSize: '13px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              Hardware Status: {getHwStatusLabel()}
            </div>
            <div>
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  minHeight: '52px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                {strings.printDone}
              </button>
            </div>
          </div>
        )}

        {/* State: Failure */}
        {status === 'failure' && (
          <div>
            <div style={{ fontSize: '52px', marginBottom: '12px' }} aria-hidden="true">
              ⚠️
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#b91c1c', margin: '0 0 8px 0' }}>
              {strings.printFailed}
            </h3>
            {errorMessage && errorMessage !== strings.printFailed && (
              <p style={{ fontSize: '15px', color: '#475569', margin: '0 0 16px 0' }}>
                {errorMessage}
              </p>
            )}
            <div
              style={{
                display: 'inline-block',
                backgroundColor: '#fef2f2',
                color: '#991b1b',
                fontSize: '13px',
                fontWeight: 600,
                padding: '6px 12px',
                borderRadius: '8px',
                marginBottom: '20px',
              }}
            >
              Status: {getHwStatusLabel()}
            </div>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  flex: 1,
                  minHeight: '52px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '2px solid #cbd5e1',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                {strings.printDone}
              </button>
              <button
                type="button"
                onClick={executePrint}
                style={{
                  flex: 1,
                  minHeight: '52px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '16px',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                🔄 {strings.printTryAgain}
              </button>
            </div>
          </div>
        )}

        {/* State: Privacy Refusal */}
        {status === 'privacy_refusal' && (
          <div>
            <div style={{ fontSize: '52px', marginBottom: '12px' }} aria-hidden="true">
              🛡️
            </div>
            <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#92400e', margin: '0 0 10px 0' }}>
              Privacy Protection
            </h3>
            <p style={{ fontSize: '16px', color: '#78350f', margin: '0 0 24px 0', lineHeight: 1.5 }}>
              {strings.printPrivacyRefusal}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                width: '100%',
                minHeight: '52px',
                backgroundColor: '#1e3a5f',
                color: '#ffffff',
                border: 'none',
                borderRadius: '14px',
                fontSize: '18px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              {strings.printDone}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
