"use client";

import { useEffect, useRef } from "react";

export function useInactivityReset(onInactive: () => void, timeoutMs: number = 45000) {
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(onInactive, timeoutMs);
  };

  useEffect(() => {
    const events = ["pointerdown", "pointermove", "keydown", "touchstart", "click"];

    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((event) => window.removeEventListener(event, resetTimer));
    };
  }, [onInactive, timeoutMs]);
}