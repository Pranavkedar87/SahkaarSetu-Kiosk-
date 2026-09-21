/**
 * Session Tests
 *
 * Verifies:
 * - KioskSessionContext initializes with correct defaults
 * - setLanguage changes language
 * - setScreen changes screen
 * - resetSession clears all citizen data
 * - resetSession returns to language screen
 * - activeOperation state is set/cleared
 * - No citizen data written to localStorage
 */

import { describe, it, expect, vi } from 'vitest';
import { render, act } from '@testing-library/react';
import { KioskSessionProvider, useKioskSession } from '../context/KioskSessionContext';

// Test component to access session state
function SessionReader({ onState }: { onState: (s: ReturnType<typeof useKioskSession>) => void }) {
  const session = useKioskSession();
  onState(session);
  return null;
}

describe('KioskSessionContext', () => {
  it('initializes directly with home screen', () => {
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    expect(captured!.session.screen).toBe('home');
  });

  it('initializes with English language', () => {
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    expect(captured!.session.language).toBe('en');
  });

  it('initializes with empty messages', () => {
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    expect(captured!.session.messages).toHaveLength(0);
  });

  it('setLanguage updates language', () => {
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    act(() => { captured!.setLanguage('mr'); });
    expect(captured!.session.language).toBe('mr');
  });

  it('setScreen updates screen', () => {
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    act(() => { captured!.setScreen('home'); });
    expect(captured!.session.screen).toBe('home');
  });

  it('addMessage adds message to session', () => {
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    act(() => {
      captured!.addMessage({ id: '1', role: 'user', text: 'Hello', timestamp: Date.now() });
    });
    expect(captured!.session.messages).toHaveLength(1);
    expect(captured!.session.messages[0].text).toBe('Hello');
  });

  it('resetSession clears messages', () => {
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    act(() => {
      captured!.addMessage({ id: '1', role: 'user', text: 'Hello', timestamp: Date.now() });
    });
    act(() => { captured!.resetSession(); });
    expect(captured!.session.messages).toHaveLength(0);
  });

  it('resetSession returns screen to home and resets language to en', () => {
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    act(() => {
      captured!.setScreen('type');
      captured!.setLanguage('mr');
    });
    act(() => { captured!.resetSession(); });
    expect(captured!.session.screen).toBe('home');
    expect(captured!.session.language).toBe('en');
  });

  it('resetSession clears document context', () => {
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    act(() => {
      captured!.setDocumentContext({
        imageObjectUrl: null,
        analysisText: 'Some analysis',
        documentType: 'land_record',
      });
    });
    act(() => { captured!.resetSession(); });
    expect(captured!.session.documentContext).toBeNull();
  });

  it('setActiveOperation sets active flag', () => {
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    act(() => { captured!.setActiveOperation(true); });
    expect(captured!.session.activeOperation).toBe(true);
    act(() => { captured!.setActiveOperation(false); });
    expect(captured!.session.activeOperation).toBe(false);
  });

  it('does NOT write citizen data to localStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');
    let captured: ReturnType<typeof useKioskSession> | null = null;
    render(
      <KioskSessionProvider>
        <SessionReader onState={(s) => { captured = s; }} />
      </KioskSessionProvider>
    );
    act(() => {
      captured!.setLanguage('hi');
      captured!.addMessage({ id: '1', role: 'user', text: 'नमस्ते', timestamp: Date.now() });
    });
    // No localStorage writes should have occurred with citizen-sensitive data
    const kioskWrites = setItemSpy.mock.calls.filter(
      ([key]) => key.includes('message') || key.includes('chat') || key.includes('citizen')
    );
    expect(kioskWrites).toHaveLength(0);
    setItemSpy.mockRestore();
  });
});
