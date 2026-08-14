// Custom entry point (package.json > main). It keeps expo-router's normal
// startup and additionally registers the Android home-screen widget task, which
// must be registered at bundle load: Android may start the JS runtime purely to
// draw a widget, with no app screen involved.
import "expo-router/entry";

import { registerWidgetTaskHandler } from "react-native-android-widget";

import { widgetTaskHandler } from "./src/widget/widgetTaskHandler";

registerWidgetTaskHandler(widgetTaskHandler);
