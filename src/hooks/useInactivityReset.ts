"use client";

import { useEffect, useRef, useCallback } from "react";

export function useInactivityReset(onInactive: () => void, timeoutMs: number = 45000) {
  const onInactiveRef = useRef(onInactive);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    onInactiveRef.current = onInactive;
  }, [onInactive]);

  const resetTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      onInactiveRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    resetTimer();

    let lastEventTime = 0;
    const handleActivity = () => {
      const now = Date.now();
      // Throttle event resets to at most once per second
      if (now - lastEventTime > 1000) {
        lastEventTime = now;
        resetTimer();
      }
    };

    const events = ["pointerdown", "keydown", "touchstart"];
    events.forEach((evt) => window.addEventListener(evt, handleActivity));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach((evt) => window.removeEventListener(evt, handleActivity));
    };
  }, [resetTimer]);
}