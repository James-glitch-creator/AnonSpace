"use client";

import { useCallback, useEffect, useState } from "react";

const RESEND_COOLDOWN_SECONDS = 30;

export function useResendCooldown() {
  const [secondsRemaining, setSecondsRemaining] = useState(0);

  useEffect(() => {
    if (secondsRemaining <= 0) return;
    const timeout = window.setTimeout(() => {
      setSecondsRemaining((seconds) => Math.max(0, seconds - 1));
    }, 1000);
    return () => window.clearTimeout(timeout);
  }, [secondsRemaining]);

  const startCooldown = useCallback(() => {
    setSecondsRemaining(RESEND_COOLDOWN_SECONDS);
  }, []);

  return { secondsRemaining, startCooldown };
}
