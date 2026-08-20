import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AppState } from "react-native";

import * as api from "../api";
import { notify } from "../lib/dialog";
import { useBackendContext } from "./BackendContext";

const AuthContext = createContext(null);

// A 90-day token is well past what setTimeout can hold (it overflows above
// ~24.8 days and fires straight away), and a backgrounded app doesn't run timers
// anyway — so the expiry check re-arms in day-long hops and re-runs whenever the
// app comes back to the foreground.
const MAX_TIMER_MS = 24 * 60 * 60 * 1000;

/**
 * status:
 *   "loading" — reading the stored token; nothing decided yet
 *   "authed"  — a token is present (confirmed against /auth/me once the API is up)
 *   "anon"    — no token, or the server rejected the one we had
 */
export function AuthProvider({ children }) {
  const [status, setStatus] = useState("loading");
  const [user, setUser]     = useState(null);
  const { status: backendStatus } = useBackendContext();
  const confirmedRef = useRef(false);
  // "this session is already over" — stops a late 401 from an in-flight request
  // announcing an expiry that has been handled, or that the user asked for.
  const endedRef     = useRef(false);

  const signOut = useCallback(async () => {
    endedRef.current = true;
    confirmedRef.current = false;
    setUser(null);
    setStatus("anon");
    await api.logout();
  }, []);

  // Ends a session the user didn't end themselves — the token aged out, or the
  // server refused it. Being dropped back to the login screen with no explanation
  // reads as a bug, so this always says what happened.
  const expireSession = useCallback(async () => {
    if (endedRef.current) return; // a burst of 401s is still one expiry
    endedRef.current = true;
    confirmedRef.current = false;
    setUser(null);
    setStatus("anon");
    // Not logout(): POSTing /auth/logout with a dead token only 401s again.
    await api.clearToken();
    notify("Session expired", "You have been signed out. Please sign in again.");
  }, []);

  // Any 401 from any call drops the session once, centrally, instead of each
  // screen discovering the expiry on its own.
  useEffect(() => {
    api.setUnauthorizedHandler(expireSession);
    return () => api.setUnauthorizedHandler(null);
  }, [expireSession]);

  // A stored token is trusted straight away so a warm launch goes right to the
  // weather; /auth/me below confirms it and fills in the account details. One
  // thing is checked first, though: a token that already expired while the app
  // was closed, so the app never flashes up behind a session that is over.
  useEffect(() => {
    let alive = true;
    api.getToken()
      .then(token => {
        if (!alive) return;
        if (!token) { setStatus("anon"); return; }

        const expiresAt = api.getTokenExpiry(token);
        if (expiresAt !== null && expiresAt <= Date.now()) { expireSession(); return; }

        setStatus("authed");
      })
      .catch(() => { if (alive) setStatus("anon"); });
    return () => { alive = false; };
  }, [expireSession]);

  // Responses alone aren't enough to notice an expiry: an app left open makes no
  // requests, so the token could lapse with the user still looking at the screen.
  // This watches the clock as well.
  useEffect(() => {
    if (status !== "authed") return;

    let alive = true;
    let timer = null;

    async function checkExpiry() {
      const token = await api.getToken();
      if (!alive) return;

      const expiresAt = token ? api.getTokenExpiry(token) : null;
      if (expiresAt === null) return; // unreadable token — leave it to the 401 path

      const remaining = expiresAt - Date.now();
      if (remaining <= 0) { expireSession(); return; }

      clearTimeout(timer); // a foreground check can land while one is already armed
      timer = setTimeout(checkExpiry, Math.min(remaining, MAX_TIMER_MS));
    }

    checkExpiry();
    const sub = AppState.addEventListener("change", next => {
      if (next === "active") checkExpiry();
    });

    return () => { alive = false; clearTimeout(timer); sub.remove(); };
  }, [status, expireSession]);

  useEffect(() => {
    if (backendStatus !== "ready" || status !== "authed" || confirmedRef.current) return;
    confirmedRef.current = true;

    api.fetchMe()
      .then(setUser)
      // A 401 already triggered the handler above. Anything else is the network,
      // and is not a reason to throw someone out of a session they may still have.
      .catch(() => {});
  }, [backendStatus, status]);

  const signIn = useCallback(async (credentials) => {
    const account = await api.login(credentials);
    confirmedRef.current = true;
    endedRef.current = false; // a fresh token gets to expire on its own terms
    setUser(account);
    setStatus("authed");
    return account;
  }, []);

  const signUp = useCallback(async (credentials) => {
    const account = await api.register(credentials);
    confirmedRef.current = true;
    endedRef.current = false;
    setUser(account);
    setStatus("authed");
    return account;
  }, []);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
    endedRef.current = true; // deliberate: don't report it as an expiry
    confirmedRef.current = false;
    setUser(null);
    setStatus("anon");
  }, []);

  return (
    <AuthContext.Provider value={{ status, user, signIn, signUp, signOut, deleteAccount }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuthContext() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuthContext must be used within AuthProvider");
  return ctx;
}
