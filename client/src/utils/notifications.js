// FlowState Audio & Notification Engine
// Uses Web Audio API for 100% self-contained sound effects & HTML5 Web Notifications API

let audioCtx = null;

function getAudioContext() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

// Synthesized Sound Effects
export function playSound(type = 'chime') {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    if (type === 'chime' || type === 'complete') {
      // Harmonic ascending arpeggio (C5, E5, G5, C6)
      const notes = [523.25, 659.25, 783.99, 1046.50];
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.1);
        gain.gain.setValueAtTime(0.001, now + idx * 0.1);
        gain.gain.exponentialRampToValueAtTime(0.2, now + idx * 0.1 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.1 + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.1);
        osc.stop(now + idx * 0.1 + 0.5);
      });
    } else if (type === 'alert' || type === 'reminder') {
      // Double reminder bell (A5, C#6)
      [880, 1108.73].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.14);
        gain.gain.setValueAtTime(0.001, now + idx * 0.14);
        gain.gain.exponentialRampToValueAtTime(0.25, now + idx * 0.14 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.4);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + idx * 0.14);
        osc.stop(now + idx * 0.14 + 0.45);
      });
    } else if (type === 'warning' || type === 'distraction') {
      // Attention anti-wavering buzz
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(190, now);
      osc.frequency.linearRampToValueAtTime(140, now + 0.35);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.36);
    } else if (type === 'tick') {
      // Gentle start/stop click
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(440, now);
      gain.gain.setValueAtTime(0.06, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.09);
    }
  } catch (err) {
    console.warn('Sound synthesis error:', err);
  }
}

// Web Notifications API
export async function requestNotificationPermission() {
  if (!('Notification' in window)) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
}

export function hasNotificationPermission() {
  return 'Notification' in window && Notification.permission === 'granted';
}

export function sendBrowserNotification(title, options = {}) {
  try {
    if (!hasNotificationPermission()) return null;
    const notif = new Notification(title, {
      icon: '/flowstate.svg',
      badge: '/flowstate.svg',
      ...options
    });
    notif.onclick = () => {
      window.focus();
      notif.close();
    };
    return notif;
  } catch (err) {
    console.warn('Browser notification error:', err);
    return null;
  }
}

// Document Title Flasher (for background tabs)
let titleInterval = null;
let originalTitle = document.title;

export function flashDocumentTitle(alertText = '⚠️ STAY ON TASK!', durationMs = 8000) {
  if (titleInterval) clearInterval(titleInterval);
  originalTitle = document.title;
  let toggle = false;

  titleInterval = setInterval(() => {
    document.title = toggle ? alertText : originalTitle;
    toggle = !toggle;
  }, 900);

  setTimeout(() => {
    clearInterval(titleInterval);
    titleInterval = null;
    document.title = originalTitle;
  }, durationMs);
}

// Ambient Noise Generator (Web Audio synthesized - no external mp3s needed)
let ambientNode = null;
let ambientGain = null;

export function setAmbientSound(type = 'none', volume = 0.25) {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Stop existing ambient audio
  if (ambientGain) {
    ambientGain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    setTimeout(() => {
      if (ambientNode) {
        try { ambientNode.stop(); } catch {}
        ambientNode = null;
      }
    }, 600);
  }

  if (type === 'none') return;

  setTimeout(() => {
    const now = ctx.currentTime;
    ambientGain = ctx.createGain();
    ambientGain.gain.setValueAtTime(0.001, now);
    ambientGain.gain.linearRampToValueAtTime(volume, now + 1.2);
    ambientGain.connect(ctx.destination);

    if (type === 'whitenoise' || type === 'rain') {
      // Noise buffer (10 seconds looped)
      const bufferSize = ctx.sampleRate * 5;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      let lastOut = 0.0;

      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        // Pink / Brown filter for soft rain/wind effect
        lastOut = (lastOut + 0.02 * white) / 1.02;
        data[i] = type === 'rain' ? lastOut * 3.5 : white * 0.15;
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Filter
      const filter = ctx.createBiquadFilter();
      filter.type = type === 'rain' ? 'lowpass' : 'bandpass';
      filter.frequency.value = type === 'rain' ? 800 : 1000;

      noise.connect(filter);
      filter.connect(ambientGain);
      noise.start();
      ambientNode = noise;
    } else if (type === 'zen_drone') {
      // Binaural alpha-wave drone (216Hz + 226Hz = 10Hz Alpha beat)
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      osc1.type = 'sine';
      osc2.type = 'sine';
      osc1.frequency.setValueAtTime(216, now);
      osc2.frequency.setValueAtTime(226, now);

      osc1.connect(ambientGain);
      osc2.connect(ambientGain);
      osc1.start();
      osc2.start();

      ambientNode = {
        stop: () => {
          try { osc1.stop(); osc2.stop(); } catch {}
        }
      };
    }
  }, 650);
}
