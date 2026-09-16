/**
 * Hardware Placeholder Interfaces
 *
 * These represent the physical hardware of the SahkaarSetu Kiosk:
 *   - Microphone (BHASHINI ASR / Groq fallback – K4)
 *   - Camera (document scanning – K6)
 *   - Physical press-to-speak button (GPIO – K10)
 *   - 58mm thermal printer (K7)
 *
 * ┌─────────────────────────────────────────────────────────────────────┐
 * │  IMPORTANT: No hardware integration is implemented in K1/K2.        │
 * │  These are type-safe placeholder interfaces only.                   │
 * │  GPIO, printer drivers, and serial comms are future work (K10+).    │
 * └─────────────────────────────────────────────────────────────────────┘
 */

import type {
  MicrophoneState,
  CameraState,
  PhysicalButtonState,
  PrinterState,
} from '../types';

// ─── Microphone ───────────────────────────────────────────────────────────────

export interface MicrophoneController {
  state: MicrophoneState;
  /**
   * Begin recording audio.
   * K4: Will invoke BHASHINI ASR / Groq fallback via backend.
   */
  startListening: () => void;
  /**
   * Stop recording and submit audio for transcription.
   */
  stopListening: () => void;
  /** Cancel recording without processing. */
  cancel: () => void;
}

export function createMicrophonePlaceholder(): MicrophoneController {
  let state: MicrophoneState = 'idle';
  return {
    get state() {
      return state;
    },
    startListening() {
      // K4: Will use MediaRecorder API + BHASHINI backend endpoint
      state = 'listening';
      console.warn('[Kiosk Hardware] Microphone: startListening — not yet implemented (K4)');
    },
    stopListening() {
      state = 'processing';
      console.warn('[Kiosk Hardware] Microphone: stopListening — not yet implemented (K4)');
    },
    cancel() {
      state = 'idle';
      console.warn('[Kiosk Hardware] Microphone: cancel');
    },
  };
}

// ─── Camera ───────────────────────────────────────────────────────────────────

export interface CameraController {
  state: CameraState;
  /**
   * Open the camera stream.
   * K6: Will use getUserMedia() on the Raspberry Pi camera.
   */
  open: () => Promise<MediaStream | null>;
  /** Capture a frame and return it as a Blob. */
  capture: () => Promise<Blob | null>;
  /** Close the camera stream and release device. */
  close: () => void;
}

export function createCameraPlaceholder(): CameraController {
  let state: CameraState = 'closed';
  return {
    get state() {
      return state;
    },
    async open() {
      // K6: Will call getUserMedia({ video: { facingMode: 'environment' } })
      state = 'active';
      console.warn('[Kiosk Hardware] Camera: open — not yet implemented (K6)');
      return null;
    },
    async capture() {
      // K6: Will draw frame to canvas and return as Blob
      state = 'captured';
      console.warn('[Kiosk Hardware] Camera: capture — not yet implemented (K6)');
      return null;
    },
    close() {
      state = 'closed';
      console.warn('[Kiosk Hardware] Camera: close');
    },
  };
}

// ─── Physical Button ──────────────────────────────────────────────────────────

export interface PhysicalButtonController {
  state: PhysicalButtonState;
  /**
   * Register callbacks for button press/release events.
   * K10: Will be driven by GPIO (via websocket or keyboard event mapping).
   *
   * The physical button is conceptually mapped to:
   *   PRESS   → startListening()
   *   RELEASE → stopListening()
   */
  onPress: (handler: () => void) => () => void;
  onRelease: (handler: () => void) => () => void;
}

export function createPhysicalButtonPlaceholder(): PhysicalButtonController {
  let state: PhysicalButtonState = 'released';
  const pressHandlers: Array<() => void> = [];
  const releaseHandlers: Array<() => void> = [];

  // K10: Replace with GPIO websocket / keyboard event bridge
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && !e.repeat && state === 'released') {
        state = 'pressed';
        pressHandlers.forEach((h) => h());
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' && state === 'pressed') {
        state = 'released';
        releaseHandlers.forEach((h) => h());
      }
    });
  }

  return {
    get state() {
      return state;
    },
    onPress(handler) {
      pressHandlers.push(handler);
      return () => {
        const i = pressHandlers.indexOf(handler);
        if (i !== -1) pressHandlers.splice(i, 1);
      };
    },
    onRelease(handler) {
      releaseHandlers.push(handler);
      return () => {
        const i = releaseHandlers.indexOf(handler);
        if (i !== -1) releaseHandlers.splice(i, 1);
      };
    },
  };
}

// ─── Printer ──────────────────────────────────────────────────────────────────

export interface PrinterController {
  state: PrinterState;
  /**
   * Trigger the browser print flow for the 58mm thermal printer.
   * K7: Will use window.print() with 58mm CSS @page rules.
   * The OS-level printer driver on Raspberry Pi handles the physical print.
   */
  print: (content: string) => void;
}

export function createPrinterPlaceholder(): PrinterController {
  let state: PrinterState = 'ready';
  return {
    get state() {
      return state;
    },
    print(content: string) {
      // K7: Will open a print-specific window with 58mm CSS and call window.print()
      state = 'printing';
      console.warn('[Kiosk Hardware] Printer: print — not yet implemented (K7)', content);
      // Simulate completion
      setTimeout(() => {
        state = 'ready';
      }, 2000);
    },
  };
}
