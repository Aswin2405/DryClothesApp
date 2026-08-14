// Transport for the DryClothes backend.
//
// All app state that used to live in AsyncStorage — settings, saved locations,
// the alert toggle and every weather cache — is owned by the server now. This
// module is the only place that knows the base URL, the device identity and the
// wire format; everything else imports the named calls from ./index.
import * as Application from "expo-application";
import { Platform } from "react-native";

// EXPO_PUBLIC_ vars are inlined by Metro at bundle time, so this also works in
// the headless widget/background contexts where there is no app config loaded.
const DEFAULT_BASE_URL = "http://localhost:4000";

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

// The web build has no install-scoped hardware id, and with AsyncStorage gone
// there is nowhere to persist a generated one — so web gets a per-session
// identity and starts fresh on reload. Native is the supported target.
const WEB_SESSION_ID = `web_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;

let deviceIdPromise = null;

async function resolveDeviceId() {
  if (Platform.OS === "android") {
    const id = Application.getAndroidId();
    if (!id) throw new ApiError("Could not read the Android device id");
    return id;
  }
  if (Platform.OS === "ios") {
    // Returns null if the device has been rebooted but not yet unlocked. That is
    // transient, so fail here rather than inventing an id that would strand the
    // user's data under a second device record.
    const id = await Application.getIosIdForVendorAsync();
    if (!id) throw new ApiError("Device identifier not available yet");
    return id;
  }
  return WEB_SESSION_ID;
}

// Cached because the native call is cheap but not free, and every request needs
// it. A failure clears the cache so the next request retries.
export function getDeviceId() {
  if (!deviceIdPromise) {
    deviceIdPromise = resolveDeviceId().catch(err => {
      deviceIdPromise = null;
      throw err;
    });
  }
  return deviceIdPromise;
}

export async function request(path, { method = "GET", body, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
  const deviceId = await getDeviceId();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let res;
  try {
    res = await fetch(`${API_BASE_URL}/api${path}`, {
      method,
      headers: {
        "x-device-id": deviceId,
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
