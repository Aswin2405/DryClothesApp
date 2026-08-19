import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";

import * as api from "../api";
import { useBackendContext } from "./BackendContext";

const AuthContext = createContext(null);

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

  const signOut = useCallback(async () => {
    confirmedRef.current = false;
    setUser(null);
    setStatus("anon");
    await api.logout();
  }, []);

  // Any 401 from any call drops the session once, centrally, instead of each
  // screen discovering the expiry on its own.
  useEffect(() => {
    api.setUnauthorizedHandler(() => {
      confirmedRef.current = false;
      setUser(null);
      setStatus("anon");
    });
    return () => api.setUnauthorizedHandler(null);
  }, []);

  // A stored token is trusted straight away so a warm launch goes right to the
  // weather; /auth/me below confirms it and fills in the account details.
  useEffect(() => {
    let alive = true;
    api.getToken()
      .then(token => { if (alive) setStatus(token ? "authed" : "anon"); })
      .catch(() => { if (alive) setStatus("anon"); });
    return () => { alive = false; };
  }, []);

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
    setUser(account);
    setStatus("authed");
    return account;
  }, []);

  const signUp = useCallback(async (credentials) => {
    const account = await api.register(credentials);
    confirmedRef.current = true;
    setUser(account);
    setStatus("authed");
    return account;
  }, []);

  const deleteAccount = useCallback(async () => {
    await api.deleteAccount();
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
