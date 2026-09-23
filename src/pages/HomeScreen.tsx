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
import { useVoiceInteraction } from '../hooks/useVoiceInteraction';
import type { PrintPayload, LanguageCode } from '../types';
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
  onSpeak?: () => void;
  onType: () => void;
  onScan: () => void;
  onPacsHelp: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
  assistantState?: AssistantState;
  mouthOpen?: number;
  speechText?: string;
  userTranscript?: string;
  language?: LanguageCode;
  setActiveOperation?: (active: boolean) => void;
  onMessageAdded?: (userText: string, assistantText: string) => void;
}

// ── Action card config ──────────────────────────────────────────────────────────

interface ActionCardConfig {
  key: string;
  icon: (color: string, size: number) => React.ReactNode;
  titleKey: keyof KioskStrings;
  descKey: keyof KioskStrings;
  actionKey?: keyof KioskStrings;
  accent: string;
  accentBg: string;
  onClick: () => void;
}

// ── Action Card Vector SVG Icons (replacing emojis) ───────────────────────────

function VoiceSvgIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" fill={`${color}22`} />
      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
      <line x1="12" y1="18" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function TypeSvgIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="4" fill={`${color}16`} />
      <circle cx="6" cy="8" r="1" fill={color} />
      <circle cx="10" cy="8" r="1" fill={color} />
      <circle cx="14" cy="8" r="1" fill={color} />
      <circle cx="18" cy="8" r="1" fill={color} />
      <circle cx="6" cy="12" r="1" fill={color} />
      <circle cx="10" cy="12" r="1" fill={color} />
      <circle cx="14" cy="12" r="1" fill={color} />
      <circle cx="18" cy="12" r="1" fill={color} />
      <line x1="7" y1="16" x2="17" y2="16" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

function ScanSvgIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 8V5a2 2 0 0 1 2-2h3" />
      <path d="M15 3h3a2 2 0 0 1 2 2v3" />
      <path d="M20 16v3a2 2 0 0 1-2 2h-3" />
      <path d="M9 21H6a2 2 0 0 1-2-2v-3" />
      <path d="M8 8h8a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1Z" fill={`${color}18`} />
      <line x1="7" y1="12" x2="17" y2="12" strokeDasharray="2 2" />
    </svg>
  );
}

