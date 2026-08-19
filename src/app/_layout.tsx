import "../weather/tasks"; // ensure BG task is defined whenever the app (or BG fetch) loads

import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";

import { AuthGate } from "../components/AuthGate";
import { BackendGate } from "../components/BackendGate";
import { AuthProvider } from "../context/AuthContext";
import { BackendProvider } from "../context/BackendContext";
import { LocationsProvider } from "../context/LocationsContext";
import { SettingsProvider } from "../context/SettingsContext";
import { WeatherProvider } from "../context/WeatherContext";

// Keep native splash up until the first screen knows what to render —
// avoids a flash of the JS "Starting up…" screen on every cold restart.
SplashScreen.preventAutoHideAsync().catch(() => {});

// The nesting order is load-bearing:
//   BackendProvider  — is the API awake? everything else waits on this
//   AuthProvider     — is anyone signed in? needs backend status to verify a token
//   SettingsProvider — per-account, so it waits for both; sits above the gates
//                      because their screens are themed and useTheme() reads it
//   BackendGate      — wake-up / unreachable screens
//   AuthGate         — login screen
//   Locations/Weather — account-scoped, mounted only once signed in
export default function RootLayout() {
  return (
    <BackendProvider>
      <AuthProvider>
        <SettingsProvider>
          <BackendGate>
            <AuthGate>
              <LocationsProvider>
                <WeatherProvider>
                  <StatusBar style="light" />
                  <Stack screenOptions={{ headerShown: false }} />
                </WeatherProvider>
              </LocationsProvider>
            </AuthGate>
          </BackendGate>
        </SettingsProvider>
      </AuthProvider>
    </BackendProvider>
  );
}
