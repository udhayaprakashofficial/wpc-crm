"use client";

import confetti from "canvas-confetti";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

const DEDUPE_MS = 4500;
const TOAST_MS = 3500;
const CONFETTI_COLORS = [
  "#22c55e",
  "#3b82f6",
  "#f59e0b",
  "#ec4899",
  "#8b5cf6",
  "#06b6d4",
  "#f97316",
];

type CelebrateOptions = {
  /** Soft chime — off by default so CRM stays quiet. */
  sound?: boolean;
};

function prefersReducedMotion() {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function playSoftChime() {
  try {
    const AudioCtx =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.05, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
    gain.connect(ctx.destination);

    for (const [i, freq] of [523.25, 659.25, 783.99].entries()) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(gain);
      osc.start(now + i * 0.06);
      osc.stop(now + 0.35);
    }
    window.setTimeout(() => void ctx.close(), 500);
  } catch {
    // Ignore audio failures — celebration still works visually.
  }
}

function fireBottomRightConfetti() {
  if (prefersReducedMotion()) return;

  const origin = { x: 0.92, y: 0.96 };
  const base = {
    origin,
    colors: CONFETTI_COLORS,
    disableForReducedMotion: true,
    zIndex: 9999,
    ticks: 180,
    gravity: 0.95,
    scalar: 0.9,
  } as const;

  confetti({
    ...base,
    particleCount: 55,
    angle: 125,
    spread: 58,
    startVelocity: 52,
  });

  window.setTimeout(() => {
    confetti({
      ...base,
      particleCount: 35,
      angle: 105,
      spread: 72,
      startVelocity: 42,
      scalar: 0.8,
    });
  }, 160);

  window.setTimeout(() => {
    confetti({
      ...base,
      particleCount: 22,
      angle: 140,
      spread: 48,
      startVelocity: 36,
      scalar: 0.75,
    });
  }, 320);
}

export function useWonCelebration() {
  const [open, setOpen] = useState(false);
  const recentRef = useRef<Map<string, number>>(new Map());
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timersRef.current) clearTimeout(t);
    timersRef.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const celebrateWon = useCallback(
    (dealId: string, options?: CelebrateOptions) => {
      const now = Date.now();
      const last = recentRef.current.get(dealId) ?? 0;
      if (now - last < DEDUPE_MS) return;
      recentRef.current.set(dealId, now);

      // Prune stale dedupe entries
      for (const [id, at] of recentRef.current) {
        if (now - at > DEDUPE_MS * 2) recentRef.current.delete(id);
      }

      fireBottomRightConfetti();
      if (options?.sound) playSoftChime();

      clearTimers();
      setOpen(true);
      const hide = setTimeout(() => setOpen(false), TOAST_MS);
      timersRef.current.push(hide);
    },
    [clearTimers],
  );

  const celebration: ReactNode = open ? (
    <div
      className="pointer-events-none fixed bottom-5 right-4 z-[100] w-[min(100%-2rem,20rem)] sm:bottom-6 sm:right-6"
      role="status"
      aria-live="polite"
    >
      <div className="pointer-events-auto animate-[won-toast-in_0.35s_ease-out] rounded-2xl border border-emerald-100 bg-white px-4 py-3.5 shadow-[0_8px_30px_rgba(16,24,40,0.12)]">
        <p className="text-sm font-semibold text-zinc-900">
          🎉 Congratulations!
        </p>
        <p className="mt-0.5 text-sm text-zinc-600">Deal Won Successfully!</p>
      </div>
    </div>
  ) : null;

  return { celebrateWon, celebration };
}
