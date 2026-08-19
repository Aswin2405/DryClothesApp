// Where the login token lives.
//
// This is the only thing the app keeps on the device, and it is a credential
// rather than app data: settings, locations and forecasts all still live only in
// Mongo, now scoped to the account the token identifies. Without somewhere to
// keep it, every launch would be a fresh login.
//
// Native uses the Keychain / EncryptedSharedPreferences via expo-secure-store.
// SecureStore has no web implementation, so the web build falls back to
// localStorage — less protected, but the alternative is logging in on every
// page load.
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const isNative = Platform.OS === "android" || Platform.OS === "ios";

// SecureStore keys allow only alphanumerics, ".", "-" and "_".
const NATIVE_KEY = "dryClothes.sessionToken";
const WEB_KEY = "dryClothes:sessionToken";

// Kept in memory so the request hot path — including the headless widget and
// background tasks — doesn't touch the Keychain on every call.
let cached = null;
let loaded = false;

export async function getToken() {
  if (loaded) return cached;
  try {
    cached = isNative
      ? await SecureStore.getItemAsync(NATIVE_KEY)
      : globalThis.localStorage?.getItem(WEB_KEY) ?? null;
  } catch {
    cached = null; // storage unavailable (private browsing, locked keystore)
  }
  loaded = true;
  return cached;
}

export async function setToken(token) {
  cached = token;
  loaded = true;
  try {
    if (isNative) await SecureStore.setItemAsync(NATIVE_KEY, token);
    else globalThis.localStorage?.setItem(WEB_KEY, token);
  } catch {
    // A session that can't be written still works until the app closes.
  }
}

export async function clearToken() {
  cached = null;
  loaded = true;
  try {
    if (isNative) await SecureStore.deleteItemAsync(NATIVE_KEY);
    else globalThis.localStorage?.removeItem(WEB_KEY);
  } catch {}
}
