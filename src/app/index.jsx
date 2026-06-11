import { useEffect, useRef } from "react";
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

import { AlertCard } from "../components/AlertCard";
import { AnimatedBackground } from "../components/AnimatedBackground";
import { BounceCard } from "../components/BounceCard";
import { ErrorScreen, LoadingScreen, LocationPermScreen } from "../components/LoadingScreens";
import { RainBar } from "../components/RainBar";
import { ScoreRing } from "../components/ScoreRing";
import { useWeather } from "../hooks/useWeather";
import { ALERT_LEAD_MINUTES } from "../weather/constants";
import { buildTamilMessage, decodeWMO, getRainRisk, getSunLabel, getWindLabel } from "../weather/score";

export default function App() {
  const {
    phase, city, weather, lastUpdated, errorMsg,
    alertEnabled, nextAlert, alertLoading,
    init, refresh, toggleAlert, speakTamil,
  } = useWeather();

  const spinAnim    = useRef(new Animated.Value(0)).current;
  const headerScale = useRef(new Animated.Value(0)).current;

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

  const statusConfig = isNight
    ? { emoji: "🌙", title: "Sun Has Set!", subtitle: "Bring your clothes inside", color: "#a78bfa" }
    : {
        safe:    { emoji: "✅", title: "Safe to Dry!",     subtitle: "Great drying conditions", color: "#44dd88" },
        warning: { emoji: "⚠️", title: "Be Careful",       subtitle: "Rain possible later",      color: "#ffaa00" },
        danger:  { emoji: "🚫", title: "Don't Dry Today!", subtitle: "Rain coming your way",      color: "#ff4455" },
      }[risk];

  return (
    <View style={S.container}>
      <StatusBar barStyle="light-content" />
      <AnimatedBackground />

      <ScrollView contentContainerStyle={S.scroll} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View style={[S.header, { transform: [{ scale: headerScale }] }]}>
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
              <Text style={S.tempText}>{weather.temp}°C</Text>
              <View style={S.condBadge}><Text style={S.condText}>{weather.condition}</Text></View>
            </View>
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
            <Text style={[S.miniValue, { color: risk === "safe" ? "#44dd88" : risk === "warning" ? "#ffaa00" : "#ff4455" }]}>
              {weather.rainChance}%
            </Text>
            <RainBar pop={weather.rainChance} />
          </BounceCard>

          <BounceCard delay={210} style={[S.card, S.miniCard]}>
            <Text style={S.miniIcon}>💧</Text>
            <Text style={S.miniLabel}>Humidity</Text>
            <Text style={[S.miniValue, { color: weather.humidity > 70 ? "#ff7744" : weather.humidity > 50 ? "#ffaa00" : "#44dd88" }]}>
              {weather.humidity}%
            </Text>
            <RainBar pop={weather.humidity} />
          </BounceCard>

          <BounceCard delay={240} style={[S.card, S.miniCard]}>
            <Text style={S.miniIcon}>{wind.icon}</Text>
            <Text style={S.miniLabel}>Wind</Text>
            <Text style={S.miniValue}>{weather.wind} km/h</Text>
            <Text style={S.miniSub} numberOfLines={2}>{wind.label}</Text>
          </BounceCard>

          <BounceCard delay={270} style={[S.card, S.miniCard]}>
            <Text style={S.miniIcon}>{sun.icon}</Text>
            <Text style={S.miniLabel}>UV</Text>
            <Text style={S.miniValue}>{weather.uvi != null ? weather.uvi : "—"}</Text>
            <Text style={S.miniSub} numberOfLines={2}>{sun.label}</Text>
          </BounceCard>
        </View>

        {/* Smart alert toggle */}
        <BounceCard delay={310}>
          <AlertCard
            alertEnabled={alertEnabled}
            onToggle={toggleAlert}
            nextAlert={nextAlert}
            loading={alertLoading}
          />
        </BounceCard>

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
                <Text style={S.hourTemp}>{h.temp}°</Text>
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
              <Text style={[S.dailyPop, { color: d.pop >= 60 ? "#ff4455" : d.pop >= 30 ? "#ffaa00" : "#44dd88" }]}>{d.pop}%</Text>
              <Text style={S.dailyHigh}>{d.high}°C</Text>
            </View>
          ))}
        </BounceCard>

        {/* Refresh */}
        <TouchableOpacity style={S.refreshBtn} onPress={refresh} activeOpacity={0.75} disabled={phase === "loading"}>
          {phase === "loading"
            ? <ActivityIndicator color="#07422A" size="small" />
            : <>
                <Text style={S.refreshIcon}>🔄</Text>
                <Text style={S.refreshTxt}>Refresh Weather</Text>
              </>
          }
        </TouchableOpacity>

        <Text style={S.footer}>
          📍 {city} • Open-Meteo & OpenStreetMap • Alerts fire {ALERT_LEAD_MINUTES} min early
        </Text>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  scroll:    { paddingTop: Platform.OS === "ios" ? 58 : 38, paddingHorizontal: 14, paddingBottom: 44 },

  header:      { alignItems: "center", marginBottom: 16 },
  headerTitle: { fontSize: 23, fontWeight: "800", color: "#fff", fontFamily: Platform.OS === "ios" ? "Georgia" : "serif", textAlign: "center" },
  locationRow: { flexDirection: "row", alignItems: "center", marginTop: 6 },
  locationPin: { fontSize: 13, marginRight: 4 },
  headerTime:  { fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 3 },

  card: { backgroundColor: "rgba(255,255,255,0.07)", borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.10)" },

  heroCard:  { flexDirection: "row", alignItems: "center", paddingVertical: 20, gap: 16 },
  heroRight: { flex: 1 },
  heroEmoji: { fontSize: 44, marginBottom: 4 },
  mainTitle: { fontSize: 22, fontWeight: "900", letterSpacing: 0.3 },
  mainSub:   { fontSize: 13, color: "rgba(255,255,255,0.6)", marginTop: 2 },
  tempRow:   { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 },
  tempText:  { fontSize: 30, fontWeight: "700", color: "#fff" },
  condBadge: { backgroundColor: "rgba(255,255,255,0.12)", borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  condText:  { fontSize: 12, color: "rgba(255,255,255,0.72)" },

  alertBanner:     { backgroundColor: "rgba(255,165,0,0.18)", borderRadius: 14, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#ffaa0088" },
  alertBannerText: { color: "#ffcc44", fontWeight: "700", fontSize: 14, textAlign: "center" },

  row:       { flexDirection: "row", gap: 6, marginBottom: 0 },
  miniCard:  { flex: 1, alignItems: "center", paddingVertical: 12, paddingHorizontal: 6 },
  miniIcon:  { fontSize: 22, marginBottom: 3 },
  miniLabel: { fontSize: 9, color: "rgba(255,255,255,0.5)", marginBottom: 1, textTransform: "uppercase", letterSpacing: 0.5 },
  miniValue: { fontSize: 15, fontWeight: "800", color: "#fff" },
  miniSub:   { fontSize: 8, color: "rgba(255,255,255,0.4)", textAlign: "center", marginTop: 2 },

  tamilRow:    { flexDirection: "row", alignItems: "flex-start" },
  tamilLabel:  { fontSize: 10, color: "rgba(255,255,255,0.45)", marginBottom: 3, textTransform: "uppercase", letterSpacing: 0.5 },
  tamilMsg:    { fontSize: 13, color: "#fff", fontWeight: "600", lineHeight: 19 },
  speakBtn:    { marginTop: 11, backgroundColor: "#44dd88", borderRadius: 12, paddingVertical: 10, alignItems: "center" },
  speakBtnTxt: { color: "#07422A", fontWeight: "900", fontSize: 13 },

  sectionTitle: { fontSize: 14, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },

  hourCell:   { alignItems: "center", padding: 9, borderRadius: 13, marginRight: 7, minWidth: 62 },
  hourSafe:   { backgroundColor: "rgba(68,221,136,0.14)" },
  hourWarn:   { backgroundColor: "rgba(255,170,0,0.18)" },
  hourDanger: { backgroundColor: "rgba(255,68,85,0.20)" },
  hourLabel:  { fontSize: 10, color: "rgba(255,255,255,0.55)", marginBottom: 3 },
  hourTemp:   { fontSize: 15, fontWeight: "700", color: "#fff", marginTop: 2 },
  hourPop:    { fontSize: 10, color: "rgba(255,255,255,0.65)", marginTop: 3 },

  dailyRow:  { flexDirection: "row", alignItems: "center", paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.05)" },
  dailyDay:  { width: 42, fontSize: 13, color: "#fff", fontWeight: "600" },
  dailyPop:  { fontSize: 13, fontWeight: "700", width: 36, textAlign: "right" },
  dailyHigh: { width: 44, fontSize: 13, color: "rgba(255,255,255,0.6)", textAlign: "right" },

  refreshBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: "#44dd88", borderRadius: 18, paddingVertical: 16, marginBottom: 10, marginTop: 4 },
  refreshIcon: { fontSize: 18 },
  refreshTxt:  { color: "#07422A", fontSize: 17, fontWeight: "900" },
  footer:     { textAlign: "center", color: "rgba(255,255,255,0.22)", fontSize: 10, marginTop: 6 },
});
