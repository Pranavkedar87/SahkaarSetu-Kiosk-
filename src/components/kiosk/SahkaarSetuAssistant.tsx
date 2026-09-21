/**
 * SahkaarSetuAssistant
 *
 * Interactive animated 2D SVG virtual assistant character for the SahkaarSetu Kiosk.
 * Visual identity: Warm, approachable Indian female cooperative guide in rural Maharashtra context.
 *
 * Supports 6 distinct state-machine states:
 *   - 'idle':      Subtle breathing, occasional blinking, gentle head sway, friendly smile
 *   - 'listening': Attentive posture, eyes forward, listening wave indicator ("Yes, I'm listening...")
 *   - 'thinking':  Thoughtful head tilt, looking slightly up/sideways, animated dots ("Let me find that for you...")
 *   - 'speaking':  Dynamic lip-sync mouth animation linked to audio amplitude, head & hand gesture, answer bubble
 *   - 'error':     Concerned friendly expression, gentle reassuring message
 *   - 'success':   Warm appreciative nod and smile
 *
 * 100% vector SVG with GPU-accelerated CSS/SVG transforms.
 * Fully compatible with Raspberry Pi 5 performance budget & prefers-reduced-motion.
 */

import React, { useState, useEffect } from 'react';
import type { KioskStrings } from '../../i18n';

export type AssistantState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error' | 'success';

interface Props {
  state?: AssistantState;
  mouthOpen?: number;          // 0 (closed) to 1 (fully open)
  strings: KioskStrings;
  speechText?: string;         // Current bubble text (defaults to state message)
  userTranscript?: string;     // If user spoke via STT
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
  // Blinking cycle: random intervals between 2.5s and 5s
  const [isBlinking, setIsBlinking] = useState(false);

  useEffect(() => {
    let blinkTimeout: ReturnType<typeof setTimeout>;
    const triggerBlink = () => {
      setIsBlinking(true);
      setTimeout(() => {
        setIsBlinking(false);
        const nextInterval = 2600 + Math.random() * 2400;
        blinkTimeout = setTimeout(triggerBlink, nextInterval);
      }, 160);
    };

    blinkTimeout = setTimeout(triggerBlink, 3000);
    return () => clearTimeout(blinkTimeout);
  }, []);

