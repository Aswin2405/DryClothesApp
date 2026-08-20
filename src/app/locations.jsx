import { useMemo, useState } from "react";
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { AddLocationModal } from "../components/AddLocationModal";
import { useLocationsContext } from "../context/LocationsContext";
import { notifyError } from "../lib/dialog";
import { useTheme } from "../theme/theme";

export default function LocationsScreen() {
  const router = useRouter();
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);
  const {
    locations, activeLocationId, notifyLocationId,
    addLocation, removeLocation, setActiveLocation,
  } = useLocationsContext();

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Locations live on the server, so every action here can fail on a bad
  // connection — say so instead of silently doing nothing.
  async function handleSave(entry) {
    setSaving(true);
    try {
      await addLocation(entry);
      setModalVisible(false);
    } catch (err) {
      notifyError("Couldn't add location", err);
    }
    setSaving(false);
  }

  async function handleRemove(id) {
    try {
      await removeLocation(id);
    } catch (err) {
      notifyError("Couldn't remove location", err);
    }
  }

  return (
    <View style={S.container}>
      <StatusBar barStyle={t.statusBarStyle === "light" ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <View style={S.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={S.backBtn}>
            <Text style={S.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={S.title}>Locations</Text>
        </View>

        {locations.map(loc => {
          const isActive = loc.id === activeLocationId;
          const isNotified = loc.id === notifyLocationId;
          return (
            <TouchableOpacity
              key={loc.id}
              style={[S.card, isActive && S.cardActive]}
              onPress={() => setActiveLocation(loc.id)}
              activeOpacity={0.8}
            >
              <View style={{ flex: 1 }}>
                <Text style={S.name}>{loc.isCurrentGPS ? "📍 " : "📌 "}{loc.name}</Text>
                {isNotified && <Text style={S.notifyTag}>🔔 Alerts armed here</Text>}
              </View>
              {isActive && <Text style={S.activeTag}>Active</Text>}
              {!loc.isCurrentGPS && (
                <TouchableOpacity onPress={() => handleRemove(loc.id)} hitSlop={10} style={S.deleteBtn}>
                  <Text style={S.deleteTxt}>🗑️</Text>
                </TouchableOpacity>
              )}
            </TouchableOpacity>
          );
        })}

        <TouchableOpacity style={S.addBtn} onPress={() => setModalVisible(true)}>
          <Text style={S.addBtnTxt}>+ Add Location</Text>
        </TouchableOpacity>
      </ScrollView>

      <AddLocationModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSave={handleSave}
        saving={saving}
      />
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    scroll:    { paddingTop: 58, paddingHorizontal: 14, paddingBottom: 44 },

    header:  { flexDirection: "row", alignItems: "center", marginBottom: 18 },
    backBtn: { marginRight: 12 },
    backTxt: { color: t.textSecondary, fontSize: 14, fontWeight: "600" },
    title:   { color: t.textPrimary, fontSize: 20, fontWeight: "800" },

    card:       { flexDirection: "row", alignItems: "center", backgroundColor: t.card, borderRadius: 16, padding: 14, borderWidth: 1, borderColor: t.cardBorder, marginBottom: 10 },
    cardActive: { borderColor: t.accentGreen },
    name:       { color: t.textPrimary, fontSize: 15, fontWeight: "700" },
    notifyTag:  { color: t.accentGreen, fontSize: 11, marginTop: 3, fontWeight: "600" },
    activeTag:  { color: t.accentGreen, fontSize: 11, fontWeight: "800", marginRight: 6 },
    deleteBtn:  { padding: 4 },
    deleteTxt:  { fontSize: 16 },

    addBtn:    { backgroundColor: t.track, borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 6 },
    addBtnTxt: { color: t.textPrimary, fontWeight: "800", fontSize: 14 },
  });
}
