// Pushes a redraw to every widget instance already on the home screen.
// Safe to call from anywhere: on iOS/web the library resolves to a no-op native
// module, and a missing widget just resolves without doing anything.
import { Platform } from "react-native";
import { requestWidgetUpdate } from "react-native-android-widget";

import { renderWidgetTree, WIDGET_NAMES } from "./renderWidget";
import { getWidgetSnapshot } from "./widgetData";

export async function updateWidgets() {
  if (Platform.OS !== "android") return;

  try {
    const { data, settings } = await getWidgetSnapshot();
    await Promise.all(
      WIDGET_NAMES.map(widgetName =>
        requestWidgetUpdate({
          widgetName,
          renderWidget: () => renderWidgetTree(widgetName, data, settings),
        }).catch(() => {})
      )
    );
  } catch {
    // widget refresh is best-effort — never let it break a weather fetch
  }
}
