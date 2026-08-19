import { createContext, useContext, useEffect, useState } from "react";

import * as api from "../api";
import { DEFAULT_SETTINGS } from "../weather/constants";
import { updateWidgets } from "../widget/updateWidgets";
import { useAuthContext } from "./AuthContext";
import { useBackendContext } from "./BackendContext";

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [fetched, setFetched]   = useState(false);
  const { status } = useBackendContext();
  const { status: authStatus } = useAuthContext();

  // This provider sits above both gates (their screens are themed), so it has to
  // do its own waiting on two things: a server that is actually up, and an
  // account to load settings for.
  useEffect(() => {
    if (status !== "ready" || authStatus !== "authed") return;

    let alive = true;
    api.fetchSettings()
      .then(saved => { if (alive) setSettings({ ...DEFAULT_SETTINGS, ...saved }); })
      // Defaults still render a fully usable screen, and the next launch
      // (or the next write) picks the real values back up.
      .catch(() => {})
      .finally(() => { if (alive) setFetched(true); });

    return () => {
      alive = false;
      // Leaving the signed-in state drops this account's values, so the login
      // screen and whoever signs in next never see them — not even for the one
      // request it takes to load theirs.
      setSettings(DEFAULT_SETTINGS);
      setFetched(false);
    };
  }, [status, authStatus]);

  // Settled once the settings have loaded, or once we know they never will be —
  // no server to ask, or nobody signed in to ask about.
  const ready = fetched || authStatus === "anon" || status === "unreachable" || status === "skipped";

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
