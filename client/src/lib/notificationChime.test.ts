import { afterEach, describe, expect, it, vi } from "vitest";
import { getNotificationSoundPreference, NOTIFICATION_SOUND_STORAGE_KEY, playAscendingNotificationChime, setNotificationSoundPreference } from "./notificationChime";

function installWindow(audioContext?: unknown) {
  const storage = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value), clear: () => storage.clear() },
    setTimeout: vi.fn(),
    AudioContext: audioContext,
  });
  return storage;
}

describe("sonido de notificaciones", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("mantiene el sonido activado por defecto y guarda la preferencia elegida", () => {
    const storage = installWindow();
    expect(getNotificationSoundPreference()).toBe(true);
    setNotificationSoundPreference(false);
    expect(storage.get(NOTIFICATION_SOUND_STORAGE_KEY)).toBe("false");
    expect(getNotificationSoundPreference()).toBe(false);
  });

  it("desbloquea el audio y programa tres notas ascendentes claramente audibles", async () => {
    const oscillators: Array<{ frequency: { setValueAtTime: ReturnType<typeof vi.fn> }; start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn> }> = [];
    class FakeAudioContext {
      currentTime = 0;
      state: AudioContextState = "suspended";
      destination = {} as AudioDestinationNode;
      createOscillator() {
        const oscillator = { type: "sine", frequency: { setValueAtTime: vi.fn() }, connect: vi.fn(), start: vi.fn(), stop: vi.fn() };
        oscillators.push(oscillator);
        return oscillator as unknown as OscillatorNode;
      }
      createGain() { return { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() } as unknown as GainNode; }
      resume = vi.fn(async () => { this.state = "running"; });
      close = vi.fn().mockResolvedValue(undefined);
    }
    installWindow(FakeAudioContext);

    await expect(playAscendingNotificationChime()).resolves.toBe(true);
    expect(oscillators).toHaveLength(3);
    expect(oscillators[0].frequency.setValueAtTime).toHaveBeenCalledWith(523.25, expect.any(Number));
    expect(oscillators[1].frequency.setValueAtTime).toHaveBeenCalledWith(659.25, expect.any(Number));
    expect(oscillators[2].frequency.setValueAtTime).toHaveBeenCalledWith(783.99, expect.any(Number));
  });
});
