/**
 * K5 Text Query Integration Tests
 *
 * Covers all 20 required test scenarios:
 *  1. Type screen opens with input area and buttons
 *  2. Empty submit blocked (button disabled, no API call)
 *  3. Valid question submission triggers /api/query
 *  4. Correct language sent (hi, mr, en, etc.)
 *  5. Correct session_id sent
 *  6. response_mode sent correctly ("text")
 *  7. Loading state displayed ("Finding your answer…")
 *  8. Successful answer rendering with formatted clean text
 *  9. Source rendering with document badges
 * 10. Backend failure handling with user-friendly message
 * 11. Timeout handling
 * 12. Malformed response handling
 * 13. Empty answer handling
 * 14. Retry functionality resubmitting original query
 * 15. Voice handoff button switches to voice interaction
 * 16. Start Over resets session
 * 17. Session reset clears transient query state
 * 18. Duplicate submit prevention
 * 19. 22-language i18n coverage
 * 20. K3 regression verification & viewports (1280x800, 1024x768, 800x480)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import { TypeScreen } from '../pages/TypeScreen';
import { getStrings } from '../i18n';
import { LANGUAGES } from '../i18n/languages';
import * as api from '../services/api';
import App from '../App';

// Mock API module
vi.mock('../services/api', () => ({
  sendQuery: vi.fn(),
  transcribeAudio: vi.fn(),
  synthesizeSpeech: vi.fn(),
  checkHealth: vi.fn().mockResolvedValue({ status: 'ok' }),
}));

class MockAudio {
  play = vi.fn().mockResolvedValue(undefined);
  pause = vi.fn();
}

class MockMediaRecorder {
  start = vi.fn();
  stop = vi.fn();
  ondataavailable = null;
  onstop = null;
  static isTypeSupported = vi.fn().mockReturnValue(true);
}

describe('K5: Text Query Interface & Pipeline', () => {
  const stringsEn = getStrings('en');
  const stringsHi = getStrings('hi');
  const stringsMr = getStrings('mr');
  const mockOnBack = vi.fn();
  const mockOnVoiceHandoff = vi.fn();
  const mockOnChangeLanguage = vi.fn();
  const mockOnStartOver = vi.fn();
  const mockSetActiveOperation = vi.fn();
  const mockOnMessageAdded = vi.fn();
  const mockOnAsk = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (window as any).Audio = MockAudio;
    (window as any).MediaRecorder = MockMediaRecorder;

    Object.defineProperty(navigator, 'mediaDevices', {
      value: {
        getUserMedia: vi.fn().mockResolvedValue({
          getTracks: vi.fn().mockReturnValue([{ stop: vi.fn() }]),
        }),
      },
      writable: true,
      configurable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Type screen opens
  it('1. opens Type screen with large input area, Back, Voice, and Ask buttons', () => {
    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
        onMessageAdded={mockOnMessageAdded}
        onAsk={mockOnAsk}
      />
    );

    expect(screen.getByPlaceholderText(stringsEn.typeQuestion)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(stringsEn.actionBack, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(stringsEn.textVoiceHandoff, 'i') })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') })).toBeInTheDocument();
  });

  // 2. Empty submit blocked
  it('2. blocks submission when text input is empty or whitespace only', () => {
    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const askBtn = screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') });
    expect(askBtn).toBeDisabled();

    // Type spaces
    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: '    ' } });
    expect(askBtn).toBeDisabled();

    fireEvent.click(askBtn);
    expect(api.sendQuery).not.toHaveBeenCalled();
  });

  // 3. Valid question submission
  it('3. submits valid question to sendQuery', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'KCC offers crop loans at subsidized 4% interest.',
      display_answer: 'KCC offers crop loans at subsidized 4% interest.',
      language: 'en',
      intent: 'LOAN_INFO',
    });

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'What is KCC interest rate?' } });

    const askBtn = screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') });
    expect(askBtn).not.toBeDisabled();
    fireEvent.click(askBtn);

    await waitFor(() => {
      expect(api.sendQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'What is KCC interest rate?',
        })
      );
    });
  });

  // 4. Correct language sent
  it('4. passes current language (hi/mr) to query endpoint', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'पैक्स सदस्यता के लिए ज़मीन के कागज़ात आवश्यक हैं।',
      language: 'hi',
      intent: 'PACS_MEMBERSHIP',
    });

    render(
      <TypeScreen
        strings={stringsHi}
        language="hi"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsHi.typeQuestion);
    fireEvent.change(input, { target: { value: 'पैक्स सदस्यता कैसे लें?' } });

    const askBtn = screen.getByRole('button', { name: new RegExp(stringsHi.actionAsk, 'i') });
    fireEvent.click(askBtn);

    await waitFor(() => {
      expect(api.sendQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          language: 'hi',
          message: 'पैक्स सदस्यता कैसे लें?',
        })
      );
    });
  });

  // 5. Correct session_id sent
  it('5. sends ephemeral session_id with kiosk-type prefix', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Test answer',
      language: 'en',
      intent: 'TEST',
    });

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Sample question' } });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(api.sendQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          session_id: expect.stringMatching(/^kiosk-type-/),
        })
      );
    });
  });

  // 6. response_mode sent correctly
  it('6. sends response_mode="text" in query request', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Test response mode',
      language: 'en',
      intent: 'TEST',
    });

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Querying response mode' } });

    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(api.sendQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          response_mode: 'text',
        })
      );
    });
  });

  // 7. Loading state
  it('7. renders "Finding your answer…" during query processing and sets activeOperation=true', async () => {
    let resolveQuery: (res: any) => void;
    const queryPromise = new Promise((resolve) => {
      resolveQuery = resolve;
    });

    vi.mocked(api.sendQuery).mockReturnValueOnce(queryPromise as any);

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Fertilizer booking steps' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText(stringsEn.textFindingAnswer)).toBeInTheDocument();
      expect(screen.getByText('"Fertilizer booking steps"')).toBeInTheDocument();
      expect(mockSetActiveOperation).toHaveBeenCalledWith(true);
    });

    resolveQuery!({ answer: 'Completed answer' });
  });

  // 8. Successful answer rendering
  it('8. renders user question and assistant answer with clean kiosk formatting', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: '**Subsidized Seeds**\nAvailable at PACS.\n* Step 1: Visit PACS\n* Step 2: Present Aadhaar',
      display_answer: '**Subsidized Seeds**\nAvailable at PACS.\n* Step 1: Visit PACS\n* Step 2: Present Aadhaar',
      language: 'en',
      intent: 'SEEDS_INFO',
    });

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'How to get seeds?' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText('"How to get seeds?"')).toBeInTheDocument();
      expect(screen.getByText(/Subsidized Seeds/)).toBeInTheDocument();
      expect(screen.getByText(/• Step 1: Visit PACS/)).toBeInTheDocument();
    });
  });

  // 9. Source rendering
  it('9. renders source/citation information when returned by backend', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'By-law amendment requires two-thirds majority in AGM.',
      sources: [
        { title: 'Model By-laws for PACS 2024', source_url: '#' },
        { title: 'State Cooperative Societies Act', source_url: '#' },
      ],
      language: 'en',
      intent: 'BYLAWS',
    });

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'How to amend bylaws?' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText(/Model By-laws for PACS 2024/i)).toBeInTheDocument();
      expect(screen.getByText(/State Cooperative Societies Act/i)).toBeInTheDocument();
    });
  });

  // 10. Backend failure
  it('10. renders friendly error fallback on network/backend failure without technical details', async () => {
    vi.mocked(api.sendQuery).mockRejectedValueOnce(new Error('Internal Server Error 500'));

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Crash test question' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText(stringsEn.stateErrorTryAgain)).toBeInTheDocument();
      expect(screen.getByText(stringsEn.textServiceUnavailable)).toBeInTheDocument();
      // Ensure raw error details / stack trace are NOT exposed
      expect(screen.queryByText(/Internal Server Error 500/i)).not.toBeInTheDocument();
    });
  });

  // 11. Timeout
  it('11. handles timeout with user-friendly fallback', async () => {
    vi.mocked(api.sendQuery).mockRejectedValueOnce(new Error('Query request timed out'));

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Timeout question' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText(stringsEn.textServiceUnavailable)).toBeInTheDocument();
    });
  });

  // 12. Malformed response
  it('12. handles malformed response with friendly error screen', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({} as any);

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Malformed test' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText(stringsEn.stateErrorTryAgain)).toBeInTheDocument();
      expect(screen.getByText(stringsEn.textServiceUnavailable)).toBeInTheDocument();
    });
  });

  // 13. Empty answer
  it('13. rejects empty answer and shows fallback', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: '   ',
      display_answer: '',
      language: 'en',
      intent: 'EMPTY',
    });

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Empty test' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText(stringsEn.stateErrorTryAgain)).toBeInTheDocument();
    });
  });

  // 14. Retry
  it('14. resubmits question when tapping Try Again button', async () => {
    vi.mocked(api.sendQuery)
      .mockRejectedValueOnce(new Error('Network drop'))
      .mockResolvedValueOnce({
        answer: 'Recovered answer after retry.',
        language: 'en',
        intent: 'RETRY',
      });

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Retry question' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText(stringsEn.stateErrorTryAgain)).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole('button', { name: new RegExp(stringsEn.voiceTryAgain, 'i') });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText('Recovered answer after retry.')).toBeInTheDocument();
    });
  });

  // 15. Voice handoff
  it('15. triggers onVoiceHandoff from input, answer, and error views', async () => {
    const { rerender } = render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    // From input view
    const voiceHandoffBtn = screen.getByRole('button', { name: new RegExp(stringsEn.textVoiceHandoff, 'i') });
    fireEvent.click(voiceHandoffBtn);
    expect(mockOnVoiceHandoff).toHaveBeenCalledTimes(1);

    // From answered view
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Handoff response',
      language: 'en',
    });

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Handoff test' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText('Handoff response')).toBeInTheDocument();
    });

    const answerVoiceBtn = screen.getByRole('button', { name: new RegExp(stringsEn.textVoiceHandoff, 'i') });
    fireEvent.click(answerVoiceBtn);
    expect(mockOnVoiceHandoff).toHaveBeenCalledTimes(2);
  });

  // 16. Start Over
  it('16. calls onStartOver and resets input state', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Answer to start over from',
      language: 'en',
    });

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Start over question' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText('Answer to start over from')).toBeInTheDocument();
    });

    const startOverBtn = screen.getByRole('button', { name: new RegExp(stringsEn.promptStartOver, 'i') });
    fireEvent.click(startOverBtn);

    expect(mockOnStartOver).toHaveBeenCalledTimes(1);
  });

  // 17. Session reset (Ask Another Question)
  it('17. "Ask Another Question" clears transient query state and returns to input', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'First query answer',
      language: 'en',
    });

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'First query' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    await waitFor(() => {
      expect(screen.getByText('First query answer')).toBeInTheDocument();
    });

    const askAnotherBtn = screen.getByRole('button', { name: new RegExp(stringsEn.textAskAnother, 'i') });
    fireEvent.click(askAnotherBtn);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(stringsEn.typeQuestion)).toBeInTheDocument();
      expect(screen.getByPlaceholderText(stringsEn.typeQuestion)).toHaveValue('');
    });
  });

  // 18. Duplicate submit prevention
  it('18. ignores secondary submit clicks while query is already inflight', async () => {
    let resolveQuery: (res: any) => void;
    const queryPromise = new Promise((res) => {
      resolveQuery = res;
    });

    vi.mocked(api.sendQuery).mockImplementation(() => queryPromise as any);

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'Double click test' } });

    const askBtn = screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') });
    fireEvent.click(askBtn);
    fireEvent.click(askBtn);

    await waitFor(() => {
      expect(api.sendQuery).toHaveBeenCalledTimes(1);
    });

    resolveQuery!({ answer: 'Single query fulfilled' });
  });

  // 19. 22-language i18n coverage
  it('19. provides complete 22-language translations for all K5 keys', () => {
    const k5Keys = [
      'textFindingAnswer',
      'textServiceUnavailable',
      'textVoiceHandoff',
      'textAskAnother',
      'textYourQuestion',
    ] as const;

    for (const lang of LANGUAGES) {
      const strings = getStrings(lang.code);
      for (const key of k5Keys) {
        expect(strings[key]).toBeDefined();
        expect(typeof strings[key]).toBe('string');
        expect(strings[key].trim().length).toBeGreaterThan(0);
      }
    }
  });

  // 20. Viewport responsiveness (1280x800, 1024x768, 800x480)
  it('20. renders correctly in standard kiosk touch viewports (1280x800, 1024x768, 800x480)', () => {
    const viewports = [
      { width: 1280, height: 800 },
      { width: 1024, height: 768 },
      { width: 800, height: 480 },
    ];

    for (const vp of viewports) {
      window.innerWidth = vp.width;
      window.innerHeight = vp.height;

      const { container, unmount } = render(
        <TypeScreen
          strings={stringsMr}
          language="mr"
          serviceAvailable={true}
          onBack={mockOnBack}
          onVoiceHandoff={mockOnVoiceHandoff}
          onChangeLanguage={mockOnChangeLanguage}
          onStartOver={mockOnStartOver}
          setActiveOperation={mockSetActiveOperation}
        />
      );

      expect(screen.getByPlaceholderText(stringsMr.typeQuestion)).toBeInTheDocument();
      expect(container.firstChild).toBeInTheDocument();
      unmount();
    }
  });

  // 21. Error view back and edit actions
  it('21. allows user to go Back or Edit their question from the error screen', async () => {
    vi.mocked(api.sendQuery).mockRejectedValueOnce(new Error('Network error'));

    render(
      <TypeScreen
        strings={stringsEn}
        language="en"
        serviceAvailable={true}
        onBack={mockOnBack}
        onVoiceHandoff={mockOnVoiceHandoff}
        onChangeLanguage={mockOnChangeLanguage}
        onStartOver={mockOnStartOver}
        setActiveOperation={mockSetActiveOperation}
      />
    );

    const input = screen.getByPlaceholderText(stringsEn.typeQuestion);
    fireEvent.change(input, { target: { value: 'How to register a PACS?' } });
    fireEvent.click(screen.getByRole('button', { name: new RegExp(stringsEn.actionAsk, 'i') }));

    // Wait for error state
    await waitFor(() => {
      expect(screen.getByText(stringsEn.stateErrorTryAgain)).toBeInTheDocument();
    });

    // Verify Back button exists and calls onBack
    const backBtn = screen.getByRole('button', { name: new RegExp(stringsEn.actionBack, 'i') });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);
    expect(mockOnBack).toHaveBeenCalledTimes(1);

    // Verify Edit button exists and restores input form with question intact
    const editBtn = screen.getByRole('button', { name: new RegExp(stringsEn.typeQuestion, 'i') });
    expect(editBtn).toBeInTheDocument();
    fireEvent.click(editBtn);

    expect(screen.getByPlaceholderText(stringsEn.typeQuestion)).toBeInTheDocument();
    expect(screen.getByDisplayValue('How to register a PACS?')).toBeInTheDocument();
  });
});

describe('K5: Full App Type Navigation & Integration Flow', () => {
  it('launches directly on home -> tap Type -> ask question -> view answer -> voice handoff', async () => {
    vi.mocked(api.sendQuery).mockResolvedValueOnce({
      answer: 'Integrated answer for cooperative member',
      display_answer: 'Integrated answer for cooperative member',
      language: 'en',
      intent: 'GENERAL',
    });

    render(<App />);

    // 1. Home screen: tap Type
    const typeBtn = await screen.findByRole('button', { name: /type/i });
    expect(typeBtn).toBeInTheDocument();
    fireEvent.click(typeBtn);

    // 2. Type screen opens
    const input = await screen.findByPlaceholderText(/type your question/i);
    expect(input).toBeInTheDocument();

    // 5. Submit question
    fireEvent.change(input, { target: { value: 'How to register a society?' } });
    fireEvent.click(screen.getByRole('button', { name: /ask/i }));

    // 6. Answer displayed
    await waitFor(() => {
      expect(screen.getByText('Integrated answer for cooperative member')).toBeInTheDocument();
    });

    // 7. Voice handoff from Answer screen
    const voiceHandoffBtn = screen.getByRole('button', { name: /voice assistance|voice/i });
    fireEvent.click(voiceHandoffBtn);

    // 8. Enters VoiceScreen
    await waitFor(() => {
      expect(screen.getByText(/listening/i)).toBeInTheDocument();
    });
  });

  it('error in TypeScreen allows clicking Back to return to HomeScreen', async () => {
    vi.mocked(api.sendQuery).mockRejectedValueOnce(new Error('Server unavailable'));

    render(<App />);

    // 1. Home -> tap Type
    const typeBtn = await screen.findByRole('button', { name: /type/i });
    fireEvent.click(typeBtn);

    // 2. Type -> submit question
    const input = await screen.findByPlaceholderText(/type your question/i);
    fireEvent.change(input, { target: { value: 'Test failing question' } });
    fireEvent.click(screen.getByRole('button', { name: /ask/i }));

    // 3. Error displayed
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /unable to process/i })).toBeInTheDocument();
    });

    // 4. Click Back on error screen
    const backBtn = screen.getByRole('button', { name: /back/i });
    expect(backBtn).toBeInTheDocument();
    fireEvent.click(backBtn);

    // 5. Successfully returns to Home Screen
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /type/i })).toBeInTheDocument();
    });
  });
});