  // Determine speech bubble text based on state and inputs
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
        return strings.assistantSuccess || "I'm ready to help whenever you need.";
      case 'error':
        return strings.assistantError || "I could not understand that. Please try again.";
      case 'idle':
      default:
        return strings.assistantGreeting || strings.homeGreeting || "Namaste! How can I help you today?";
    }
  };

  // State-based head tilt / gesture styles
  const getHeadTransform = () => {
    switch (state) {
      case 'listening':
        return 'translate(0px, -2px) rotate(-1.8deg)';
      case 'thinking':
        return 'translate(1px, -4px) rotate(2.4deg)';
      case 'speaking':
        return 'translate(0px, 0px)';
      case 'error':
        return 'translate(-1px, 1px) rotate(-1.2deg)';
      case 'success':
        return 'translate(0px, -1px) rotate(0.8deg)';
      case 'idle':
      default:
        return 'translate(0px, 0px)';
    }
  };

  // Eyebrow curves based on state
  const getEyebrowY = () => {
    switch (state) {
      case 'listening':
        return -3; // slightly raised
      case 'thinking':
        return -2;
      case 'error':
        return 1;  // slightly concerned
      default:
        return 0;
    }
  };

  // Eye gaze direction
  const getPupilOffset = () => {
    switch (state) {
      case 'thinking':
        return { x: 2, y: -2 }; // looking up thoughtfully
      case 'listening':
        return { x: 0, y: 0 };  // focused forward
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
      {/* ── SPEECH BUBBLE ──────────────────────────────────────────────────────── */}
      <div
        data-testid="assistant-speech-bubble"
        style={{
          position: 'relative',
          zIndex: 10,
          background: 'rgba(255, 255, 255, 0.94)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderRadius: '24px',
          border: '1.5px solid rgba(255, 255, 255, 0.95)',
          padding: '16px 22px',
          boxShadow: '0 10px 30px rgba(0, 0, 0, 0.08), 0 0 0 1px rgba(21, 128, 61, 0.1)',
          marginBottom: '10px',
          width: '92%',
          boxSizing: 'border-box',
          animation: 'homeFadeInUp 0.4s ease-out both',
        }}
      >
        {/* State Badge / Indicator */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor:
                  state === 'listening'
                    ? '#22c55e'
                    : state === 'thinking'
                    ? '#0284c7'
                    : state === 'speaking'
                    ? '#ea580c'
                    : state === 'error'
                    ? '#ef4444'
                    : '#15803d',
                boxShadow: '0 0 6px currentColor',
              }}
            />
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#15803d',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
              }}
            >
              {strings.brandName || 'SahkaarSetu'} AI Guide
            </span>
          </div>

          {/* Animated state wave / dots */}
          {state === 'listening' && (
            <div style={{ display: 'flex', gap: '3px', alignItems: 'flex-end', height: '14px' }}>
              <span className="wave-bar wave-bar-1" />
              <span className="wave-bar wave-bar-2" />
              <span className="wave-bar wave-bar-3" />
            </div>
          )}

          {state === 'thinking' && (
            <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
              <span className="dot-pulse dot-pulse-1" />
              <span className="dot-pulse dot-pulse-2" />
              <span className="dot-pulse dot-pulse-3" />
            </div>
          )}

          {state === 'speaking' && (
            <span style={{ fontSize: '13px', color: '#ea580c', animation: 'kiosk-pulse 1s infinite' }}>
              🔊 {strings.voiceAnswer || 'Speaking'}
            </span>
          )}
        </div>

        {/* User Transcript Display (if available) */}
        {userTranscript && (
          <div
            style={{
              padding: '6px 12px',
              marginBottom: '8px',
              background: 'rgba(2, 132, 199, 0.08)',
              borderRadius: '12px',
              borderLeft: '3px solid #0284c7',
              fontSize: '13px',
              color: '#0369a1',
              fontWeight: 600,
            }}
          >
            <span style={{ fontWeight: 700 }}>{strings.assistantYouSaid || strings.voiceYouSaid || 'You said:'} </span>
            <span style={{ fontStyle: 'italic', color: '#0f172a' }}>"{userTranscript}"</span>
          </div>
        )}

        {/* Assistant Message */}
        {state === 'idle' && !speechText ? (
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', marginBottom: '2px', letterSpacing: '-0.3px' }}>
              {strings.homeGreeting || 'Namaste!'}
            </div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', lineHeight: 1.35 }}>
              {strings.homeSubGreeting || 'How can I help you today?'}
            </div>
          </div>
        ) : (
          <div
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: '#1e293b',
              lineHeight: 1.4,
              maxHeight: '120px',
              overflowY: 'auto',
            }}
          >
            {getBubbleText()}
          </div>
        )}

        {/* Audio Controls during Speaking / Answered */}
        {(state === 'speaking' || isAudioPlaying) && (
          <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
            {onStopAudio && (
              <button
                type="button"
                onClick={onStopAudio}
                style={{
                  height: '34px',
                  padding: '0 12px',
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
                style={{
                  height: '34px',
                  padding: '0 12px',
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

      {/* ── SVG LAYERED ANIMATED CHARACTER ───────────────────────────────────── */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '340px',
          height: '310px',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-end',
          overflow: 'visible',
        }}
      >
        {/* Ambient State Glow Ring */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            top: '20px',
            width: '260px',
            height: '260px',
            borderRadius: '50%',
            background:
              state === 'listening'
                ? 'radial-gradient(circle, rgba(34, 197, 94, 0.28) 0%, transparent 70%)'
                : state === 'thinking'
                ? 'radial-gradient(circle, rgba(2, 132, 199, 0.25) 0%, transparent 70%)'
                : state === 'speaking'
                ? 'radial-gradient(circle, rgba(234, 88, 12, 0.24) 0%, transparent 70%)'
                : 'radial-gradient(circle, rgba(21, 128, 61, 0.18) 0%, transparent 70%)',
            transition: 'background 0.3s ease',
            pointerEvents: 'none',
            zIndex: 0,
          }}
        />

        <svg
          viewBox="0 0 320 360"
          width="100%"
          height="100%"
          style={{
            overflow: 'visible',
            position: 'relative',
            zIndex: 1,
            filter: 'drop-shadow(0 12px 24px rgba(0,0,0,0.12))',
          }}
          aria-label="SahkaarSetu Virtual Assistant Character"
        >
          <defs>
            {/* Skin Shading */}
            <linearGradient id="skinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f4c29e" />
              <stop offset="60%" stopColor="#e5aa82" />
              <stop offset="100%" stopColor="#d9996f" />
            </linearGradient>

            {/* Hair Color */}
            <linearGradient id="hairGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2c1810" />
              <stop offset="60%" stopColor="#1a0f0a" />
              <stop offset="100%" stopColor="#0d0805" />
            </linearGradient>

            {/* Kurta SahkaarSetu Green */}
            <linearGradient id="kurtaGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#22c55e" />
              <stop offset="50%" stopColor="#16a34a" />
              <stop offset="100%" stopColor="#15803d" />
            </linearGradient>

            {/* Saffron Dupatta */}
            <linearGradient id="saffronGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#ea580c" />
            </linearGradient>
          </defs>

          {/* ── LAYER 1: Torso / Clothing / Kurta (with subtle breathing) ── */}
          <g
            id="torso-layer"
            style={{
              animation: 'assistantBreathe 3.6s ease-in-out infinite',
              transformOrigin: '160px 340px',
            }}
          >
            {/* Shoulders & Main Kurta Body */}
            <path
              d="M 70,360 L 80,265 Q 110,245 160,245 Q 210,245 240,265 L 250,360 Z"
              fill="url(#kurtaGrad)"
            />

            {/* Kurta Collar & Saffron Border */}
            <path
              d="M 130,245 Q 160,270 190,245 L 180,290 Q 160,305 140,290 Z"
              fill="#fef3c7"
              stroke="#ea580c"
              strokeWidth="2.5"
            />

            {/* Saffron Dupatta Draped over Left Shoulder */}
            <path
              d="M 80,265 Q 95,250 115,260 L 100,360 L 70,360 Z"
              fill="url(#saffronGrad)"
              opacity="0.95"
            />

            {/* Golden Button Details */}
            <circle cx="160" cy="275" r="2.5" fill="#f59e0b" />
            <circle cx="160" cy="290" r="2.5" fill="#f59e0b" />
            <circle cx="160" cy="305" r="2.5" fill="#f59e0b" />
          </g>

          {/* ── LAYER 2: Neck ── */}
          <g id="neck-layer">
            <path
              d="M 144,195 L 144,248 Q 160,256 176,248 L 176,195 Z"
              fill="url(#skinGrad)"
            />
            {/* Neck Shadow under Chin */}
            <ellipse cx="160" cy="202" rx="16" ry="6" fill="rgba(0,0,0,0.12)" />
          </g>

          {/* ── LAYER 3: Head & Facial Features (Head tilt on state) ── */}
          <g
            id="head-layer"
            style={{
              transform: getHeadTransform(),
              transformOrigin: '160px 190px',
              transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            {/* Back Hair Volume */}
            <ellipse cx="160" cy="135" rx="66" ry="76" fill="url(#hairGrad)" />

            {/* Head Base / Skin */}
            <path
              d="M 106,135 Q 106,75 160,75 Q 214,75 214,135 Q 214,192 160,205 Q 106,192 106,135 Z"
              fill="url(#skinGrad)"
            />

            {/* Soft Rosy Cheeks */}
            <circle cx="125" cy="155" r="14" fill="#f87171" opacity="0.18" />
            <circle cx="195" cy="155" r="14" fill="#f87171" opacity="0.18" />

            {/* Ears */}
            <ellipse cx="104" cy="142" rx="7" ry="12" fill="#e5aa82" />
            <ellipse cx="216" cy="142" rx="7" ry="12" fill="#e5aa82" />

            {/* Traditional Gold Earrings */}
            <circle cx="104" cy="152" r="3.5" fill="#f59e0b" />
            <circle cx="216" cy="152" r="3.5" fill="#f59e0b" />

            {/* Front Hair Style & Parting */}
            <path
              d="M 104,130 Q 120,80 160,75 Q 200,80 216,130 Q 185,92 160,98 Q 135,92 104,130 Z"
              fill="url(#hairGrad)"
            />
            {/* Left Sweep Hair */}
            <path
              d="M 106,125 Q 120,95 155,95 Q 120,118 108,145 Z"
              fill="url(#hairGrad)"
            />
            {/* Right Sweep Hair */}
            <path
              d="M 214,125 Q 200,95 165,95 Q 200,118 212,145 Z"
              fill="url(#hairGrad)"
            />

            {/* Traditional Maroon Bindi */}
            <circle cx="160" cy="120" r="3.2" fill="#991b1b" />

            {/* Eyebrows */}
            <g
              id="eyebrows"
              style={{
                transform: `translateY(${getEyebrowY()}px)`,
                transition: 'transform 0.2s ease',
              }}
            >
              {/* Left Eyebrow */}
              <path
                d="M 125,122 Q 138,116 150,121"
                fill="none"
                stroke="#26150d"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {/* Right Eyebrow */}
              <path
                d="M 170,121 Q 182,116 195,122"
                fill="none"
                stroke="#26150d"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </g>

            {/* Eyes & Blinking */}
            <g id="eyes">
              {/* Left Eye */}
              <g
                style={{
                  transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)',
                  transformOrigin: '137px 135px',
                  transition: 'transform 0.08s ease',
                }}
              >
                {/* White of eye */}
                <path
                  d="M 124,135 Q 137,126 150,135 Q 137,144 124,135 Z"
                  fill="#ffffff"
                  stroke="#26150d"
                  strokeWidth="1.2"
                />
                {/* Iris */}
                <circle cx={137 + pupil.x} cy={135 + pupil.y} r="5.5" fill="#3b2112" />
                {/* Pupil */}
                <circle cx={137 + pupil.x} cy={135 + pupil.y} r="3" fill="#0f0905" />
                {/* Catchlight */}
                <circle cx={135 + pupil.x} cy={133 + pupil.y} r="1.5" fill="#ffffff" />
                {/* Eyelash line */}
                <path
                  d="M 123,135 Q 137,125 151,135"
                  fill="none"
                  stroke="#1a0f0a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>

              {/* Right Eye */}
              <g
                style={{
                  transform: isBlinking ? 'scaleY(0.1)' : 'scaleY(1)',
                  transformOrigin: '183px 135px',
                  transition: 'transform 0.08s ease',
                }}
              >
                {/* White of eye */}
                <path
                  d="M 170,135 Q 183,126 196,135 Q 183,144 170,135 Z"
                  fill="#ffffff"
                  stroke="#26150d"
                  strokeWidth="1.2"
                />
                {/* Iris */}
                <circle cx={183 + pupil.x} cy={135 + pupil.y} r="5.5" fill="#3b2112" />
                {/* Pupil */}
                <circle cx={183 + pupil.x} cy={135 + pupil.y} r="3" fill="#0f0905" />
                {/* Catchlight */}
                <circle cx={181 + pupil.x} cy={133 + pupil.y} r="1.5" fill="#ffffff" />
                {/* Eyelash line */}
                <path
                  d="M 169,135 Q 183,125 197,135"
                  fill="none"
                  stroke="#1a0f0a"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </g>
            </g>

            {/* Nose */}
            <path
              d="M 158,138 L 157,156 Q 160,161 163,156"
              fill="none"
              stroke="#c78c66"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <ellipse cx="155" cy="158" rx="2" ry="1.2" fill="#b97c56" opacity="0.6" />
            <ellipse cx="165" cy="158" rx="2" ry="1.2" fill="#b97c56" opacity="0.6" />

            {/* ── Dynamic Lip-Sync Mouth ── */}
            <g id="mouth" style={{ transform: 'translate(160px, 178px)' }}>
              {clampedMouth === 0 ? (
                // Closed / Neutral Warm Smile
                <g>
                  {/* Upper lip */}
                  <path
                    d="M -14,-1 Q -6,-3 0,-1 Q 6,-3 14,-1 Q 0,4 -14,-1 Z"
                    fill="#be4b4b"
                  />
                  {/* Smile line */}
                  <path
                    d="M -15,0 Q 0,6 15,0"
                    fill="none"
                    stroke="#881337"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                  {/* Lower lip highlight */}
                  <path
                    d="M -10,1 Q 0,6 10,1"
                    fill="none"
                    stroke="#fca5a5"
                    strokeWidth="1.2"
                    opacity="0.8"
                  />
                </g>
              ) : (
                // Open Mouth during Speaking (amplitude-interpolated)
                <g>
                  {/* Dark inner mouth cavity */}
                  <path
                    d={`M -15,0 Q 0,${8 + clampedMouth * 16} 15,0 Q 0,${-3 - clampedMouth * 4} -15,0 Z`}
                    fill="#4c0519"
                  />
                  {/* Upper teeth row */}
                  <path
                    d={`M -11,-1 Q 0,${1 + clampedMouth * 3} 11,-1 Q 0,-3 -11,-1 Z`}
                    fill="#ffffff"
                  />
                  {/* Tongue hint */}
                  {clampedMouth > 0.35 && (
                    <path
                      d={`M -8,${5 + clampedMouth * 8} Q 0,${3 + clampedMouth * 7} 8,${5 + clampedMouth * 8} Q 0,${8 + clampedMouth * 12} -8,${5 + clampedMouth * 8} Z`}
                      fill="#f43f5e"
                      opacity="0.9"
                    />
                  )}
                  {/* Upper and lower lip contour */}
                  <path
                    d={`M -15,0 Q 0,${8 + clampedMouth * 16} 15,0 Q 0,${-3 - clampedMouth * 4} -15,0 Z`}
                    fill="none"
                    stroke="#be4b4b"
                    strokeWidth="2.5"
                    strokeLinejoin="round"
                  />
                </g>
              )}
            </g>
          </g>

          {/* ── LAYER 4: Hand / Gesture ── */}
          <g
            id="hand-gesture"
            style={{
              animation:
                state === 'speaking'
                  ? 'assistantHandSpeak 2.4s ease-in-out infinite'
                  : 'assistantHandIdle 4s ease-in-out infinite',
              transformOrigin: '210px 330px',
            }}
          >
            {/* Friendly guiding hand near right side */}
            <path
              d="M 215,310 Q 235,285 245,295 Q 255,305 240,325 Q 225,340 215,330 Z"
              fill="url(#skinGrad)"
            />
            {/* Fingertip contours */}
            <path
              d="M 235,292 Q 242,286 248,293"
              fill="none"
              stroke="#c78c66"
              strokeWidth="1.2"
            />
          </g>
        </svg>
      </div>

      {/* ── CSS Animations for Assistant ── */}
      <style>{`
        @keyframes assistantBreathe {
          0%, 100% {
            transform: scaleY(1) translateY(0);
          }
          50% {
            transform: scaleY(1.025) translateY(-2px);
          }
        }

        @keyframes assistantHandSpeak {
          0%, 100% {
            transform: rotate(0deg) translateY(0);
          }
          50% {
            transform: rotate(-3deg) translateY(-4px);
          }
        }

        @keyframes assistantHandIdle {
          0%, 100% {
            transform: rotate(0deg);
          }
          50% {
            transform: rotate(1deg);
          }
        }

        .wave-bar {
          display: inline-block;
          width: 3px;
          border-radius: 2px;
          background: #22c55e;
        }
        .wave-bar-1 {
          height: 8px;
          animation: wavePulse 0.7s infinite alternate ease-in-out;
        }
        .wave-bar-2 {
          height: 14px;
          animation: wavePulse 0.9s infinite alternate ease-in-out 0.2s;
        }
        .wave-bar-3 {
          height: 10px;
          animation: wavePulse 0.8s infinite alternate ease-in-out 0.4s;
        }

        @keyframes wavePulse {
          0% { height: 4px; }
          100% { height: 16px; }
        }

        .dot-pulse {
          display: inline-block;
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #0284c7;
          animation: dotBounce 1.2s infinite ease-in-out both;
        }
        .dot-pulse-1 { animation-delay: 0s; }
        .dot-pulse-2 { animation-delay: 0.2s; }
        .dot-pulse-3 { animation-delay: 0.4s; }

        @keyframes dotBounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1.1); opacity: 1; }
        }

        @media (prefers-reduced-motion: reduce) {
          #torso-layer,
          #head-layer,
          #hand-gesture,
          .wave-bar,
          .dot-pulse {
            animation: none !important;
            transition: none !important;
          }
        }
      `}</style>
    </div>
  );
}
