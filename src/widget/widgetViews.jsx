"use no memo";
// Native Android widget surfaces, rendered via react-native-android-widget's
// own primitives (FlexWidget/TextWidget map to Android RemoteViews — these are
// NOT plain react-native components and can't share code with src/app or
// src/components).
//
// The "use no memo" directive above is required: the app runs with the React
// Compiler enabled (app.json > experiments.reactCompiler), and the library
// calls these functions directly instead of rendering them through React, so
// compiler-injected memo hooks would blow up with "Invalid hook call".
//
// Colors are #RRGGBBAA — the library converts them to Android's #AARRGGBB.
import { FlexWidget, TextWidget } from "react-native-android-widget";

import { scoreLabel } from "../weather/score";
import { formatTemp } from "../weather/units";

const PALETTES = {
  dark: {
    bgGood: "#07422A", bgWarn: "#4A2E00", bgBad: "#420707",
    text: "#FFFFFF", textSecondary: "#FFFFFFB0", textMuted: "#FFFFFF73", textFaint: "#FFFFFF40",
    accents: ["#44DD88", "#88CC44", "#FFAA00", "#FF7744", "#FF4455"],
  },
  light: {
    bgGood: "#E1F2E8", bgWarn: "#FBEEDC", bgBad: "#FBE3E6",
    text: "#0B2E1C", textSecondary: "#0B2E1CB0", textMuted: "#0B2E1C8C", textFaint: "#0B2E1C59",
    accents: ["#12844A", "#4A8C1F", "#B36B00", "#C4522A", "#C22337"],
  },
};

// Maps a score onto the same five bands scoreLabel() uses, so the widget's
// background and accent stay in step with the in-app score ring.
function theme(score, scheme) {
  const p    = PALETTES[scheme] ?? PALETTES.dark;
  const band = score >= 75 ? 0 : score >= 55 ? 1 : score >= 35 ? 2 : score >= 15 ? 3 : 4;
  return {
    ...p,
    bg:     band <= 1 ? p.bgGood : band === 2 ? p.bgWarn : p.bgBad,
    accent: p.accents[band],
  };
}

