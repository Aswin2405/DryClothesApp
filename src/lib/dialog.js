// Cross-platform dialogs.
//
// react-native-web ships `Alert` as an empty stub:
//
//   class Alert { static alert() {} }
//
// so on web every Alert.alert() call silently does nothing — a confirmation
// dialog never appears, and the button that was waiting on it looks broken.
// These two helpers fall back to the browser's own dialogs there.
import { Alert, Platform } from "react-native";

const isWeb = Platform.OS === "web";

const joinText = (title, message) => [title, message].filter(Boolean).join("\n\n");

/**
 * Asks the user to confirm something. Resolves true if they confirmed, false if
 * they cancelled or dismissed it — so callers can always `await` it and branch,
 * rather than passing callbacks that never fire on web.
 */
export function confirm({ title, message, confirmLabel = "OK", cancelLabel = "Cancel", destructive = false }) {
  if (isWeb) {
    return Promise.resolve(Boolean(globalThis.confirm?.(joinText(title, message))));
  }

  return new Promise(resolve => {
    Alert.alert(
      title,
      message,
      [
        { text: cancelLabel, style: "cancel", onPress: () => resolve(false) },
        { text: confirmLabel, style: destructive ? "destructive" : "default", onPress: () => resolve(true) },
      ],
      // Android lets a tap outside dismiss the dialog; treat that as cancelling.
      { onDismiss: () => resolve(false) }
    );
  });
}

/** One-way message — nothing to decide, nothing to wait for. */
export function notify(title, message) {
  if (isWeb) {
    globalThis.alert?.(joinText(title, message));
    return;
  }
  Alert.alert(title, message);
}
