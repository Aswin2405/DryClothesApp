import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import { waitForBackend } from "../api/health";

const BackendContext = createContext(null);

// How long a warm server gets to answer before we admit we're waiting. Under
// this, the native splash covers the whole check and the app opens straight to
// the weather — no loader flash for the common case.
const GRACE_MS = 1_200;

// Free-tier cold starts land around 30–60s; 90 gives that headroom without
// stranding someone whose server is simply gone.
const WAKE_TIMEOUT_MS = 90_000;

/**
 * status:
 *   "checking"    — probing, still behind the splash
 *   "waking"      — slow enough to be a cold start; show the loader
 *   "ready"       — API answered and its db is connected
 *   "unreachable" — gave up after WAKE_TIMEOUT_MS
 *   "skipped"     — user chose to carry on without it
 */
export function BackendProvider({ children }) {
  const [status, setStatus]         = useState("checking");
  const [elapsedSec, setElapsedSec] = useState(0);
  const runIdRef = useRef(0);

  const runCheck = useCallback(async () => {
    const runId   = ++runIdRef.current;
    const started = Date.now();

    // Only flip to "waking" if the probe is still outstanding once the grace
    // period is up; a warm server resolves first and this never fires.
    const graceTimer = setTimeout(() => {
      if (runIdRef.current === runId) setStatus(s => (s === "checking" ? "waking" : s));
    }, GRACE_MS);

    const tick = setInterval(() => {
      if (runIdRef.current === runId) setElapsedSec(Math.round((Date.now() - started) / 1000));
    }, 1_000);

    try {
      const up = await waitForBackend({ totalMs: WAKE_TIMEOUT_MS });
      if (runIdRef.current === runId) setStatus(up ? "ready" : "unreachable");
    } finally {
      clearTimeout(graceTimer);
      clearInterval(tick);
    }
  }, []);

  useEffect(() => {
    runCheck();
    return () => { runIdRef.current += 1; }; // stale probes stop mattering
  }, [runCheck]);

  const retry = useCallback(() => {
    setStatus("checking");
    setElapsedSec(0);
    runCheck();
  }, [runCheck]);

  const skip = useCallback(() => setStatus("skipped"), []);

  return (
    <BackendContext.Provider value={{ status, elapsedSec, retry, skip }}>
      {children}
    </BackendContext.Provider>
  );
}

export function useBackendContext() {
  const ctx = useContext(BackendContext);
  if (!ctx) throw new Error("useBackendContext must be used within BackendProvider");
  return ctx;
}
