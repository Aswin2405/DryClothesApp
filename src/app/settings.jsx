import { useMemo } from "react";
import { ScrollView, StatusBar, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { useRouter } from "expo-router";

import { AlertCard } from "../components/AlertCard";
import { useSettingsContext } from "../context/SettingsContext";
import { useWeatherContext } from "../context/WeatherContext";
import { useTheme } from "../theme/theme";
import { stepTime } from "../weather/quietHours";

function SegmentedRow({ label, options, value, onChange, S }) {
  return (
    <View style={S.row}>
      <Text style={S.rowLabel}>{label}</Text>
      <View style={S.segmented}>
        {options.map(opt => (
          <TouchableOpacity
            key={opt.value}
            style={[S.segment, value === opt.value && S.segmentActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[S.segmentTxt, value === opt.value && S.segmentTxtActive]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function Stepper({ label, value, unit, onDec, onInc, S }) {
  return (
    <View style={S.row}>
      <Text style={S.rowLabel}>{label}</Text>
      <View style={S.stepper}>
        <TouchableOpacity style={S.stepBtn} onPress={onDec}><Text style={S.stepBtnTxt}>−</Text></TouchableOpacity>
        <Text style={S.stepValue}>{value}{unit}</Text>
        <TouchableOpacity style={S.stepBtn} onPress={onInc}><Text style={S.stepBtnTxt}>+</Text></TouchableOpacity>
      </View>
    </View>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);
  const { settings, updateSettings } = useSettingsContext();
  const { alertEnabled, nextAlert, alertLoading, toggleAlert } = useWeatherContext();

  return (
    <View style={S.container}>
      <StatusBar barStyle={t.statusBarStyle === "light" ? "light-content" : "dark-content"} />
      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>
        <View style={S.header}>
          <TouchableOpacity onPress={() => router.back()} hitSlop={10} style={S.backBtn}>
            <Text style={S.backTxt}>← Back</Text>
          </TouchableOpacity>
          <Text style={S.title}>Settings</Text>
        </View>

        <Text style={S.sectionTitle}>Units</Text>
        <View style={S.card}>
          <SegmentedRow
            label="Temperature"
            value={settings.tempUnit}
            onChange={v => updateSettings({ tempUnit: v })}
            options={[{ label: "°C", value: "C" }, { label: "°F", value: "F" }]}
            S={S}
          />
          <SegmentedRow
            label="Wind speed"
            value={settings.windUnit}
            onChange={v => updateSettings({ windUnit: v })}
            options={[{ label: "km/h", value: "kmh" }, { label: "mph", value: "mph" }]}
            S={S}
          />
        </View>

        <Text style={S.sectionTitle}>Notifications</Text>
        <AlertCard
          alertEnabled={alertEnabled}
          onToggle={toggleAlert}
          nextAlert={nextAlert}
          loading={alertLoading}
          leadMinutes={settings.alertLeadMinutes}
        />
        <View style={S.card}>
          <Stepper
            label="Alert lead time"
            value={settings.alertLeadMinutes}
            unit=" min"
            onDec={() => updateSettings({ alertLeadMinutes: Math.max(15, settings.alertLeadMinutes - 15) })}
            onInc={() => updateSettings({ alertLeadMinutes: Math.min(120, settings.alertLeadMinutes + 15) })}
            S={S}
          />
          <View style={S.row}>
            <Text style={S.rowLabel}>Quiet hours</Text>
            <Switch
              value={settings.quietHoursEnabled}
              onValueChange={v => updateSettings({ quietHoursEnabled: v })}
              trackColor={{ false: t.track, true: t.accentGreen }}
              thumbColor="#fff"
              ios_backgroundColor={t.track}
            />
          </View>
          {settings.quietHoursEnabled && (
            <>
              <Stepper
                label="Quiet from"
                value={settings.quietHoursStart}
                unit=""
                onDec={() => updateSettings({ quietHoursStart: stepTime(settings.quietHoursStart, -30) })}
                onInc={() => updateSettings({ quietHoursStart: stepTime(settings.quietHoursStart, 30) })}
                S={S}
              />
              <Stepper
                label="Quiet until"
                value={settings.quietHoursEnd}
                unit=""
                onDec={() => updateSettings({ quietHoursEnd: stepTime(settings.quietHoursEnd, -30) })}
                onInc={() => updateSettings({ quietHoursEnd: stepTime(settings.quietHoursEnd, 30) })}
                S={S}
              />
            </>
          )}
        </View>

        <Text style={S.sectionTitle}>Appearance</Text>
        <View style={S.card}>
          <SegmentedRow
            label="Theme"
            value={settings.theme}
            onChange={v => updateSettings({ theme: v })}
            options={[{ label: "System", value: "system" }, { label: "Light", value: "light" }, { label: "Dark", value: "dark" }]}
            S={S}
          />
        </View>

        <TouchableOpacity style={S.linkBtn} onPress={() => router.push("/locations")}>
          <Text style={S.linkBtnTxt}>📍 Manage Locations</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: t.bg },
    scroll:    { paddingTop: 58, paddingHorizontal: 14, paddingBottom: 44 },

    header:   { flexDirection: "row", alignItems: "center", marginBottom: 18 },
    backBtn:  { marginRight: 12 },
    backTxt:  { color: t.textSecondary, fontSize: 14, fontWeight: "600" },
    title:    { color: t.textPrimary, fontSize: 20, fontWeight: "800" },

    sectionTitle: { color: t.textMuted, fontSize: 11, fontWeight: "800", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 8, marginTop: 18 },

    card: { backgroundColor: t.card, borderRadius: 18, padding: 14, borderWidth: 1, borderColor: t.cardBorder },

    row:      { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10 },
    rowLabel: { color: t.textPrimary, fontSize: 14, fontWeight: "600" },

    segmented:      { flexDirection: "row", backgroundColor: t.track, borderRadius: 10, padding: 2 },
    segment:        { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
    segmentActive:  { backgroundColor: t.accentGreen },
    segmentTxt:     { color: t.textSecondary, fontSize: 12, fontWeight: "700" },
    segmentTxtActive: { color: t.accentGreenText },

    stepper:    { flexDirection: "row", alignItems: "center", gap: 12 },
    stepBtn:    { width: 28, height: 28, borderRadius: 14, backgroundColor: t.track, alignItems: "center", justifyContent: "center" },
    stepBtnTxt: { color: t.textPrimary, fontSize: 16, fontWeight: "800" },
    stepValue:  { color: t.textPrimary, fontSize: 14, fontWeight: "700", minWidth: 56, textAlign: "center" },

    linkBtn:    { backgroundColor: t.track, borderRadius: 16, paddingVertical: 14, alignItems: "center", marginTop: 20 },
    linkBtnTxt: { color: t.textPrimary, fontWeight: "800", fontSize: 14 },
  });
}
