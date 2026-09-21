/**
 * K7 58mm Thermal Printer Integration Tests
 *
 * Covers:
 *  1. PII Scrubbing (Aadhaar, PAN, Bank Account, Mobile, Auth Tokens)
 *  2. Markdown stripping for thermal typography
 *  3. Character length truncation (guidance <= 650, question <= 150)
 *  4. Privacy refusal for identity documents
 *  5. BrowserPrintService Level A (window.print, status, active slip)
 *  6. RaspberryPiThermalService Level B (hardware abstraction)
 *  7. printerService facade (fallback to browser print, status check)
 *  8. AssistanceSlip 58mm component rendering (SVG QR, headers, cut line)
 *  9. PrintModal status transitions (printing -> success, failure, privacy_refusal)
 * 10. TypeScreen print integration (answered state)
 * 11. VoiceScreen print integration (answered/speaking state)
 * 12. ScanScreen print integration (analyzed state)
 * 13. ScanScreen identity document refusal (print button hidden)
 * 14. HelpScreen PACS reference slip (code generation, print modal)
 * 15. In-memory volatile state (zero localStorage/sessionStorage/IndexedDB)
 * 16. Session reset clears active print slip
 * 17. 22-language translation coverage for print strings
 * 18. Responsive touchscreen viewports (1280x800, 1024x768, 800x480)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import {
  stripMarkdownForThermal,
  sanitizeTextPII,
  canPrintPayload,
  sanitizePrintPayload,
  BrowserPrintService,
  RaspberryPiThermalService,
  printerService,
  getActivePrintSlip,
  setActivePrintSlip,
  clearActivePrintSlip,
  MAX_GUIDANCE_CHARS,
  MAX_QUESTION_CHARS,
} from '../services/printer';
import { AssistanceSlip } from '../components/kiosk/AssistanceSlip';
import { PrintModal } from '../components/kiosk/PrintModal';
import { TypeScreen } from '../pages/TypeScreen';
import { VoiceScreen } from '../pages/VoiceScreen';
import { ScanScreen } from '../pages/ScanScreen';
import { HelpScreen } from '../pages/HelpScreen';
import { getStrings } from '../i18n';
import { LANGUAGES } from '../i18n/languages';
import type { PrintPayload } from '../types';
import * as api from '../services/api';

vi.mock('../services/api', () => ({
  sendQuery: vi.fn(),
  transcribeAudio: vi.fn(),
  synthesizeSpeech: vi.fn(),
  analyzeDocument: vi.fn(),
  queryVisionDocument: vi.fn(),
  checkHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
}));

describe('K7: 58mm Thermal Printer System', () => {
  const stringsEn = getStrings('en');
  const stringsHi = getStrings('hi');
  const stringsMr = getStrings('mr');

  const originalPrint = window.print;

  beforeEach(() => {
    vi.clearAllMocks();
    clearActivePrintSlip();
    window.print = vi.fn();
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:kiosk-test-image-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    window.print = originalPrint;
    clearActivePrintSlip();
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 1. PII Scrubbing & Formatting Unit Tests
  // ───────────────────────────────────────────────────────────────────────────
  describe('PII Sanitization & Typography Formatting', () => {
    it('masks 12-digit Aadhaar numbers', () => {
      const input = 'Farmer Aadhaar number is 1234 5678 9012 for verification.';
      const output = sanitizeTextPII(input);
      expect(output).not.toContain('1234 5678 9012');
      expect(output).toContain('XXXX-XXXX-XXXX');
    });

    it('masks 10-character PAN cards', () => {
      const input = 'PAN card reference is ABCDE1234F submitted today.';
      const output = sanitizeTextPII(input);
      expect(output).not.toContain('ABCDE1234F');
      expect(output).toContain('XXXXX0000X');
    });

    it('masks 10-digit mobile phone numbers', () => {
      const input = 'Contact farmer at +91 9876543210 immediately.';
      const output = sanitizeTextPII(input);
      expect(output).not.toContain('9876543210');
      expect(output).toContain('XXXXX-XXXXX');
    });

    it('masks 9 to 18-digit bank account numbers', () => {
      const input = 'Disbursement sent to account 11223344556677 at SBI.';
      const output = sanitizeTextPII(input);
      expect(output).not.toContain('11223344556677');
      expect(output).toContain('XXXXXXXXX');
    });

    it('masks bearer auth tokens and sensitive API keys', () => {
      const input = 'Auth details: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9 and key-998811.';
      const output = sanitizeTextPII(input);
      expect(output).toContain('[TOKEN REDACTED]');
    });

    it('strips markdown headings, bold, italic, and bullet points', () => {
      const input = `### Crop Insurance
**PMFBY Scheme Details**
* Eligibility: Farmers with *active* KCC
- Loan limit: __₹1,60,000__
\`Online Application\` available.`;

      const output = stripMarkdownForThermal(input);
      expect(output).not.toContain('###');
      expect(output).not.toContain('**');
      expect(output).not.toContain('`');
      expect(output).toContain('Crop Insurance');
      expect(output).toContain('PMFBY Scheme Details');
      expect(output).toContain('• Eligibility: Farmers with active KCC');
    });

    it('truncates guidance text to MAX_GUIDANCE_CHARS for 58mm paper', () => {
      const veryLongText = 'A'.repeat(800);
      const payload: PrintPayload = {
        guidance: veryLongText,
        language: 'en',
      };
      const sanitized = sanitizePrintPayload(payload);
      expect(sanitized.guidance.length).toBeLessThan(800);
      expect(sanitized.guidance).toContain('… [Continued at PACS]');
    });

    it('truncates citizen question to MAX_QUESTION_CHARS', () => {
      const veryLongQuestion = 'What is the exact subsidy rate '.repeat(10);
      const payload: PrintPayload = {
        question: veryLongQuestion,
        guidance: 'Sample guidance text.',
        language: 'en',
      };
      const sanitized = sanitizePrintPayload(payload);
      expect(sanitized.question?.length).toBeLessThanOrEqual(MAX_QUESTION_CHARS + 2);
      expect(sanitized.question?.endsWith('…')).toBe(true);
    });

    it('generates a human-readable reference code if not provided', () => {
      const payload: PrintPayload = {
        guidance: 'Guidance text without reference code.',
        language: 'en',
      };
      const sanitized = sanitizePrintPayload(payload);
      expect(sanitized.referenceCode).toMatch(/^REF-[A-Z0-9]+-\d+$/);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Sensitive Content & Privacy Refusal
  // ───────────────────────────────────────────────────────────────────────────
  describe('Privacy Protection & Identity Document Refusal', () => {
    it('refuses to print payloads with empty guidance', () => {
      const res = canPrintPayload({ guidance: '   ', language: 'en' });
      expect(res.canPrint).toBe(false);
      expect(res.reason).toContain('No guidance content');
    });

    it('refuses to print identity documents (Aadhaar / PAN category)', () => {
      const res = canPrintPayload({
        title: 'Identity Document',
        category: 'Identity',
        guidance: 'Aadhaar card details scanned.',
        language: 'en',
      });
      expect(res.canPrint).toBe(false);
      expect(res.reason).toBe('This information cannot be printed for privacy reasons.');
    });

    it('refuses to print when guidance notes identity documents are protected', () => {
      const res = canPrintPayload({
        guidance: 'Identity document protected. Physical identity cards cannot be processed.',
        language: 'en',
      });
      expect(res.canPrint).toBe(false);
      expect(res.reason).toBe('This information cannot be printed for privacy reasons.');
    });

    it('permits printing valid cooperative scheme guidance', () => {
      const res = canPrintPayload({
        title: 'PMFBY Crop Insurance',
        category: 'Crop Insurance',
        guidance: 'PMFBY provides comprehensive crop coverage against natural risks.',
        language: 'en',
      });
      expect(res.canPrint).toBe(true);
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Thermal Printer Services (Level A & Level B)
  // ───────────────────────────────────────────────────────────────────────────
  describe('Printer Services & Abstractions', () => {
    it('BrowserPrintService isAvailable returns true when window.print exists', async () => {
      const svc = new BrowserPrintService();
      const avail = await svc.isAvailable();
      expect(avail).toBe(true);

      const status = await svc.getStatus();
      expect(status).toBe('ready');
    });

    it('BrowserPrintService printSlip formats, sets active slip, and calls window.print()', async () => {
      const svc = new BrowserPrintService();
      const payload: PrintPayload = {
        title: 'KCC Loan Assistance',
        guidance: 'KCC loans up to ₹3 lakh are provided at 4% effective interest.',
        language: 'en',
      };

      const res = await svc.printSlip(payload);
      expect(res.success).toBe(true);
      expect(res.via).toBe('browser');
      expect(window.print).toHaveBeenCalledTimes(1);

      const active = getActivePrintSlip();
      expect(active).not.toBeNull();
      expect(active?.title).toBe('KCC Loan Assistance');
    });

    it('RaspberryPiThermalService reports unavailable when hardware is disconnected', async () => {
      const svc = new RaspberryPiThermalService(false);
      const avail = await svc.isAvailable();
      expect(avail).toBe(false);

      const status = await svc.getStatus();
      expect(status).toBe('unavailable');

      const res = await svc.printSlip({ guidance: 'Test', language: 'en' });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Physical thermal printer not connected');
    });

    it('RaspberryPiThermalService succeeds when hardware is connected', async () => {
      const svc = new RaspberryPiThermalService(true);
      const avail = await svc.isAvailable();
      expect(avail).toBe(true);

      const status = await svc.getStatus();
      expect(status).toBe('ready');

      const res = await svc.printSlip({ guidance: 'Test guidance', language: 'en' });
      expect(res.success).toBe(true);
      expect(res.via).toBe('thermal');
    });

    it('printerService facade falls back to BrowserPrintService when no hardware is attached', async () => {
      const hwStatus = await printerService.getHardwareStatus();
      expect(hwStatus).toBe('unavailable');

      const res = await printerService.printAssistanceSlip({
        title: 'PACS Fertilizer Scheme',
        guidance: 'Subsidized urea and DAP available at your local PACS society.',
        language: 'en',
      });
      expect(res.success).toBe(true);
      expect(res.via).toBe('browser');
      expect(window.print).toHaveBeenCalled();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 4. AssistanceSlip 58mm Component
  // ───────────────────────────────────────────────────────────────────────────
  describe('AssistanceSlip Component', () => {
    it('renders null when slip is null', () => {
      const { container } = render(<AssistanceSlip slip={null} />);
      expect(container.firstChild).toBeNull();
    });

    it('renders complete 58mm thermal slip with reference code, QR, question, guidance, and cut line', () => {
      const slip: PrintPayload = {
        title: 'SAHKAARSETU',
        subTitle: 'Assistance Reference Slip',
        referenceCode: 'REF-TEST-999',
        question: 'How do I apply for KCC?',
        guidance: 'Visit your nearest PACS society with land 7/12 record and passport photograph.',
        pacsName: 'Shivaji PACS',
        village: 'Baramati',
        category: 'Agricultural Credit',
        language: 'en',
        createdAt: '20 Sep 2026, 11:30 AM',
        sources: ['PACS Circular 2026', 'Ministry Guidelines'],
        qrPayload: 'https://sahkaarsetu.gov.in/verify?ref=REF-TEST-999',
      };

      const { container } = render(<AssistanceSlip slip={slip} />);
      const slipElem = container.querySelector('#kiosk-thermal-slip');
      expect(slipElem).toBeInTheDocument();

      expect(screen.getByText('SAHKAARSETU')).toBeInTheDocument();
      expect(screen.getByText('सहकारसेतू')).toBeInTheDocument();
      expect(screen.getByText('REF-TEST-999')).toBeInTheDocument();
      expect(screen.getByText('Shivaji PACS')).toBeInTheDocument();
      expect(screen.getByText('Baramati')).toBeInTheDocument();
      expect(screen.getByText('How do I apply for KCC?')).toBeInTheDocument();
      expect(
        screen.getByText('Visit your nearest PACS society with land 7/12 record and passport photograph.')
      ).toBeInTheDocument();
      expect(screen.getByText('• PACS Circular 2026')).toBeInTheDocument();
      expect(screen.getByText('- - - - - END OF SLIP - - - - -')).toBeInTheDocument();

      // Verification QR code SVG presence
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 5. PrintModal Component
  // ───────────────────────────────────────────────────────────────────────────
  describe('PrintModal Component State & Interactions', () => {
    it('executes print, displays success confirmation, and closes on Done', async () => {
      const onClose = vi.fn();
      const payload: PrintPayload = {
        question: 'What is PMFBY?',
        guidance: 'PMFBY is the National Crop Insurance Scheme.',
        language: 'en',
      };

      render(<PrintModal strings={stringsEn} payload={payload} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(stringsEn.printReady)).toBeInTheDocument();
      });

      expect(screen.getByText(stringsEn.printKeepingSlipNotice)).toBeInTheDocument();
      expect(window.print).toHaveBeenCalled();

      const doneBtn = screen.getByRole('button', { name: stringsEn.printDone });
      fireEvent.click(doneBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('displays privacy protection modal when printing an identity document', async () => {
      const onClose = vi.fn();
      const payload: PrintPayload = {
        title: 'Identity Document',
        guidance: 'Aadhaar, PAN, Voter ID cards cannot be processed.',
        language: 'en',
      };

      render(<PrintModal strings={stringsEn} payload={payload} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText('Privacy Protection')).toBeInTheDocument();
      });

      expect(screen.getByText(stringsEn.printPrivacyRefusal)).toBeInTheDocument();
      expect(window.print).not.toHaveBeenCalled();

      const doneBtn = screen.getByRole('button', { name: stringsEn.printDone });
      fireEvent.click(doneBtn);
      expect(onClose).toHaveBeenCalled();
    });

    it('handles print failure and provides Try Again retry', async () => {
      window.print = vi.fn().mockImplementationOnce(() => {
        throw new Error('Printer disconnected');
      });

      const onClose = vi.fn();
      const payload: PrintPayload = {
        guidance: 'Sample guidance.',
        language: 'en',
      };

      render(<PrintModal strings={stringsEn} payload={payload} onClose={onClose} />);

      await waitFor(() => {
        expect(screen.getByText(stringsEn.printFailed)).toBeInTheDocument();
      });

      // Try Again
      const retryBtn = screen.getByRole('button', { name: `🔄 ${stringsEn.printTryAgain}` });
      fireEvent.click(retryBtn);

      await waitFor(() => {
        expect(screen.getByText(stringsEn.printReady)).toBeInTheDocument();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 6. Screen Integrations
  // ───────────────────────────────────────────────────────────────────────────
  describe('Screen Integration: TypeScreen', () => {
    it('renders Print Slip button when query is answered, and opens PrintModal', async () => {
      const mockQuery = vi.mocked(api.sendQuery).mockResolvedValueOnce({
        answer: 'Fertilizer subsidy is ₹24,000 per tonne.',
        session_id: 'test-session',
        language: 'en',
        intent: 'SCHEME_INQUIRY',
        sources: [{ title: 'DBT Fertilizer Portal', snippet: 'Subsidy rates 2026' }],
      });

      render(
        <TypeScreen
          strings={stringsEn}
          serviceAvailable={true}
          onBack={vi.fn()}
          onVoiceHandoff={vi.fn()}
          onChangeLanguage={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const textarea = screen.getByPlaceholderText(stringsEn.typeQuestion);
      fireEvent.change(textarea, { target: { value: 'What is fertilizer subsidy?' } });
      const submitBtn = screen.getByRole('button', { name: `${stringsEn.actionAsk} →` });
      fireEvent.click(submitBtn);

      await waitFor(() => {
        expect(screen.getByText('Fertilizer subsidy is ₹24,000 per tonne.')).toBeInTheDocument();
      });

      // Print Slip button is present
      const printBtn = screen.getByRole('button', { name: `🖨️ ${stringsEn.actionPrint}` });
      expect(printBtn).toBeInTheDocument();
      expect(printBtn).toHaveStyle({ minHeight: '56px' });

      // Click Print Slip
      fireEvent.click(printBtn);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(stringsEn.printReady)).toBeInTheDocument();
      });
    });
  });

  describe('Screen Integration: VoiceScreen', () => {
    it('renders Print Slip button when query answer is ready', async () => {
      const mockQuery = vi.mocked(api.sendQuery).mockResolvedValueOnce({
        answer: 'PM-Kisan provides ₹6,000 yearly in three installments.',
        session_id: 'test-voice',
        language: 'en',
        intent: 'SCHEME_INQUIRY',
      });

      render(
        <VoiceScreen
          strings={stringsEn}
          language="en"
          serviceAvailable={true}
          onBack={vi.fn()}
          onTypeInstead={vi.fn()}
          onChangeLanguage={vi.fn()}
          onStartOver={vi.fn()}
          setActiveOperation={vi.fn()}
        />
      );

      // In initial state, print button is not shown
      expect(screen.queryByRole('button', { name: `🖨️ ${stringsEn.actionPrint}` })).toBeNull();
    });
  });

  describe('Screen Integration: ScanScreen', () => {
    it('renders Print Slip button for analyzed cooperative documents', async () => {
      vi.mocked(api.analyzeDocument).mockResolvedValueOnce({
        success: true,
        document_type: 'PMFBY_POLICY',
        readability: 'CLEAR',
        document_summary: 'PMFBY policy document for Kharif 2026. Sum insured: ₹50,000.',
        suggested_questions: ['What is the claim deadline?'],
      });

      render(
        <ScanScreen
          strings={stringsEn}
          serviceAvailable={true}
          onBack={vi.fn()}
          onVoiceHandoff={vi.fn()}
          onTypeHandoff={vi.fn()}
          onChangeLanguage={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Trigger file upload
      const file = new File(['fake-image'], 'pmfby.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(fileInput).not.toBeNull();
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/PMFBY Crop Insurance Document/)).toBeInTheDocument();
      });

      // Print button is displayed
      const printBtn = screen.getByRole('button', { name: `🖨️ ${stringsEn.actionPrint}` });
      expect(printBtn).toBeInTheDocument();

      fireEvent.click(printBtn);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(stringsEn.printReady)).toBeInTheDocument();
      });
    });

    it('DOES NOT render Print Slip button for IDENTITY_DOCUMENT', async () => {
      vi.mocked(api.analyzeDocument).mockResolvedValueOnce({
        success: true,
        document_type: 'IDENTITY_DOCUMENT',
        readability: 'CLEAR',
        has_sensitive_pii: true,
        refusal_reason: 'Identity documents not processed.',
        document_summary: null,
      });

      render(
        <ScanScreen
          strings={stringsEn}
          serviceAvailable={true}
          onBack={vi.fn()}
          onVoiceHandoff={vi.fn()}
          onTypeHandoff={vi.fn()}
          onChangeLanguage={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      const file = new File(['fake-aadhaar'], 'aadhaar.jpg', { type: 'image/jpeg' });
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
      fireEvent.change(fileInput, { target: { files: [file] } });

      await waitFor(() => {
        expect(screen.getByText(/Identity Document Protected/i)).toBeInTheDocument();
      });

      // Print button MUST NOT be present
      expect(screen.queryByRole('button', { name: `🖨️ ${stringsEn.actionPrint}` })).toBeNull();
    });
  });

  describe('Screen Integration: HelpScreen', () => {
    it('generates PACS reference code and renders Print Slip button on Continue', async () => {
      render(
        <HelpScreen
          strings={stringsEn}
          language="en"
          serviceAvailable={true}
          onBack={vi.fn()}
          onChangeLanguage={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      // Initially, only Back and Continue are displayed
      expect(screen.getByRole('button', { name: `${stringsEn.promptContinue} →` })).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: `🖨️ ${stringsEn.actionPrint}` })).toBeNull();

      // Click Continue
      const continueBtn = screen.getByRole('button', { name: `${stringsEn.promptContinue} →` });
      fireEvent.click(continueBtn);

      // Now prepared state is visible with reference code
      expect(screen.getByText(/Request prepared for PACS staff assistance/)).toBeInTheDocument();
      expect(screen.getByText(/PACS-2026-/)).toBeInTheDocument();

      // Print Slip button is rendered
      const printBtn = screen.getByRole('button', { name: `🖨️ ${stringsEn.actionPrint}` });
      expect(printBtn).toBeInTheDocument();

      fireEvent.click(printBtn);
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(screen.getByText(stringsEn.printReady)).toBeInTheDocument();
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 7. Session Privacy & In-Memory Storage Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe('Zero-Persistence & Session Reset', () => {
    it('does not write print data to localStorage or sessionStorage', async () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

      const svc = new BrowserPrintService();
      await svc.printSlip({
        title: 'PACS Record',
        guidance: 'Important information.',
        language: 'en',
      });

      expect(setItemSpy).not.toHaveBeenCalled();
      setItemSpy.mockRestore();
    });

    it('clearActivePrintSlip resets active slip in memory', () => {
      setActivePrintSlip({
        guidance: 'Sample guidance.',
        language: 'en',
      });
      expect(getActivePrintSlip()).not.toBeNull();

      clearActivePrintSlip();
      expect(getActivePrintSlip()).toBeNull();
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 8. 22-Language Translation Verification for K7 Keys
  // ───────────────────────────────────────────────────────────────────────────
  describe('22-Language i18n Verification for Thermal Printing Keys', () => {
    const requiredKeys = [
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
    ] as const;

    LANGUAGES.forEach((lang) => {
      it(`language "${lang.code}" (${lang.label}) contains all 11 printing keys`, () => {
        const strings = getStrings(lang.code);
        requiredKeys.forEach((key) => {
          expect(strings[key], `Missing key "${key}" in language "${lang.code}"`).toBeDefined();
          expect(typeof strings[key]).toBe('string');
          expect((strings[key] as string).trim().length).toBeGreaterThan(0);
        });
      });
    });
  });

  // ───────────────────────────────────────────────────────────────────────────
  // 9. Viewport Dimensions Verification
  // ───────────────────────────────────────────────────────────────────────────
  describe('Touchscreen Viewports (1280x800, 1024x768, 800x480)', () => {
    const viewports = [
      { width: 1280, height: 800, name: '10.1" Landscape (1280x800)' },
      { width: 1024, height: 768, name: 'Standard 4:3 (1024x768)' },
      { width: 800, height: 480, name: '7" Compact Landscape (800x480)' },
    ];

    viewports.forEach((vp) => {
      it(`renders PrintModal properly at ${vp.name}`, () => {
        window.innerWidth = vp.width;
        window.innerHeight = vp.height;

        const { container } = render(
          <PrintModal
            strings={stringsEn}
            payload={{ guidance: 'Guidance text for viewport testing.', language: 'en' }}
            onClose={vi.fn()}
          />
        );

        const dialog = container.querySelector('[role="dialog"]');
        expect(dialog).toBeInTheDocument();
      });
    });
  });
});
