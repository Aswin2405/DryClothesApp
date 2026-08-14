import { useMemo } from "react";
import { StyleSheet, Text, View } from "react-native";

import { useTheme } from "../theme/theme";

function fmtClock(iso) {
  const d    = new Date(iso);
  const hrs  = d.getHours();
  const mins = String(d.getMinutes()).padStart(2, "0");
  const ap   = hrs >= 12 ? "PM" : "AM";
  const h12  = hrs > 12 ? hrs - 12 : hrs === 0 ? 12 : hrs;
  return `${h12}:${mins} ${ap}`;
}

export function DryByBadge({ dryBy }) {
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);

  if (!dryBy) return null;

  if (dryBy.blocked) {
    return (
      <View style={[S.badge, S.badgeWarn]}>
        <Text style={S.warnText}>⏳ {dryBy.reason}</Text>
      </View>
    );
  }

  return (
    <View style={S.badge}>
      <Text style={S.okText}>🕐 Dry by ~{fmtClock(dryBy.isoTime)} ({dryBy.hoursNeeded}h)</Text>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    badge:    { backgroundColor: t.track, borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, marginTop: 10, alignSelf: "flex-start" },
    badgeWarn:{ backgroundColor: t.accentRed + "24" },
    okText:   { color: t.textSecondary, fontSize: 12, fontWeight: "700" },
    warnText: { color: t.accentRed, fontSize: 12, fontWeight: "700" },
  });
}
