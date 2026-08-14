import "../weather/tasks"; // ensure BG task is defined whenever the app (or BG fetch) loads

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { BackendGate } from "../components/BackendGate";
import { BackendProvider } from "../context/BackendContext";
import { LocationsProvider } from "../context/LocationsContext";
import { SettingsProvider } from "../context/SettingsContext";
import { WeatherProvider } from "../context/WeatherContext";

// Keep native splash up until the first screen knows what to render —
// avoids a flash of the JS "Starting up…" screen on every cold restart.
SplashScreen.preventAutoHideAsync().catch(() => {});

// BackendProvider is outermost because SettingsProvider waits on its status.
// SettingsProvider sits above BackendGate because the gate's screens are themed,
// and useTheme() reads settings. Everything that talks to the API on mount lives
// below the gate, so it only runs once the server is actually up.
export default function RootLayout() {
  return (
    <BackendProvider>
      <SettingsProvider>
        <BackendGate>
          <LocationsProvider>
            <WeatherProvider>
              <StatusBar style="light" />
              <Stack screenOptions={{ headerShown: false }} />
            </WeatherProvider>
          </LocationsProvider>
        </BackendGate>
      </SettingsProvider>
    </BackendProvider>
  );
}
