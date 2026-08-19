"use no memo";
// Headless entry point for every Android widget event. Registered once from the
// app entry file (index.js); Android runs it with no UI and no React tree, so
// it may only touch storage/network, never contexts or hooks.
import { renderWidgetTree } from "./renderWidget";
import { getWidgetSnapshot } from "./widgetData";

export async function widgetTaskHandler({ widgetInfo, widgetAction, clickAction, renderWidget }) {
  const draw = (data, settings) => renderWidget(renderWidgetTree(widgetInfo.widgetName, data, settings));

  switch (widgetAction) {
    // WIDGET_ADDED has nothing on screen yet, so it draws whatever it gets —
    // including the empty state.
    case "WIDGET_ADDED": {
      const { data, settings } = await getWidgetSnapshot({ refresh: "stale" });
      draw(data, settings);
      break;
    }

    // WIDGET_UPDATE also fires on the plugin's updatePeriodMillis (30 min) and
    // after a reboot, which is what keeps the widget current on its own.
    case "WIDGET_UPDATE":
    case "WIDGET_RESIZED": {
      const { data, settings } = await getWidgetSnapshot({ refresh: "stale" });
      // A sleeping free-tier server answers nothing, and blanking a widget that
      // was showing a good reading is worse than letting it go stale. Redraw only
      // when there is something to redraw with.
      if (data || widgetAction === "WIDGET_RESIZED") draw(data, settings);
      break;
    }

    case "WIDGET_CLICK": {
      // Taps on the widget body use clickAction="OPEN_APP", handled natively —
      // only the refresh control reaches JS.
      if (clickAction !== "REFRESH") break;

      const cached = await getWidgetSnapshot();
      draw(cached.data, cached.settings); // keep the current reading on screen while fetching

      const fresh = await getWidgetSnapshot({ refresh: "force" });
      if (fresh.data) draw(fresh.data, fresh.settings);
      break;
    }

    case "WIDGET_DELETED":
    default:
      break;
  }
}
