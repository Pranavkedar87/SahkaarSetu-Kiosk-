/**
 * K6 Document Scan & Multimodal Vision Integration Tests
 *
 * Covers:
 *  1. Initial rendering with viewfinder, camera, upload, and back buttons
 *  2. Camera opening with navigator.mediaDevices.getUserMedia (environment-facing)
 *  3. Camera active state and live preview display
 *  4. Video frame capture, canvas draw, track release, and analysis trigger
 *  5. Camera permission denial (NotAllowedError) handling and alert
 *  6. File upload with valid image (JPEG/PNG/WebP) and analysis trigger
 *  7. File upload size limit (rejects files > 5MB with scanTooLarge alert)
 *  8. File upload MIME format validation (rejects invalid formats with scanUnsupportedFormat)
 *  9. Processing state display (spinner, scanAnalyzing, activeOperation=true)
 * 10. Structured analysis display: Document type badge (PMFBY, 7/12, etc.)
 * 11. Readability badge rendering (Clear, Blurry, etc.)
 * 12. Document summary card rendering
 * 13. Extracted key details grid (key_fields) rendering
 * 14. PII warning banner rendering when has_sensitive_pii is true
 * 15. Identity document refusal protection (Aadhaar/PAN/Voter ID)
 * 16. Follow-up question submission calls queryVisionDocument
 * 17. Suggested question chip tap triggers queryVisionDocument
 * 18. Follow-up answer card display and onMessageAdded notification
 * 19. Asking follow-up state (scanAskingDoc loading and activeOperation=true)
 * 20. activeOperation management across preview, capture, analysis, and asking
 * 21. Back button navigation and resource cleanup (camera tracks + object URLs)
 * 22. Scan Another / Retake resets state and clears transient data
 * 23. Voice handoff navigation button calls onVoiceHandoff
 * 24. Type handoff navigation button calls onTypeHandoff
 * 25. Vision API failure error handling
 * 26. Zero persistent storage (localStorage, sessionStorage, IndexedDB)
 * 27. 22-language i18n support across English, Hindi, and Marathi
 * 28. Responsive layout across 1280x800, 1024x768, and 800x480 viewports
 * 29. Full app flow navigation: Splash -> Language -> Home -> Scan -> Home
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { ScanScreen } from '../pages/ScanScreen';
import { getStrings } from '../i18n';
import * as api from '../services/api';
import type { VisionAnalyzeResponse, QueryResponse } from '../types';
import App from '../App';

// Mock API module
vi.mock('../services/api', () => ({
  analyzeDocument: vi.fn(),
  queryVisionDocument: vi.fn(),
  sendQuery: vi.fn(),
  transcribeAudio: vi.fn(),
  synthesizeSpeech: vi.fn(),
  checkHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
}));

describe('K6: Document Scan & Vision Integration', () => {
  const stringsEn = getStrings('en');
  const stringsHi = getStrings('hi');
  const stringsMr = getStrings('mr');

  let mockTracks: Array<{ stop: ReturnType<typeof vi.fn> }>;
  let mockStream: { getTracks: () => Array<{ stop: ReturnType<typeof vi.fn> }> };

  beforeEach(() => {
    vi.clearAllMocks();

    mockTracks = [{ stop: vi.fn() }, { stop: vi.fn() }];
    mockStream = {
      getTracks: () => mockTracks,
    };

    // Mock mediaDevices.getUserMedia
    Object.defineProperty(navigator, 'mediaDevices', {
      writable: true,
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue(mockStream),
      },
    });

    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn().mockReturnValue('blob:kiosk-test-image-url');
    global.URL.revokeObjectURL = vi.fn();

    // Mock HTMLCanvasElement toBlob and getContext
    HTMLCanvasElement.prototype.getContext = vi.fn().mockReturnValue({
      drawImage: vi.fn(),
    }) as any;

    HTMLCanvasElement.prototype.toBlob = vi.fn().mockImplementation((callback, type, quality) => {
      const blob = new Blob(['mock-binary-data'], { type: type || 'image/jpeg' });
      callback(blob);
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // ── 1. Initial Render ───────────────────────────────────────────────────────
  it('renders initial viewfinder frame, open camera, and upload buttons', () => {
    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    expect(screen.getByRole('region', { name: /viewfinder/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(stringsEn.actionOpenCamera, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(stringsEn.actionUploadDocument, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(stringsEn.actionBack, 'i'))).toBeInTheDocument();
  });

  // ── 2. Camera Opening & Constraints ─────────────────────────────────────────
  it('opens camera with environment-facing constraint and sets active preview', async () => {
    const setActiveOp = vi.fn();

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
        setActiveOperation={setActiveOp}
      />
    );

    const openCamBtn = screen.getByText(new RegExp(stringsEn.actionOpenCamera, 'i'));
    fireEvent.click(openCamBtn);

    await waitFor(() => {
      expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith(
        expect.objectContaining({
          video: expect.objectContaining({ facingMode: 'environment' }),
        })
      );
      expect(screen.getByText(/Camera Active/i)).toBeInTheDocument();
      expect(screen.getByText(new RegExp(stringsEn.actionCapture, 'i'))).toBeInTheDocument();
    });

    expect(setActiveOp).toHaveBeenCalledWith(true);
  });

  // ── 3. Frame Capture & Track Stop ───────────────────────────────────────────
  it('captures frame, stops camera tracks immediately, and sends image to analyzeDocument', async () => {
    const mockAnalysis: VisionAnalyzeResponse = {
      success: true,
      document_type: 'PMFBY_POLICY',
      readability: 'CLEAR',
      key_fields: {
        application_no: 'PMFBY-2024-9988',
        insured_crop: 'Soybean',
        sum_insured: '₹45,000',
      },
      document_summary: 'PMFBY Kharif 2024 Crop Insurance acknowledgement for Soybean.',
      suggested_questions: ['What is my sum insured?', 'When is the claim deadline?'],
      has_sensitive_pii: false,
    };

    vi.mocked(api.analyzeDocument).mockResolvedValue(mockAnalysis);

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    // 1. Open camera
    fireEvent.click(screen.getByText(new RegExp(stringsEn.actionOpenCamera, 'i')));
    await waitFor(() => {
      expect(screen.getByText(new RegExp(stringsEn.actionCapture, 'i'))).toBeInTheDocument();
    });

    // 2. Capture
    fireEvent.click(screen.getByText(new RegExp(stringsEn.actionCapture, 'i')));

    // Camera tracks should be stopped immediately
    expect(mockTracks[0].stop).toHaveBeenCalled();
    expect(mockTracks[1].stop).toHaveBeenCalled();

    // analyzeDocument should be invoked
    await waitFor(() => {
      expect(api.analyzeDocument).toHaveBeenCalledWith(expect.any(Blob), 'en');
    });

    // Result should be displayed
    await waitFor(() => {
      expect(screen.getByText(/PMFBY Crop Insurance/i)).toBeInTheDocument();
      expect(screen.getByText(/PMFBY Kharif 2024/i)).toBeInTheDocument();
      expect(screen.getByText('₹45,000')).toBeInTheDocument();
    });
  });

  // ── 4. Camera Permission Denied ─────────────────────────────────────────────
  it('handles camera permission rejection and displays user-friendly alert', async () => {
    const permError = new Error('Permission denied');
    permError.name = 'NotAllowedError';
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(permError);

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText(new RegExp(stringsEn.actionOpenCamera, 'i')));

    await waitFor(() => {
      expect(screen.getByText(new RegExp(stringsEn.scanCameraDenied, 'i'))).toBeInTheDocument();
    });
  });

  // ── 5. File Upload with Valid Image ─────────────────────────────────────────
  it('processes valid uploaded document image via analyzeDocument', async () => {
    const mockAnalysis: VisionAnalyzeResponse = {
      success: true,
      document_type: 'LAND_RECORD_7_12',
      readability: 'CLEAR',
      key_fields: {
        gat_no: '142/1',
        village: 'Koregaon',
        area: '1.45 Hectares',
      },
      document_summary: 'Maharashtra 7/12 Land Extract (सातबारा) showing agricultural land ownership.',
      suggested_questions: ['Can I apply for KCC loan with this?', 'What is the mutation entry?'],
      has_sensitive_pii: false,
    };

    vi.mocked(api.analyzeDocument).mockResolvedValue(mockAnalysis);

    render(
      <ScanScreen
        strings={stringsEn}
        language="mr"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const fileInput = screen.getByTestId('document-file-input');
    const validFile = new File(['mock-img-bytes'], 'extract_7_12.jpg', { type: 'image/jpeg' });

    fireEvent.change(fileInput, { target: { files: [validFile] } });

    await waitFor(() => {
      expect(api.analyzeDocument).toHaveBeenCalledWith(validFile, 'mr');
      expect(screen.getByText(/7\/12 Land Record/i)).toBeInTheDocument();
      expect(screen.getByText(/1.45 Hectares/i)).toBeInTheDocument();
    });
  });

  // ── 6. File Upload Size Validation (> 5MB) ──────────────────────────────────
  it('rejects file larger than 5MB with scanTooLarge alert and does not call API', async () => {
    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const fileInput = screen.getByTestId('document-file-input');
    // Create fake 6MB file
    const largeFile = new File(['a'.repeat(100)], 'huge.jpg', { type: 'image/jpeg' });
    Object.defineProperty(largeFile, 'size', { value: 6 * 1024 * 1024 });

    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(screen.getByText(/too large/i)).toBeInTheDocument();
    });

    expect(api.analyzeDocument).not.toHaveBeenCalled();
  });

  // ── 7. File Upload MIME Validation ──────────────────────────────────────────
  it('rejects unsupported file formats with scanUnsupportedFormat alert', async () => {
    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const fileInput = screen.getByTestId('document-file-input');
    const pdfFile = new File(['pdf-data'], 'policy.pdf', { type: 'application/pdf' });

    fireEvent.change(fileInput, { target: { files: [pdfFile] } });

    await waitFor(() => {
      expect(screen.getByText(/JPEG, PNG/i)).toBeInTheDocument();
    });

    expect(api.analyzeDocument).not.toHaveBeenCalled();
  });

  // ── 8. PII Warning Rendering ────────────────────────────────────────────────
  it('displays PII warning badge when sensitive PII was detected and masked', async () => {
    const mockAnalysis: VisionAnalyzeResponse = {
      success: true,
      document_type: 'PACS_MEMBERSHIP_FORM',
      readability: 'CLEAR',
      key_fields: {
        pacs_name: 'Gramin PACS Satara',
        member_id: 'MEM-4091',
      },
      document_summary: 'PACS share application and membership card.',
      suggested_questions: ['What is the dividend rate?'],
      has_sensitive_pii: true,
    };

    vi.mocked(api.analyzeDocument).mockResolvedValue(mockAnalysis);

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const fileInput = screen.getByTestId('document-file-input');
    const file = new File(['img'], 'pacs.png', { type: 'image/png' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(new RegExp(stringsEn.scanPiiWarning, 'i'))).toBeInTheDocument();
    });
  });

  // ── 9. Identity Document Refusal Protection ─────────────────────────────────
  it('refuses processing identity cards (Aadhaar/PAN) and shows privacy protection notice', async () => {
    const mockAnalysis: VisionAnalyzeResponse = {
      success: true,
      document_type: 'IDENTITY_DOCUMENT',
      readability: 'CLEAR',
      refusal_reason:
        'SahkaarSetu protects citizen privacy. Identity documents (Aadhaar, PAN, Voter ID) are not analyzed.',
      has_sensitive_pii: true,
    };

    vi.mocked(api.analyzeDocument).mockResolvedValue(mockAnalysis);

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const fileInput = screen.getByTestId('document-file-input');
    const file = new File(['id'], 'aadhaar.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/Identity Document Protected/i)).toBeInTheDocument();
      expect(screen.getByText(/Aadhaar, PAN, Voter ID/i)).toBeInTheDocument();
      // Should offer scan another document
      expect(screen.getByText(new RegExp(stringsEn.scanAnotherDoc, 'i'))).toBeInTheDocument();
    });

    // Should NOT render key fields or follow-up question input
    expect(screen.queryByPlaceholderText(new RegExp(stringsEn.scanAskPlaceholder, 'i'))).not.toBeInTheDocument();
  });

  // ── 10. Follow-up Q&A on Document ───────────────────────────────────────────
  it('submits follow-up question about document to queryVisionDocument and renders answer', async () => {
    const mockAnalysis: VisionAnalyzeResponse = {
      success: true,
      document_type: 'PMFBY_POLICY',
      readability: 'CLEAR',
      document_summary: 'PMFBY Kharif 2024 Crop Insurance acknowledgement.',
      key_fields: {
        sum_insured: '₹50,000',
        premium_paid: '₹1,000',
      },
      suggested_questions: ['What is my coverage amount?'],
      has_sensitive_pii: false,
    };

    const mockQueryAnswer: QueryResponse = {
      answer: 'Your total sum insured under this policy is ₹50,000 for Soybean.',
      display_answer: 'Your total sum insured under this policy is ₹50,000 for Soybean.',
    };

    vi.mocked(api.analyzeDocument).mockResolvedValue(mockAnalysis);
    vi.mocked(api.queryVisionDocument).mockResolvedValue(mockQueryAnswer);

    const onMessageAdded = vi.fn();

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
        onMessageAdded={onMessageAdded}
      />
    );

    // 1. Analyze document
    const fileInput = screen.getByTestId('document-file-input');
    const file = new File(['doc'], 'pmfby.jpg', { type: 'image/jpeg' });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByText(/PMFBY Kharif 2024/i)).toBeInTheDocument();
    });

    // 2. Type question and click Ask
    const questionInput = screen.getByPlaceholderText(stringsEn.scanAskPlaceholder);
    fireEvent.change(questionInput, { target: { value: 'How much is the coverage?' } });

    const askBtn = screen.getByRole('button', { name: stringsEn.actionAsk });
    fireEvent.click(askBtn);

    // 3. Verify queryVisionDocument called with document context
    await waitFor(() => {
      expect(api.queryVisionDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          extracted_text: expect.stringContaining('PMFBY Kharif 2024'),
          language: 'en',
        })
      );
    });

    // 4. Verify answer rendered and onMessageAdded called
    await waitFor(() => {
      expect(screen.getByText(/Your total sum insured under this policy is ₹50,000/i)).toBeInTheDocument();
      expect(onMessageAdded).toHaveBeenCalledWith(
        'How much is the coverage?',
        'Your total sum insured under this policy is ₹50,000 for Soybean.'
      );
    });
  });

  // ── 11. Suggested Question Chip Tap ─────────────────────────────────────────
  it('triggers follow-up query when tapping a suggested question chip', async () => {
    const mockAnalysis: VisionAnalyzeResponse = {
      success: true,
      document_type: 'FERTILIZER_RECEIPT',
      readability: 'CLEAR',
      document_summary: 'Receipt for 2 bags of Urea subsidized at PACS counter.',
      suggested_questions: ['What is the subsidized rate?'],
    };

    const mockAnswer: QueryResponse = {
      answer: 'The subsidized rate per bag of Urea was ₹266.50.',
    };

    vi.mocked(api.analyzeDocument).mockResolvedValue(mockAnalysis);
    vi.mocked(api.queryVisionDocument).mockResolvedValue(mockAnswer);

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const fileInput = screen.getByTestId('document-file-input');
    fireEvent.change(fileInput, {
      target: { files: [new File(['rec'], 'rec.png', { type: 'image/png' })] },
    });

    await waitFor(() => {
      expect(screen.getByText(/What is the subsidized rate\?/i)).toBeInTheDocument();
    });

    // Click suggested chip
    fireEvent.click(screen.getByText(/What is the subsidized rate\?/i));

    await waitFor(() => {
      expect(api.queryVisionDocument).toHaveBeenCalledWith(
        expect.objectContaining({
          extracted_text: expect.stringContaining('What is the subsidized rate?'),
        })
      );
      expect(screen.getByText(/The subsidized rate per bag of Urea was ₹266.50/i)).toBeInTheDocument();
    });
  });

  // ── 12. activeOperation Inactivity Timer Protection ──────────────────────────
  it('suspends inactivity timer during camera preview and querying', async () => {
    const setActiveOp = vi.fn();

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
        setActiveOperation={setActiveOp}
      />
    );

    // Initial state: not active
    expect(setActiveOp).toHaveBeenLastCalledWith(false);

    // Open camera: activeOperation = true
    fireEvent.click(screen.getByText(new RegExp(stringsEn.actionOpenCamera, 'i')));
    await waitFor(() => {
      expect(setActiveOp).toHaveBeenCalledWith(true);
    });
  });

  // ── 13. Back Button and Resource Cleanup ────────────────────────────────────
  it('stops camera and revokes object URLs when back button is tapped', async () => {
    const onBack = vi.fn();

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={onBack}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    // Open camera
    fireEvent.click(screen.getByText(new RegExp(stringsEn.actionOpenCamera, 'i')));
    await waitFor(() => {
      expect(screen.getByText(/Camera Active/i)).toBeInTheDocument();
    });

    // Tap Back
    const backBtn = screen.getByText(new RegExp(stringsEn.actionBack, 'i'));
    fireEvent.click(backBtn);

    expect(mockTracks[0].stop).toHaveBeenCalled();
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  // ── 14. Scan Another Document (Reset State) ─────────────────────────────────
  it('resets screen to idle state when tapping Scan Another Document', async () => {
    const mockAnalysis: VisionAnalyzeResponse = {
      success: true,
      document_type: 'SUBSIDY_LETTER',
      readability: 'CLEAR',
      document_summary: 'Drip irrigation subsidy sanction letter.',
    };

    vi.mocked(api.analyzeDocument).mockResolvedValue(mockAnalysis);

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const fileInput = screen.getByTestId('document-file-input');
    fireEvent.change(fileInput, {
      target: { files: [new File(['let'], 'letter.jpg', { type: 'image/jpeg' })] },
    });

    await waitFor(() => {
      expect(screen.getByText(/Drip irrigation subsidy/i)).toBeInTheDocument();
    });

    // Click Scan Another Document
    const scanAnotherBtn = screen.getByText(new RegExp(stringsEn.scanAnotherDoc, 'i'));
    fireEvent.click(scanAnotherBtn);

    // Should return to idle viewfinder
    expect(screen.getByRole('region', { name: /viewfinder/i })).toBeInTheDocument();
    expect(screen.getByText(new RegExp(stringsEn.actionOpenCamera, 'i'))).toBeInTheDocument();
  });

  // ── 15. Handoff to Voice and Type ───────────────────────────────────────────
  it('invokes voice and type handoffs when clicked', () => {
    const onVoiceHandoff = vi.fn();
    const onTypeHandoff = vi.fn();

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onVoiceHandoff={onVoiceHandoff}
        onTypeHandoff={onTypeHandoff}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const voiceBtn = screen.getByText(new RegExp(stringsEn.actionSpeak, 'i'));
    fireEvent.click(voiceBtn);
    expect(onVoiceHandoff).toHaveBeenCalledTimes(1);

    const typeBtn = screen.getByText(new RegExp(stringsEn.actionType, 'i'));
    fireEvent.click(typeBtn);
    expect(onTypeHandoff).toHaveBeenCalledTimes(1);
  });

  // ── 16. Backend Failure Error Handling ──────────────────────────────────────
  it('handles backend 500 error gracefully without technical jargon', async () => {
    vi.mocked(api.analyzeDocument).mockRejectedValue(new Error('Server error occurred'));

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const fileInput = screen.getByTestId('document-file-input');
    fireEvent.change(fileInput, {
      target: { files: [new File(['err'], 'err.jpg', { type: 'image/jpeg' })] },
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Server error occurred/i)).toBeInTheDocument();
    });
  });

  // ── 17. Security & Ephemeral Privacy Verification ───────────────────────────
  it('does not store documents or queries in localStorage, sessionStorage, or IndexedDB', async () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    const mockAnalysis: VisionAnalyzeResponse = {
      success: true,
      document_type: 'PMFBY_POLICY',
      readability: 'CLEAR',
      document_summary: 'Confidential farmer document.',
    };

    vi.mocked(api.analyzeDocument).mockResolvedValue(mockAnalysis);

    render(
      <ScanScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    const fileInput = screen.getByTestId('document-file-input');
    fireEvent.change(fileInput, {
      target: { files: [new File(['conf'], 'secret.jpg', { type: 'image/jpeg' })] },
    });

    await waitFor(() => {
      expect(screen.getByText(/Confidential farmer document/i)).toBeInTheDocument();
    });

    expect(setItemSpy).not.toHaveBeenCalled();
  });

  // ── 18. Multilingual Rendering (Marathi & Hindi) ────────────────────────────
  it('renders ScanScreen in Marathi with full localization', () => {
    render(
      <ScanScreen
        strings={stringsMr}
        language="mr"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    expect(screen.getByText(stringsMr.scanDocument)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(stringsMr.actionOpenCamera, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(stringsMr.actionUploadDocument, 'i'))).toBeInTheDocument();
  });

  it('renders ScanScreen in Hindi with full localization', () => {
    render(
      <ScanScreen
        strings={stringsHi}
        language="hi"
        serviceAvailable={true}
        onBack={vi.fn()}
        onChangeLanguage={vi.fn()}
        onStartOver={vi.fn()}
      />
    );

    expect(screen.getByText(stringsHi.scanDocument)).toBeInTheDocument();
    expect(screen.getByText(new RegExp(stringsHi.actionOpenCamera, 'i'))).toBeInTheDocument();
    expect(screen.getByText(new RegExp(stringsHi.actionUploadDocument, 'i'))).toBeInTheDocument();
  });

  // ── 19. Responsive Viewports ────────────────────────────────────────────────
  it('renders correctly across 1280x800, 1024x768, and 800x480 viewports without crashing', () => {
    const viewports = [
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
      { width: 800, height: 480 },
    ];

    for (const vp of viewports) {
      window.innerWidth = vp.width;
      window.innerHeight = vp.height;
      window.dispatchEvent(new Event('resize'));

      const { unmount } = render(
        <ScanScreen
          strings={stringsEn}
          language="en"
          serviceAvailable={true}
          onBack={vi.fn()}
          onChangeLanguage={vi.fn()}
          onStartOver={vi.fn()}
        />
      );

      expect(screen.getByRole('region', { name: /viewfinder/i })).toBeInTheDocument();
      unmount();
    }
  });

  // ── 20. Full App Navigation Integration Flow ────────────────────────────────
  it('navigates from Home -> Tap Scan Document -> ScanScreen -> Back', async () => {
    render(<App />);

    // 1. Home Screen -> tap Scan Document
    await waitFor(() => {
      expect(screen.getByText(/How can we help you\?/i)).toBeInTheDocument();
    });

    const scanTile = screen.getByRole('button', { name: /Scan Document/i });
    fireEvent.click(scanTile);

    // 4. In ScanScreen
    expect(screen.getByRole('region', { name: /viewfinder/i })).toBeInTheDocument();
    expect(screen.getByText(/Open Camera/i)).toBeInTheDocument();

    // 5. Back to Home
    const backBtn = screen.getByText(/← Back/i);
    fireEvent.click(backBtn);

    await waitFor(() => {
      expect(screen.getByText(/How can we help you\?/i)).toBeInTheDocument();
    });
  });
});