function clock(iso) {
  const d = new Date(iso);
  return `${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

// ── Small widget (2×2) ────────────────────────────────────────────────────────
export function SmallDryingWidget({ data, settings, scheme = "dark" }) {
  const score = data?.score ?? 0;
  const sl    = scoreLabel(score);
  // Without data there is no score to colour by, so fall back to the calm band.
  const t     = theme(data ? score : 100, scheme);

  return (
    <FlexWidget
      style={{
        height: "match_parent", width: "match_parent",
        flexDirection: "column", alignItems: "center", justifyContent: "center",
        backgroundColor: t.bg, borderRadius: 20, padding: 10,
      }}
      clickAction="OPEN_APP"
      accessibilityLabel={data ? `Drying score ${score} out of 100, ${sl.text}` : "Open DryClothes"}
    >
      {data ? (
        <FlexWidget style={{ flexDirection: "column", alignItems: "center" }}>
          <TextWidget text={sl.emoji} style={{ fontSize: 20 }} />
          <TextWidget text={String(score)} style={{ fontSize: 34, fontWeight: "900", color: t.accent }} />
          <TextWidget text={sl.text} style={{ fontSize: 11, fontWeight: "700", color: t.accent, marginTop: 1 }} />
          <TextWidget
            text={data.city ?? ""}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 10, color: t.textMuted, marginTop: 6 }}
          />
          <TextWidget text={`🌧 ${data.rainChance ?? 0}%`} style={{ fontSize: 11, color: t.textSecondary, marginTop: 2 }} />
        </FlexWidget>
      ) : (
        <FlexWidget style={{ flexDirection: "column", alignItems: "center" }}>
          <TextWidget text="🧺" style={{ fontSize: 26 }} />
          <TextWidget text="Tap to set up" style={{ fontSize: 12, fontWeight: "700", color: t.text, marginTop: 6 }} />
          <TextWidget text="No weather cached yet" style={{ fontSize: 10, color: t.textMuted, marginTop: 2, textAlign: "center" }} />
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

// ── Medium widget (4×2) ───────────────────────────────────────────────────────
export function MediumDryingWidget({ data, settings, scheme = "dark" }) {
  const score = data?.score ?? 0;
  const sl    = scoreLabel(score);
  const t     = theme(data ? score : 100, scheme);

  if (!data) {
    return (
      <FlexWidget
        style={{
          height: "match_parent", width: "match_parent",
          flexDirection: "column", alignItems: "center", justifyContent: "center",
          backgroundColor: t.bg, borderRadius: 24, padding: 14,
        }}
        clickAction="OPEN_APP"
        accessibilityLabel="Open DryClothes"
      >
        <TextWidget text="🧺 DryClothes" style={{ fontSize: 15, fontWeight: "700", color: t.text }} />
        <TextWidget
          text="Open the app once to load your location's drying forecast."
          style={{ fontSize: 11, color: t.textMuted, marginTop: 4, textAlign: "center" }}
        />
      </FlexWidget>
    );
  }

  const rainColor = data.rainChance >= 60 ? t.accents[4] : data.rainChance >= 30 ? t.accents[2] : t.accents[0];

  return (
    <FlexWidget
      style={{
        height: "match_parent", width: "match_parent",
        flexDirection: "row", alignItems: "center",
        backgroundColor: t.bg, borderRadius: 24, padding: 14,
      }}
      clickAction="OPEN_APP"
      accessibilityLabel={`Drying score ${score} out of 100, ${sl.text} in ${data.city ?? "your location"}`}
    >
      <FlexWidget style={{ flexDirection: "column", alignItems: "center", width: 92 }}>
        <TextWidget text={sl.emoji} style={{ fontSize: 18 }} />
        <TextWidget text={String(score)} style={{ fontSize: 32, fontWeight: "900", color: t.accent }} />
        <TextWidget text={sl.text} style={{ fontSize: 11, fontWeight: "700", color: t.accent }} />
        <TextWidget text="Drying score" style={{ fontSize: 9, color: t.textFaint, marginTop: 1 }} />
      </FlexWidget>

      <FlexWidget style={{ flexDirection: "column", flex: 1, marginLeft: 12 }}>
        <FlexWidget style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "match_parent" }}>
          <TextWidget
            text={`📍 ${data.city ?? "Your location"}`}
            maxLines={1}
            truncate="END"
            style={{ fontSize: 12, fontWeight: "700", color: t.textSecondary }}
          />
          <TextWidget
            text="⟳"
            style={{ fontSize: 14, color: t.textMuted, paddingLeft: 8, paddingRight: 2, paddingTop: 2, paddingBottom: 2 }}
            clickAction="REFRESH"
            accessibilityLabel="Refresh drying score"
          />
        </FlexWidget>

        <TextWidget
          text={`${formatTemp(data.temp, settings?.tempUnit)}  ${data.conditionEmoji ?? ""} ${data.condition ?? ""}`.trim()}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 13, fontWeight: "700", color: t.text, marginTop: 4 }}
        />

        <TextWidget
          text={`🌧️ ${data.rainChance ?? 0}% rain chance`}
          style={{ fontSize: 12, fontWeight: "700", color: rainColor, marginTop: 6 }}
        />

        <TextWidget
          text={data.dryByIso ? `👕 Dry by ~${clock(data.dryByIso)}` : "👕 Not a drying window"}
          maxLines={1}
          truncate="END"
          style={{ fontSize: 11, color: t.textMuted, marginTop: 4 }}
        />

        <TextWidget
          text={data.updatedAt ? `Updated ${clock(data.updatedAt)}` : ""}
          style={{ fontSize: 9, color: t.textFaint, marginTop: 4 }}
        />
      </FlexWidget>
    </FlexWidget>
  );
}
