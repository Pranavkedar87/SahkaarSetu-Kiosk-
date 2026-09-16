/**
 * Full language list for the SahkaarSetu Kiosk.
 *
 * Source: exact language list configured in the SahkaarSetu Citizen UI
 * (SIH26088-Cooperative-AI / frontend / src / types / index.ts + i18n/translations.ts)
 *
 * 22 languages currently supported by the SahkaarSetu Citizen UI.
 *
 * NOTE: UI language support does NOT imply voice/ASR/TTS/AI support for every
 * language. Voice capabilities depend on backend BHASHINI configuration.
 */

import type { Language } from '../types';

export const LANGUAGES: Language[] = [
  { code: 'hi',  label: 'Hindi',      nativeLabel: 'हिंदी' },
  { code: 'en',  label: 'English',    nativeLabel: 'English' },
  { code: 'mr',  label: 'Marathi',    nativeLabel: 'मराठी' },
  { code: 'gu',  label: 'Gujarati',   nativeLabel: 'ગુજરાતી' },
  { code: 'bn',  label: 'Bengali',    nativeLabel: 'বাংলা' },
  { code: 'ta',  label: 'Tamil',      nativeLabel: 'தமிழ்' },
  { code: 'te',  label: 'Telugu',     nativeLabel: 'తెలుగు' },
  { code: 'kn',  label: 'Kannada',    nativeLabel: 'ಕನ್ನಡ' },
  { code: 'ml',  label: 'Malayalam',  nativeLabel: 'മലയാളം' },
  { code: 'pa',  label: 'Punjabi',    nativeLabel: 'ਪੰਜਾਬੀ' },
  { code: 'or',  label: 'Odia',       nativeLabel: 'ଓଡ଼ିଆ' },
  { code: 'as',  label: 'Assamese',   nativeLabel: 'অসমীয়া' },
  { code: 'ur',  label: 'Urdu',       nativeLabel: 'اردو',         rtl: true },
  { code: 'sa',  label: 'Sanskrit',   nativeLabel: 'संस्कृतम्' },
  { code: 'ks',  label: 'Kashmiri',   nativeLabel: 'کٲشُر',        rtl: true },
  { code: 'kok', label: 'Konkani',    nativeLabel: 'कोंकणी' },
  { code: 'mai', label: 'Maithili',   nativeLabel: 'मैथिली' },
  { code: 'mni', label: 'Manipuri',   nativeLabel: 'মৈতৈলোন্' },
  { code: 'ne',  label: 'Nepali',     nativeLabel: 'नेपाली' },
  { code: 'brx', label: 'Bodo',       nativeLabel: 'बड़ो' },
  { code: 'sat', label: 'Santali',    nativeLabel: 'ᱥᱟᱱᱛᱟᱲᱤ' },
  { code: 'sd',  label: 'Sindhi',     nativeLabel: 'سنڌي',         rtl: true },
];

/** Set of RTL language codes for quick lookup */
export const RTL_CODES = new Set<string>(
  LANGUAGES.filter((l) => l.rtl).map((l) => l.code)
);

export function isRTL(code: string): boolean {
  return RTL_CODES.has(code);
}
