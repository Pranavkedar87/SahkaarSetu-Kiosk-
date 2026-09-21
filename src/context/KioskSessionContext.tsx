/**
 * Kiosk Session Context
 *
 * Manages the ephemeral, in-memory session for one citizen interaction.
 *
 * PRIVACY RULES:
 *   - All state is held in React memory only.
 *   - Nothing is written to localStorage, sessionStorage, or IndexedDB.
 *   - A browser reload always produces a clean session.
 *   - resetSession() wipes all citizen data and returns to language selection.
 */

import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { clearActivePrintSlip } from '../services/printer';
import type { LanguageCode, KioskSession, KioskScreen, ChatMessage, DocumentContext } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface KioskSessionContextValue {
  session: KioskSession;
  setLanguage: (lang: LanguageCode) => void;
  setScreen: (screen: KioskScreen) => void;
  setActiveOperation: (active: boolean) => void;
  addMessage: (msg: ChatMessage) => void;
  setDocumentContext: (ctx: DocumentContext | null) => void;
  setServiceAvailable: (available: boolean) => void;
  /** Clears ALL citizen data and navigates to language screen. */
  resetSession: () => void;
}

// ─── Initial state ────────────────────────────────────────────────────────────

const INITIAL_SESSION: KioskSession = {
  language: 'en',
  screen: 'splash',
  activeOperation: false,
  messages: [],
  documentContext: null,
  serviceAvailable: true,
};

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'SET_LANGUAGE'; lang: LanguageCode }
  | { type: 'SET_SCREEN'; screen: KioskScreen }
  | { type: 'SET_ACTIVE_OPERATION'; active: boolean }
  | { type: 'ADD_MESSAGE'; msg: ChatMessage }
  | { type: 'SET_DOCUMENT_CONTEXT'; ctx: DocumentContext | null }
  | { type: 'SET_SERVICE_AVAILABLE'; available: boolean }
  | { type: 'RESET_SESSION' };

function sessionReducer(state: KioskSession, action: Action): KioskSession {
  switch (action.type) {
    case 'SET_LANGUAGE':
      return { ...state, language: action.lang };

    case 'SET_SCREEN':
      return { ...state, screen: action.screen };

    case 'SET_ACTIVE_OPERATION':
      return { ...state, activeOperation: action.active };

    case 'ADD_MESSAGE':
      return { ...state, messages: [...state.messages, action.msg] };

    case 'SET_DOCUMENT_CONTEXT': {
      // Revoke any previous object URL to prevent memory leaks
      if (state.documentContext?.imageObjectUrl) {
        URL.revokeObjectURL(state.documentContext.imageObjectUrl);
      }
      return { ...state, documentContext: action.ctx };
    }

    case 'SET_SERVICE_AVAILABLE':
      return { ...state, serviceAvailable: action.available };

    case 'RESET_SESSION': {
      // Revoke image object URL if one exists
      if (state.documentContext?.imageObjectUrl) {
        URL.revokeObjectURL(state.documentContext.imageObjectUrl);
      }
      // Return to a clean state, preserving only language for one last use,
      // then immediately switch screen to 'language' so the next citizen
      // chooses their own.
      return {
        ...INITIAL_SESSION,
        screen: 'language',
      };
    }

    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const KioskSessionContext = createContext<KioskSessionContextValue | null>(null);

export function KioskSessionProvider({ children }: { children: React.ReactNode }) {
  const [session, dispatch] = useReducer(sessionReducer, INITIAL_SESSION);

  const setLanguage = useCallback((lang: LanguageCode) => {
    dispatch({ type: 'SET_LANGUAGE', lang });
  }, []);

  const setScreen = useCallback((screen: KioskScreen) => {
    dispatch({ type: 'SET_SCREEN', screen });
  }, []);

  const setActiveOperation = useCallback((active: boolean) => {
    dispatch({ type: 'SET_ACTIVE_OPERATION', active });
  }, []);

  const addMessage = useCallback((msg: ChatMessage) => {
    dispatch({ type: 'ADD_MESSAGE', msg });
  }, []);

  const setDocumentContext = useCallback((ctx: DocumentContext | null) => {
    dispatch({ type: 'SET_DOCUMENT_CONTEXT', ctx });
  }, []);

  const setServiceAvailable = useCallback((available: boolean) => {
    dispatch({ type: 'SET_SERVICE_AVAILABLE', available });
  }, []);

  const resetSession = useCallback(() => {
    clearActivePrintSlip();
    dispatch({ type: 'RESET_SESSION' });
  }, []);

  const value: KioskSessionContextValue = {
    session,
    setLanguage,
    setScreen,
    setActiveOperation,
    addMessage,
    setDocumentContext,
    setServiceAvailable,
    resetSession,
  };

  return (
    <KioskSessionContext.Provider value={value}>
      {children}
    </KioskSessionContext.Provider>
  );
}

export function useKioskSession(): KioskSessionContextValue {
  const ctx = useContext(KioskSessionContext);
  if (!ctx) {
    throw new Error('useKioskSession must be used within KioskSessionProvider');
  }
  return ctx;
}
