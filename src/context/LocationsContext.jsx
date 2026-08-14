import { createContext, useContext, useEffect, useMemo, useState } from "react";

import * as api from "../api";
import { CURRENT_GPS_ID } from "../weather/constants";

// The server seeds this same entry for every new device; it is duplicated here
// purely as the offline fallback so the app still boots without a backend.
const CURRENT_GPS_ENTRY = { id: CURRENT_GPS_ID, name: "Current Location", isCurrentGPS: true, lat: null, lon: null };

const LocationsContext = createContext(null);

export function LocationsProvider({ children }) {
  const [locations, setLocations]              = useState([CURRENT_GPS_ENTRY]);
  const [activeLocationId, setActiveLocationId] = useState(CURRENT_GPS_ID);
  const [notifyLocationId, setNotifyLocationId] = useState(null);
  const [ready, setReady]                       = useState(false);

  // Every locations endpoint answers with the whole { locations, activeLocationId,
  // notifyLocationId } triple, so one helper absorbs reads and writes alike.
  function apply(payload) {
    setLocations(payload?.locations?.length ? payload.locations : [CURRENT_GPS_ENTRY]);
    setActiveLocationId(payload?.activeLocationId ?? CURRENT_GPS_ID);
    setNotifyLocationId(payload?.notifyLocationId ?? null);
  }

  useEffect(() => {
    api.fetchLocations()
      .then(apply)
      .catch(() => {}) // fall back to the GPS-only default set above
      .finally(() => setReady(true));
  }, []);

  async function addLocation({ name, lat, lon }) {
    const res = await api.createLocation({ name, lat, lon });
    apply(res);
    return res.location;
  }

  async function renameLocation(id, name) {
    apply(await api.renameLocation(id, name));
  }

  async function removeLocation(id) {
    if (id === CURRENT_GPS_ID) return; // the GPS entry is the fallback target, it always stays
    // The server also drops the location's weather cache and repoints
    // active/notify if either pointed here, so one call settles all of it.
    apply(await api.deleteLocation(id));
  }

  async function setActiveLocation(id) {
    const previous = activeLocationId;
    setActiveLocationId(id); // switch the screen straight away
    try {
      apply(await api.putActiveLocation(id));
    } catch {
      setActiveLocationId(previous);
    }
  }

  async function setNotifyLocation(id) {
    const previous = notifyLocationId;
    setNotifyLocationId(id);
    try {
      apply(await api.putNotifyLocation(id ?? null));
    } catch {
      setNotifyLocationId(previous);
      throw new Error("Could not save the alert location");
    }
  }

  const activeLocation = useMemo(
    () => locations.find(l => l.id === activeLocationId) ?? CURRENT_GPS_ENTRY,
    [locations, activeLocationId]
  );

  return (
    <LocationsContext.Provider value={{
      locations, activeLocationId, activeLocation, notifyLocationId, ready,
      addLocation, renameLocation, removeLocation, setActiveLocation, setNotifyLocation,
    }}>
      {children}
    </LocationsContext.Provider>
  );
}

export function useLocationsContext() {
  const ctx = useContext(LocationsContext);
  if (!ctx) throw new Error("useLocationsContext must be used within LocationsProvider");
  return ctx;
}
