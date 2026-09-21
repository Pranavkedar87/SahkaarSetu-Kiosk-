/**
 * HomeScreen — K9 Interactive Animated Assistant
 *
 * Full-fidelity AI-assisted rural cooperative kiosk interface featuring the
 * interactive animated SahkaarSetu virtual assistant character.
 *
 * Visual composition:
 *   Left (54–56%): Rural Maharashtra backdrop with the animated SahkaarSetu
 *                  Virtual Assistant character, interactive speech bubble, and
 *                  large glowing circular microphone CTA (~190px).
 *   Right (44–46%): "How can we help you?", 2x2 prominent action cards
 *                   (Voice, Type, Scan, PACS) with glassmorphism, rich
 *                   typography, and large touch targets.
 *   Bottom: Cooperative green/saffron decorative wave with 3 trust badges.
 *
 * All K4/K5/K6/K7 capabilities preserved.
 */

import React, { useState, useEffect } from 'react';
import { ServiceUnavailableBanner } from '../components/kiosk/ServiceUnavailableBanner';
import { AssistanceSlip } from '../components/kiosk/AssistanceSlip';
import { SahkaarSetuAssistant, type AssistantState } from '../components/kiosk/SahkaarSetuAssistant';
import { getActivePrintSlip, subscribeActivePrintSlip } from '../services/printer';
import type { PrintPayload } from '../types';
import type { KioskStrings } from '../i18n';
import type { SpeakButtonState } from '../types';
import logoSrc from '../assets/logo.png';
import heroAssistantSrc from '../assets/hero-assistant.jpg';
import '../styles/HomeAnimations.css';

// ── Props ──────────────────────────────────────────────────────────────────────

export interface HomeScreenProps {
  strings: KioskStrings;
  serviceAvailable: boolean;
  speakState?: SpeakButtonState;
  onSpeak: () => void;
  onType: () => void;
  onScan: () => void;
  onPacsHelp: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
  assistantState?: AssistantState;
  mouthOpen?: number;
  speechText?: string;
  userTranscript?: string;
}

// ── Action card config ──────────────────────────────────────────────────────────

interface ActionCardConfig {
  key: string;
  icon: string;
  titleKey: keyof KioskStrings;
  descKey: keyof KioskStrings;
  actionKey?: keyof KioskStrings;
  accent: string;
  accentBg: string;
  onClick: () => void;
}

// ── Responsive width hook ──────────────────────────────────────────────────────

function useWindowWidth() {
  const [width, setWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1280);
  useEffect(() => {
    const handle = () => setWidth(window.innerWidth);
    window.addEventListener('resize', handle);
    return () => window.removeEventListener('resize', handle);
  }, []);
  return width;
}

// ── Clock hook ──────────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);
  return now;
}

// ── Component ───────────────────────────────────────────────────────────────────