function PacsSvgIcon({ color, size = 26 }: { color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" fill={`${color}20`} />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
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
  language,
  setActiveOperation,
  onMessageAdded,
}: HomeScreenProps) {
  const width = useWindowWidth();
  const now = useClock();
  const isWide = width >= 1024;
  const isMobile = width <= 768;
  const isCompact = width <= 820;

  // Real voice interaction engine (inline on HomeScreen, zero redirect)
  const voice = useVoiceInteraction({
    language: language || 'en',
    strings,
    setActiveOperation,
    onMessageAdded,
  });

  // Determine active character state: prop overrides take precedence for tests, otherwise voice engine
  const resolvedState: AssistantState =
    assistantState ||
    (voice.state !== 'idle'
      ? voice.state
      : speakState === 'listening'
      ? 'listening'
      : speakState === 'processing'
      ? 'thinking'
      : speakState === 'error'
      ? 'error'
      : 'idle');

  const resolvedMouthOpen =
    mouthOpen !== undefined && mouthOpen !== 0 ? mouthOpen : voice.mouthOpen;

  const resolvedSpeechText =
    speechText ||
    (voice.displayAnswer ? voice.displayAnswer : voice.errorMessage ? voice.errorMessage : undefined);

  const resolvedUserTranscript =
    userTranscript || voice.userTranscript;

  // Inline microphone trigger (zero navigation away from Home)
  const handleMainMicClick = async () => {
    onSpeak?.();
    if (voice.awaitingClarificationGesture) {
      await voice.startListeningForClarification();
      return;
    }
    if (resolvedState === 'idle') {
      await voice.startListening();
    } else if (resolvedState === 'listening') {
      await voice.stopListening();
    } else if (resolvedState === 'speaking') {
      voice.stopAudio();
    } else if (resolvedState === 'success' || resolvedState === 'error') {
      await voice.startListening();
    }
  };

  // Inline "Ask by Voice" card trigger
  const handleVoiceCardClick = async () => {
    onSpeak?.();
    if (resolvedState === 'idle') {
      await voice.startListening();
    } else if (resolvedState === 'listening') {
      await voice.stopListening();
    } else if (resolvedState === 'speaking') {
      voice.stopAudio();
    } else {
      await voice.startListening();
    }
  };

  // Start Over handler resets voice state as well
  const handleStartOverClick = () => {
    voice.reset();
    onStartOver();
  };

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
      icon: (color, size) => <VoiceSvgIcon color={color} size={size} />,
      titleKey: 'homeAskByVoice',
      descKey: 'homeAskByVoiceDesc',
      accent: '#15803d',
      accentBg: 'rgba(21,128,61,0.12)',
      onClick: handleVoiceCardClick,
    },
    {
      key: 'type',
      icon: (color, size) => <TypeSvgIcon color={color} size={size} />,
      titleKey: 'homeTypeQuestion',
      descKey: 'homeTypeQuestionDesc',
      actionKey: 'actionType',
      accent: '#0284c7',
      accentBg: 'rgba(2,132,199,0.12)',
      onClick: onType,
    },
    {
      key: 'scan',
      icon: (color, size) => <ScanSvgIcon color={color} size={size} />,
      titleKey: 'homeScanDocument',
      descKey: 'homeScanDocumentDesc',
      accent: '#ea580c',
      accentBg: 'rgba(234,88,12,0.12)',
      onClick: onScan,
    },
    {
      key: 'pacs',
      icon: (color, size) => <PacsSvgIcon color={color} size={size} />,
      titleKey: 'homePacsAssistance',
      descKey: 'homePacsAssistanceDesc',
      actionKey: 'actionHelpPacs',
      accent: '#7c3aed',
      accentBg: 'rgba(124,58,237,0.12)',
      onClick: onPacsHelp,
    },
  ];

  // 3 Trust indicators (clean vector SVG icons)
  const infoItems = [
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 22 12 12" />
          <path d="M11 2a8 8 0 0 0-8 8v12" />
          <path d="M22 11a8 8 0 0 0-8-8v12" />
        </svg>
      ),
      textKey: 'homeFarmerFriendly' as keyof KioskStrings,
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      ),
      textKey: 'homeTrustedInfo' as keyof KioskStrings,
    },
    {
      icon: (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 10v12" />
          <path d="M12 10a5 5 0 0 1 5-5h2a5 5 0 0 1-5 5" />
          <path d="M12 14a5 5 0 0 0-5-5H5a5 5 0 0 0 5 5" />
        </svg>
      ),
      textKey: 'homeBrighterTomorrow' as keyof KioskStrings,
    },
  ];

  return (
    <div
      className="kiosk-home-container"
      style={{
        width: '100%',
        minHeight: isMobile ? '100dvh' : '100vh',
        height: isMobile ? 'auto' : '100vh',
        display: 'flex',
        flexDirection: 'column',
        overflowY: isMobile ? 'auto' : 'hidden',
        overflowX: 'hidden',
        boxSizing: 'border-box',
        background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 30%, #fff7ed 70%, #fef3c7 100%)',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      {/* ═══════════════ HEADER BAR ═══════════════ */}
      <header
        className="kiosk-home-header"
        style={{
          display: 'flex',
          flexDirection: isMobile ? 'column' : 'row',
          alignItems: isMobile ? 'stretch' : 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '10px 14px' : '8px 24px',
          height: isMobile ? 'auto' : '64px',
          minHeight: isMobile ? 'auto' : '64px',
          gap: isMobile ? '10px' : '14px',
          flexShrink: 0,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          borderBottom: '1.5px solid rgba(21,128,61,0.12)',
          zIndex: 20,
        }}
      >
        {/* Row 1 on mobile: Brand on left, Time + Connectivity on right */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: isMobile ? '100%' : 'auto', gap: '12px' }}>
          {/* Brand Identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '10px' : '12px' }}>
            <img
              src={logoSrc}
              alt="SahkaarSetu Logo"
              style={{ height: isMobile ? '36px' : '42px', width: isMobile ? '36px' : '42px', objectFit: 'contain' }}
            />
            <div>
              <div style={{ fontSize: isMobile ? '18px' : '20px', fontWeight: 800, color: '#15803d', lineHeight: 1.1, letterSpacing: '-0.3px' }}>
                {strings.brandName}
              </div>
              <div style={{ fontSize: isMobile ? '10px' : '11px', color: '#64748b', fontWeight: 600 }}>
                {strings.tagline}
              </div>
            </div>
          </div>

          {/* If mobile, show Time & Connectivity in Row 1 */}
          {isMobile && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ textAlign: 'right', lineHeight: 1.15 }}>
                <div data-testid="clock-time" style={{ fontSize: '13px', fontWeight: 700, color: '#1e3a5f' }}>
                  {timeStr}
                </div>
                <div data-testid="clock-date" style={{ fontSize: '10px', color: '#64748b', fontWeight: 600 }}>
                  {dateStr}
                </div>
              </div>
              <div
                data-testid="connectivity-indicator"
                title={isOnline ? 'Online' : 'Offline'}
                style={{
                  width: '9px',
                  height: '9px',
                  borderRadius: '50%',
                  backgroundColor: isOnline ? '#22c55e' : '#ef4444',
                  boxShadow: `0 0 6px ${isOnline ? 'rgba(34,197,94,0.6)' : 'rgba(239,68,68,0.6)'}`,
                  flexShrink: 0,
                }}
              />
            </div>
          )}
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

        {/* Controls: On desktop (time + connectivity + buttons); On mobile (Row 2 full-width buttons) */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: isMobile ? '8px' : '14px',
            width: isMobile ? '100%' : 'auto',
            justifyContent: isMobile ? 'stretch' : 'flex-end',
          }}
        >
          {!isMobile && (
            <>
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
            </>
          )}

          {/* Language Selector */}
          <button
            onClick={onChangeLanguage}
            aria-label={strings.changeLanguage}
            style={{
              flex: isMobile ? 1 : 'none',
              height: '48px',
              minHeight: '48px',
              padding: isMobile ? '0 10px' : '0 16px',
              background: 'rgba(21,128,61,0.08)',
              color: '#15803d',
              border: '2px solid rgba(21,128,61,0.25)',
              borderRadius: '12px',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              touchAction: 'manipulation',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxSizing: 'border-box',
            }}
          >
            <span>🌐</span>
            <span>{strings.changeLanguage}</span>
          </button>

          {/* Start Over Button */}
          <button
            onClick={handleStartOverClick}
            aria-label={strings.promptStartOver}
            style={{
              flex: isMobile ? 1 : 'none',
              height: '48px',
              minHeight: '48px',
              padding: isMobile ? '0 10px' : '0 16px',
              background: 'rgba(220,38,38,0.06)',
              color: '#dc2626',
              border: '2px solid rgba(220,38,38,0.25)',
              borderRadius: '12px',
              fontSize: isMobile ? '13px' : '14px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              touchAction: 'manipulation',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              boxSizing: 'border-box',
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
        className="kiosk-home-main"
        style={{
          flex: isMobile ? '0 0 auto' : 1,
          display: 'flex',
          flexDirection: isWide ? 'row' : 'column',
          overflow: isMobile ? 'visible' : 'hidden',
          position: 'relative',
        }}
      >
        {/* ── Left Hero Panel (54–56% width): Animated Assistant + Mic ── */}
        <div
          className="kiosk-hero-panel"
          style={{
            flex: isWide ? '0 0 54%' : '0 0 auto',
            position: 'relative',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: isMobile ? 'flex-start' : 'space-between',
            padding: isWide ? '16px 28px 18px' : isMobile ? '12px 14px 18px' : '12px 16px',
            overflow: 'hidden',
            minHeight: isWide ? 'auto' : isMobile ? 'auto' : '360px',
          }}
        >
          {/* Rural Maharashtra Hero Assistant Background Image */}
          <img
            src={heroAssistantSrc}
            alt="SahkaarSetu Rural Cooperative Assistant Landscape"
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
              mouthOpen={resolvedMouthOpen}
              strings={strings}
              speechText={resolvedSpeechText}
              userTranscript={resolvedUserTranscript}
              failureLayer={voice.failureLayer || undefined}
              isAudioPlaying={voice.isPlaying}
              onPlayAgain={voice.replayAudio}
              onStopAudio={voice.stopAudio}
              isMobile={isMobile}
              awaitingClarificationGesture={voice.awaitingClarificationGesture}
              onClarificationTap={voice.startListeningForClarification}
            />
          </div>

          {/* Central Microphone CTA Button with Flanking Audio Waves (Reference B) */}
          <div
            style={{
              position: 'relative',
              zIndex: 2,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: isWide ? '16px' : '10px',
              marginTop: '4px',
            }}
          >
            {/* Left Audio Waveform Bars */}
            <div
              aria-hidden="true"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                opacity: resolvedState === 'listening' || resolvedState === 'speaking' ? 1 : 0.4,
                transition: 'opacity 0.3s ease',
              }}
            >
              {[12, 22, 36, 20, 14].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: '4px',
                    height: `${h}px`,
                    background: resolvedState === 'listening' ? '#22c55e' : resolvedState === 'speaking' ? '#ea580c' : 'rgba(34, 197, 94, 0.45)',
                    borderRadius: '4px',
                    animation:
                      resolvedState === 'listening' || resolvedState === 'speaking'
                        ? `homeWaveBounce 0.7s ease-in-out infinite ${i * 0.12}s`
                        : 'none',
                  }}
                />
              ))}
            </div>

            {/* Central Circular Button Container */}
            <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {/* Animated Ripple Wave */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: 0,
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
                onClick={handleMainMicClick}
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
                      : resolvedState === 'speaking'
                      ? 'linear-gradient(145deg, #f97316 0%, #c2410c 100%)'
                      : voice.awaitingClarificationGesture
                      ? 'linear-gradient(145deg, #f59e0b 0%, #d97706 100%)'
                      : 'linear-gradient(145deg, #22c55e 0%, #15803d 100%)',
                  border: '5px solid rgba(255, 255, 255, 0.95)',
                  color: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  cursor: 'pointer',
                  boxShadow: voice.awaitingClarificationGesture
                    ? '0 0 35px rgba(245, 158, 11, 0.5), 0 16px 40px rgba(217, 119, 6, 0.35)'
                    : '0 0 35px rgba(34, 197, 94, 0.5), 0 16px 40px rgba(21, 128, 61, 0.35)',
                  animation: 'homeMicGlow 3s ease-in-out infinite, homeMicBreathe 4s ease-in-out infinite',
                  transition: 'transform 0.15s ease, background 0.3s ease',
                  touchAction: 'manipulation',
                  userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <span
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                  }}
                  aria-hidden="true"
                >
                  {resolvedState === 'listening' ? (
                    <svg width={isWide ? 44 : 34} height={isWide ? 44 : 34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" fill="rgba(255,255,255,0.3)" />
                      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="8" y1="22" x2="16" y2="22" />
                    </svg>
                  ) : resolvedState === 'thinking' ? (
                    <svg width={isWide ? 44 : 34} height={isWide ? 44 : 34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1.5s linear infinite' }}>
                      <circle cx="12" cy="12" r="3" />
                      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
                    </svg>
                  ) : resolvedState === 'speaking' ? (
                    <svg width={isWide ? 44 : 34} height={isWide ? 44 : 34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="rgba(255,255,255,0.3)" />
                      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
                      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
                    </svg>
                  ) : (
                    <svg width={isWide ? 44 : 34} height={isWide ? 44 : 34} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="9" y="2" width="6" height="12" rx="3" fill="rgba(255,255,255,0.3)" />
                      <path d="M5 10v1a7 7 0 0 0 14 0v-1" />
                      <line x1="12" y1="18" x2="12" y2="22" />
                      <line x1="8" y1="22" x2="16" y2="22" />
                    </svg>
                  )}
                </span>
                <span
                  style={{
                    fontSize: isWide ? '17px' : '14px',
                    fontWeight: 800,
                    textAlign: 'center',
                    letterSpacing: '0.3px',
                  }}
                >
                  {voice.awaitingClarificationGesture
                    ? (strings.clarificationTapToAnswer || 'Tap to Answer')
                    : resolvedState === 'thinking'
                    ? strings.stateProcessing || 'Processing'
                    : resolvedState === 'speaking'
                    ? strings.voiceStopAudio || 'Stop'
                    : strings.actionSpeak}
                </span>
              </button>

              {/* Tap to speak Glass Badge */}
              <div
                style={{
                  marginTop: '8px',
                  fontSize: isWide ? '14px' : '12px',
                  fontWeight: 700,
                  color: voice.awaitingClarificationGesture ? '#d97706' : resolvedState === 'listening' ? '#047857' : '#15803d',
                  background: 'rgba(255, 255, 255, 0.92)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  padding: '4px 16px',
                  borderRadius: '20px',
                  border: voice.awaitingClarificationGesture ? '1.5px solid rgba(245, 158, 11, 0.4)' : '1px solid rgba(21, 128, 61, 0.2)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
                  letterSpacing: '-0.2px',
                  whiteSpace: 'nowrap',
                }}
              >
                {voice.awaitingClarificationGesture
                  ? (strings.clarificationReady || 'Ready for your answer')
                  : resolvedState === 'listening'
                  ? strings.voiceTapToStop || 'Tap to finish speaking'
                  : resolvedState === 'thinking'
                  ? strings.assistantThinking || 'Thinking...'
                  : resolvedState === 'speaking'
                  ? strings.voiceStopAudio || 'Tap to stop'
                  : (strings.homeTapToSpeak || strings.pressToSpeak)}
              </div>
            </div>

            {/* Right Audio Waveform Bars */}
            <div
              aria-hidden="true"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
                opacity: resolvedState === 'listening' || resolvedState === 'speaking' ? 1 : 0.4,
                transition: 'opacity 0.3s ease',
              }}
            >
              {[14, 20, 36, 22, 12].map((h, i) => (
                <span
                  key={i}
                  style={{
                    width: '4px',
                    height: `${h}px`,
                    background: resolvedState === 'listening' ? '#22c55e' : resolvedState === 'speaking' ? '#ea580c' : 'rgba(34, 197, 94, 0.45)',
                    borderRadius: '4px',
                    animation:
                      resolvedState === 'listening' || resolvedState === 'speaking'
                        ? `homeWaveBounce 0.7s ease-in-out infinite ${0.48 - i * 0.12}s`
                        : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        {/* ── Right Action Panel (44–46% width): Prominent Action Cards ── */}
        <div
          className="kiosk-action-panel"
          style={{
            flex: isWide ? '0 0 46%' : isMobile ? '0 0 auto' : '1 1 auto',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: isMobile ? 'flex-start' : 'center',
            padding: isWide ? '20px 32px 20px 16px' : isMobile ? '16px 14px 20px' : '12px 16px',
            overflowY: isMobile ? 'visible' : 'auto',
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
                fontSize: isWide ? '32px' : isMobile ? '20px' : '22px',
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
                fontSize: isWide ? '16px' : isMobile ? '12px' : '13px',
                fontWeight: 500,
                color: '#475569',
                margin: 0,
              }}
            >
              Choose an option or tap the mic and speak
            </p>
          </div>

          {/* Action Card Grid (1 col on narrow mobile <= 600px, 2 col otherwise) */}
          <div
            className="kiosk-action-grid"
            style={{
              display: 'grid',
              gridTemplateColumns: width <= 600 ? '1fr' : 'repeat(2, 1fr)',
              gap: isWide ? '16px' : '10px',
              width: '100%',
              maxWidth: isMobile ? '100%' : '560px',
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
                isMobile={isMobile}
              />
            ))}
          </div>
        </div>
      </main>

      {/* ═══════════════ BOTTOM DECORATIVE STRIP ═══════════════ */}
      <div
        className="kiosk-bottom-strip"
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          gap: isWide ? '36px' : isMobile ? '14px' : '16px',
          padding: isMobile ? '12px 14px' : '10px 24px',
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
        className="kiosk-footer"
        style={{
          textAlign: 'center',
          padding: isMobile ? '10px 14px 18px' : '6px 24px',
          fontSize: isMobile ? '11px' : '12px',
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
  isMobile,
}: {
  card: ActionCardConfig;
  strings: KioskStrings;
  index: number;
  isWide: boolean;
  isCompact: boolean;
  isMobile?: boolean;
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
        flexDirection: isMobile ? 'row' : 'column',
        alignItems: isMobile ? 'center' : 'flex-start',
        justifyContent: 'space-between',
        padding: isWide ? '20px 22px' : isMobile ? '14px 18px' : '14px 16px',
        minHeight: isWide ? '180px' : isMobile ? '80px' : isCompact ? '110px' : '140px',
        background: isHovered
          ? 'rgba(255,255,255,0.98)'
          : 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(18px)',
        WebkitBackdropFilter: 'blur(18px)',
        border: `2px solid ${isHovered ? card.accent : 'rgba(255,255,255,0.9)'}`,
        borderRadius: isMobile ? '18px' : '26px',
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
        gap: isMobile ? '12px' : '0px',
      }}
    >
      {/* Icon badge */}
      <div
        style={{
          width: isWide ? '52px' : isMobile ? '44px' : '42px',
          height: isWide ? '52px' : isMobile ? '44px' : '42px',
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
        {card.icon(card.accent, isWide ? 28 : 22)}
      </div>

      {/* Middle: Title & Subtitle */}
      <div style={{ flex: isMobile ? 1 : 'none', width: isMobile ? 'auto' : '100%', marginTop: isMobile ? 0 : '10px' }}>
        <div
          style={{
            fontSize: isWide ? '22px' : '16px',
            fontWeight: 800,
            color: '#1e3a5f',
            marginBottom: '2px',
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

      {/* Right: Tag and/or Arrow */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', alignSelf: isMobile ? 'center' : 'flex-end', flexShrink: 0 }}>
        {actionLabel && (
          <span
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: card.accent,
              backgroundColor: card.accentBg,
              padding: '3px 8px',
              borderRadius: '8px',
              border: `1.5px solid ${card.accent}35`,
              whiteSpace: 'nowrap',
              letterSpacing: '-0.2px',
            }}
          >
            {actionLabel}
          </span>
        )}
        <div
          style={{
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
      </div>
    </button>
  );
}
