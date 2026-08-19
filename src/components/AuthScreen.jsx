import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

import { useAuthContext } from "../context/AuthContext";
import { useTheme } from "../theme/theme";

const MIN_PASSWORD_LENGTH = 8; // mirrors MIN_PASSWORD_LENGTH in the backend's User model

export function AuthScreen() {
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);
  const { signIn, signUp } = useAuthContext();

  const [mode, setMode]         = useState("login"); // "login" | "signup"
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [name, setName]         = useState("");
  const [error, setError]       = useState("");
  const [busy, setBusy]         = useState(false);

  const isSignup = mode === "signup";
  const canSubmit = email.trim().length > 3 && password.length >= MIN_PASSWORD_LENGTH && !busy;

  function switchMode() {
    setMode(isSignup ? "login" : "signup");
    setError("");
  }

  async function submit() {
    if (!canSubmit) return;
    setBusy(true);
    setError("");
    try {
      const credentials = { email: email.trim(), password };
      if (isSignup) await signUp({ ...credentials, name: name.trim() });
      else await signIn(credentials);
      // On success this screen unmounts — AuthGate swaps in the app.
    } catch (err) {
      setError(err.message || "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <KeyboardAvoidingView style={S.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <StatusBar barStyle={t.statusBarStyle === "light" ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={S.scroll} keyboardShouldPersistTaps="handled">

        <Text style={S.logo}>👕</Text>
        <Text style={S.title}>Dry Clothes Today</Text>
        <Text style={S.subtitle}>
          {isSignup
            ? "Create an account — your locations, alerts and units stay yours."
            : "Sign in to pick up your locations, alerts and units."}
        </Text>

        {isSignup && (
          <>
            <Text style={S.label}>Name (optional)</Text>
            <TextInput
              style={S.input}
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={t.textFaint}
              autoCapitalize="words"
              autoComplete="name"
              editable={!busy}
            />
          </>
        )}

        <Text style={S.label}>Email</Text>
        <TextInput
          style={S.input}
          value={email}
          onChangeText={v => { setEmail(v); setError(""); }}
          placeholder="you@example.com"
          placeholderTextColor={t.textFaint}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          autoComplete="email"
          editable={!busy}
        />

        <Text style={S.label}>Password</Text>
        <TextInput
          style={S.input}
          value={password}
          onChangeText={v => { setPassword(v); setError(""); }}
          placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
          placeholderTextColor={t.textFaint}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={isSignup ? "new-password" : "current-password"}
          editable={!busy}
          onSubmitEditing={submit}
          returnKeyType="go"
        />

        {!!error && <Text style={S.error}>{error}</Text>}

        <TouchableOpacity
          style={[S.primaryBtn, !canSubmit && S.primaryBtnDisabled]}
          onPress={submit}
          disabled={!canSubmit}
          activeOpacity={0.85}
        >
          {busy
            ? <ActivityIndicator color={t.accentGreenText} size="small" />
            : <Text style={S.primaryBtnTxt}>{isSignup ? "Create Account" : "Sign In"}</Text>}
        </TouchableOpacity>

        <TouchableOpacity onPress={switchMode} style={S.switchBtn} disabled={busy} hitSlop={8}>
          <Text style={S.switchTxt}>
            {isSignup ? "Already have an account? Sign in" : "New here? Create an account"}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    flex:   { flex: 1, backgroundColor: t.bg },
    scroll: { flexGrow: 1, justifyContent: "center", padding: 28, paddingBottom: 44 },

    logo:     { fontSize: 56, textAlign: "center" },
    title:    { color: t.textPrimary, fontSize: 26, fontWeight: "900", textAlign: "center", marginTop: 10 },
    subtitle: { color: t.textSecondary, fontSize: 14, textAlign: "center", marginTop: 8, marginBottom: 26, lineHeight: 20 },

    label: { color: t.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginTop: 14, marginBottom: 6 },
    input: {
      backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 14,
      paddingHorizontal: 14, paddingVertical: 12, color: t.textPrimary, fontSize: 15,
    },

    error: { color: t.accentRed, fontSize: 13, marginTop: 14, textAlign: "center", fontWeight: "600" },

    primaryBtn:         { backgroundColor: t.accentGreen, borderRadius: 16, paddingVertical: 16, alignItems: "center", marginTop: 24 },
    primaryBtnDisabled: { opacity: 0.45 },
    primaryBtnTxt:      { color: t.accentGreenText, fontWeight: "900", fontSize: 16 },

    switchBtn: { marginTop: 18, alignItems: "center" },
    switchTxt: { color: t.textSecondary, fontSize: 13, fontWeight: "600" },
  });
}
