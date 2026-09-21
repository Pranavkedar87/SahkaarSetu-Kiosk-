/**
 * HomeScreen — K9 Redesigned
 *
 * Premium rural-India-themed kiosk home dashboard inspired by the
 * SahkaarSetu AI Kiosk reference design.
 *
 * Layout:
 *   Header: logo + quote + time/date/status + controls
 *   Main:   hero panel (left) + action grid (right)  — 2-col ≥1024px, stacked <1024px
 *   Bottom: info strip + footer
 *
 * All existing K4/K5/K6/K7 functionality preserved.
 * Props interface is identical to the original HomeScreen.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { ServiceUnavailableBanner } from '../components/kiosk/ServiceUnavailableBanner';
import { AssistanceSlip } from '../components/kiosk/AssistanceSlip';
import { getActivePrintSlip, subscribeActivePrintSlip } from '../services/printer';
import type { PrintPayload } from '../types';
import type { KioskStrings } from '../i18n';
import type { SpeakButtonState } from '../types';
import logoSrc from '../assets/logo.png';
import '../styles/HomeAnimations.css';

// ── Props (unchanged from original HomeScreen) ─────────────────────────────────

interface Props {
  strings: KioskStrings;
  serviceAvailable: boolean;
  speakState?: SpeakButtonState;
  onSpeak: () => void;
  onType: () => void;
  onScan: () => void;
  onPacsHelp: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
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

// ── Responsive hook ─────────────────────────────────────────────────────────────

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
}: Props) {
  const width = useWindowWidth();
  const now = useClock();
  const isWide = width >= 1024;

  // Print slip state (from KioskShell — replicated here since HomeScreen owns its layout)
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

  // Format time/date
  const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateStr = now.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });

  // Action cards
  const cards: ActionCardConfig[] = [
    {
      key: 'voice',
      icon: '🎤',
      titleKey: 'homeAskByVoice',
      descKey: 'homeAskByVoiceDesc',
      accent: '#15803d',
      accentBg: 'rgba(21,128,61,0.08)',
      onClick: onSpeak,
    },
    {
      key: 'type',
      icon: '⌨️',
      titleKey: 'homeTypeQuestion',
      descKey: 'homeTypeQuestionDesc',
      actionKey: 'actionType',
      accent: '#0369a1',
      accentBg: 'rgba(3,105,161,0.08)',
      onClick: onType,
    },
    {
      key: 'scan',
      icon: '📷',
      titleKey: 'homeScanDocument',
      descKey: 'homeScanDocumentDesc',
      accent: '#c2410c',
      accentBg: 'rgba(194,65,12,0.08)',
      onClick: onScan,
    },
    {
      key: 'pacs',
      icon: '🏛️',
      titleKey: 'homePacsAssistance',
      descKey: 'homePacsAssistanceDesc',
      actionKey: 'actionHelpPacs',
      accent: '#7c3aed',
      accentBg: 'rgba(124,58,237,0.08)',
      onClick: onPacsHelp,
    },
  ];

  // ── Info strip items ──────────────────────────────────────────────────────────
  const infoItems = [
    { icon: '🌾', textKey: 'homeFarmerFriendly' as keyof KioskStrings },
    { icon: '✅', textKey: 'homeTrustedInfo' as keyof KioskStrings },
    { icon: '🌅', textKey: 'homeBrighterTomorrow' as keyof KioskStrings },
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
      {/* ═══════════════ HEADER ═══════════════ */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 24px',
          height: '64px',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(21,128,61,0.1)',
          zIndex: 10,
        }}
      >
        {/* Left: Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={logoSrc}
            alt="SahkaarSetu Logo"
            style={{ height: '40px', width: '40px', objectFit: 'contain' }}
          />
          <div>
            <div style={{ fontSize: '18px', fontWeight: 800, color: '#15803d', lineHeight: 1.1 }}>
              {strings.brandName}
            </div>
            <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              {strings.tagline}
            </div>
          </div>
        </div>

        {/* Center: Quote (only on wide screens) */}
        {isWide && (
          <div
            style={{
              textAlign: 'center',
              fontSize: '15px',
              fontWeight: 700,
              color: '#1e3a5f',
              opacity: 0.8,
              letterSpacing: '-0.2px',
            }}
          >
            {strings.homeQuote || strings.tagline}
          </div>
        )}

        {/* Right: Status + Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Time & Date */}
          <div style={{ textAlign: 'right', lineHeight: 1.2 }}>
            <div data-testid="clock-time" style={{ fontSize: '15px', fontWeight: 700, color: '#1e3a5f' }}>
              {timeStr}
            </div>
            <div data-testid="clock-date" style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>
              {dateStr}
            </div>
          </div>

          {/* Connectivity */}
          <div
            data-testid="connectivity-indicator"
            title={isOnline ? 'Online' : 'Offline'}
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              backgroundColor: isOnline ? '#22c55e' : '#ef4444',
              boxShadow: `0 0 6px ${isOnline ? 'rgba(34,197,94,0.5)' : 'rgba(239,68,68,0.5)'}`,
              flexShrink: 0,
            }}
          />

          {/* Language */}
          <button
            onClick={onChangeLanguage}
            aria-label={strings.changeLanguage}
            style={{
              height: '48px',
              minHeight: '48px',
              padding: '0 16px',
              background: 'rgba(21,128,61,0.08)',
              color: '#15803d',
              border: '1.5px solid rgba(21,128,61,0.2)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              touchAction: 'manipulation',
            }}
          >
            🌐 {strings.changeLanguage}
          </button>

          {/* Start Over */}
          <button
            onClick={onStartOver}
            aria-label={strings.promptStartOver}
            style={{
              height: '48px',
              minHeight: '48px',
              padding: '0 16px',
              background: 'rgba(220,38,38,0.06)',
              color: '#dc2626',
              border: '1.5px solid rgba(220,38,38,0.2)',
              borderRadius: '10px',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              touchAction: 'manipulation',
            }}
          >
            ↩ {strings.promptStartOver}
          </button>
        </div>
      </header>

      {/* Service unavailable */}
      {!serviceAvailable && (
        <div style={{ padding: '0 24px', paddingTop: '8px' }}>
          <ServiceUnavailableBanner strings={strings} />
        </div>
      )}

      {/* ═══════════════ MAIN ═══════════════ */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: isWide ? 'row' : 'column',
          overflow: 'hidden',
          padding: isWide ? '0' : '12px 16px',
          gap: isWide ? '0' : '16px',
        }}
      >
        {/* ── Hero Panel (Left) ─────────────────────────────────────────────── */}
        <div
          style={{
            flex: isWide ? '1 1 50%' : '0 0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            padding: isWide ? '32px' : '16px',
            background: isWide
              ? 'linear-gradient(160deg, rgba(21,128,61,0.06) 0%, rgba(194,65,12,0.04) 50%, rgba(21,128,61,0.02) 100%)'
              : 'transparent',
            animation: 'homeHeroFadeIn 0.8s ease-out both',
            overflow: 'hidden',
          }}
        >
          {/* Decorative gradient circles (background depth) */}
          {isWide && (
            <>
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '-60px',
                  left: '-40px',
                  width: '260px',
                  height: '260px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(21,128,61,0.08) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  bottom: '-40px',
                  right: '-20px',
                  width: '200px',
                  height: '200px',
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(234,88,12,0.06) 0%, transparent 70%)',
                  pointerEvents: 'none',
                }}
              />
            </>
          )}

          {/* Welcome Card */}
          <div
            style={{
              background: 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              borderRadius: '24px',
              border: '1px solid rgba(255,255,255,0.6)',
              padding: isWide ? '28px 36px' : '20px 24px',
              textAlign: 'center',
              boxShadow: '0 8px 32px rgba(0,0,0,0.06)',
              marginBottom: isWide ? '28px' : '16px',
              animation: 'homeFadeInUp 0.6s ease-out 0.2s both',
              maxWidth: '420px',
              width: '100%',
            }}
          >
            <div
              style={{
                fontSize: isWide ? '36px' : '28px',
                fontWeight: 800,
                color: '#15803d',
                marginBottom: '6px',
                letterSpacing: '-0.5px',
              }}
            >
              {strings.homeGreeting || 'Namaste!'}
            </div>
            <div
              style={{
                fontSize: isWide ? '18px' : '15px',
                fontWeight: 600,
                color: '#475569',
                lineHeight: 1.4,
              }}
            >
              {strings.homeSubGreeting || strings.howCanWeHelp}
            </div>
          </div>

          {/* ── Central Microphone CTA ──────────────────────────────────────── */}
          <div
            style={{
              position: 'relative',
              display: 'inline-flex',
              justifyContent: 'center',
              alignItems: 'center',
              animation: 'homeFadeInUp 0.6s ease-out 0.4s both',
            }}
          >
            {/* Ripple ring */}
            <span
              aria-hidden="true"
              style={{
                position: 'absolute',
                width: '180px',
                height: '180px',
                borderRadius: '50%',
                border: '2px solid rgba(21,128,61,0.15)',
                animation: 'homeMicRipple 2.5s ease-out infinite',
              }}
            />

            <button
              type="button"
              onClick={onSpeak}
              aria-label={`${strings.actionSpeak} - ${strings.homeTapToSpeak || strings.pressToSpeak}`}
              style={{
                position: 'relative',
                zIndex: 1,
                width: isWide ? '160px' : '130px',
                height: isWide ? '160px' : '130px',
                borderRadius: '50%',
                background: 'linear-gradient(145deg, #22c55e, #15803d)',
                border: '4px solid rgba(255,255,255,0.3)',
                color: '#fff',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                cursor: 'pointer',
                animation: 'homeMicGlow 3s ease-in-out infinite',
                transition: 'transform 0.15s ease',
                touchAction: 'manipulation',
                userSelect: 'none',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              <span style={{ fontSize: isWide ? '44px' : '36px', lineHeight: 1 }} aria-hidden="true">
                🎤
              </span>
              <span style={{ fontSize: isWide ? '16px' : '13px', fontWeight: 800, textAlign: 'center' }}>
                {strings.actionSpeak}
              </span>
            </button>
          </div>

          {/* Tap to speak label */}
          <div
            style={{
              marginTop: '12px',
              fontSize: '14px',
              fontWeight: 600,
              color: '#64748b',
              animation: 'homeFadeInUp 0.6s ease-out 0.6s both',
            }}
          >
            {strings.homeTapToSpeak || strings.pressToSpeak}
          </div>
        </div>

        {/* ── Right Action Panel ────────────────────────────────────────────── */}
        <div
          style={{
            flex: isWide ? '1 1 50%' : '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            padding: isWide ? '24px 36px 24px 24px' : '0',
            overflowY: 'auto',
            overflowX: 'hidden',
          }}
        >
          {/* Section heading */}
          <div
            style={{
              marginBottom: '16px',
              animation: 'homeFadeInUp 0.6s ease-out 0.3s both',
            }}
          >
            <h2
              style={{
                fontSize: isWide ? '26px' : '22px',
                fontWeight: 800,
                color: '#1e3a5f',
                margin: 0,
                marginBottom: '4px',
                letterSpacing: '-0.3px',
              }}
            >
              {strings.howCanWeHelp}
            </h2>
            <p
              style={{
                fontSize: '14px',
                fontWeight: 500,
                color: '#64748b',
                margin: 0,
              }}
            >
              Choose an option or tap the mic and speak
            </p>
          </div>

          {/* 2×2 Action Card Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: isWide ? 'repeat(2, 1fr)' : 'repeat(2, 1fr)',
              gap: isWide ? '14px' : '12px',
              maxWidth: '520px',
            }}
          >
            {cards.map((card, i) => (
              <ActionCard
                key={card.key}
                card={card}
                strings={strings}
                index={i}
                isWide={isWide}
              />
            ))}
          </div>
        </div>
      </main>

      {/* ═══════════════ BOTTOM INFO STRIP ═══════════════ */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          gap: isWide ? '32px' : '16px',
          padding: '10px 24px',
          background: 'rgba(255,255,255,0.6)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          borderTop: '1px solid rgba(21,128,61,0.08)',
          flexShrink: 0,
          flexWrap: 'wrap',
        }}
      >
        {infoItems.map((item) => (
          <div
            key={item.textKey}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 600,
              color: '#475569',
            }}
          >
            <span aria-hidden="true">{item.icon}</span>
            <span>{String(strings[item.textKey] || item.textKey)}</span>
          </div>
        ))}
      </div>

      {/* ═══════════════ FOOTER ═══════════════ */}
      <footer
        style={{
          textAlign: 'center',
          padding: '8px 24px',
          fontSize: '12px',
          fontWeight: 600,
          color: '#94a3b8',
          background: 'rgba(255,255,255,0.4)',
          flexShrink: 0,
          letterSpacing: '0.3px',
        }}
      >
        {strings.homeCoopFooter || 'Stronger Cooperatives, A Brighter India'} • {strings.kioskSubtitle}
      </footer>

      {/* 58mm Thermal Printable Slip (styled by @media print) */}
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
}: {
  card: ActionCardConfig;
  strings: KioskStrings;
  index: number;
  isWide: boolean;
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
        gap: '8px',
        padding: isWide ? '18px 20px' : '14px 16px',
        minHeight: isWide ? '110px' : '96px',
        background: isHovered
          ? 'rgba(255,255,255,0.95)'
          : 'rgba(255,255,255,0.75)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1.5px solid ${isHovered ? card.accent + '40' : 'rgba(255,255,255,0.5)'}`,
        borderRadius: '18px',
        boxShadow: isHovered
          ? `0 8px 28px rgba(0,0,0,0.08), 0 0 0 1px ${card.accent}15`
          : '0 2px 12px rgba(0,0,0,0.04)',
        cursor: 'pointer',
        textAlign: 'left',
        transition: 'all 0.18s ease',
        transform: isPressed ? 'scale(0.97)' : isHovered ? 'translateY(-2px)' : 'none',
        animation: `homeCardStagger 0.5s ease-out ${0.4 + index * 0.1}s both`,
        touchAction: 'manipulation',
        userSelect: 'none',
        WebkitTapHighlightColor: 'transparent',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Icon badge */}
      <div
        style={{
          width: '40px',
          height: '40px',
          borderRadius: '12px',
          background: card.accentBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '22px',
          flexShrink: 0,
        }}
        aria-hidden="true"
      >
        {card.icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1, width: '100%' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px',
            marginBottom: '3px',
          }}
        >
          <span
            style={{
              fontSize: isWide ? '16px' : '14px',
              fontWeight: 700,
              color: '#1e3a5f',
              lineHeight: 1.2,
            }}
          >
            {title}
          </span>
          {actionLabel && (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: card.accent,
                backgroundColor: card.accentBg,
                padding: '2px 8px',
                borderRadius: '6px',
                border: `1px solid ${card.accent}30`,
                whiteSpace: 'nowrap',
                marginRight: '16px',
              }}
            >
              {actionLabel}
            </span>
          )}
        </div>
        <div
          style={{
            fontSize: isWide ? '12px' : '11px',
            fontWeight: 500,
            color: '#64748b',
            lineHeight: 1.3,
          }}
        >
          {desc}
        </div>
      </div>

      {/* Arrow */}
      <div
        style={{
          position: 'absolute',
          right: '16px',
          top: '50%',
          transform: `translateY(-50%) translateX(${isHovered ? '0' : '-4px'})`,
          opacity: isHovered ? 0.6 : 0.25,
          fontSize: '16px',
          color: card.accent,
          transition: 'all 0.18s ease',
        }}
        aria-hidden="true"
      >
        →
      </div>
    </button>
  );
}
