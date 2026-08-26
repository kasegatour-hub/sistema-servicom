export const NOTIFICATION_SOUND_STORAGE_KEY = "servicom.notification-sound-enabled";

type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };
let sharedAudioContext: AudioContext | null = null;

function getAudioContext() {
  if (typeof window === "undefined") return null;
  const AudioContextConstructor = window.AudioContext || (window as AudioWindow).webkitAudioContext;
  if (!AudioContextConstructor) return null;
  if (!sharedAudioContext || sharedAudioContext.state === "closed") sharedAudioContext = new AudioContextConstructor();
  return sharedAudioContext;
}

export function getNotificationSoundPreference() {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(NOTIFICATION_SOUND_STORAGE_KEY) !== "false";
}

export function setNotificationSoundPreference(enabled: boolean) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(NOTIFICATION_SOUND_STORAGE_KEY, String(enabled));
}

export async function prepareNotificationChime() {
  const context = getAudioContext();
  if (!context) return false;
  try {
    if (context.state === "suspended") await context.resume();
    return context.state !== "suspended";
  } catch {
    return false;
  }
}

export async function playAscendingNotificationChime() {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (!await prepareNotificationChime()) return false;
    const start = context.currentTime + 0.02;
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.14;
      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.1, noteStart + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.135);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.14);
    });
    return true;
  } catch {
    return false;
  }
}
