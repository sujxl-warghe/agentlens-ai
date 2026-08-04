"use client";

import { useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { ScanResponse } from "@/types/scan";

const TERMINAL_STATUSES = new Set(["complete", "failed"]);
const POLL_INTERVAL_MS = 1500;

export function useScanPolling(scanId: string, resetKey = 0) {
  const [scan, setScan] = useState<ScanResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    let attemptCount = 0;

    async function poll() {
      attemptCount += 1;
      if (!cancelled) setAttempt(attemptCount);

      try {
        const result = await api.getScan(scanId);
        if (cancelled) return;
        setScan(result);
        setError(null);

        if (!TERMINAL_STATUSES.has(result.status)) {
          timerRef.current = setTimeout(poll, POLL_INTERVAL_MS);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof ApiError ? err.message : "Lost connection to the backend.");
        timerRef.current = setTimeout(poll, POLL_INTERVAL_MS * 2);
      }
    }

    poll();

    return () => {
      cancelled = true;
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scanId, resetKey]);

  return {
    scan,
    error,
    attempt,
    isDone: scan ? TERMINAL_STATUSES.has(scan.status) : false,
  };
}
