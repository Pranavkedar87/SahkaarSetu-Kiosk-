#!/bin/bash
# ==============================================================================
# SahkaarSetu Kiosk — Raspberry Pi 5 Hardware Autostart Script
# ==============================================================================
# Target: Raspberry Pi 5 (Raspberry Pi OS Bookworm / Wayfire / X11 / Wayland)
# Hardware: 7"-10.1" Touchscreen, USB Microphone, Speaker, Camera, 58mm Thermal Printer
#
# Startup flow:
#   Power on → OS boots → Window manager starts → Script executes →
#   Screen blanking disabled → Cursor hidden → Chromium launches in kiosk mode →
#   SahkaarSetu Kiosk loaded fullscreen.
# ==============================================================================

set -e

KIOSK_URL="https://pranavkedar87.github.io/SahkaarSetu-Kiosk-/"

echo "[SahkaarSetu Kiosk] Initializing hardware and display environment..."

# 1. Disable screen blanking & display power management (X11/Xwayland)
if command -v xset >/dev/null 2>&1; then
  xset s noblank 2>/dev/null || true
  xset s off 2>/dev/null || true
  xset -dpms 2>/dev/null || true
fi

# 2. Hide mouse cursor when idle on touchscreen
if command -v unclutter >/dev/null 2>&1; then
  unclutter -idle 0.5 -root &
fi

# 3. Clean up Chromium unclean shutdown state to avoid "Restore pages" dialogs
PREFS="$HOME/.config/chromium/Default/Preferences"
if [ -f "$PREFS" ]; then
  sed -i 's/"exited_cleanly":false/"exited_cleanly":true/' "$PREFS" 2>/dev/null || true
  sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/' "$PREFS" 2>/dev/null || true
fi

# 4. Launch Chromium in locked full-screen Kiosk mode
# Flags explanation:
#   --kiosk: Locked full screen without address bar, tabs, or window chrome
#   --noerrdialogs: Suppress crash/error popups
#   --disable-infobars: Suppress warnings
#   --check-for-update-interval=31536000: Disable auto-update checks
#   --disable-pinch: Prevent multi-touch zoom
#   --overscroll-history-navigation=0: Prevent swipe-to-navigate gestures
#   --autoplay-policy=no-user-gesture-required: Allow voice synthesis autoplay
#   --use-fake-ui-for-media-stream: Auto-grant camera & microphone permissions
#   --touch-events=enabled: Force touchscreen input recognition
#   --kiosk-printing: Direct 58mm printing without print preview dialog when printer attached

echo "[SahkaarSetu Kiosk] Launching Chromium in kiosk mode at $KIOSK_URL..."

exec chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --check-for-update-interval=31536000 \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --autoplay-policy=no-user-gesture-required \
  --use-fake-ui-for-media-stream \
  --touch-events=enabled \
  --kiosk-printing \
  "$KIOSK_URL"
