"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";

interface KioskConfig {
  idleTimeoutSec: number;
  soundEffects: boolean;
  maxDailyTasks: number;
}

export function useKioskSettings(enableIdleReset: boolean = true) {
  const router = useRouter();
  const pathname = usePathname();
  const [config, setConfig] = useState<KioskConfig>({
    idleTimeoutSec: 45,
    soundEffects: true,
    maxDailyTasks: 5,
  });

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch kiosk config from backend
  useEffect(() => {
    let isCancelled = false;

    async function fetchConfig() {
      try {
        const res = await fetch("/api/config/kiosk");
        if (res.ok) {
          const data = await res.json();
          if (!isCancelled && data && typeof data === "object") {
            setConfig(data);
          }
        }
      } catch (err) {
        console.error("Failed to fetch kiosk configuration:", err);
      }
    }

    fetchConfig();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Idle timeout management
  const resetIdleTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    // Do not auto-redirect if already at the root / screen or parent portal
    if (!enableIdleReset || pathname === "/" || pathname.startsWith("/parent")) {
      return;
    }

    const timeoutMs = (config.idleTimeoutSec || 45) * 1000;
    timerRef.current = setTimeout(() => {
      router.push("/");
    }, timeoutMs);
  }, [config.idleTimeoutSec, enableIdleReset, pathname, router]);

  useEffect(() => {
    if (!enableIdleReset || pathname === "/" || pathname.startsWith("/parent")) {
      return;
    }

    const events = ["mousedown", "mousemove", "touchstart", "keydown", "scroll"];
    const handleActivity = () => resetIdleTimer();

    events.forEach((event) => window.addEventListener(event, handleActivity, { passive: true }));
    resetIdleTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, handleActivity));
    };
  }, [resetIdleTimer, enableIdleReset, pathname]);

  // Audio helper respecting soundEffects toggle
  const playSfx = useCallback(
    (type: "success" | "chime" | "buzz" | "click") => {
      if (!config.soundEffects) return;

      try {
        const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();

        if (type === "success" || type === "chime") {
          // Cheerful ascending arpeggio
          const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(freq, ctx.currentTime + idx * 0.08);

            gain.gain.setValueAtTime(0, ctx.currentTime + idx * 0.08);
            gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + idx * 0.08 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + idx * 0.08 + 0.25);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(ctx.currentTime + idx * 0.08);
            osc.stop(ctx.currentTime + idx * 0.08 + 0.3);
          });
        } else if (type === "buzz") {
          // Low error buzz
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(130, ctx.currentTime);

          gain.gain.setValueAtTime(0.2, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.35);
        } else if (type === "click") {
          // Subtle tactile tap
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "sine";
          osc.frequency.setValueAtTime(800, ctx.currentTime);

          gain.gain.setValueAtTime(0.08, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

          osc.connect(gain);
          gain.connect(ctx.destination);

          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.05);
        }
      } catch (err) {
        console.error("Web Audio playback failed:", err);
      }
    },
    [config.soundEffects]
  );

  return {
    config,
    playSfx,
    resetIdleTimer,
  };
}