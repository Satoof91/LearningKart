// Native-app layer: haptics, orientation/fullscreen, app lifecycle, tilt steering.
// Every call is wrapped so the same code runs in a normal browser (web fallbacks) and inside Capacitor.
import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';
import { StatusBar } from '@capacitor/status-bar';
import { ScreenOrientation } from '@capacitor/screen-orientation';

export const isNative = Capacitor.isNativePlatform();
export const platform = Capacitor.getPlatform(); // 'android' | 'ios' | 'web'

let hapticsOn = true;
export function setHaptics(v) { hapticsOn = !!v; }
export function haptic(kind) {
  if (!hapticsOn) return;
  try {
    if (isNative) {
      if (kind === 'boost') Haptics.impact({ style: ImpactStyle.Medium });
      else if (kind === 'bump') Haptics.impact({ style: ImpactStyle.Heavy });
      else if (kind === 'tick') Haptics.impact({ style: ImpactStyle.Light });
      else if (kind === 'go') Haptics.impact({ style: ImpactStyle.Heavy });
      else if (kind === 'win') Haptics.notification({ type: NotificationType.Success });
    } else if (navigator.vibrate) {
      navigator.vibrate({ boost: 40, bump: 70, tick: 10, go: 60, win: [80, 60, 80, 60, 160] }[kind] || 20);
    }
  } catch (e) { /* ignore */ }
}

export async function initPlatform({ onBackground, onBack }) {
  if (isNative) {
    // Android back button / back gesture: without a listener Capacitor closes the app mid-level
    try { App.addListener('backButton', () => { if (onBack) onBack(); }); } catch (e) { /* ignore */ }
    try { await ScreenOrientation.lock({ orientation: 'landscape' }); } catch (e) { /* manifest/plist also lock it */ }
    try { await StatusBar.hide(); } catch (e) { /* not available */ }
    try { App.addListener('appStateChange', ({ isActive }) => { if (!isActive) onBackground(); }); } catch (e) { /* ignore */ }
    try { App.addListener('pause', onBackground); } catch (e) { /* ignore */ }
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) onBackground(); });
  window.addEventListener('pagehide', onBackground);
}

// ---------- tilt steering ----------
// Hold the phone like a steering wheel (landscape). We derive the gravity direction from
// deviceorientation (beta/gamma behave the same on Android and iOS), map it into screen
// coordinates for the current screen rotation, and use its roll angle as steering.
const RAD = Math.PI / 180;
const Tilt = {
  enabled: false, sign: 1, roll: 0, neutral: 0, value: 0, listening: false, supported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
  _onOrient(e) {
    if (e.beta == null || e.gamma == null) return;
    const b = e.beta * RAD, g = e.gamma * RAD;
    // world "up" expressed in device coordinates
    const ux = -Math.sin(g) * Math.cos(b), uy = Math.sin(b);
    let ang = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
    ang = ((ang % 360) + 360) % 360;
    let sx, sy; // up vector in screen coords (x right, y up)
    if (ang === 90) { sx = -uy; sy = ux; } else if (ang === 270) { sx = uy; sy = -ux; } else if (ang === 180) { sx = -ux; sy = -uy; } else { sx = ux; sy = uy; }
    // phone lying flat: gravity is (almost) perpendicular to the screen and the roll angle is pure noise
    Tilt.flat = Math.hypot(sx, sy) < 0.35;
    if (!Tilt.flat) Tilt.roll = Math.atan2(sx, sy);
  },
  async enable() {
    if (!this.supported) return false;
    try {
      const D = window.DeviceOrientationEvent;
      if (D && typeof D.requestPermission === 'function') {
        const r = await D.requestPermission();
        if (r !== 'granted') return false;
      }
    } catch (e) { return false; }
    if (!this.listening) { window.addEventListener('deviceorientation', this._onOrient); this.listening = true; }
    this.enabled = true; this.calibrate();
    return true;
  },
  disable() { this.enabled = false; this.value = 0; },
  calibrate() { this.neutral = this.roll; },
  flip() { this.sign = -this.sign; },
  // returns steering in [-1, 1]; positive = steer left (the game's convention)
  steer() {
    if (!this.enabled) return 0;
    if (this.flat) { this.value *= 0.6; return this.value; }
    let r = (this.roll - this.neutral) * this.sign;
    r = Math.atan2(Math.sin(r), Math.cos(r));
    const dead = 3 * RAD, full = 24 * RAD;
    const m = Math.max(0, (Math.abs(r) - dead) / (full - dead));
    const target = Math.min(1, m) * Math.sign(r);
    this.value += (target - this.value) * 0.4;
    return this.value;
  }
};
export { Tilt };
