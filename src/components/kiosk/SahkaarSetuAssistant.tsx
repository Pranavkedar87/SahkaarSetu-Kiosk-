/**
 * SahkaarSetuAssistant.tsx
 *
 * Interactive AI Guide interface for the SahkaarSetu Kiosk.
 * Displays:
 *   - Citizen Transcript Pill (when citizen speaks via STT)
 *   - Glassmorphic AI Assistant HUD Card with live greeting, thinking indicator, and answers
 *   - Stop Audio / Replay controls during playback
 */

import React from 'react';
import type { KioskStrings } from '../../i18n';
import type { VoiceFailureLayer } from '../../types';

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error' | 'success';

interface Props {
  state?: AssistantState;
  mouthOpen?: number;          // Retained for backward-compatible interface
  strings: KioskStrings;
  speechText?: string;         // Current speech bubble / answer text
  userTranscript?: string;     // What the citizen said
  failureLayer?: VoiceFailureLayer;
  isAudioPlaying?: boolean;
  onPlayAgain?: () => void;
  onStopAudio?: () => void;
  className?: string;
  style?: React.CSSProperties;
}

export function SahkaarSetuAssistant({
  state = 'idle',
  mouthOpen = 0,
  strings,
  speechText,
  userTranscript,
  failureLayer,
  isAudioPlaying = false,
  onPlayAgain,
  onStopAudio,
  className,
  style,
}: Props) {
  // Determine speech bubble text
  const getBubbleText = () => {
    if (speechText) return speechText;
    switch (state) {
      case 'listening':
        return strings.assistantListening || "Yes, I'm listening...";
      case 'thinking':
        return strings.assistantThinking || "Let me find that for you...";
      case 'speaking':
        return strings.assistantSpeaking || "Here is what I found:";
      case 'success':
        return strings.assistantSuccess || "Glad I could help! Tap the mic to ask another question.";
      case 'error':
        return strings.assistantError || "I could not understand that. Please try again.";
      case 'idle':
      default:
        return strings.assistantGreeting || strings.homeGreeting || "Namaste! How can I help you today?";
    }
  };

  return (
    <div
      className={className}
      data-testid="sahkaarsetu-assistant"
      data-assistant-state={state}
      data-failure-layer={failureLayer || undefined}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        width: '100%',
        maxWidth: '460px',
        userSelect: 'none',
        ...style,
      }}
    >
      {/* ── USER TRANSCRIPT PILL (When citizen spoke) ────────────────────────── */}
      {userTranscript && (
        <div
          data-testid="assistant-transcript-bubble"
          style={{
            position: 'relative',
            zIndex: 10,
            background: 'rgba(254, 243, 199, 0.94)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            borderRadius: '16px',
            border: '1.5px solid rgba(245, 158, 11, 0.4)',
            padding: '6px 14px',
            marginBottom: '8px',
            maxWidth: '380px',
            width: '92%',
            boxShadow: '0 4px 14px rgba(245, 158, 11, 0.15)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            animation: 'homeFadeInUp 0.35s ease-out both',
          }}
        >
          <span style={{ fontSize: '15px' }} aria-hidden="true">👤</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {strings.assistantYouSaid || 'You said'}
            </span>
            <span style={{ fontSize: '11px', fontWeight: 800, color: '#b45309' }}>:</span>
            <span
              style={{
                marginLeft: '6px',
                fontSize: '13px',
                fontWeight: 600,
                color: '#78350f',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'inline-block',
                verticalAlign: 'bottom',
                maxWidth: '260px',
              }}
            >
              "{userTranscript}"
            </span>
          </div>
        </div>
      )}

      {/* ── SLEEK GLASSMORPHIC SPEECH CARD ─────────────────────────────────── */}
      <div
        data-testid="assistant-speech-bubble"
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          borderRadius: '24px',
          border: '1.5px solid rgba(255, 255, 255, 0.95)',
          padding: '16px 24px',
          textAlign: 'center',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.10)',
          maxWidth: '420px',
          width: '94%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Subtle Assistant Tag */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(34, 197, 94, 0.12)',
            padding: '4px 12px',
            borderRadius: '12px',
            marginBottom: '8px',
          }}
        >
          <span style={{ fontSize: '12px' }} aria-hidden="true">🍃</span>
          <span
            style={{
              fontSize: '11px',
              fontWeight: 800,
              color: '#15803d',
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
            }}
          >
            SahkaarSetu AI Guide
          </span>
        </div>

        {/* State message or Answer */}
        {state === 'idle' ? (
          <div>
            <div
              style={{
                fontSize: '26px',
                fontWeight: 800,
                color: '#15803d',
                marginBottom: '2px',
                letterSpacing: '-0.3px',
              }}
            >
              {strings.homeGreeting || 'Namaste!'}
            </div>
            <div
              style={{
                fontSize: '15px',
                fontWeight: 600,
                color: '#1e293b',
                lineHeight: 1.35,
              }}
            >
              {strings.homeSubGreeting || 'How can I help you today?'}
            </div>
          </div>
        ) : (
          <div
            style={{
              fontSize: state === 'speaking' ? '14px' : '16px',
              fontWeight: state === 'speaking' ? 500 : 700,
              color: state === 'error' ? '#dc2626' : '#1e293b',
              lineHeight: 1.4,
              maxHeight: '130px',
              overflowY: 'auto',
              paddingRight: '4px',
            }}
          >
            {getBubbleText()}
          </div>
        )}

        {/* Visual indicators for active states */}
        {state === 'listening' && (
          <div
            data-testid="assistant-listening-wave"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '4px',
              marginTop: '8px',
              height: '18px',
            }}
          >
            {[6, 14, 20, 15, 8, 16, 12].map((h, i) => (
              <span
                key={i}
                style={{
                  width: '3.5px',
                  height: `${h}px`,
                  backgroundColor: '#22c55e',
                  borderRadius: '3px',
                  animation: `homeWaveBounce 0.8s ease-in-out infinite ${i * 0.1}s`,
                }}
              />
            ))}
          </div>
        )}

        {state === 'thinking' && (
          <div
            data-testid="assistant-thinking-indicator"
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '6px',
              marginTop: '8px',
              height: '18px',
            }}
          >
            {[0, 0.2, 0.4].map((delay, i) => (
              <span
                key={i}
                style={{
                  width: '7px',
                  height: '7px',
                  backgroundColor: '#0284c7',
                  borderRadius: '50%',
                  animation: `homePulseDot 1.2s ease-in-out infinite ${delay}s`,
                }}
              />
            ))}
          </div>
        )}

        {/* Audio controls (Stop / Listen Again) */}
        {(isAudioPlaying || onPlayAgain || onStopAudio) && (state === 'speaking' || state === 'success') && (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px',
            }}
          >
            {isAudioPlaying && onStopAudio && (
              <button
                type="button"
                onClick={onStopAudio}
                aria-label={strings.voiceStopAudio || 'Stop'}
                style={{
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  background: '#fef2f2',
                  color: '#dc2626',
                  border: '1.5px solid #fca5a5',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                ⏹ {strings.voiceStopAudio || 'Stop'}
              </button>
            )}
            {onPlayAgain && (
              <button
                type="button"
                onClick={onPlayAgain}
                aria-label={strings.voicePlayAgain || 'Play Again'}
                style={{
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: '10px',
                  background: '#f0fdf4',
                  color: '#15803d',
                  border: '1.5px solid #86efac',
                  fontSize: '12px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
              >
                🔄 {strings.voicePlayAgain || 'Play Again'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
