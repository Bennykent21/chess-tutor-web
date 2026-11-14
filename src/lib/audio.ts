export type SoundCueKind =
  | "move"
  | "capture"
  | "castle"
  | "check"
  | "promote"
  | "win"
  | "lose"
  | "correct"
  | "wrong"
  | "tap"
  | "success"
  | "error"
  | "click";

const SFX_MAP: Record<SoundCueKind, string> = {
  move: "/assets/sfx/sfx_move.ogg",
  capture: "/assets/sfx/sfx_capture.ogg",
  castle: "/assets/sfx/sfx_castle.ogg",
  check: "/assets/sfx/sfx_check.ogg",
  promote: "/assets/sfx/sfx_promote.ogg",
  win: "/assets/sfx/sfx_win.ogg",
  lose: "/assets/sfx/sfx_lose.ogg",
  correct: "/assets/sfx/sfx_correct.ogg",
  wrong: "/assets/sfx/sfx_wrong.ogg",
  tap: "/assets/sfx/sfx_tap.ogg",
  success: "/assets/sfx/sfx_correct.ogg",
  error: "/assets/sfx/sfx_wrong.ogg",
  click: "/assets/sfx/sfx_tap.ogg"
};

const audioPool = new Map<string, HTMLAudioElement>();

function playFallbackTone(kind: SoundCueKind): void {
  try {
    const AudioCtor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtor) return;
    const context = new AudioCtor();
    const now = context.currentTime;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = kind === "capture" ? "square" : kind === "move" || kind === "castle" ? "triangle" : "sine";
    const freq =
      kind === "wrong" || kind === "error" || kind === "lose"
        ? 185
        : kind === "correct" || kind === "success" || kind === "win"
        ? 587
        : kind === "check"
        ? 720
        : kind === "tap" || kind === "click"
        ? 480
        : 310;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(0.055, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
    osc.connect(gain);
    gain.connect(context.destination);
    osc.start(now);
    osc.stop(now + 0.13);
    osc.onended = () => {
      void context.close();
    };
  } catch {
    // ignore WebAudio failures
  }
}

export function playCue(kind: SoundCueKind, enabled = true): void {
  if (!enabled || typeof window === "undefined") return;
  const src = SFX_MAP[kind];
  if (typeof Audio !== "undefined" && src) {
    try {
      let base = audioPool.get(src);
      if (!base) {
        base = new Audio(src);
        base.preload = "auto";
        audioPool.set(src, base);
      }
      const instance = base.cloneNode(true) as HTMLAudioElement;
      instance.volume = kind === "tap" || kind === "click" ? 0.35 : 0.6;
      const playPromise = instance.play();
      if (playPromise && typeof playPromise.catch === "function") {
        playPromise.catch(() => playFallbackTone(kind));
      }
      return;
    } catch {
      // fall through to WebAudio
    }
  }
  playFallbackTone(kind);
}

export function triggerHaptic(kind: "move" | "capture" | "wrong" | "success", enabled = true): void {
  if (!enabled || typeof navigator === "undefined" || typeof navigator.vibrate !== "function") return;
  try {
    if (kind === "move") navigator.vibrate(10);
    else if (kind === "capture") navigator.vibrate(22);
    else if (kind === "wrong") navigator.vibrate([18, 36, 18]);
    else if (kind === "success") navigator.vibrate(40);
  } catch {
    // ignore vibration block
  }
}
