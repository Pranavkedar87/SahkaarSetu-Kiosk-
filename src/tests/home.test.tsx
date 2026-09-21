/**
 * Home Screen Tests
 *
 * Verifies:
 * - Renders "How can we help you?" greeting
 * - Speak button present and visually dominant
 * - Type button present
 * - Scan Document button present
 * - Get Help from PACS available
 * - No sidebar/admin/profile/settings/login elements
 * - Change language button visible
 * - Start Over button visible
 * - Service unavailable banner shown when serviceAvailable=false
 * - Service unavailable banner hidden when serviceAvailable=true
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HomeScreen } from '../pages/HomeScreen';
import { getStrings } from '../i18n';

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

describe('HomeScreen', () => {
  it('renders "How can we help you?" greeting', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.getByText('How can we help you?')).toBeInTheDocument();
  });

  it('renders Speak action button', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.getByText('Speak')).toBeInTheDocument();
  });

  it('renders Type action button', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.getByText('Type')).toBeInTheDocument();
  });

  it('renders Scan Document button', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.getByText('Scan Document')).toBeInTheDocument();
  });

  it('renders Get Help from PACS button', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.getByText('Get Help from PACS')).toBeInTheDocument();
  });

  it('renders Change Language button', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.getByText(/Change Language/i)).toBeInTheDocument();
  });

  it('renders Start Over button in header', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    const startOverButtons = screen.getAllByText(/Start Over/i);
    expect(startOverButtons.length).toBeGreaterThan(0);
  });

  it('calls onSpeak when Speak is clicked', () => {
    const onSpeak = vi.fn();
    render(<HomeScreen {...DEFAULT_PROPS} onSpeak={onSpeak} />);
    fireEvent.click(screen.getByText('Speak'));
    expect(onSpeak).toHaveBeenCalledTimes(1);
  });

  it('calls onType when Type is clicked', () => {
    const onType = vi.fn();
    render(<HomeScreen {...DEFAULT_PROPS} onType={onType} />);
    fireEvent.click(screen.getByText('Type'));
    expect(onType).toHaveBeenCalledTimes(1);
  });

  it('calls onScan when Scan Document is clicked', () => {
    const onScan = vi.fn();
    render(<HomeScreen {...DEFAULT_PROPS} onScan={onScan} />);
    fireEvent.click(screen.getByText('Scan Document'));
    expect(onScan).toHaveBeenCalledTimes(1);
  });

  it('shows ServiceUnavailableBanner when serviceAvailable=false', () => {
    render(<HomeScreen {...DEFAULT_PROPS} serviceAvailable={false} />);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText(/PACS clerk/i)).toBeInTheDocument();
  });

  it('hides ServiceUnavailableBanner when serviceAvailable=true', () => {
    render(<HomeScreen {...DEFAULT_PROPS} serviceAvailable={true} />);
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('does not render admin/sidebar/profile/login/dashboard/settings elements', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByText(/\bsidebar\b/i)).toBeNull();
    expect(screen.queryByText(/\blogin\b/i)).toBeNull();
    expect(screen.queryByText(/\bsign in\b/i)).toBeNull();
    expect(screen.queryByText(/\bprofile\b/i)).toBeNull();
    expect(screen.queryByText(/\bsettings\b/i)).toBeNull();
    expect(screen.queryByText(/\bdashboard\b/i)).toBeNull();
    expect(screen.queryByText(/\badmin\b/i)).toBeNull();
  });

  // ── K9 Redesign Tests ──────────────────────────────────────────────────────
  it('renders welcome greeting card with Namaste and sub-greeting', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.getByText(strings.homeGreeting)).toBeInTheDocument();
    expect(screen.getByText(strings.homeSubGreeting)).toBeInTheDocument();
  });

  it('renders rural cooperative assistant hero image with appropriate alt text', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    const heroImg = screen.getByAltText(/rural cooperative assistant/i);
    expect(heroImg).toBeInTheDocument();
  });

  it('renders live clock time and date display', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.getByTestId('clock-time')).toBeInTheDocument();
    expect(screen.getByTestId('clock-date')).toBeInTheDocument();
  });

  it('renders connectivity indicator with online status', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    const indicator = screen.getByTestId('connectivity-indicator');
    expect(indicator).toBeInTheDocument();
    expect(indicator).toHaveAttribute('title', 'Online');
  });

  it('renders bottom info strip with farmer-friendly badges', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.getByText(strings.homeFarmerFriendly)).toBeInTheDocument();
    expect(screen.getByText(strings.homeTrustedInfo)).toBeInTheDocument();
    expect(screen.getByText(strings.homeBrighterTomorrow)).toBeInTheDocument();
  });

  it('renders cooperative-themed quote and footer', () => {
    render(<HomeScreen {...DEFAULT_PROPS} />);
    expect(screen.getByText(strings.homeQuote)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(strings.homeCoopFooter, 'i'))).toBeInTheDocument();
  });

  it('calls onSpeak when Ask by Voice card is clicked', () => {
    const onSpeak = vi.fn();
    render(<HomeScreen {...DEFAULT_PROPS} onSpeak={onSpeak} />);
    const voiceCard = screen.getByRole('button', { name: new RegExp(strings.homeAskByVoice, 'i') });
    fireEvent.click(voiceCard);
    expect(onSpeak).toHaveBeenCalledTimes(1);
  });

  it('calls onPacsHelp when PACS card is clicked', () => {
    const onPacsHelp = vi.fn();
    render(<HomeScreen {...DEFAULT_PROPS} onPacsHelp={onPacsHelp} />);
    const pacsCard = screen.getByRole('button', { name: new RegExp(strings.homePacsAssistance, 'i') });
    fireEvent.click(pacsCard);
    expect(onPacsHelp).toHaveBeenCalledTimes(1);
  });

  it('calls onChangeLanguage when language button is clicked', () => {
    const onChangeLanguage = vi.fn();
    render(<HomeScreen {...DEFAULT_PROPS} onChangeLanguage={onChangeLanguage} />);
    fireEvent.click(screen.getByRole('button', { name: strings.changeLanguage }));
    expect(onChangeLanguage).toHaveBeenCalledTimes(1);
  });

  it('calls onStartOver when start over button is clicked', () => {
    const onStartOver = vi.fn();
    render(<HomeScreen {...DEFAULT_PROPS} onStartOver={onStartOver} />);
    fireEvent.click(screen.getByRole('button', { name: strings.promptStartOver }));
    expect(onStartOver).toHaveBeenCalledTimes(1);
  });
});
