/**
 * PrimarySpeakButton
 *
 * Visually dominant action button for the kiosk voice interaction.
 * Supports visual states:
 *   - 'idle': Standard large green button with 🎤 icon
 *   - 'listening': Animated ripple / pulse indicator with "Listening..." text
 *   - 'processing': Activity spinner / loader with "Processing..." text
 *   - 'error': Error warning state with "Unable to process. Try again." text
 *
 * Designed for 180–220px touch target on landscape kiosks.
 */

import type { SpeakButtonState } from '../../types';
import type { KioskStrings } from '../../i18n';

interface Props {
  state?: SpeakButtonState;
  strings: KioskStrings;
  onClick: () => void;
  disabled?: boolean;
}

export function PrimarySpeakButton({
  state = 'idle',
  strings,
  onClick,
  disabled = false,
}: Props) {
  const getIcon = () => {
    switch (state) {
      case 'listening':
        return '🎙️';
      case 'processing':
        return '⏳';
      case 'error':
        return '⚠️';
      case 'idle':
      default:
        return '🎤';
    }
  };

  const getLabel = () => {
    switch (state) {
      case 'listening':
        return strings.stateListening;
      case 'processing':
        return strings.stateProcessing;
      case 'error':
        return strings.stateErrorTryAgain;
      case 'idle':
      default:
        return strings.actionSpeak;
    }
  };

  const getBackgroundColor = () => {
    switch (state) {
      case 'listening':
        return '#047857'; // vibrant emerald
      case 'processing':
        return '#0369a1'; // ocean blue
      case 'error':
        return '#b91c1c'; // error red
      case 'idle':
      default:
        return '#15803d'; // SahkaarSetu green
    }
  };

  const getBorderColor = () => {
    switch (state) {
      case 'listening':
        return '#34d399';
      case 'processing':
        return '#38bdf8';
      case 'error':
        return '#fca5a5';
      case 'idle':
      default:
        return '#166534';
    }
  };

  return (
    <div style={{ position: 'relative', display: 'inline-flex', justifyContent: 'center', alignItems: 'center' }}>
      {/* Listening animated ripple ring */}
      {state === 'listening' && (
        <span
          style={{
            position: 'absolute',
            width: '230px',
            height: '230px',
            borderRadius: '50%',
            backgroundColor: 'rgba(21, 128, 61, 0.25)',
            animation: 'kiosk-ripple 1.6s ease-out infinite',
            zIndex: 0,
          }}
          aria-hidden="true"
        />
      )}

      <button
        type="button"
        onClick={onClick}
        disabled={disabled || state === 'processing'}
        aria-label={`${strings.actionSpeak} - ${getLabel()}`}
        aria-live="polite"
        style={{
          position: 'relative',
          zIndex: 1,
          width: '200px',
          height: '200px',
          borderRadius: '50%',
          backgroundColor: getBackgroundColor(),
          border: `5px solid ${getBorderColor()}`,
          color: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '16px',
          boxSizing: 'border-box',
          cursor: disabled ? 'not-allowed' : 'pointer',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease',
          touchAction: 'manipulation',
          userSelect: 'none',
        }}
      >
        <span
          style={{
            fontSize: '52px',
            lineHeight: 1,
            animation: state === 'listening' ? 'kiosk-pulse 1.2s infinite' : 'none',
          }}
          aria-hidden="true"
        >
          {getIcon()}
        </span>

        <span
          style={{
            fontSize: state === 'error' ? '15px' : '22px',
            fontWeight: 800,
            textAlign: 'center',
            lineHeight: 1.2,
            maxWidth: '160px',
          }}
        >
          {getLabel()}
        </span>
      </button>

      <style>{`
        @keyframes kiosk-ripple {
          0% {
            transform: scale(0.9);
            opacity: 0.8;
          }
          100% {
            transform: scale(1.3);
            opacity: 0;
          }
        }
        @keyframes kiosk-pulse {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.12);
          }
        }
      `}</style>
    </div>
  );
}
