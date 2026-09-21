/**
 * AssistanceSlip.tsx (K7)
 *
 * Dedicated 58mm thermal printable slip component.
 * Renders into the DOM under #kiosk-thermal-slip for @media print CSS.
 *
 * Characteristics:
 *   - Exactly 58mm width (54mm printable area)
 *   - Monospace typography for thermal head clarity
 *   - High contrast black-and-white
 *   - Crisp SVG verification QR code
 *   - Dashed dividers and clear content hierarchy
 *   - End-of-slip cut line
 */

import React, { useMemo } from 'react';
import type { PrintPayload } from '../../types';
import { generateQrSvg } from '../../utils/qrGenerator';

interface Props {
  slip: PrintPayload | null;
}

export const AssistanceSlip: React.FC<Props> = ({ slip }) => {
  if (!slip) return null;

  const qrSvg = useMemo(() => {
    if (!slip.qrPayload) return null;
    try {
      return generateQrSvg(slip.qrPayload, {
        size: 110,
        margin: 2,
        fgColor: '#000000',
        bgColor: '#FFFFFF',
      });
    } catch {
      return null;
    }
  }, [slip.qrPayload]);

  return (
    <div id="kiosk-thermal-slip" className="kiosk-thermal-slip">
      {/* Emblem & Header */}
      <div className="slip-header" style={{ textAlign: 'center', marginBottom: '4px' }}>
        <div style={{ fontSize: '18px', lineHeight: 1 }} aria-hidden="true">
          🏛️
        </div>
        <div style={{ fontSize: '12pt', fontWeight: 900, letterSpacing: '0.5px' }}>
          SAHKAARSETU
        </div>
        <div style={{ fontSize: '11pt', fontWeight: 800 }}>
          सहकारसेतू
        </div>
        <div style={{ fontSize: '7pt', textTransform: 'uppercase', marginTop: '2px', color: '#000' }}>
          {slip.subTitle || 'Assistance Reference Slip / सेवा संदर्भ पावती'}
        </div>
      </div>

      <div className="slip-dashed-divider" />

      {/* Prominent Reference Code Box */}
      <div
        className="slip-ref-box"
        style={{
          textAlign: 'center',
          padding: '3px 0',
          border: '1px dashed #000',
          margin: '4px 0',
        }}
      >
        <div style={{ fontSize: '7pt', textTransform: 'uppercase' }}>
          Reference Number / संदर्भ क्रमांक
        </div>
        <div style={{ fontSize: '11pt', fontWeight: 900, letterSpacing: '1px' }}>
          {slip.referenceCode}
        </div>
        <div style={{ fontSize: '6.5pt', marginTop: '1px' }}>
          {slip.createdAt}
        </div>
      </div>

      <div className="slip-dashed-divider" />

      {/* Society / Language Metadata */}
      <div className="slip-meta-table" style={{ fontSize: '7pt', margin: '4px 0' }}>
        {slip.pacsName && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>PACS:</span>
            <span>{slip.pacsName}</span>
          </div>
        )}
        {slip.village && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>Village:</span>
            <span>{slip.village}</span>
          </div>
        )}
        {slip.category && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700 }}>Category:</span>
            <span>{slip.category}</span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontWeight: 700 }}>Language:</span>
          <span>{slip.language.toUpperCase()}</span>
        </div>
      </div>

      {/* Citizen Question / Request */}
      {slip.question && (
        <>
          <div className="slip-dashed-divider" />
          <div style={{ margin: '4px 0' }}>
            <div style={{ fontSize: '7pt', fontWeight: 900, textTransform: 'uppercase' }}>
              Citizen Question / प्रश्न:
            </div>
            <div
              style={{
                fontSize: '7.5pt',
                lineHeight: 1.3,
                fontStyle: 'italic',
                padding: '2px 0 2px 4px',
                borderLeft: '1.5px solid #000',
                marginTop: '2px',
              }}
            >
              {slip.question}
            </div>
          </div>
        </>
      )}

      {/* Grounded Guidance */}
      <div className="slip-dashed-divider" />
      <div style={{ margin: '4px 0' }}>
        <div style={{ fontSize: '7pt', fontWeight: 900, textTransform: 'uppercase' }}>
          Guidance / मार्गदर्शन:
        </div>
        <div
          style={{
            fontSize: '7.5pt',
            lineHeight: 1.3,
            whiteSpace: 'pre-line',
            padding: '2px 0',
          }}
        >
          {slip.guidance}
        </div>
      </div>

      {/* Source Citations */}
      {slip.sources && slip.sources.length > 0 && (
        <div style={{ margin: '4px 0' }}>
          <div style={{ fontSize: '6.5pt', fontWeight: 700 }}>Official References:</div>
          <div style={{ fontSize: '6.5pt' }}>
            {slip.sources.map((src, idx) => (
              <div key={idx}>• {src}</div>
            ))}
          </div>
        </div>
      )}

      {/* Verification QR Code */}
      {qrSvg && (
        <>
          <div className="slip-dashed-divider" />
          <div style={{ textAlign: 'center', margin: '4px 0' }}>
            <div
              style={{ display: 'inline-block' }}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div style={{ fontSize: '6.5pt', marginTop: '2px', fontWeight: 600 }}>
              Scan to verify guidance online
            </div>
          </div>
        </>
      )}

      <div className="slip-dashed-divider" />

      {/* Footer Disclaimer & Cut Line */}
      <div style={{ textAlign: 'center', fontSize: '6.5pt', margin: '4px 0 6px 0' }}>
        <div>{slip.disclaimer || 'Please keep this slip for reference.'}</div>
        <div style={{ marginTop: '2px', fontWeight: 700 }}>
          Ministry of Cooperation — SIH26088
        </div>
      </div>

      <div style={{ textAlign: 'center', fontSize: '6pt', letterSpacing: '1px' }}>
        - - - - - END OF SLIP - - - - -
      </div>
    </div>
  );
};
