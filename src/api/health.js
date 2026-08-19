// Liveness probing, kept separate from ./client because /api/health is the one
// route that needs no token — it answers before anyone has signed in, which is
// exactly when the wake-up gate needs it.
//
// Free-tier hosts idle their containers out, so the first request after a quiet
// spell is also the request that wakes them: it can hang for the better part of
// a minute, or bounce with a 502 while the container boots. Both are handled by
// polling rather than by one long request.
import { API_BASE_URL } from "./client";

const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

// True only when the API is up *and* connected to Mongo — a server whose db is
// still connecting answers 503, which is a retry, not a success.
export async function pingBackend({ timeoutMs = 10_000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`, { signal: controller.signal });
    if (!res.ok) return false;
    const json = await res.json();
    return json?.ok === true;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

// Polls until the backend answers or `totalMs` runs out. Resolves true/false —
// it never throws, so callers can treat it as a plain "is it up yet".
export async function waitForBackend({
  totalMs   = 90_000,
  attemptMs = 10_000,
  gapMs     = 2_000,
  onAttempt,
} = {}) {
  const deadline = Date.now() + totalMs;
  let attempt = 0;

  while (Date.now() < deadline) {
    attempt += 1;
    onAttempt?.(attempt);

    const remaining = deadline - Date.now();
    if (await pingBackend({ timeoutMs: Math.min(attemptMs, remaining) })) return true;

    if (Date.now() + gapMs >= deadline) break;
    await delay(gapMs);
  }

  return false;
}
