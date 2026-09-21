/**
 * SahkaarSetuAssistant.tsx
 *
 * Semi-realistic, 2.5D layered animated vector character for the SahkaarSetu Kiosk.
 * Visual Identity: Warm, approachable Indian woman in rural Maharashtra cooperative context
 * modeled directly after Reference B.
 *
 * Separable animated regions:
 *   - HEAD: Subtle tilt on listening/thinking, gentle idle sway
 *   - EYES: Natural blinking, almond eyes with kajal, dynamic pupil gaze tracking
 *   - EYEBROWS: Micro-shifts on listening/thinking
 *   - MOUTH: 4-tier amplitude-driven lip-sync interpolation (closed, slight, medium, open)
 *   - HAIR: Lustrous dark brown waves with sunlight highlights, traditional gold jhumkas
 *   - BODY: Subtle breathing cycle, cream embroidered kurta + emerald green dupatta with zari border
 *   - SPEECH BUBBLE: Glassmorphic bubble with leaf icon, live transcript, governed answer, controls
 *
 * 100% Vector SVG + GPU-accelerated CSS transforms. Lightweight and optimized for Raspberry Pi 5.
 */

import React, { useState, useEffect } from 'react';
import type { KioskStrings } from '../../i18n';

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error' | 'success';

interface Props {
  state?: AssistantState;
  mouthOpen?: number;          // 0 (closed) to 1 (fully open)
  strings: KioskStrings;
  speechText?: string;         // Current speech bubble / answer text
  userTranscript?: string;     // What the citizen said
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
  isAudioPlaying = false,
  onPlayAgain,
  onStopAudio,
  className,
  style,
}: Props) {
  // Natural blinking cycle: random intervals between 2.5s and 4.8s
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        const nextInterval = 2500 + Math.random() * 2300;
        blinkTimeout = setTimeout(triggerBlink, nextInterval);
      }, 150);
    };

    blinkTimeout = setTimeout(triggerBlink, 2800);
    return () => clearTimeout(blinkTimeout);
  }, []);

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

  // State-based head tilt / gesture
  const getHeadTransform = () => {
    switch (state) {
      case 'listening':
        return 'translate(0px, -2px) rotate(-1.5deg)';
      case 'thinking':
        return 'translate(2px, -4px) rotate(2.2deg)';
      case 'speaking':
        return 'translate(0px, 0px) rotate(0.4deg)';
      case 'error':
        return 'translate(-1px, 1px) rotate(-1.2deg)';
      case 'success':
        return 'translate(0px, -1px) rotate(0.8deg)';
      case 'idle':
      default:
        return 'translate(0px, 0px)';
    }
  };

  // Eyebrow vertical offset based on state
  const getEyebrowY = () => {
    switch (state) {
      case 'listening':
        return -2.5; // attentively raised
      case 'thinking':
        return -1.8;
      case 'error':
        return 1.2;  // concerned
      default:
        return 0;
    }
  };

  // Pupil gaze tracking
  const getPupilOffset = () => {
    switch (state) {
      case 'thinking':
        return { x: 2.2, y: -2.2 }; // looking up thoughtfully
      case 'listening':
        return { x: 0, y: 0 };      // focused directly forward on citizen
      case 'speaking':
        return { x: 0.5, y: 0.5 };
      default:
        return { x: 0, y: 0 };
    }
  };

  const pupil = getPupilOffset();
  const clampedMouth = Math.max(0, Math.min(1, mouthOpen));

  return (
    <div
      className={className}
      data-testid="sahkaarsetu-assistant"
      data-assistant-state={state}
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

      {/* ── SLEEK GLASSMORPHIC SPEECH BUBBLE ─────────────────────────────────── */}
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
          padding: '14px 22px',
          textAlign: 'center',
          boxShadow: '0 12px 36px rgba(0, 0, 0, 0.10)',
          marginBottom: '10px',
          maxWidth: '410px',
          width: '94%',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        {/* Subtle Assistant Tag with Leaf Icon */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'rgba(34, 197, 94, 0.12)',
            padding: '3px 10px',
            borderRadius: '12px',
            marginBottom: '6px',
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

        {/* Speech bubble tail pointing to assistant */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: '-9px',
            left: '50%',
            transform: 'translateX(-50%)',
            width: '18px',
            height: '9px',
            clipPath: 'polygon(50% 100%, 0 0, 100% 0)',
            backgroundColor: 'rgba(255, 255, 255, 0.94)',
          }}
        />
      </div>

      {/* ── 2.5D ILLUSTRATED LAYERED ANIMATED CHARACTER (REFERENCE B) ────────── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '350px',
          height: '330px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          overflow: 'visible',
        }}
      >
        {/* Soft Ambient State Glow */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '25px',
            width: '280px',
            height: '280px',
            borderRadius: '50%',
            background:
              state === 'listening'
                ? 'radial-gradient(circle, rgba(34, 197, 94, 0.32) 0%, transparent 70%)'
                : state === 'thinking'
                ? 'radial-gradient(circle, rgba(2, 132, 199, 0.28) 0%, transparent 70%)'
                : state === 'speaking'
                ? 'radial-gradient(circle, rgba(234, 88, 12, 0.26) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(21, 128, 61, 0.18) 0%, transparent 70%)',
            transition: 'background 0.3s ease',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <svg
          viewBox="0 0 320 370"
          width="100%"
          height="100%"
          style={{
            overflow: 'visible',
            position: 'relative',
            zIndex: 1,
            filter: 'drop-shadow(0 14px 26px rgba(0,0,0,0.14))',
          }}
          aria-label="SahkaarSetu Virtual Assistant Character"
        >
          <defs>
            {/* Skin Shading Gradient (Warm Honey-Wheat Indian Complexion) */}
            <linearGradient id="skinBase" x1="20%" y1="0%" x2="80%" y2="100%">
              <stop offset="0%" stopColor="#f8cbb0" />
              <stop offset="45%" stopColor="#eeae89" />
              <stop offset="85%" stopColor="#df9770" />
              <stop offset="100%" stopColor="#cb8560" />
            </linearGradient>

            {/* Neck Depth Gradient */}
            <linearGradient id="neckGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d58b62" />
              <stop offset="60%" stopColor="#bf774f" />
              <stop offset="100%" stopColor="#a9643d" />
            </linearGradient>

            {/* Hair Base & Highlights */}
            <linearGradient id="hairBase" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2e1910" />
              <stop offset="40%" stopColor="#1a0e08" />
              <stop offset="100%" stopColor="#0d0704" />
            </linearGradient>
            <linearGradient id="hairHighlight" x1="30%" y1="0%" x2="70%" y2="100%">
              <stop offset="0%" stopColor="#523223" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#3d2216" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#22120b" stopOpacity="0" />
            </linearGradient>

            {/* Kurta Fabric (Cream / Ivory with Gold Warmth) */}
            <linearGradient id="kurtaFabric" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fffdfa" />
              <stop offset="50%" stopColor="#f7f2ea" />
              <stop offset="100%" stopColor="#eee5d6" />
            </linearGradient>

            {/* Saree / Dupatta Emerald Green */}
            <linearGradient id="sareeEmerald" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#15803d" />
              <stop offset="50%" stopColor="#166534" />
              <stop offset="100%" stopColor="#14532d" />
            </linearGradient>

            {/* Gold Zari Border */}
            <linearGradient id="goldZari" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#ca8a04" />
            </linearGradient>

            {/* SahkaarSetu Lanyard Ribbon */}
            <linearGradient id="lanyardGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#047857" />
              <stop offset="100%" stopColor="#065f46" />
            </linearGradient>

            {/* Iris Gradient */}
            <radialGradient id="irisGrad" cx="40%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#5c3822" />
              <stop offset="60%" stopColor="#3d2112" />
              <stop offset="100%" stopColor="#1e0f07" />
            </radialGradient>
          </defs>

          {/* ── LAYER 1: Torso, Kurta, Lanyard & Saree (Breathing cycle) ──────── */}
          <g
            id="torso-layer"
            style={{
              animation: 'assistantBreathe 4s ease-in-out infinite',
              transformOrigin: '160px 350px',
            }}
          >
            {/* Shoulders & Main Kurta Body */}
            <path
              d="M 52,370 L 68,268 Q 110,240 160,240 Q 210,240 252,268 L 268,370 Z"
              fill="url(#kurtaFabric)"
              stroke="#e2d8c6"
              strokeWidth="1.2"
            />

            {/* Delicate Kurta Gold Embroidery Pattern */}
            <g stroke="#d4af37" strokeWidth="1" fill="none" opacity="0.6">
              <path d="M 125,270 Q 130,280 135,270 Q 140,280 145,270" />
              <path d="M 175,270 Q 180,280 185,270 Q 190,280 195,270" />
              <path d="M 128,300 Q 133,310 138,300 Q 143,310 148,300" />
              <path d="M 172,300 Q 177,310 182,300 Q 187,310 192,300" />
            </g>

            {/* Kurta Placket & Collar */}
            <path
              d="M 148,240 L 148,315 L 172,315 L 172,240 Z"
              fill="#f5efe4"
              stroke="#d5c8b2"
              strokeWidth="1"
            />
            {/* Buttons */}
            <circle cx="160" cy="265" r="2.2" fill="#ca8a04" />
            <circle cx="160" cy="285" r="2.2" fill="#ca8a04" />
            <circle cx="160" cy="305" r="2.2" fill="#ca8a04" />

            {/* SahkaarSetu Green Lanyard around Neck */}
            <path
              d="M 132,242 L 148,340 L 158,340 L 140,242 Z"
              fill="url(#lanyardGrad)"
            />
            <path
              d="M 188,242 L 172,340 L 162,340 L 180,242 Z"
              fill="url(#lanyardGrad)"
            />
            {/* Lanyard Badge Clip */}
            <rect x="153" y="338" width="14" height="18" rx="2" fill="#e2e8f0" stroke="#94a3b8" strokeWidth="1" />
            <rect x="156" y="342" width="8" height="10" rx="1" fill="#15803d" />

            {/* Emerald Green Saree Pallu / Dupatta with Zari on Left Shoulder */}
            <path
              d="M 210,242 Q 235,255 258,280 L 268,370 L 220,370 Q 212,300 205,244 Z"
              fill="url(#sareeEmerald)"
            />
            {/* Zari Gold Border along Pallu Edge */}
            <path
              d="M 205,244 Q 212,300 220,370 L 227,370 Q 218,300 212,244 Z"
              fill="url(#goldZari)"
            />
            {/* Gold Leaf Motif on Pallu */}
            <circle cx="236" cy="310" r="3" fill="#fde047" opacity="0.8" />
            <circle cx="246" cy="335" r="3" fill="#fde047" opacity="0.8" />
          </g>

          {/* ── LAYER 2: Neck & Graceful Shadow ───────────────────────────────── */}
          <g id="neck-layer">
            <path
              d="M 143,188 L 143,244 Q 160,252 177,244 L 177,188 Z"
              fill="url(#skinBase)"
            />
            {/* Soft Shadow under Chin */}
            <path
              d="M 143,188 Q 160,206 177,188 L 177,196 Q 160,214 143,196 Z"
              fill="url(#neckGrad)"
              opacity="0.75"
            />
            {/* Subtle Gold Chain at Collar */}
            <path
              d="M 144,232 Q 160,244 176,232"
              fill="none"
              stroke="#eab308"
              strokeWidth="1.2"
              strokeDasharray="2,2"
            />
          </g>

          {/* ── LAYER 3: Back Hair Bun / Mass ─────────────────────────────────── */}
          <g id="back-hair">
            <ellipse cx="160" cy="130" rx="72" ry="78" fill="url(#hairBase)" />
          </g>

          {/* ── LAYER 4: Head & Beautiful Facial Anatomy (Pivot for tilt) ─────── */}
          <g
            id="head-layer"
            style={{
              transform: getHeadTransform(),
              transformOrigin: '160px 195px',
              transition: 'transform 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Natural Jawline / Face Contour */}
            <path
              d="M 104,124 Q 104,66 160,66 Q 216,66 216,124 Q 216,180 160,198 Q 104,180 104,124 Z"
              fill="url(#skinBase)"
            />

            {/* Delicate Jawline Ambient Shadow */}
            <path
              d="M 112,142 Q 110,175 160,198 Q 210,175 208,142 Q 214,178 160,196 Q 106,178 112,142 Z"
              fill="#cb8560"
              opacity="0.35"
            />

            {/* Soft Rosy Peach Cheeks */}
            <ellipse cx="126" cy="148" rx="16" ry="9" fill="#fb7185" opacity="0.18" />
            <ellipse cx="194" cy="148" rx="16" ry="9" fill="#fb7185" opacity="0.18" />

            {/* Ears */}
            <ellipse cx="102" cy="138" rx="7" ry="13" fill="#e2a37e" />
            <ellipse cx="218" cy="138" rx="7" ry="13" fill="#e2a37e" />

            {/* Traditional Gold Jhumka Earrings (Reference B) */}
            <g id="earring-left">
              <circle cx="102" cy="148" r="3" fill="url(#goldZari)" />
              <path d="M 98,153 Q 102,151 106,153 L 105,160 Q 102,162 99,160 Z" fill="url(#goldZari)" />
              {/* Pearl droplets */}
              <circle cx="99" cy="162" r="1.2" fill="#fff" />
              <circle cx="102" cy="163" r="1.2" fill="#fff" />
              <circle cx="105" cy="162" r="1.2" fill="#fff" />
            </g>
            <g id="earring-right">
              <circle cx="218" cy="148" r="3" fill="url(#goldZari)" />
              <path d="M 214,153 Q 218,151 222,153 L 221,160 Q 218,162 215,160 Z" fill="url(#goldZari)" />
              {/* Pearl droplets */}
              <circle cx="215" cy="162" r="1.2" fill="#fff" />
              <circle cx="218" cy="163" r="1.2" fill="#fff" />
              <circle cx="221" cy="162" r="1.2" fill="#fff" />
            </g>

            {/* Natural Front Hair Waves & Parting (Reference B) */}
            <path
              d="M 102,122 Q 116,72 160,68 Q 204,72 218,122 Q 192,84 160,88 Q 128,84 102,122 Z"
              fill="url(#hairBase)"
            />
            {/* Left Soft Sweep Fringe */}
            <path
              d="M 104,116 Q 122,86 160,88 Q 124,112 108,136 Z"
              fill="url(#hairBase)"
            />
            {/* Right Soft Waves */}
            <path
              d="M 216,116 Q 198,86 160,88 Q 196,112 212,136 Z"
              fill="url(#hairBase)"
            />
            {/* Hair Sunlight Sheen */}
            <path
              d="M 132,74 Q 160,72 188,74 Q 160,80 132,74 Z"
              fill="url(#hairHighlight)"
            />

            {/* Traditional Maroon Bindi with Gold Accent */}
            <circle cx="160" cy="114" r="3" fill="#881337" />
            <circle cx="160" cy="114" r="1.2" fill="#fde047" opacity="0.8" />

            {/* ── Expressive Eyebrows (Reference B) ────────────────────────── */}
            <g
              id="eyebrows"
              style={{
                transform: `translateY(${getEyebrowY()}px)`,
                transition: 'transform 0.25s ease',
              }}
            >
              {/* Left Eyebrow - elegantly arched */}
              <path
                d="M 122,116 Q 136,110 148,115"
                fill="none"
                stroke="#1c0f0a"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
              {/* Right Eyebrow */}
              <path
                d="M 172,115 Q 184,110 198,116"
                fill="none"
                stroke="#1c0f0a"
                strokeWidth="2.6"
                strokeLinecap="round"
              />
            </g>

            {/* ── Realistic Almond Eyes with Kajal (Blinking) ──────────────── */}
            <g id="eyes">
              {/* Left Eye */}
              <g
                style={{
                  transform: isBlinking ? 'scaleY(0.08)' : 'scaleY(1)',
                  transformOrigin: '136px 128px',
                  transition: 'transform 0.08s ease',
                }}
              >
                {/* Sclera / Eye White with subtle lid shadow */}
                <path
                  d="M 121,128 Q 136,118 151,128 Q 136,137 121,128 Z"
                  fill="#fbfbfa"
                  stroke="#26150d"
                  strokeWidth="1.2"
                />
                {/* Iris */}
                <circle cx={136 + pupil.x} cy={128 + pupil.y} r="5.6" fill="url(#irisGrad)" />
                {/* Pupil */}
                <circle cx={136 + pupil.x} cy={128 + pupil.y} r="2.8" fill="#080402" />
                {/* Glossy Catchlight Reflection */}
                <circle cx={134.5 + pupil.x} cy={126 + pupil.y} r="1.6" fill="#ffffff" />
                <circle cx={138 + pupil.x} cy={130 + pupil.y} r="0.8" fill="#ffffff" opacity="0.6" />
                {/* Upper Kajal Eyelash Line with winged flick */}
                <path
                  d="M 119,128 Q 136,117 153,127"
                  fill="none"
                  stroke="#120905"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </g>

              {/* Right Eye */}
              <g
                style={{
                  transform: isBlinking ? 'scaleY(0.08)' : 'scaleY(1)',
                  transformOrigin: '184px 128px',
                  transition: 'transform 0.08s ease',
                }}
              >
                {/* Sclera / Eye White */}
                <path
                  d="M 169,128 Q 184,118 199,128 Q 184,137 169,128 Z"
                  fill="#fbfbfa"
                  stroke="#26150d"
                  strokeWidth="1.2"
                />
                {/* Iris */}
                <circle cx={184 + pupil.x} cy={128 + pupil.y} r="5.6" fill="url(#irisGrad)" />
                {/* Pupil */}
                <circle cx={184 + pupil.x} cy={128 + pupil.y} r="2.8" fill="#080402" />
                {/* Glossy Catchlight */}
                <circle cx={182.5 + pupil.x} cy={126 + pupil.y} r="1.6" fill="#ffffff" />
                <circle cx={186 + pupil.x} cy={130 + pupil.y} r="0.8" fill="#ffffff" opacity="0.6" />
                {/* Upper Kajal Eyelash Line */}
                <path
                  d="M 167,127 Q 184,117 201,128"
                  fill="none"
                  stroke="#120905"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                />
              </g>
            </g>

            {/* ── Sculpted Nose with Tip Highlight ─────────────────────────── */}
            <path
              d="M 158,128 L 157,148 Q 160,154 163,148"
              fill="none"
              stroke="#cb8560"
              strokeWidth="2"
              strokeLinecap="round"
            />
            {/* Delicate Nostril Shadows */}
            <ellipse cx="154" cy="150" rx="2.2" ry="1.2" fill="#b46d45" opacity="0.6" />
            <ellipse cx="166" cy="150" rx="2.2" ry="1.2" fill="#b46d45" opacity="0.6" />
            {/* Nose Tip Soft Highlight */}
            <circle cx="160" cy="148" r="2.2" fill="#ffebd9" opacity="0.4" />

            {/* ── 4-Tier Amplitude-Driven Lip-Sync Mouth (Reference B) ─────── */}
            <g id="mouth" style={{ transform: 'translate(160px, 170px)' }}>
              {clampedMouth === 0 ? (
                /* Natural warm smile (Reference B) */
                <g id="mouth-closed-smile">
                  {/* Upper Lip with Cupid's Bow */}
                  <path
                    d="M -16,-1 Q -8,-5 0,-2 Q 8,-5 16,-1 Q 8,-2 0,0 Q -8,-2 -16,-1 Z"
                    fill="#be4b58"
                  />
                  {/* Lower Lip fullness */}
                  <path
                    d="M -16,-1 Q 0,8 16,-1 Q 0,4 -16,-1 Z"
                    fill="#cf5664"
                  />
                  {/* Subtle Smile Line Accent */}
                  <path
                    d="M -17,-2 Q -18,-1 -19,0"
                    fill="none"
                    stroke="#a33441"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M 17,-2 Q 18,-1 19,0"
                    fill="none"
                    stroke="#a33441"
                    strokeWidth="1.2"
                    strokeLinecap="round"
                  />
                  {/* Lip Gloss Highlight */}
                  <ellipse cx="0" cy="2" rx="6" ry="1.4" fill="#ffffff" opacity="0.35" />
                </g>
              ) : clampedMouth <= 0.3 ? (
                /* Small Parted Mouth (Consonants / soft vowels) */
                <g id="mouth-small-open">
                  {/* Dark Oral Cavity */}
                  <ellipse cx="0" cy="2" rx="13" ry="5" fill="#581c22" />
                  {/* Upper Teeth glimpse */}
                  <path d="M -9,0 Q 0,2 9,0 L 8,2 Q 0,4 -8,2 Z" fill="#f8fafc" />
                  {/* Upper Lip */}
                  <path d="M -16,-2 Q 0,-6 16,-2 Q 0,-1 -16,-2 Z" fill="#be4b58" />
                  {/* Lower Lip */}
                  <path d="M -15,5 Q 0,10 15,5 Q 0,6 -15,5 Z" fill="#cf5664" />
                </g>
              ) : clampedMouth <= 0.65 ? (
                /* Medium Open Mouth (Conversational vowels) */
                <g id="mouth-medium-open">
                  {/* Cavity */}
                  <ellipse cx="0" cy="3" rx="14" ry="9" fill="#4c0519" />
                  {/* Teeth */}
                  <path d="M -10,-1 Q 0,2 10,-1 L 9,3 Q 0,5 -9,3 Z" fill="#f8fafc" />
                  {/* Tongue depth */}
                  <ellipse cx="0" cy="8" rx="8" ry="4" fill="#e11d48" opacity="0.8" />
                  {/* Upper Lip */}
                  <path d="M -16,-3 Q 0,-7 16,-3 Q 0,-1 -16,-3 Z" fill="#be4b58" />
                  {/* Lower Lip */}
                  <path d="M -15,8 Q 0,14 15,8 Q 0,9 -15,8 Z" fill="#cf5664" />
                </g>
              ) : (
                /* Wide Open Mouth (Stressed syllables / open vowels) */
                <g id="mouth-wide-open">
                  {/* Deep Cavity */}
                  <ellipse cx="0" cy="4" rx="15" ry="13" fill="#3b0712" />
                  {/* Upper Teeth */}
                  <path d="M -11,-1 Q 0,3 11,-1 L 10,4 Q 0,7 -10,4 Z" fill="#f8fafc" />
                  {/* Lower Teeth & Tongue */}
                  <ellipse cx="0" cy="11" rx="9" ry="5" fill="#e11d48" opacity="0.9" />
                  {/* Upper Lip */}
                  <path d="M -17,-4 Q 0,-8 17,-4 Q 0,-1 -17,-4 Z" fill="#be4b58" />
                  {/* Lower Lip */}
                  <path d="M -16,12 Q 0,19 16,12 Q 0,13 -16,12 Z" fill="#cf5664" />
                </g>
              )}
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
