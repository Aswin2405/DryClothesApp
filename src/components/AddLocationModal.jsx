import * as Location from "expo-location";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

import { useKeyboardAwareScroll } from "../hooks/useKeyboardAwareScroll";
import { useTheme } from "../theme/theme";
import { geocodeSearch, reverseGeocode } from "../weather/api";

const DEBOUNCE_MS = 600;

export function AddLocationModal({ visible, onClose, onSave, saving = false }) {
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);
  const { scrollRef, scrollProps, field } = useKeyboardAwareScroll();

  const [query, setQuery]       = useState("");
  const [results, setResults]   = useState([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked]     = useState(null); // { lat, lon }
  const [name, setName]         = useState("");
  const [locating, setLocating] = useState(false);
  const debounceRef = useRef(null);

  useEffect(() => {
    if (!visible) {
      setQuery(""); setResults([]); setPicked(null); setName(""); setSearching(false);
    }
  }, [visible]);

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (query.trim().length < 3) { setResults([]); return; }
    setSearching(true);
    debounceRef.current = setTimeout(async () => {
      const r = await geocodeSearch(query.trim());
      setResults(r);
      setSearching(false);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [query]);

  function pickResult(r) {
    setPicked({ lat: r.lat, lon: r.lon });
    setName(r.displayName.split(",")[0]);
    // The name field and Save button only appear now — bring them into view.
    requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
  }

  async function useCurrentGps() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const cityName = await reverseGeocode(latitude, longitude);
      setPicked({ lat: latitude, lon: longitude });
      setName(cityName);
    } catch {}
    setLocating(false);
  }

  function save() {
    if (!picked || !name.trim()) return;
    onSave({ name: name.trim(), lat: picked.lat, lon: picked.lon });
  }

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      {/* A Modal gets no keyboard handling of its own on either platform, so the
          sheet has to lift itself — otherwise the keyboard sits right on top of
          the fields being typed into. */}
      <KeyboardAvoidingView style={S.backdrop} behavior="padding">
        <View style={S.sheet}>
          <View style={S.headerRow}>
            <Text style={S.title}>Add Location</Text>
            <TouchableOpacity onPress={onClose} hitSlop={10}><Text style={S.closeTxt}>✕</Text></TouchableOpacity>
          </View>

          {/* One scroll surface for the whole body: whatever space the keyboard
              leaves, every field stays reachable inside it. */}
          <ScrollView ref={scrollRef} contentContainerStyle={S.body} bounces={false} {...scrollProps}>
            <TouchableOpacity style={S.gpsBtn} onPress={useCurrentGps} disabled={locating}>
              {locating
                ? <ActivityIndicator color={t.accentGreenText} size="small" />
                : <Text style={S.gpsBtnTxt}>📍 Use current GPS position</Text>}
            </TouchableOpacity>

            <TextInput
              {...field("query")}
              style={S.input}
              placeholder="Search for a city…"
              placeholderTextColor={t.textFaint}
              value={query}
              onChangeText={setQuery}
            />

            {searching && <ActivityIndicator style={{ marginTop: 10 }} color={t.textSecondary} size="small" />}

            {results.map((r, i) => (
              <TouchableOpacity key={i} style={S.resultRow} onPress={() => pickResult(r)}>
                <Text style={S.resultTxt} numberOfLines={1}>{r.displayName}</Text>
              </TouchableOpacity>
            ))}

            {picked && (
              <>
                <Text style={S.label}>Name this location</Text>
                <TextInput
                  {...field("name")}
                  style={S.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="e.g. Home"
                  placeholderTextColor={t.textFaint}
                  returnKeyType="done"
                  onSubmitEditing={save}
                />
                {/* Saving now round-trips to the server, so the button has to show it */}
                <TouchableOpacity style={S.saveBtn} onPress={save} disabled={!name.trim() || saving}>
                  {saving
                    ? <ActivityIndicator color={t.accentGreenText} size="small" />
                    : <Text style={S.saveBtnTxt}>Save Location</Text>}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
    // maxHeight lets the body scroll instead of the sheet growing off-screen
    // once the keyboard has taken the bottom half.
    sheet:    { backgroundColor: t.bg, borderTopLeftRadius: 24, borderTopRightRadius: 24, paddingHorizontal: 20, paddingTop: 20, maxHeight: "92%" },
    body:     { paddingBottom: 36 },

    headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
    title:     { color: t.textPrimary, fontSize: 18, fontWeight: "800" },
    closeTxt:  { color: t.textSecondary, fontSize: 18 },

    gpsBtn:    { backgroundColor: t.accentGreen, borderRadius: 14, paddingVertical: 12, alignItems: "center", marginBottom: 14 },
    gpsBtnTxt: { color: t.accentGreenText, fontWeight: "800", fontSize: 14 },

    input: { backgroundColor: t.card, borderWidth: 1, borderColor: t.cardBorder, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10, color: t.textPrimary, fontSize: 14, marginTop: 4 },

    resultRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: t.divider },
    resultTxt: { color: t.textSecondary, fontSize: 13 },

    label:    { color: t.textMuted, fontSize: 11, fontWeight: "700", textTransform: "uppercase", marginTop: 14, marginBottom: 4 },
    saveBtn:  { backgroundColor: t.accentGreen, borderRadius: 14, paddingVertical: 14, alignItems: "center", marginTop: 14 },
    saveBtnTxt: { color: t.accentGreenText, fontWeight: "900", fontSize: 15 },
  });
}
