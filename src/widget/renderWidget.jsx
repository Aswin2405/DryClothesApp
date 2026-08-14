"use no memo";
// Shared render mapping used by both the headless widget task handler and the
// in-app update path, so a widget looks identical however it got redrawn.
// Names must match the `widgets[].name` entries in app.json's
// react-native-android-widget plugin config.
import { MediumDryingWidget, SmallDryingWidget } from "./widgetViews";

export const WIDGET_NAMES = ["DryingScoreSmall", "DryingScoreMedium"];

const VIEWS = {
  DryingScoreSmall:  SmallDryingWidget,
  DryingScoreMedium: MediumDryingWidget,
};

// Returns the widget JSX for `widgetName`. On "system" theme both variants are
// handed to Android so it can swap them with the system light/dark mode without
// waking JS; an explicit in-app theme choice pins a single variant.
export function renderWidgetTree(widgetName, data, settings) {
  const View = VIEWS[widgetName] ?? SmallDryingWidget;

  if (settings?.theme === "light") return <View data={data} settings={settings} scheme="light" />;
  if (settings?.theme === "dark")  return <View data={data} settings={settings} scheme="dark" />;

  return {
    light: <View data={data} settings={settings} scheme="light" />,
    dark:  <View data={data} settings={settings} scheme="dark" />,
  };
}
