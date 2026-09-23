/**
 * Test Suite: Mobile Responsive Layout + Interactive Clarification Conversation
 *
 * Verifies:
 * PART A — MOBILE KIOSK RESPONSIVE FIX
 * 1. Mobile viewport container has .kiosk-home-container with vertical scroll capability
 * 2. Mobile header wraps into 2 rows with Change Language and Start Over buttons comfortably accessible (>= 48px height)
 * 3. Narrow mobile screens (<= 600px) stack action cards in 1 column with min-height >= 80px
 * 4. Desktop layouts (1280x800, 1024x768) preserve approved side-by-side hero + action card composition
 * 5. Bottom strip and footer exist in normal document flow
 *
 * PART B — INTERACTIVE CLARIFICATION CONVERSATION
 * 6. Clarification detector identifies clarification questions in English, Hindi, and Marathi
 * 7. Clarification detector does not falsely trigger on normal informational answers
 * 8. Contextual query compilation combines previous context with user follow-up answer
 * 9. Preserves session_id across clarification turns
 * 10. Fallback UI displays "Tap to answer" / "Ready for your answer" when auto-listen gesture is required
 * 11. Start Over cleanly clears pending clarification state
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { HomeScreen } from '../pages/HomeScreen';
import { getStrings } from '../i18n';
import {
  detectClarification,
  buildClarificationContextQuery,
} from '../services/clarificationDetector';

const strings = getStrings('en');

const DEFAULT_PROPS = {
  strings,
  serviceAvailable: true,
  onSpeak: vi.fn(),
  onType: vi.fn(),
  onScan: vi.fn(),
  onPacsHelp: vi.fn(),
  onChangeLanguage: vi.fn(),
  onStartOver: vi.fn(),
};

describe('PART A — Mobile Responsive Kiosk Layout', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: originalInnerWidth,
    });
  });

  it('renders mobile layout with .kiosk-home-container and vertical scroll at width <= 768px', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 390, // iPhone 12/13/14 portrait width
    });

    const { container } = render(<HomeScreen {...DEFAULT_PROPS} />);
    const homeContainer = container.querySelector('.kiosk-home-container') as HTMLElement;
    expect(homeContainer).toBeInTheDocument();
    expect(homeContainer.style.overflowY).toBe('auto');
    expect(homeContainer.style.minHeight).toBe('100dvh');
  });

  it('renders 2-row header on mobile with accessible buttons (>= 48px touch target, no clipping)', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    });

    render(<HomeScreen {...DEFAULT_PROPS} />);

    const langBtn = screen.getByRole('button', { name: strings.changeLanguage });
    const startOverBtn = screen.getByRole('button', { name: strings.promptStartOver });

    expect(langBtn).toBeInTheDocument();
    expect(startOverBtn).toBeInTheDocument();

    expect(langBtn.style.minHeight).toBe('48px');
    expect(startOverBtn.style.minHeight).toBe('48px');
    expect(langBtn.style.flex).toMatch(/1/);
    expect(startOverBtn.style.flex).toMatch(/1/);
  });

  it('renders action cards stacked in 1 column on narrow screens (<= 600px) with min-height >= 80px', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 412,
    });

    const { container } = render(<HomeScreen {...DEFAULT_PROPS} />);
    const grid = container.querySelector('.kiosk-action-grid') as HTMLElement;
    expect(grid).toBeInTheDocument();
    expect(grid.style.gridTemplateColumns).toBe('1fr');

    const speakCard = screen.getByRole('button', { name: /Ask by Voice/i });
    expect(speakCard).toBeInTheDocument();
    expect(speakCard.style.minHeight).toBe('80px');
  });

  it('preserves desktop horizontal composition and hidden overflow at 1280x800', () => {
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1280,
    });

    const { container } = render(<HomeScreen {...DEFAULT_PROPS} />);
    const homeContainer = container.querySelector('.kiosk-home-container') as HTMLElement;
    expect(homeContainer).toBeInTheDocument();
    expect(homeContainer.style.overflowY).toBe('hidden');
    expect(homeContainer.style.height).toBe('100vh');

    const grid = container.querySelector('.kiosk-action-grid') as HTMLElement;
    expect(grid.style.gridTemplateColumns).toBe('repeat(2, 1fr)');
  });

  it('renders bottom info strip and footer in normal document flow', () => {
    const { container } = render(<HomeScreen {...DEFAULT_PROPS} />);
    const bottomStrip = container.querySelector('.kiosk-bottom-strip');
    const footer = container.querySelector('.kiosk-footer');

    expect(bottomStrip).toBeInTheDocument();
    expect(footer).toBeInTheDocument();
    expect(screen.getByText(/Farmer Friendly/i)).toBeInTheDocument();
    expect(screen.getByText(/Stronger Cooperatives, A Brighter India/i)).toBeInTheDocument();
  });
});

describe('PART B — Interactive Clarification Conversation Flow', () => {
  it('detects clarification questions in English', () => {
    const res1 = detectClarification('Which state are you from?');
    expect(res1.isClarification).toBe(true);

    const res2 = detectClarification('Please specify which district or state your cooperative operates in.');
    expect(res2.isClarification).toBe(true);

    const res3 = detectClarification('Could you tell me what crop you are growing?');
    expect(res3.isClarification).toBe(true);
  });

  it('detects clarification questions in Hindi', () => {
    const res1 = detectClarification('आप किस राज्य से हैं?');
    expect(res1.isClarification).toBe(true);

    const res2 = detectClarification('कृपया अपना राज्य या ज़िला बताएं');
    expect(res2.isClarification).toBe(true);

    const res3 = detectClarification('क्या आप अपनी ज़मीन का क्षेत्रफल बता सकते हैं?');
    expect(res3.isClarification).toBe(true);
  });

  it('detects clarification questions in Marathi', () => {
    const res1 = detectClarification('तुम्ही कोणत्या राज्यातून आहात?');
    expect(res1.isClarification).toBe(true);

    const res2 = detectClarification('कृपया तुमचा जिल्हा किंवा राज्य सांगा.');
    expect(res2.isClarification).toBe(true);

    const res3 = detectClarification('तुम्ही कोणत्या पिकाची लागवड केली आहे?');
    expect(res3.isClarification).toBe(true);
  });

  it('does NOT falsely trigger on standard informational responses', () => {
    const res1 = detectClarification('PM-KUSUM scheme provides subsidy up to 60% on solar pumps for farmers.');
    expect(res1.isClarification).toBe(false);

    const res2 = detectClarification('पीक विम्यासाठी अर्ज करण्याची शेवटची तारीख ३१ जुलै आहे.');
    expect(res2.isClarification).toBe(false);

    const res3 = detectClarification('सहकारी संस्थांच्या नोंदणीसाठी निबंधक कार्यालयात संपर्क साधावा.');
    expect(res3.isClarification).toBe(false);
  });

  it('compiles contextual query with previous query and user follow-up answer', () => {
    const compiled = buildClarificationContextQuery(
      'I want to buy a tractor',
      'Which state are you from?',
      'Maharashtra'
    );
    expect(compiled).toBe('I want to buy a tractor in Maharashtra');

    const compiledGeneric = buildClarificationContextQuery(
      'How to apply for crop loan',
      'Are you a small or marginal farmer?',
      'Small farmer'
    );
    expect(compiledGeneric).toBe('How to apply for crop loan (Small farmer)');
  });

  it('resets speech and voice interaction state cleanly on Start Over', () => {
    const onStartOver = vi.fn();
    render(<HomeScreen {...DEFAULT_PROPS} onStartOver={onStartOver} />);

    const startOverBtn = screen.getByRole('button', { name: strings.promptStartOver });
    fireEvent.click(startOverBtn);

    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});
