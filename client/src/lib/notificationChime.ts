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

export function prepareNotificationChime() {
  const context = getAudioContext();
  if (!context) return false;
  if (context.state === "suspended") void context.resume();
  return true;
}

export function playAscendingNotificationChime() {
  const context = getAudioContext();
  if (!context) return false;

  try {
    if (context.state === "suspended") void context.resume();
    const start = context.currentTime + 0.01;
    [659.25, 880].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = start + index * 0.11;
      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(0.045, noteStart + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteStart + 0.105);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteStart + 0.11);
    });
    return true;
  } catch {
    return false;
  }
}