export function HomeScreen({
  strings,
  serviceAvailable,
  speakState = 'idle',
  onSpeak,
  onType,
  onScan,
  onPacsHelp,
  onChangeLanguage,
  onStartOver,
  assistantState,
  mouthOpen = 0,
  speechText,
  userTranscript,
}: HomeScreenProps) {
  const width = useWindowWidth();
  const now = useClock();
  const isWide = width >= 1024;
  const isCompact = width <= 820;

  // Determine active character state (maps speakState if provided)
  const resolvedState: AssistantState =
    assistantState ||
    (speakState === 'listening'
      ? 'listening'
      : speakState === 'processing'
      ? 'thinking'
      : speakState === 'error'
      ? 'error'
      : 'idle');

  // Print slip state
  const [activeSlip, setActiveSlip] = useState<PrintPayload | null>(getActivePrintSlip);
  useEffect(() => subscribeActivePrintSlip(setActiveSlip), []);

  // Online status
  const [isOnline, setIsOnline] = useState(typeof navigator !== 'undefined' ? navigator.onLine : true);
  useEffect(() => {
    const on = () => setIsOnline(true);
    const off = () => setIsOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

  // 4 Action Cards
  const cards: ActionCardConfig[] = [
    {
      key: 'voice',
      icon: '🎤',
      titleKey: 'homeAskByVoice',
      descKey: 'homeAskByVoiceDesc',
      accent: '#15803d',
      accentBg: 'rgba(21,128,61,0.12)',
      onClick: onSpeak,
    },
    {
      key: 'type',
      icon: '⌨️',
      titleKey: 'homeTypeQuestion',
      descKey: 'homeTypeQuestionDesc',
      actionKey: 'actionType',
      accent: '#0284c7',
      accentBg: 'rgba(2,132,199,0.12)',
      onClick: onType,
    },
    {
      key: 'scan',
      icon: '📄',
      titleKey: 'homeScanDocument',
      descKey: 'homeScanDocumentDesc',
      accent: '#ea580c',
      accentBg: 'rgba(234,88,12,0.12)',
      onClick: onScan,
    },
    {
      key: 'pacs',
      icon: '🤝',
      titleKey: 'homePacsAssistance',
      descKey: 'homePacsAssistanceDesc',
      actionKey: 'actionHelpPacs',
      accent: '#7c3aed',
      accentBg: 'rgba(124,58,237,0.12)',
      onClick: onPacsHelp,
    },
  ];

  // 3 Trust indicators
  const infoItems = [
    { icon: '🌾', textKey: 'homeFarmerFriendly' as keyof KioskStrings },
    { icon: '✓', textKey: 'homeTrustedInfo' as keyof KioskStrings },
    { icon: '🌱', textKey: 'homeBrighterTomorrow' as keyof KioskStrings },
  ];

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #fff7ed 70%, #fef3c7 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ═══════════════ HEADER BAR ═══════════════ */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 24px',
          height: '64px',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1.5px solid rgba(21,128,61,0.12)',
          zIndex: 20,
        }}
      >
        {/* Left: Brand Identity */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img
            src={logoSrc}
            alt="SahkaarSetu Logo"
            style={{ height: '42px', width: '42px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '20px', fontWeight: 800, color: '#15803d', lineHeight: 1.1, letterSpacing: '-0.3px' }}>
              {strings.brandName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              {strings.tagline}
            </div>
          </div>
        </div>

        {/* Center: Quote (wide screens) */}
        {isWide && (
          <div
            style={{
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: 700,
              color: '#1e3a5f',
              letterSpacing: '-0.2px',
              background: 'rgba(21,128,61,0.06)',
              padding: '6px 18px',
              borderRadius: '20px',
              border: '1px solid rgba(21,128,61,0.15)',
            }}
          >
            {strings.homeQuote || strings.tagline}
          </div>
        )}

        {/* Right: Connectivity + Time + Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {/* Time & Date */}
          <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <div data-testid="clock-time" style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a5f' }}>
              {timeStr}
            </div>
            <div data-testid="clock-date" style={{ fontSize: '11px', color: '#64748b', fontWeight: 600 }}>
              {dateStr}
            </div>
          </div>

          {/* Connectivity Indicator */}
          <div
            data-testid="connectivity-indicator"
            title={isOnline ? 'Online' : 'Offline'}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#22c55e' : '#ef4444',
              boxShadow: `0 0 8px ${isOnline ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'}`,
              flexShrink: 0,
            }}
          />

          {/* Language Selector */}
          <button
            onClick={onChangeLanguage}
            aria-label={strings.changeLanguage}
            style={{
              height: '48px',
              minHeight: '48px',
              padding: '0 16px',
              background: 'rgba(21,128,61,0.08)',
              color: '#15803d',
              border: '2px solid rgba(21,128,61,0.25)',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              touchAction: 'manipulation',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>🌐</span>
            <span>{strings.changeLanguage}</span>
          </button>

          {/* Start Over Button */}
          <button
            onClick={onStartOver}
            aria-label={strings.promptStartOver}
            style={{
              height: '48px',
              minHeight: '48px',
              padding: '0 16px',
              background: 'rgba(220,38,38,0.06)',
              color: '#dc2626',
              border: '2px solid rgba(220,38,38,0.25)',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              touchAction: 'manipulation',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>↩</span>
            <span>{strings.promptStartOver}</span>
          </button>
        </div>
      </header>

      {/* Service Unavailable Banner */}
      {!serviceAvailable && (
        <div style={{ padding: '0 24px', paddingTop: '8px', zIndex: 15 }}>
          <ServiceUnavailableBanner strings={strings} />
        </div>
      )}

      {/* ═══════════════ MAIN VIEWPORT ═══════════════ */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isWide ? 'row' : 'column',
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {/* ── Left Hero Panel (54–56% width): Animated Assistant + Mic ── */}
        <div
          style={{
            flex: isWide ? '0 0 54%' : '0 0 auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: isWide ? '16px 28px 18px' : '12px 16px',
            overflow: 'hidden',
            minHeight: isWide ? 'auto' : '360px',
          }}
        >
          {/* Rural Maharashtra Hero Assistant Background Image */}
          <img
            src={heroAssistantSrc}
            alt="SahkaarSetu Rural Cooperative Assistant"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: 'center 22%',
              zIndex: 0,
              opacity: 0.85,
              animation: 'homeHeroImageScale 1.2s ease-out both',
            }}
          />

          {/* Soft Blended Gradient Overlays (preserves face clarity, blends seamlessly) */}
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              background: isWide
                ? 'linear-gradient(to right, rgba(0,0,0,0.10) 0%, rgba(240,253,244,0.15) 45%, rgba(240,253,244,0.88) 90%, #f0fdf4 100%)'
                : 'linear-gradient(to bottom, rgba(0,0,0,0.10) 0%, rgba(240,253,244,0.7) 70%, #f0fdf4 100%)',
              zIndex: 1,
              pointerEvents: 'none',
            }}
          />

          {/* ── Interactive Animated SahkaarSetu Virtual Assistant Character ── */}
          <div style={{ position: 'relative', zIndex: 2, width: '100%', display: 'flex', justifyContent: 'center' }}>
            <SahkaarSetuAssistant
              state={resolvedState}
              mouthOpen={mouthOpen}
              strings={strings}
              speechText={speechText}
              userTranscript={userTranscript}
            />
          </div>

          {/* Central Microphone CTA Button (~186px on 1280x800) */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              marginTop: '4px',
            }}
          >
            {/* Animated Ripple Wave */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: isWide ? '190px' : '150px',
                height: isWide ? '190px' : '150px',
                borderRadius: '50%',
                border: '3px solid rgba(34, 197, 94, 0.35)',
                animation: 'homeMicRipple 2.2s ease-out infinite',
                pointerEvents: 'none',
              }}
            />

            <button
              type="button"
              onClick={onSpeak}
              aria-label={`${strings.actionSpeak} - ${strings.homeTapToSpeak || strings.pressToSpeak}`}
              style={{
                position: 'relative',
                zIndex: 2,
                width: isWide ? '160px' : '130px',
                height: isWide ? '160px' : '130px',
                minHeight: isWide ? '160px' : '130px',
                borderRadius: '50%',
                background:
                  resolvedState === 'listening'
                    ? 'linear-gradient(145deg, #10b981 0%, #047857 100%)'
                    : resolvedState === 'thinking'
                    ? 'linear-gradient(145deg, #0284c7 0%, #0369a1 100%)'
                    : 'linear-gradient(145deg, #22c55e 0%, #15803d 100%)',
                border: '5px solid rgba(255, 255, 255, 0.95)',
                color: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '4px',
                cursor: 'pointer',
                boxShadow: '0 0 35px rgba(34, 197, 94, 0.5), 0 16px 40px rgba(21, 128, 61, 0.35)',
                animation: 'homeMicGlow 3s ease-in-out infinite, homeMicBreathe 4s ease-in-out infinite',
                transition: 'transform 0.15s ease, background 0.3s ease',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span
                style={{
                  fontSize: isWide ? '46px' : '36px',
                  lineHeight: 1,
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                }}
                aria-hidden="true"
              >
                {resolvedState === 'listening' ? '🎙️' : resolvedState === 'thinking' ? '⚙️' : '🎤'}
              </span>
              <span
                style={{
                  fontSize: isWide ? '17px' : '14px',
                  fontWeight: 800,
                  textAlign: 'center',
                  letterSpacing: '0.3px',
                }}
              >
                {resolvedState === 'listening'
                  ? strings.stateListening || 'Listening'
                  : resolvedState === 'thinking'
                  ? strings.stateProcessing || 'Processing'
                  : strings.actionSpeak}
              </span>
            </button>

            {/* Tap to speak Glass Badge */}
            <div
              style={{
                marginTop: '8px',
                fontSize: isWide ? '15px' : '12px',
                fontWeight: 700,
                color: '#15803d',
                background: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                padding: '4px 16px',
                borderRadius: '20px',
                border: '1px solid rgba(21, 128, 61, 0.2)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                letterSpacing: '-0.2px',
              }}
            >
              {strings.homeTapToSpeak || strings.pressToSpeak}
            </div>
          </div>
        </div>

        {/* ── Right Action Panel (44–46% width): 2x2 Prominent Action Cards ── */}
        <div
          style={{
            flex: isWide ? '0 0 46%' : '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: isWide ? '20px 32px 20px 16px' : '12px 16px',
            overflowY: 'auto',
            overflowX: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          {/* Action Heading */}
          <div
            style={{
              marginBottom: isWide ? '18px' : '10px',
              animation: 'homeFadeInUp 0.6s ease-out 0.25s both',
            }}
          >
            <h2
              style={{
                fontSize: isWide ? '32px' : '22px',
                fontWeight: 800,
                color: '#1e3a5f',
                margin: 0,
                marginBottom: '4px',
                letterSpacing: '-0.5px',
              }}
            >
              {strings.howCanWeHelp}
            </h2>
            <p
              style={{
                fontSize: isWide ? '16px' : '13px',
                fontWeight: 500,
                color: '#475569',
                margin: 0,
              }}
            >
              Choose an option or tap the mic and speak
            </p>
          </div>

          {/* 2x2 Action Card Grid (Card height ~180-210px on 1280x800) */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(2, 1fr)',
              gap: isWide ? '16px' : '10px',
              width: '100%',
              maxWidth: '560px',
            }}
          >
            {cards.map((card, i) => (
              <ActionCard
                key={card.key}
                card={card}
                strings={strings}
                index={i}
                isWide={isWide}
                isCompact={isCompact}
              />
            ))}
          </div>
        </div>
      </main>

      {/* ═══════════════ BOTTOM DECORATIVE STRIP ═══════════════ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: isWide ? '36px' : '16px',
          padding: '10px 24px',
          background: 'linear-gradient(90deg, rgba(21,128,61,0.09) 0%, rgba(255,255,255,0.92) 50%, rgba(234,88,12,0.09) 100%)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: '1.5px solid rgba(21,128,61,0.15)',
          flexShrink: 0,
          flexWrap: 'wrap',
          zIndex: 10,
        }}
      >
        {infoItems.map((item) => (
          <div
            key={item.textKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: isWide ? '14px' : '12px',
              fontWeight: 700,
              color: '#334155',
            }}
          >
            <span style={{ fontSize: '16px' }} aria-hidden="true">{item.icon}</span>
            <span>{String(strings[item.textKey] || item.textKey)}</span>
          </div>
        ))}
      </div>

      {/* ═══════════════ COMPACT FOOTER ═══════════════ */}
      <footer
        style={{
          textAlign: 'center',
          padding: '6px 24px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#64748b',
          background: 'rgba(255,255,255,0.75)',
          flexShrink: 0,
          letterSpacing: '0.2px',
          borderTop: '1px solid rgba(0,0,0,0.04)',
        }}
      >
        {strings.homeCoopFooter || 'Stronger Cooperatives, A Brighter India'} • {strings.kioskSubtitle}
      </footer>

      {/* 58mm Thermal Printable Slip */}
      <AssistanceSlip slip={activeSlip} />
    </div>
  );
}

// ── Action Card Sub-Component ───────────────────────────────────────────────────

function ActionCard({
  card,
  strings,
  index,
  isWide,
  isCompact,
}: {
  card: ActionCardConfig;
  strings: KioskStrings;
  index: number;
  isWide: boolean;
  isCompact: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);
  const [isPressed, setIsPressed] = useState(false);

  const title = String(strings[card.titleKey] || card.titleKey);
  const desc = String(strings[card.descKey] || card.descKey);
  const actionLabel = card.actionKey ? String(strings[card.actionKey] || '') : '';
  const ariaLabel = actionLabel ? `${title} - ${actionLabel}` : title;

  return (
    <button
      onClick={card.onClick}
      aria-label={ariaLabel}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => { setIsHovered(false); setIsPressed(false); }}
      onPointerDown={() => setIsPressed(true)}
      onPointerUp={() => setIsPressed(false)}
      onPointerCancel={() => setIsPressed(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: isWide ? '20px 22px' : '14px 16px',
        minHeight: isWide ? '180px' : isCompact ? '110px' : '140px',
        background: isHovered
          ? 'rgba(255,255,255,0.98)'
          : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: `2px solid ${isHovered ? card.accent : 'rgba(255,255,255,0.9)'}`,
        borderRadius: '26px',
        boxShadow: isHovered
          ? `0 14px 34px rgba(0,0,0,0.10), 0 0 0 2px ${card.accent}25`
          : '0 8px 24px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.18s cubic-bezier(0.4, 0, 0.2, 1)',
        transform: isPressed ? 'scale(0.97)' : isHovered ? 'translateY(-3px)' : 'none',
        animation: `homeCardStagger 0.5s ease-out ${0.35 + index * 0.08}s both`,
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}
    >
      {/* Top row: Icon badge + Action tag */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
        }}
      >
        <div
          style={{
            width: isWide ? '52px' : '42px',
            height: isWide ? '52px' : '42px',
            borderRadius: '16px',
            background: card.accentBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: isWide ? '28px' : '22px',
            flexShrink: 0,
            border: `1px solid ${card.accent}30`,
          }}
          aria-hidden="true"
        >
          {card.icon}
        </div>

        {actionLabel && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: card.accent,
              backgroundColor: card.accentBg,
              padding: '3px 10px',
              borderRadius: '8px',
              border: `1.5px solid ${card.accent}35`,
              whiteSpace: 'nowrap',
              letterSpacing: '-0.2px',
            }}
          >
            {actionLabel}
          </span>
        )}
      </div>

      {/* Middle: Title & Subtitle */}
      <div style={{ width: '100%', marginTop: '10px' }}>
        <div
          style={{
            fontSize: isWide ? '22px' : '16px',
            fontWeight: 800,
            color: '#1e3a5f',
            marginBottom: '4px',
            lineHeight: 1.2,
            letterSpacing: '-0.3px',
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: isWide ? '15px' : '12px',
            fontWeight: 500,
            color: '#64748b',
            lineHeight: 1.35,
          }}
        >
          {desc}
        </div>
      </div>

      {/* Bottom row: Right Arrow */}
      <div
        style={{
          alignSelf: 'flex-end',
          fontSize: '20px',
          fontWeight: 700,
          color: card.accent,
          opacity: isHovered ? 1 : 0.45,
          transform: isHovered ? 'translateX(4px)' : 'none',
          transition: 'all 0.18s ease',
          lineHeight: 1,
        }}
        aria-hidden="true"
      >
        →
      </div>
    </button>
  );
}
