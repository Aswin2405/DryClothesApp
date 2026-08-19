// Transport for the DryClothes backend.
//
// Everything the app used to keep in AsyncStorage — settings, saved locations,
// the alert toggle and every weather cache — is owned by the server and scoped to
// the signed-in account. This module is the only place that knows the base URL,
// how a request is authenticated, and the wire format; everything else imports
// the named calls from ./index.
import { getToken } from "./session";

// EXPO_PUBLIC_ vars are inlined by Metro at bundle time, so this also works in
// the headless widget/background contexts where there is no app config loaded.
// The deployed API is the fallback rather than localhost: a build that somehow
// misses the env var should still reach a real server instead of dialling a port
// on the phone itself.
const DEFAULT_BASE_URL = "https://dryclothesapp-backend.onrender.com";

export const API_BASE_URL = String(process.env.EXPO_PUBLIC_API_URL || DEFAULT_BASE_URL).replace(/\/+$/, "");

// Long enough for a cold Atlas connection, short enough that a background task
// or widget redraw does not sit on a dead socket until Android kills it.
const REQUEST_TIMEOUT_MS = 12_000;

export class ApiError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

// AuthContext registers here so a rejected token drops the session everywhere at
// once, rather than each screen discovering it separately. Headless callers never
// register one, so they just see the error.
let onUnauthorized = null;

export function setUnauthorizedHandler(fn) {
  onUnauthorized = fn;
}

/**
 * `auth: false` sends no token and suppresses the global sign-out — used by
 * login and register, where a 401 means "wrong password", not "session expired".
 */
export async function request(path, { method = "GET", body, timeoutMs = REQUEST_TIMEOUT_MS, auth = true } = {}) {
  const token = auth ? await getToken() : null;
  if (auth && !token) throw new ApiError("Not signed in", 401);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    if (err?.name === "AbortError") throw new ApiError(`${method} ${path} timed out`);
    throw new ApiError(`Cannot reach the server at ${API_BASE_URL}`);
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 && auth) onUnauthorized?.();
  if (res.status === 204) return null;

  const text = await res.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ApiError(`${method} ${path} returned a non-JSON response`, res.status);
    }
  }

  if (!res.ok) throw new ApiError(payload?.error || `${method} ${path} failed (${res.status})`, res.status);
  return payload;
}
