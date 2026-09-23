/**
 * Clarification Detector Service
 *
 * Detects whether the virtual assistant's response is an interactive clarification
 * request requiring additional context from the citizen (e.g. State, District)
 * before providing a definitive answer.
 *
 * Supports:
 *   - English, Hindi, and Marathi clarification patterns
 *   - Structured intent detection (e.g. CLARIFICATION_REQUIRED, NEEDS_STATE)
 *   - Conservative matching (avoids false positives on general informative questions)
 *   - Contextual query compilation combining original query + clarification answer
 */

export type ClarificationType = 'STATE' | 'DISTRICT' | 'GENERIC';

export interface ClarificationMatch {
  isClarification: boolean;
  type: ClarificationType;
  prompt: string;
}

export interface ClarificationSessionContext {
  type: ClarificationType;
  originalQuestion: string;
  clarificationPrompt: string;
}

// ── State Clarification Patterns ──────────────────────────────────────────────
const STATE_PATTERNS: RegExp[] = [
  /which state are you from\??/i,
  /what state do you live in\??/i,
  /which state should i use\??/i,
  /what is your state\??/i,
  /specify (?:which )?(?:district or )?state\??/i,
  /tell me your state\??/i,
  /please (?:provide|tell|mention|specify) (?:which )?(?:district or )?state\??/i,
  /(?:vary|varies|depends?) by state.*which state/i,
  /(?:vary|varies|depends?) on the state.*which state/i,
  /assistance can vary by state.*state/i,
  /support can vary by state.*state/i,
  // Hindi
  /आप किस राज्य से हैं\??/,
  /आप किस राज्य में रहते हैं\??/,
  /अपना राज्य बताएं\??/,
  /कृपया अपना राज्य (?:या ज़िला )?बताएं\??/,
  /किस राज्य से\??/,
  /राज्य का नाम बताएं\??/,
  // Marathi
  /तुम्ही कोणत्या राज्यातून आहात\??/,
  /तुम्ही कोणत्या राज्यात राहता\??/,
  /आपले राज्य सांगा\??/,
  /कृपया (?:आपले|तुमचा) (?:जिल्हा किंवा )?राज्य सांगा\??/,
  /कोणत्या राज्यातून\??/,
  /राज्याचे नाव सांगा\??/,
];

// ── District Clarification Patterns ───────────────────────────────────────────
const DISTRICT_PATTERNS: RegExp[] = [
  /which district are you from\??/i,
  /what district do you live in\??/i,
  /which district\??/i,
  /specify your district\??/i,
  /please (?:provide|tell|mention|specify) your district\??/i,
  // Hindi
  /आप किस जिले से हैं\??/,
  /अपना जिला बताएं\??/,
  /कृपया अपना जिला बताएं\??/,
  // Marathi
  /तुम्ही कोणत्या जिल्ह्यातून आहात\??/,
  /आपला जिल्हा सांगा\??/,
  /कृपया आपला जिल्हा सांगा\??/,
];

// ── Generic Clarification Patterns ────────────────────────────────────────────
const GENERIC_PATTERNS: RegExp[] = [
  /(?:could|can) you tell me what crop/i,
  /are you a small or marginal farmer\??/i,
  /what crop (?:are you|do you)/i,
  // Hindi
  /क्या आप अपनी ज़मीन का क्षेत्रफल बता सकते हैं\??/,
  /आप कौन सी फसल/i,
  // Marathi
  /तुम्ही कोणत्या पिकाची लागवड केली आहे\??/,
  /आपण कोणत्या पिकाची/i,
];

/**
 * Detects whether the provided text contains an interactive clarification request.
 * Returns ClarificationMatch with isClarification=true if detected, or isClarification=false.
 */
export function detectClarification(
  text: string,
  intent?: string
): ClarificationMatch {
  if (!text) {
    return { isClarification: false, type: 'GENERIC', prompt: '' };
  }
  const clean = text.trim();

  // 1. Check explicit backend intent signals
  const normalizedIntent = (intent || '').toUpperCase();
  if (
    normalizedIntent === 'CLARIFICATION_REQUIRED' ||
    normalizedIntent === 'NEEDS_STATE' ||
    normalizedIntent === 'CLARIFICATION_STATE'
  ) {
    return { isClarification: true, type: 'STATE', prompt: clean };
  }
  if (
    normalizedIntent === 'NEEDS_DISTRICT' ||
    normalizedIntent === 'CLARIFICATION_DISTRICT'
  ) {
    return { isClarification: true, type: 'DISTRICT', prompt: clean };
  }

  // 2. Check state clarification regexes
  for (const pattern of STATE_PATTERNS) {
    if (pattern.test(clean)) {
      return { isClarification: true, type: 'STATE', prompt: clean };
    }
  }

  // 3. Check district clarification regexes
  for (const pattern of DISTRICT_PATTERNS) {
    if (pattern.test(clean)) {
      return { isClarification: true, type: 'DISTRICT', prompt: clean };
    }
  }

  // 4. Check generic clarification regexes
  for (const pattern of GENERIC_PATTERNS) {
    if (pattern.test(clean)) {
      return { isClarification: true, type: 'GENERIC', prompt: clean };
    }
  }

  return { isClarification: false, type: 'GENERIC', prompt: clean };
}

/**
 * Builds the contextual follow-up query preserving the original user question
 * and injecting the user's clarification answer.
 *
 * Supports:
 *   buildClarificationContextQuery(original, answer, type)
 *   buildClarificationContextQuery(original, prompt, answer)
 */
export function buildClarificationContextQuery(
  originalQuestion: string,
  param2: string,
  param3?: string
): string {
  const cleanOriginal = (originalQuestion || '').trim();
  let cleanAnswer: string;
  let type: ClarificationType = 'STATE';

  if (param3 !== undefined) {
    if (param3 === 'STATE' || param3 === 'DISTRICT' || param3 === 'GENERIC') {
      cleanAnswer = (param2 || '').trim();
      type = param3;
    } else {
      // Called as (originalQuestion, prompt, answer)
      cleanAnswer = (param3 || '').trim();
      const promptLower = (param2 || '').toLowerCase();
      if (/state|राज्य/.test(promptLower)) {
        type = 'STATE';
      } else if (/district|ज़िला|जिल्हा/.test(promptLower)) {
        type = 'DISTRICT';
      } else {
        type = 'GENERIC';
      }
    }
  } else {
    cleanAnswer = (param2 || '').trim();
  }

  if (!cleanOriginal) return cleanAnswer;
  if (!cleanAnswer) return cleanOriginal;

  const base = cleanOriginal.replace(/[.?!]+$/, '').trim();

  if (type === 'STATE') {
    return `${base} in ${cleanAnswer}`;
  }

  if (type === 'DISTRICT') {
    return `${base} in ${cleanAnswer} district`;
  }

  return `${base} (${cleanAnswer})`;
}
