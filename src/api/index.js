// One named call per backend route. Import as `import * as api from "../api"`.
import { request } from "./client";

export { API_BASE_URL, ApiError, getDeviceId } from "./client";
export { pingBackend, waitForBackend } from "./health";

const enc = encodeURIComponent;

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
// the background task and the widget task where request count actually matters.

export const fetchSnapshot = () => request("/snapshot");
