import { createContext, useContext, useEffect, useState } from "react";

import * as api from "../api";
import { DEFAULT_SETTINGS } from "../weather/constants";
import { updateWidgets } from "../widget/updateWidgets";
import { useBackendContext } from "./BackendContext";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [fetched, setFetched]   = useState(false);
  const { status } = useBackendContext();

  // This provider sits above BackendGate (the gate's screens are themed), so it
  // has to do its own waiting: fetching during a cold start would just time out
  // and leave the session stuck on defaults.
  useEffect(() => {
    if (status !== "ready") return;

    api.fetchSettings()
      .then(saved => setSettings({ ...DEFAULT_SETTINGS, ...saved }))
      // Defaults still render a fully usable screen, and the next launch
      // (or the next write) picks the real values back up.
      .catch(() => {})
      .finally(() => setFetched(true));
  }, [status]);

  // Settled once the settings have loaded, or once we know there is no server
  // to load them from and defaults are the final answer.
  const ready = fetched || status === "unreachable" || status === "skipped";

  async function updateSettings(patch) {
    const previous = settings;
    setSettings(prev => ({ ...prev, ...patch })); // optimistic: the toggles feel instant

    try {
      const saved = await api.patchSettings(patch);
      setSettings({ ...DEFAULT_SETTINGS, ...saved });
      // Widgets read units/theme from the server, so redraw only once the new
      // settings have actually landed there.
      await updateWidgets();
    } catch {
      setSettings(previous); // never leave the UI claiming a save that did not happen
    }
  }

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, ready }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettingsContext() {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettingsContext must be used within SettingsProvider");
  return ctx;
}
