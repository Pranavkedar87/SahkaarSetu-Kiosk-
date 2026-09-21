/**
 * TypeScreen
 *
 * Real Text Query screen for the SahkaarSetu Kiosk (Phase K5).
 * End-to-end flow:
 *   1. Large touchscreen-friendly text input area.
 *   2. Prominent submit button (disabled when empty or processing).
 *   3. Submits query to POST /api/query with response_mode="text" and active language.
 *   4. Displays user's question, structured answer, and source citations.
 *   5. Internal scrolling for long answers on kiosk screens.
 *   6. Friendly error handling without exposing internal technical details.
 *   7. Actions: Ask Another Question, Voice Handoff, Start Over, Back.
 *   8. Strict privacy: all transient state in React memory only.
 *   9. Inactivity timer pause during processing.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { KioskShell } from '../components/kiosk/KioskShell';
import { PrintModal } from '../components/kiosk/PrintModal';
import { sendQuery } from '../services/api';
import type { KioskStrings } from '../i18n';
import type { LanguageCode, QueryResponse } from '../types';

export type TypeFlowState = 'input' | 'processing' | 'answered' | 'error';

interface Props {
  strings: KioskStrings;
  language?: LanguageCode;
  serviceAvailable: boolean;
  onBack: () => void;
  onVoiceHandoff?: () => void;
  onChangeLanguage: () => void;
  onStartOver: () => void;
  setActiveOperation?: (active: boolean) => void;
  onMessageAdded?: (userText: string, assistantText: string) => void;
  onAsk?: (question: string) => void;
}

// Clean and format text for accessible touchscreen readability
function formatKioskAnswer(text: string): string {
  if (!text) return '';
  return text
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#+\s*/g, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/[*_`]/g, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .trim();
}

export function TypeScreen({
  strings,
  language = 'en',
  serviceAvailable,
  onBack,
  onVoiceHandoff,
  onChangeLanguage,
  onStartOver,
  setActiveOperation,
  onMessageAdded,
  onAsk,
}: Props) {
  const [flowState, setFlowState] = useState<TypeFlowState>('input');
  const [question, setQuestion] = useState('');
  const [submittedQuestion, setSubmittedQuestion] = useState('');
  const [queryResponse, setQueryResponse] = useState<QueryResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showPrintModal, setShowPrintModal] = useState(false);

  const isSubmittingRef = useRef(false);
  const sessionIdRef = useRef<string>(
    `kiosk-type-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`
  );

  // Sync active operation to pause kiosk inactivity timeout during processing
  useEffect(() => {
    if (setActiveOperation) {
      setActiveOperation(flowState === 'processing');
    }
    return () => {
      if (setActiveOperation) {
        setActiveOperation(false);
      }
    };
  }, [flowState, setActiveOperation]);

  // Handle question submission to backend
  const executeQuery = useCallback(
    async (textToAsk: string) => {
      const trimmed = textToAsk.trim();
      if (!trimmed || isSubmittingRef.current) return;

      isSubmittingRef.current = true;
      setSubmittedQuestion(trimmed);
      setFlowState('processing');
      setErrorMessage(null);

      try {
        const res = await sendQuery({
          message: trimmed,
          language,
          session_id: sessionIdRef.current,
          response_mode: 'text',
        });

        const rawAnswer = res.display_answer || res.answer || '';
        if (!rawAnswer.trim()) {
          throw new Error('Empty answer received');
        }

        setQueryResponse(res);
        setFlowState('answered');

        if (onMessageAdded) {
          onMessageAdded(trimmed, rawAnswer);
        }
        if (onAsk) {
          onAsk(trimmed);
        }
      } catch (err) {
        console.error('[TypeScreen] Query error:', err);
        setFlowState('error');
        setErrorMessage(strings.textServiceUnavailable);
      } finally {
        isSubmittingRef.current = false;
      }
    },
    [language, strings.textServiceUnavailable, onMessageAdded, onAsk]
  );

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = question.trim();
    if (trimmed) {
      if (onAsk) {
        onAsk(trimmed);
      }
      executeQuery(trimmed);
    }
  };

  const handleRetry = () => {
    if (submittedQuestion) {
      executeQuery(submittedQuestion);
    } else {
      setFlowState('input');
    }
  };

  const handleAskAnother = () => {
    setQuestion('');
    setSubmittedQuestion('');
    setQueryResponse(null);
    setErrorMessage(null);
    setFlowState('input');
  };

  const handleStartOver = () => {
    setQuestion('');
    setSubmittedQuestion('');
    setQueryResponse(null);
    setErrorMessage(null);
    setFlowState('input');
    onStartOver();
  };

  return (
    <KioskShell
      strings={strings}
      serviceAvailable={serviceAvailable}
      onBack={onBack}
      onChangeLanguage={onChangeLanguage}
      onStartOver={handleStartOver}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '20px',
          width: '100%',
          maxWidth: '720px',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        {/* STATE 1: INPUT FORM */}
        {flowState === 'input' && (
          <div
            style={{
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
            }}
          >
            <h2
              style={{
                fontSize: '32px',
                fontWeight: 800,
                color: '#1e3a5f',
                margin: 0,
                textAlign: 'center',
              }}
            >
              {strings.howCanWeHelp}
            </h2>

            <form
              onSubmit={handleSubmit}
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: '20px',
              }}
            >
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={strings.typeQuestion}
                aria-label={strings.typeQuestion}
                rows={4}
                autoFocus
                style={{
                  width: '100%',
                  padding: '20px',
                  fontSize: '22px',
                  lineHeight: 1.4,
                  fontFamily: 'inherit',
                  borderRadius: '16px',
                  border: '2px solid #cbd5e1',
                  boxSizing: 'border-box',
                  outline: 'none',
                  resize: 'none',
                  backgroundColor: '#ffffff',
                  color: '#0f172a',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  touchAction: 'manipulation',
                }}
              />

              <div
                style={{
                  display: 'flex',
                  gap: '14px',
                  width: '100%',
                }}
              >
                <button
                  type="button"
                  onClick={onBack}
                  style={{
                    flex: 1,
                    minHeight: '60px',
                    backgroundColor: '#f1f5f9',
                    color: '#334155',
                    border: '2px solid #cbd5e1',
                    borderRadius: '14px',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                  }}
                >
                  ← {strings.actionBack}
                </button>

                {onVoiceHandoff && (
                  <button
                    type="button"
                    onClick={onVoiceHandoff}
                    style={{
                      flex: 1,
                      minHeight: '60px',
                      backgroundColor: '#f0fdf4',
                      color: '#15803d',
                      border: '2px solid #86efac',
                      borderRadius: '14px',
                      fontSize: '18px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      touchAction: 'manipulation',
                    }}
                  >
                    🎙️ {strings.textVoiceHandoff}
                  </button>
                )}

                <button
                  type="submit"
                  disabled={!question.trim()}
                  style={{
                    flex: 2,
                    minHeight: '60px',
                    backgroundColor: question.trim() ? '#15803d' : '#94a3b8',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '14px',
                    fontSize: '20px',
                    fontWeight: 800,
                    cursor: question.trim() ? 'pointer' : 'not-allowed',
                    touchAction: 'manipulation',
                    boxShadow: question.trim() ? '0 4px 16px rgba(21, 128, 61, 0.3)' : 'none',
                  }}
                >
                  {strings.actionAsk} →
                </button>
              </div>
            </form>
          </div>
        )}

        {/* STATE 2: PROCESSING */}
        {flowState === 'processing' && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '20px',
              padding: '40px 0',
              textAlign: 'center',
              width: '100%',
            }}
          >
            <div style={{ fontSize: '56px' }} aria-hidden="true">
              ⏳
            </div>

            <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#1e3a5f', margin: 0 }}>
              {strings.textFindingAnswer}
            </h2>

            {submittedQuestion && (
              <div
                style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e2e8f0',
                  borderRadius: '16px',
                  padding: '16px 24px',
                  maxWidth: '560px',
                  width: '100%',
                  boxSizing: 'border-box',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                }}
              >
                <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 700, display: 'block' }}>
                  {strings.textYourQuestion}:
                </span>
                <p style={{ fontSize: '20px', fontWeight: 600, color: '#0f172a', margin: '4px 0 0' }}>
                  "{submittedQuestion}"
                </p>
              </div>
            )}
          </div>
        )}

        {/* STATE 3: ANSWERED */}
        {flowState === 'answered' && queryResponse && (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              width: '100%',
            }}
          >
            {/* User Question Card */}
            {submittedQuestion && (
              <div
                style={{
                  backgroundColor: '#f1f5f9',
                  borderRadius: '14px',
                  padding: '12px 20px',
                  borderLeft: '5px solid #15803d',
                }}
              >
                <span style={{ fontSize: '14px', fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>
                  {strings.textYourQuestion}:
                </span>
                <p style={{ fontSize: '19px', fontWeight: 600, color: '#0f172a', margin: '4px 0 0' }}>
                  "{submittedQuestion}"
                </p>
              </div>
            )}

            {/* Assistant Answer Card */}
            <div
              style={{
                backgroundColor: '#ffffff',
                border: '2px solid #e2e8f0',
                borderRadius: '18px',
                padding: '24px 28px',
                boxShadow: '0 4px 16px rgba(0,0,0,0.06)',
                maxHeight: '380px',
                overflowY: 'auto',
                boxSizing: 'border-box',
              }}
            >
              <div style={{ marginBottom: '12px' }}>
                <span style={{ fontSize: '16px', fontWeight: 800, color: '#15803d' }}>
                  🏛️ {strings.voiceAnswer}
                </span>
              </div>

              <p
                style={{
                  fontSize: '20px',
                  lineHeight: 1.55,
                  color: '#1e293b',
                  margin: 0,
                  whiteSpace: 'pre-line',
                }}
              >
                {formatKioskAnswer(queryResponse.display_answer || queryResponse.answer || '')}
              </p>

              {/* Source citations if present */}
              {queryResponse.sources && queryResponse.sources.length > 0 && (
                <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 700 }}>
                    Sources:
                  </span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '6px' }}>
                    {queryResponse.sources.map((s, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          borderRadius: '6px',
                          padding: '4px 8px',
                          fontSize: '13px',
                          color: '#334155',
                        }}
                      >
                        📄 {s.title || 'Official Cooperative Guideline'}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Actions Bar */}
            <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '8px' }}>
              <button
                type="button"
                onClick={handleAskAnother}
                style={{
                  flex: 2,
                  minHeight: '56px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '14px',
                  fontSize: '18px',
                  fontWeight: 800,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                  boxShadow: '0 4px 16px rgba(21, 128, 61, 0.25)',
                }}
              >
                ✏️ {strings.textAskAnother}
              </button>

              {onVoiceHandoff && (
                <button
                  type="button"
                  onClick={onVoiceHandoff}
                  style={{
                    flex: 1.5,
                    minHeight: '56px',
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    border: '2px solid #86efac',
                    borderRadius: '14px',
                    fontSize: '17px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                  }}
                >
                  🎙️ {strings.textVoiceHandoff}
                </button>
              )}

              <button
                type="button"
                onClick={() => setShowPrintModal(true)}
                style={{
                  flex: 1.5,
                  minHeight: '56px',
                  backgroundColor: '#ffffff',
                  color: '#1e3a5f',
                  border: '2px solid #cbd5e1',
                  borderRadius: '14px',
                  fontSize: '17px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                🖨️ {strings.actionPrint}
              </button>

              <button
                type="button"
                onClick={onBack}
                style={{
                  flex: 1,
                  minHeight: '56px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '2px solid #cbd5e1',
                  borderRadius: '14px',
                  fontSize: '17px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                ← {strings.actionBack}
              </button>
            </div>

            {showPrintModal && queryResponse && (
              <PrintModal
                strings={strings}
                payload={{
                  question: submittedQuestion || question,
                  guidance: queryResponse.display_answer || queryResponse.answer || '',
                  language: language || 'en',
                  sources: queryResponse.sources?.map((s) => s.title || s.snippet || '').filter(Boolean),
                  createdAt: new Date().toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
                }}
                onClose={() => setShowPrintModal(false)}
              />
            )}
          </div>
        )}

        {/* STATE 4: ERROR */}
        {flowState === 'error' && (
          <div
            style={{
              backgroundColor: '#ffffff',
              border: '2px solid #fecaca',
              borderRadius: '20px',
              padding: '32px',
              width: '100%',
              maxWidth: '560px',
              textAlign: 'center',
              boxShadow: '0 8px 30px rgba(0,0,0,0.06)',
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px' }} aria-hidden="true">
              ⚠️
            </div>

            <h3 style={{ fontSize: '24px', fontWeight: 800, color: '#991b1b', margin: '0 0 12px 0' }}>
              {strings.stateErrorTryAgain}
            </h3>

            <p style={{ fontSize: '18px', color: '#475569', margin: '0 0 28px 0', lineHeight: 1.4 }}>
              {errorMessage || strings.textServiceUnavailable}
            </p>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleRetry}
                style={{
                  flex: '1 1 130px',
                  minHeight: '56px',
                  backgroundColor: '#15803d',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                🔄 {strings.voiceTryAgain}
              </button>

              <button
                type="button"
                onClick={() => setFlowState('input')}
                style={{
                  flex: '1 1 130px',
                  minHeight: '56px',
                  backgroundColor: '#eff6ff',
                  color: '#1d4ed8',
                  border: '2px solid #93c5fd',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                ✏️ {strings.typeQuestion}
              </button>

              <button
                type="button"
                onClick={onBack}
                style={{
                  flex: '1 1 130px',
                  minHeight: '56px',
                  backgroundColor: '#f1f5f9',
                  color: '#334155',
                  border: '2px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                ← {strings.actionBack}
              </button>

              {onVoiceHandoff && (
                <button
                  type="button"
                  onClick={onVoiceHandoff}
                  style={{
                    flex: '1 1 130px',
                    minHeight: '56px',
                    backgroundColor: '#f0fdf4',
                    color: '#15803d',
                    border: '2px solid #86efac',
                    borderRadius: '12px',
                    fontSize: '18px',
                    fontWeight: 700,
                    cursor: 'pointer',
                    touchAction: 'manipulation',
                  }}
                >
                  🎙️ {strings.textVoiceHandoff}
                </button>
              )}

              <button
                type="button"
                onClick={handleStartOver}
                style={{
                  flex: '1 1 130px',
                  minHeight: '56px',
                  backgroundColor: '#ffffff',
                  color: '#1e3a5f',
                  border: '2px solid #cbd5e1',
                  borderRadius: '12px',
                  fontSize: '18px',
                  fontWeight: 700,
                  cursor: 'pointer',
                  touchAction: 'manipulation',
                }}
              >
                ↩ {strings.promptStartOver}
              </button>
            </div>
          </div>
        )}
      </div>
    </KioskShell>
  );
}
