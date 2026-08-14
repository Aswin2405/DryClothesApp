import { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Animated,
  Easing,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";

import { AnimatedBackground } from "../components/AnimatedBackground";
import { BounceCard } from "../components/BounceCard";
import { DryByBadge } from "../components/DryByBadge";
import { ErrorScreen, LoadingScreen, LocationPermScreen } from "../components/LoadingScreens";
import { RainBar } from "../components/RainBar";
import { ScoreRing } from "../components/ScoreRing";
import { useSettingsContext } from "../context/SettingsContext";
import { useWeatherContext } from "../context/WeatherContext";
import { useTheme } from "../theme/theme";
import { formatTemp, formatWind } from "../weather/units";
import { buildTamilMessage, decodeWMO, getRainRisk, getSunLabel, getWindLabel } from "../weather/score";

export default function App() {
  const {
    phase, city, weather, lastUpdated, errorMsg,
    init, refresh, speakTamil,
  } = useWeatherContext();
  const { settings } = useSettingsContext();
  const router = useRouter();
  const t = useTheme();
  const S = useMemo(() => makeStyles(t), [t]);

  const spinAnim    = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0)).current;

  // Boot decision made (cache hit, or entering the real locating/loading flow) —
  // safe to swap the native splash for JS content now.
  useEffect(() => {
    if (phase !== "init") {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [phase]);

  useEffect(() => {
    if (phase !== "ready") {
      Animated.loop(
        Animated.timing(spinAnim, { toValue: 1, duration: 1100, useNativeDriver: true, easing: Easing.linear })
      ).start();
    } else {
      spinAnim.stopAnimation();
      spinAnim.setValue(0);
    }
  }, [phase]);

  useEffect(() => {
    if (phase === "ready") {
      Animated.spring(headerScale, { toValue: 1, delay: 100, useNativeDriver: true, tension: 50 }).start();
    } else {
      headerScale.setValue(0);
    }
  }, [phase]);

  if (phase === "noperm") return <LocationPermScreen onRetry={init} />;
  if (phase === "error")  return <ErrorScreen message={errorMsg} onRetry={init} />;
  if (phase !== "ready" || !weather) return <LoadingScreen phase={phase} spinAnim={spinAnim} city={city} />;

  const risk     = getRainRisk(weather.rainChance);
  const wind     = getWindLabel(weather.wind);
  const sun      = getSunLabel(weather.uvi);
  const tamilMsg = buildTamilMessage(weather.rainChance, weather.wind, weather.score);

  const now         = Date.now();
  const afterSunset = weather.sunsetIso  ? now >= new Date(weather.sunsetIso).getTime()  : false;
  const beforeSun   = weather.sunriseIso ? now <  new Date(weather.sunriseIso).getTime() : false;
  const isNight     = afterSunset || beforeSun;

  const riskColor = { safe: t.accentGreen, warning: t.accentOrange, danger: t.accentRed }[risk];

  const statusConfig = isNight
    ? { emoji: "🌙", title: "Sun Has Set!", subtitle: "Bring your clothes inside", color: t.accentPurple }
    : {
        safe:    { emoji: "✅", title: "Safe to Dry!",     subtitle: "Great drying conditions", color: t.accentGreen },
        warning: { emoji: "⚠️", title: "Be Careful",       subtitle: "Rain possible later",      color: t.accentOrange },
        danger:  { emoji: "🚫", title: "Don't Dry Today!", subtitle: "Rain coming your way",      color: t.accentRed },
      }[risk];

  return (
    <View style={S.container}>
      <StatusBar barStyle={t.statusBarStyle === "light" ? "light-content" : "dark-content"} />
      <AnimatedBackground />

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View style={[S.header, { transform: [{ scale: headerScale }] }]}>
          <TouchableOpacity style={S.settingsBtn} onPress={() => router.push("/settings")} hitSlop={10}>
            <Text style={S.settingsIcon}>⚙️</Text>
          </TouchableOpacity>
          <View style={S.locationRow}>
            <Text style={S.locationPin}>📍</Text>
            <Text style={S.headerTitle}>{city}</Text>
          </View>
          <Text style={S.headerTime}>Updated {lastUpdated}</Text>
        </Animated.View>

        {/* Score ring + status */}
        <BounceCard delay={80} style={[S.card, S.heroCard]}>
          <ScoreRing score={weather.score} />
          <View style={S.heroRight}>
            <Text style={S.heroEmoji}>{weather.conditionEmoji}</Text>
            <Text style={[S.mainTitle, { color: statusConfig.color }]}>{statusConfig.title}</Text>
            <Text style={S.mainSub}>{statusConfig.subtitle}</Text>
            <View style={S.tempRow}>
              <Text style={S.tempText}>{formatTemp(weather.temp, settings.tempUnit)}</Text>
              <View style={S.condBadge}><Text style={S.condText}>{weather.condition}</Text></View>
            </View>
            <DryByBadge dryBy={weather.dryBy} />
          </View>
        </BounceCard>

        {/* Hourly alert banner */}
        {weather.hourlyAlert && (
          <BounceCard delay={140} style={S.alertBanner}>
            <Text style={S.alertBannerText}>{weather.hourlyAlert}</Text>
          </BounceCard>
        )}

        {/* 4 mini stat cards */}
        <View style={S.row}>
          <BounceCard delay={180} style={[S.card, S.miniCard]}>
            <Text style={S.miniIcon}>🌧️</Text>
            <Text style={S.miniLabel}>Rain</Text>
            <Text style={[S.miniValue, { color: riskColor }]}>
              {weather.rainChance}%
            </Text>
            <RainBar pop={weather.rainChance} />
          </BounceCard>

          <BounceCard delay={210} style={[S.card, S.miniCard]}>
            <Text style={S.miniIcon}>💧</Text>
            <Text style={S.miniLabel}>Humidity</Text>
            <Text style={[S.miniValue, { color: weather.humidity > 70 ? t.accentRed : weather.humidity > 50 ? t.accentOrange : t.accentGreen }]}>
              {weather.humidity}%
            </Text>
            <RainBar pop={weather.humidity} />
          </BounceCard>

          <BounceCard delay={240} style={[S.card, S.miniCard]}>
            <Text style={S.miniIcon}>{wind.icon}</Text>
            <Text style={S.miniLabel}>Wind</Text>
            <Text style={S.miniValue}>{formatWind(weather.wind, settings.windUnit)}</Text>
            <Text style={S.miniSub} numberOfLines={2}>{wind.label}</Text>
          </BounceCard>

          <BounceCard delay={270} style={[S.card, S.miniCard]}>
            <Text style={S.miniIcon}>{sun.icon}</Text>
            <Text style={S.miniLabel}>UV</Text>
            <Text style={S.miniValue}>{weather.uvi != null ? weather.uvi : "—"}</Text>
            <Text style={S.miniSub} numberOfLines={2}>{sun.label}</Text>
          </BounceCard>
        </View>

        {/* Tamil voice */}
        {/* <BounceCard delay={360} style={S.card}>
          <View style={S.tamilRow}>
            <Text style={{ fontSize: 28 }}>🗣️</Text>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={S.tamilLabel}>Tamil Alert • தமிழ் அலர்ட்</Text>
              <Text style={S.tamilMsg}>{tamilMsg}</Text>
            </View>
          </View>
          <TouchableOpacity style={S.speakBtn} onPress={speakTamil} activeOpacity={0.82}>
            <Text style={S.speakBtnTxt}>🔊 கேட்க (Listen in Tamil)</Text>
          </TouchableOpacity>
        </BounceCard> */}

        {/* Hourly forecast */}
        <BounceCard delay={400} style={S.card}>
          <Text style={S.sectionTitle}>⏰ Next 24 Hours</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 10 }}>
            {weather.hourly.map((h, i) => (
              <View key={i} style={[S.hourCell, h.pop >= 60 ? S.hourDanger : h.pop >= 30 ? S.hourWarn : S.hourSafe]}>
                <Text style={S.hourLabel}>{h.hour}</Text>
                <Text style={{ fontSize: 18 }}>{decodeWMO(h.wmo).emoji}</Text>
                <Text style={S.hourTemp}>{formatTemp(h.temp, settings.tempUnit)}</Text>
                <Text style={S.hourPop}>💧{h.pop}%</Text>
              </View>
            ))}
          </ScrollView>
        </BounceCard>

        {/* 5-day forecast */}
        <BounceCard delay={450} style={S.card}>
          <Text style={S.sectionTitle}>📅 5-Day Outlook</Text>
          {weather.daily.map((d, i) => (
            <View key={i} style={S.dailyRow}>
              <Text style={S.dailyDay}>{d.day}</Text>
              <Text style={{ fontSize: 20, width: 30 }}>{d.icon}</Text>
              <RainBar pop={d.pop} height={6} style={{ flex: 1, marginHorizontal: 10, marginTop: 0 }} />
              <Text style={[S.dailyPop, { color: d.pop >= 60 ? t.accentRed : d.pop >= 30 ? t.accentOrange : t.accentGreen }]}>{d.pop}%</Text>
              <Text style={S.dailyHigh}>{formatTemp(d.high, settings.tempUnit)}</Text>
            </View>
          ))}
        </BounceCard>

        {/* Refresh */}
        <TouchableOpacity style={S.refreshBtn} onPress={refresh} activeOpacity={0.75} disabled={phase === "loading"}>
          {phase === "loading"
            ? <ActivityIndicator color={t.accentGreenText} size="small" />
            : <>
                <Text style={S.refreshIcon}>🔄</Text>
                <Text style={S.refreshTxt}>Refresh Weather</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={S.footer}>
          📍 {city} • Open-Meteo & OpenStreetMap • Alerts fire {settings.alertLeadMinutes} min early
        </Text>
      </ScrollView>
    </View>
  );
}

