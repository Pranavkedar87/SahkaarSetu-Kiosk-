/**
 * Thermal Printer Service & Abstraction (K7)
 *
 * Provides a clean dual-level printing architecture for 58mm thermal receipts:
 *   Level A: Browser-native print workflow via window.print() and 58mm @media print CSS.
 *   Level B: Hardware abstraction for Raspberry Pi thermal printer (serial / USB / CUPS).
 *
 * Privacy & Security:
 *   - Strictly sanitizes all print payloads before printing.
 *   - Strips and masks PII (Aadhaar, PAN, Bank Accounts, Mobile Numbers, Auth tokens).
 *   - Refuses printing if the payload contains non-sanitizable identity documents.
 *   - Never stores print data in localStorage, sessionStorage, or IndexedDB.
 *   - Truncates excessively long answers to fit standard 58mm roll width.
 *   - Strips markdown formatting to ensure crisp, clean monospace typography.
 */

import type { PrintPayload, PrintResult, PrinterStatus, ThermalPrinterInterface } from '../types';

// ── PII Sanitization Patterns ──────────────────────────────────────────────────
const AADHAAR_REGEX = /\b\d{4}\s?\d{4}\s?\d{4}\b/g;
const PAN_REGEX = /\b[A-Za-z]{5}[0-9]{4}[A-Za-z]\b/g;
const MOBILE_REGEX = /\b(?:\+91[\s-]?)?[6-9]\d{9}\b/g;
const BANK_ACCOUNT_REGEX = /\b\d{9,18}\b/g;
const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
const KEY_TOKEN_REGEX = /\b(bearer\s+[a-zA-Z0-9_\-\.]+)|(key-[a-zA-Z0-9]+)|(AIza[0-9A-Za-z\-_]{35})\b/gi;
const INTERNAL_URL_REGEX = /https?:\/\/[^\s"'<>]+/gi;

/** Maximum character length of guidance text for 58mm receipt paper */
export const MAX_GUIDANCE_CHARS = 650;
export const MAX_QUESTION_CHARS = 150;

/**
 * Strips markdown symbols (bold, headers, bullets, code blocks)
 * to produce clean plain text suitable for thermal printer receipts.
 */
export function stripMarkdownForThermal(text: string): string {
  if (!text) return '';
  return text
    .replace(/^#{1,6}\s+/gm, '') // headings
    .replace(/\*\*(.*?)\*\*/g, '$1') // bold
    .replace(/__(.*?)__/g, '$1')
    .replace(/^\s*[-*+]\s+/gm, '• ') // bullet points (before single asterisk italic)
    .replace(/\*(.*?)\*/g, '$1') // italic
    .replace(/_(.*?)_/g, '$1')
    .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // inline code / codeblocks
    .replace(/^\s*\d+\.\s+/gm, (match) => match) // numbered lists
    .replace(/\n{3,}/g, '\n\n') // excessive newlines
    .trim();
}

/**
 * Sanitizes text by removing/masking known sensitive PII patterns.
 */
export function sanitizeTextPII(text: string): string {
  if (!text) return '';
  return text
    .replace(AADHAAR_REGEX, 'XXXX-XXXX-XXXX')
    .replace(PAN_REGEX, 'XXXXX0000X')
    .replace(MOBILE_REGEX, 'XXXXX-XXXXX')
    .replace(BANK_ACCOUNT_REGEX, 'XXXXXXXXX')
    .replace(EMAIL_REGEX, '[EMAIL PROTECTED]')
    .replace(KEY_TOKEN_REGEX, '[TOKEN REDACTED]')
    .replace(INTERNAL_URL_REGEX, '[OFFICIAL PORTAL]');
}

/**
 * Checks if a payload can safely be printed on public thermal paper.
 * Refuses identity cards and sensitive unmaskable documents.
 */
export function canPrintPayload(payload: PrintPayload): { canPrint: boolean; reason?: string } {
  if (!payload || !payload.guidance || !payload.guidance.trim()) {
    return {
      canPrint: false,
      reason: 'No guidance content available to print.',
    };
  }

  // Refuse printing if marked as an identity document or has refusal_reason
  const lowerGuidance = payload.guidance.toLowerCase();
  const lowerCategory = (payload.category || '').toLowerCase();
  const lowerTitle = (payload.title || '').toLowerCase();

  const isIdentityDoc =
    lowerCategory.includes('identity') ||
    lowerTitle.includes('identity document') ||
    lowerGuidance.includes('identity document protected') ||
    lowerGuidance.includes('aadhaar, pan, voter id') ||
    lowerGuidance.includes('identity documents not processed');

  if (isIdentityDoc) {
    return {
      canPrint: false,
      reason: 'This information cannot be printed for privacy reasons.',
    };
  }

  return { canPrint: true };
}

/**
 * Sanitizes and formats an entire assistance-slip payload for 58mm thermal output.
 */
export function sanitizePrintPayload(raw: PrintPayload): PrintPayload {
  // 1. Strip Markdown
  const cleanGuidance = stripMarkdownForThermal(raw.guidance);
  const cleanQuestion = raw.question ? stripMarkdownForThermal(raw.question) : undefined;

  // 2. Scrub PII
  const piiScrubbedGuidance = sanitizeTextPII(cleanGuidance);
  const piiScrubbedQuestion = cleanQuestion ? sanitizeTextPII(cleanQuestion) : undefined;

  // 3. Truncate for 58mm compact thermal roll
  let finalGuidance = piiScrubbedGuidance;
  if (finalGuidance.length > MAX_GUIDANCE_CHARS) {
    finalGuidance = finalGuidance.slice(0, MAX_GUIDANCE_CHARS).trim() + '… [Continued at PACS]';
  }

  let finalQuestion = piiScrubbedQuestion;
  if (finalQuestion && finalQuestion.length > MAX_QUESTION_CHARS) {
    finalQuestion = finalQuestion.slice(0, MAX_QUESTION_CHARS).trim() + '…';
  }

  // 4. Clean and sanitize sources
  const cleanSources = (raw.sources || [])
    .map((s) => sanitizeTextPII(stripMarkdownForThermal(s)))
    .filter(Boolean)
    .slice(0, 3); // maximum 3 short citations on thermal paper

  // 5. Generate human-readable reference code if absent
  const referenceCode =
    raw.referenceCode ||
    `REF-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

  // 6. Format timestamp
  const createdAt = raw.createdAt || new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return {
    title: raw.title || 'SAHKAARSETU / सहकारसेतू',
    subTitle: raw.subTitle || 'Assistance Reference Slip / सेवा संदर्भ पावती',
    question: finalQuestion,
    guidance: finalGuidance,
    referenceCode,
    pacsName: raw.pacsName ? sanitizeTextPII(raw.pacsName) : undefined,
    village: raw.village ? sanitizeTextPII(raw.village) : undefined,
    category: raw.category ? sanitizeTextPII(raw.category) : undefined,
    language: raw.language,
    createdAt,
    sources: cleanSources,
    disclaimer: raw.disclaimer || 'Please keep this slip for reference.',
    qrPayload: raw.qrPayload || `https://sahkaarsetu.gov.in/verify?ref=${encodeURIComponent(referenceCode)}`,
  };
}

// ── Level A: Browser Print Service ─────────────────────────────────────────────

/**
 * Active in-memory print slip payload for browser print rendering.
 * Kept in volatile memory only. Never persisted.
 */
let activePrintSlip: PrintPayload | null = null;
let printSlipListeners: Array<(slip: PrintPayload | null) => void> = [];

export function getActivePrintSlip(): PrintPayload | null {
  return activePrintSlip;
}

export function setActivePrintSlip(slip: PrintPayload | null): void {
  activePrintSlip = slip;
  printSlipListeners.forEach((fn) => fn(slip));
}

export function subscribeActivePrintSlip(fn: (slip: PrintPayload | null) => void): () => void {
  printSlipListeners.push(fn);
  return () => {
    printSlipListeners = printSlipListeners.filter((l) => l !== fn);
  };
}

export function clearActivePrintSlip(): void {
  activePrintSlip = null;
  printSlipListeners.forEach((fn) => fn(null));
}

export class BrowserPrintService implements ThermalPrinterInterface {
  async isAvailable(): Promise<boolean> {
    return typeof window !== 'undefined' && typeof window.print === 'function';
  }

  async getStatus(): Promise<PrinterStatus> {
    const available = await this.isAvailable();
    return available ? 'ready' : 'unavailable';
  }

  async printSlip(payload: PrintPayload): Promise<PrintResult> {
    const check = canPrintPayload(payload);
    if (!check.canPrint) {
      return {
        success: false,
        error: check.reason || 'Cannot print this information.',
        via: 'browser',
      };
    }

    const sanitized = sanitizePrintPayload(payload);
    setActivePrintSlip(sanitized);

    // Give React 100ms to render the slip into #kiosk-thermal-slip before triggering print
    await new Promise((resolve) => setTimeout(resolve, 100));

    try {
      if (typeof window !== 'undefined' && typeof window.print === 'function') {
        window.print();
        return { success: true, via: 'browser' };
      }
      throw new Error('window.print is not available');
    } catch (err: any) {
      console.warn('[Printer] Browser print failed:', err);
      return {
        success: false,
        error: 'Printing is currently unavailable. You can try again.',
        via: 'browser',
      };
    }
  }
}

// ── Level B: Raspberry Pi Physical Thermal Printer Abstraction ──────────────────

export class RaspberryPiThermalService implements ThermalPrinterInterface {
  private _isHardwareConnected = false;

  constructor(connected = false) {
    this._isHardwareConnected = connected;
  }

  async isAvailable(): Promise<boolean> {
    // In actual production on Raspberry Pi with ESC/POS serial or USB driver attached,
    // this queries the local driver/daemon. Without hardware attached, it safely returns false.
    return this._isHardwareConnected;
  }

  async getStatus(): Promise<PrinterStatus> {
    if (!this._isHardwareConnected) {
      return 'unavailable';
    }
    return 'ready';
  }

  async printSlip(payload: PrintPayload): Promise<PrintResult> {
    if (!this._isHardwareConnected) {
      return {
        success: false,
        error: 'Physical thermal printer not connected.',
        via: 'thermal',
      };
    }

    const check = canPrintPayload(payload);
    if (!check.canPrint) {
      return {
        success: false,
        error: check.reason || 'Privacy refusal.',
        via: 'thermal',
      };
    }

    // Physical thermal print logic (ESC/POS formatting) would dispatch to Raspberry Pi device
    return { success: true, via: 'thermal' };
  }
}

// ── Printer Manager / Facade ───────────────────────────────────────────────────

class PrinterManager {
  private browserPrinter = new BrowserPrintService();
  private hardwarePrinter = new RaspberryPiThermalService(false); // Default: no physical hardware connected

  /**
   * Returns current hardware printer status.
   * Reports "unavailable" if physical thermal printer is not connected.
   */
  async getHardwareStatus(): Promise<PrinterStatus> {
    return this.hardwarePrinter.getStatus();
  }

  /**
   * Returns whether a physical printer or browser print is available.
   */
  async isAnyPrinterAvailable(): Promise<boolean> {
    const hw = await this.hardwarePrinter.isAvailable();
    if (hw) return true;
    return this.browserPrinter.isAvailable();
  }

  /**
   * High-level entry point to print a sanitized assistance slip.
   * Attempts configured physical hardware printer first;
   * if unavailable, falls back gracefully to browser 58mm preview print.
   */
  async printAssistanceSlip(payload: PrintPayload): Promise<PrintResult> {
    const check = canPrintPayload(payload);
    if (!check.canPrint) {
      return {
        success: false,
        error: check.reason,
        via: 'browser',
      };
    }

    const sanitized = sanitizePrintPayload(payload);

    // 1. Try physical printer if available
    const hwAvailable = await this.hardwarePrinter.isAvailable();
    if (hwAvailable) {
      const res = await this.hardwarePrinter.printSlip(sanitized);
      if (res.success) return res;
    }

    // 2. Fallback to Browser Print
    return this.browserPrinter.printSlip(sanitized);
  }
}

export const printerService = new PrinterManager();
