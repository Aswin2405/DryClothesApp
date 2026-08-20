// One named call per backend route. Import as `import * as api from "../api"`.
import { request } from "./client";
import { clearToken, setToken } from "./session";

export { API_BASE_URL, ApiError, setUnauthorizedHandler } from "./client";
// clearToken is the token-only half of logout(), for when the session is already
// dead and POSTing /auth/logout with it would just 401 again.
export { clearToken, getToken, getTokenExpiry } from "./session";
export { pingBackend, waitForBackend } from "./health";

const enc = encodeURIComponent;

// --- auth -------------------------------------------------------------------
// register/login are the only unauthenticated calls; both store the token they
// get back, so every later request is signed in automatically.

async function startSession(payload) {
  await setToken(payload.token);
  return payload.user;
}

export const register = ({ email, password, name }) =>
  request("/auth/register", { method: "POST", auth: false, body: { email, password, name } }).then(startSession);

export const login = ({ email, password }) =>
  request("/auth/login", { method: "POST", auth: false, body: { email, password } }).then(startSession);

export const fetchMe = () => request("/auth/me").then(r => r.user);

// Best-effort server call, then drop the token locally no matter what — being
// unable to reach the server must not trap someone in a session.
export async function logout() {
  try {
    await request("/auth/logout", { method: "POST" });
  } catch {}
  await clearToken();
}

export const deleteAccount = async () => {
  await request("/auth/me", { method: "DELETE" });
  await clearToken();
};

// --- settings ---------------------------------------------------------------

export const fetchSettings = () => request("/settings");
export const patchSettings = patch => request("/settings", { method: "PATCH", body: patch });

// --- locations --------------------------------------------------------------
// Every mutation echoes back the full { locations, activeLocationId,
// notifyLocationId } payload, so the context never has to re-read after writing.

export const fetchLocations = () => request("/locations");
export const createLocation = ({ name, lat, lon }) => request("/locations", { method: "POST", body: { name, lat, lon } });
export const renameLocation = (id, name) => request(`/locations/${enc(id)}`, { method: "PATCH", body: { name } });
export const deleteLocation = id => request(`/locations/${enc(id)}`, { method: "DELETE" });
export const putActiveLocation = locationId => request("/locations/active", { method: "PUT", body: { locationId } });
export const putNotifyLocation = locationId => request("/locations/notify", { method: "PUT", body: { locationId } });

// --- alerts -----------------------------------------------------------------

export const fetchAlerts = () => request("/alerts");
export const patchAlerts = patch => request("/alerts", { method: "PATCH", body: patch });

// --- weather cache ----------------------------------------------------------
// Returns null when a location has never been fetched.

export const fetchWeatherCache = locationId => request(`/weather-cache/${enc(locationId)}`);
export const putWeatherCache = (locationId, { coords, weatherFull, updatedAt }) =>
  request(`/weather-cache/${enc(locationId)}`, { method: "PUT", body: { coords, weatherFull, updatedAt } });

// --- snapshot ---------------------------------------------------------------
// Settings + locations + state + the active/notify caches in one round trip, for
// the background task and the widget where request count actually matters.

export const fetchSnapshot = () => request("/snapshot");