function makeStyles(t) {
  return StyleSheet.create({
    container: { flex: 1 },
    scroll:    { paddingTop: Platform.OS === "ios" ? 58 : 38, paddingHorizontal: 14, paddingBottom: 44 },

    header:      { alignItems: "center", marginBottom: 16 },
    settingsBtn: { position: "absolute", top: 0, right: 4, padding: 6, zIndex: 1 },
    settingsIcon:{ fontSize: 20 },
    headerTitle: { fontSize: 23, fontWeight: "800", color: t.textPrimary, fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", textAlign: "center" },
    locationRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
    locationPin: { fontSize: 13, marginRight: 4 },
    headerTime:  { fontSize: 11, color: t.textMuted, marginTop: 3 },

    card: { backgroundColor: t.card, borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: t.cardBorder },

    heroCard:  { flexDirection: "row", alignItems: "center", paddingVertical: 20, gap: 16 },
    heroRight: { flex: 1 },
    heroEmoji: { fontSize: 44, marginBottom: 4 },
    mainTitle: { fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
    mainSub:   { fontSize: 13, color: t.textSecondary, marginTop: 2 },
    tempRow:   { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 },
    tempText:  { fontSize: 30, fontWeight: "700", color: t.textPrimary },
    condBadge: { backgroundColor: t.track, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    condText:  { fontSize: 12, color: t.textSecondary },

    alertBanner:     { backgroundColor: t.alertBannerBg, borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: t.alertBannerBorder },
    alertBannerText: { color: t.alertBannerText, fontWeight: "700", fontSize: 14, textAlign: "center" },

    row:       { flexDirection: "row", gap: 6, marginBottom: 0 },
    miniCard:  { flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 6 },
    miniIcon:  { fontSize: 22, marginBottom: 3 },
    miniLabel: { fontSize: 9, color: t.textMuted, marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.5 },
    miniValue: { fontSize: 15, fontWeight: "800", color: t.textPrimary },
    miniSub:   { fontSize: 8, color: t.textMuted, textAlign: "center", marginTop: 2 },

    tamilRow:    { flexDirection: "row", alignItems: "flex-start" },
    tamilLabel:  { fontSize: 10, color: t.textMuted, marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 },
    tamilMsg:    { fontSize: 13, color: t.textPrimary, fontWeight: "600", lineHeight: 19 },
    speakBtn:    { marginTop: 11, backgroundColor: t.accentGreen, borderRadius: 12, paddingVertical: 10, alignItems: "center" },
    speakBtnTxt: { color: t.accentGreenText, fontWeight: "900", fontSize: 13 },

    sectionTitle: { fontSize: 14, fontWeight: "700", color: t.textPrimary, letterSpacing: 0.3 },

    hourCell:   { alignItems: "center", padding: 9, borderRadius: 13, marginRight: 7, minWidth: 62 },
    hourSafe:   { backgroundColor: t.hourSafeBg },
    hourWarn:   { backgroundColor: t.hourWarnBg },
    hourDanger: { backgroundColor: t.hourDangerBg },
    hourLabel:  { fontSize: 10, color: t.textSecondary, marginBottom: 3 },
    hourTemp:   { fontSize: 15, fontWeight: "700", color: t.textPrimary, marginTop: 2 },
    hourPop:    { fontSize: 10, color: t.textSecondary, marginTop: 3 },

    dailyRow:  { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: t.divider },
    dailyDay:  { width: 42, fontSize: 13, color: t.textPrimary, fontWeight: "600" },
    dailyPop:  { fontSize: 13, fontWeight: "700", width: 36, textAlign: "right" },
    dailyHigh: { width: 44, fontSize: 13, color: t.textSecondary, textAlign: "right" },

    refreshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: t.accentGreen, borderRadius: 18, paddingVertical: 16, marginBottom: 10, marginTop: 4 },
    refreshIcon: { fontSize: 18 },
    refreshTxt:  { color: t.accentGreenText, fontSize: 17, fontWeight: "900" },
    footer:     { textAlign: "center", color: t.textFaint, fontSize: 10, marginTop: 6 },
  });
}
