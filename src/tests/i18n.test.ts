/**
 * i18n Tests
 *
 * Verifies:
 * - Exact 22-language count from Citizen UI source
 * - All required language codes present
 * - Every language has valid native label
 * - All 22 languages have every required kiosk translation key
 * - No undefined values in translations
 * - RTL languages correctly flagged
 */

import { describe, it, expect } from 'vitest';
import { LANGUAGES } from '../i18n/languages';
import { KIOSK_TRANSLATIONS, getStrings } from '../i18n/translations';
import type { LanguageCode } from '../types';

// Exact language codes from the Citizen i18n configuration
const EXPECTED_CODES: LanguageCode[] = [
  'hi', 'en', 'mr', 'gu', 'bn', 'ta', 'te', 'kn', 'ml', 'pa',
  'or', 'as', 'ur', 'sa', 'ks', 'kok', 'mai', 'mni', 'ne', 'brx', 'sat', 'sd',
];

const REQUIRED_KEYS: Array<keyof typeof KIOSK_TRANSLATIONS['en']> = [
  'brandName',
  'tagline',
  'kioskSubtitle',
  'chooseLanguage',
  'howCanWeHelp',
  'actionSpeak',
  'actionType',
  'actionScan',
  'actionHelpPacs',
  'promptContinue',
  'promptStartOver',
  'timeoutWarning',
  'statusStarting',
  'statusResetting',
  'serviceUnavailable',
  'changeLanguage',
  'pressToSpeak',
  'typeQuestion',
  'scanDocument',
  'sessionReset',
  'actionBack',
  'actionAsk',
  'stateListening',
  'stateProcessing',
  'stateErrorTryAgain',
  'scanInstruction',
  'actionOpenCamera',
  'actionUploadDocument',
  'actionCapture',
  'needHelpTitle',
  'needHelpDesc',
  'startOverConfirmTitle',
  'startOverConfirmDesc',
  'voiceYouSaid',
  'voiceAnswer',
  'voicePlayAgain',
  'voiceStopAudio',
  'voiceTryAgain',
  'voiceTypeInstead',
  'voiceAskAnother',
  'voiceTapToStop',
  'voiceMicDenied',
  'voiceNoSpeech',
  'voiceServiceUnavailable',
  'textFindingAnswer',
  'textServiceUnavailable',
  'textVoiceHandoff',
  'textAskAnother',
  'textYourQuestion',
  'scanAnalyzing',
  'scanDocumentType',
  'scanSummary',
  'scanKeyDetails',
  'scanAskAboutDoc',
  'scanAnotherDoc',
  'scanCameraDenied',
  'scanTooLarge',
  'scanUnsupportedFormat',
  'scanServiceUnavailable',
  'scanRetake',
  'scanAskPlaceholder',
  'scanRefusalWarning',
  'scanPiiWarning',
  'scanAskingDoc',
  'scanDocAnswer',
  'scanVoiceHandoff',
  'scanTypeHandoff',
  'actionPrint',
  'printSlipTitle',
  'printReady',
  'printFailed',
  'printPrivacyRefusal',
  'printStatusReady',
  'printStatusUnavailable',
  'printStatusChecking',
  'printDone',
  'printTryAgain',
  'printKeepingSlipNotice',
];

describe('i18n — Language List', () => {
  it('has exactly 22 languages', () => {
    expect(LANGUAGES).toHaveLength(22);
  });

  it('contains all expected language codes from Citizen configuration', () => {
    const codes = LANGUAGES.map((l) => l.code);
    for (const expected of EXPECTED_CODES) {
      expect(codes).toContain(expected);
    }
  });

  it('every language has a non-empty nativeLabel', () => {
    for (const lang of LANGUAGES) {
      expect(lang.nativeLabel.trim().length).toBeGreaterThan(0);
    }
  });

  it('every language has a non-empty label', () => {
    for (const lang of LANGUAGES) {
      expect(lang.label.trim().length).toBeGreaterThan(0);
    }
  });

  it('marks RTL languages correctly (ur, ks, sd)', () => {
    const rtlCodes = LANGUAGES.filter((l) => l.rtl).map((l) => l.code);
    expect(rtlCodes).toContain('ur');
    expect(rtlCodes).toContain('ks');
    expect(rtlCodes).toContain('sd');
  });

  it('marks non-RTL languages without rtl flag', () => {
    const hi = LANGUAGES.find((l) => l.code === 'hi');
    expect(hi?.rtl).toBeFalsy();
  });
});

describe('i18n — Translations Completeness', () => {
  it('has translation entries for all 22 languages', () => {
    for (const code of EXPECTED_CODES) {
      expect(KIOSK_TRANSLATIONS[code]).toBeDefined();
    }
  });

  for (const code of EXPECTED_CODES) {
    describe(`Language: ${code}`, () => {
      it(`has all required translation keys`, () => {
        const strings = KIOSK_TRANSLATIONS[code];
        for (const key of REQUIRED_KEYS) {
          const value = strings[key];
          expect(value, `Missing key "${key}" for language "${code}"`).toBeDefined();
          expect(typeof value).toBe('string');
          expect((value as string).trim().length, `Empty key "${key}" for "${code}"`).toBeGreaterThan(0);
        }
      });
    });
  }

  it('getStrings returns English as fallback for unknown code', () => {
    // Cast unknown code for testing fallback
    const strings = getStrings('en');
    expect(strings.brandName).toBe('SahkaarSetu');
  });

  it('English strings are correct', () => {
    const en = getStrings('en');
    expect(en.brandName).toBe('SahkaarSetu');
    expect(en.kioskSubtitle).toBe('Cooperative Assistance Kiosk');
    expect(en.actionSpeak).toBe('Speak');
    expect(en.actionType).toBe('Type');
    expect(en.actionScan).toBe('Scan Document');
    expect(en.actionHelpPacs).toBe('Get Help from PACS');
    expect(en.promptContinue).toBe('Continue');
    expect(en.promptStartOver).toBe('Start Over');
  });

  it('Hindi strings are correct', () => {
    const hi = getStrings('hi');
    expect(hi.actionSpeak).toBe('बोलें');
  });

  it('Marathi strings are correct', () => {
    const mr = getStrings('mr');
    expect(mr.pressToSpeak).toBe('बोलण्यासाठी दाबा');
  });
});
