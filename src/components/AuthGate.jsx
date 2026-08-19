import { useEffect } from "react";
import * as SplashScreen from "expo-splash-screen";

import { useAuthContext } from "../context/AuthContext";
import { AuthScreen } from "./AuthScreen";

// Holds the app back until someone is signed in. Everything below this point —
// locations, weather, alerts — is scoped to that account, so none of it should
// mount without one.
export function AuthGate({ children }) {
  const { status } = useAuthContext();

  // Reading the stored token is fast, so "loading" stays behind the splash. Once
  // we know there is no session, the splash has to come down for the login form —
  // index.jsx only hides it when there is weather, which never arrives here.
  useEffect(() => {
    if (status === "anon") SplashScreen.hideAsync().catch(() => {});
  }, [status]);

  if (status === "loading") return null;
  if (status === "anon") return <AuthScreen />;
  return children;
}
