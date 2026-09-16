/**
 * Language Screen Tests
 *
 * Verifies:
 * - All 22 language cards render
 * - All native language names are displayed
 * - Language card selection fires callback
 * - No admin/sidebar/profile elements
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { LanguageScreen } from '../pages/LanguageScreen';
import { LANGUAGES } from '../i18n/languages';

describe('LanguageScreen', () => {
  it('renders all 22 language options', () => {
    render(<LanguageScreen currentLanguage="en" onSelectLanguage={() => {}} />);
    for (const lang of LANGUAGES) {
      // Search for buttons containing the native label
      const buttons = screen.getAllByRole('button');
      const match = buttons.some((btn) => btn.textContent?.includes(lang.nativeLabel));
      expect(match, `Missing native label for ${lang.code}: ${lang.nativeLabel}`).toBe(true);
    }
  });

  it('renders correct count — exactly 22 language cards', () => {
    render(<LanguageScreen currentLanguage="en" onSelectLanguage={() => {}} />);
    const buttons = screen.getAllByRole('button');
    // 22 language cards (plus any header/footer buttons if present)
    const langButtons = buttons.filter(
      (btn) => LANGUAGES.some((l) => btn.textContent?.includes(l.nativeLabel))
    );
    expect(langButtons).toHaveLength(22);
  });

  it('selecting a language calls onSelectLanguage with the correct code', () => {
    const onSelect = vi.fn();
    render(<LanguageScreen currentLanguage="en" onSelectLanguage={onSelect} />);
    const buttons = screen.getAllByRole('button');
    const mrBtn = buttons.find((btn) => btn.textContent?.includes('मराठी'));
    expect(mrBtn).toBeDefined();
    fireEvent.click(mrBtn!);
    expect(onSelect).toHaveBeenCalledWith('mr');
  });

  it('marks currently selected language', () => {
    render(<LanguageScreen currentLanguage="hi" onSelectLanguage={() => {}} />);
    // The Hindi button should have aria-pressed="true"
    const hiButton = screen.getAllByRole('button').find(
      (btn) => btn.getAttribute('aria-pressed') === 'true'
    );
    expect(hiButton).toBeDefined();
    expect(hiButton?.textContent).toContain('हिंदी');
  });

  it('does not render admin/sidebar/profile elements', () => {
    render(<LanguageScreen currentLanguage="en" onSelectLanguage={() => {}} />);
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByText(/settings/i)).toBeNull();
    expect(screen.queryByText(/profile/i)).toBeNull();
    expect(screen.queryByText(/dashboard/i)).toBeNull();
    expect(screen.queryByText(/admin/i)).toBeNull();
  });

  it('renders Santali in its native script', () => {
    render(<LanguageScreen currentLanguage="en" onSelectLanguage={() => {}} />);
    const buttons = screen.getAllByRole('button');
    const satBtn = buttons.find((btn) => btn.textContent?.includes('ᱥᱟᱱᱛᱟᱲᱤ'));
    expect(satBtn).toBeDefined();
  });

  it('renders Urdu', () => {
    render(<LanguageScreen currentLanguage="en" onSelectLanguage={() => {}} />);
    const buttons = screen.getAllByRole('button');
    const urBtn = buttons.find((btn) => btn.textContent?.includes('اردو'));
    expect(urBtn).toBeDefined();
  });
});
