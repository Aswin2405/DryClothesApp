import { useEffect, useRef } from "react";
import * as SplashScreen from "expo-splash-screen";

import { useBackendContext } from "../context/BackendContext";
import { confirm } from "../lib/dialog";
import { BackendUnreachableScreen, WakingScreen } from "./BackendScreens";

// After this long the wait stops being reassuring and starts being a trap, so
// offer a way past it.
const SKIP_AFTER_SEC = 20;

// Holds the rest of the tree back until the API answers, so the providers below
// don't fire a round of requests into a server that is still booting and then
// settle on defaults for the whole session.
export function BackendGate({ children }) {
  const { status, elapsedSec, retry, skip } = useBackendContext();
  const alerted = useRef(false);

  // Only take the splash down for screens we own. On the fast path the splash
  // stays up and index.jsx hides it once there is weather to show — which is
  // what keeps a warm start free of any intermediate loader.
  useEffect(() => {
    if (status === "waking" || status === "unreachable") {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [status]);

  useEffect(() => {
    if (status !== "unreachable" || alerted.current) return;
    alerted.current = true;

    confirm({
      title: "Server not responding",
      message: "Your saved settings and locations couldn't be loaded. You can keep using the app — the forecast still works — but nothing will be saved.",
      confirmLabel: "Try again",
      cancelLabel: "Continue anyway",
    }).then(tryAgain => {
      if (tryAgain) {
        alerted.current = false;
        retry();
      } else {
        skip();
      }
    });
  }, [status, retry, skip]);

  if (status === "checking") return null; // native splash is still covering this
  if (status === "waking") {
    return <WakingScreen elapsedSec={elapsedSec} onSkip={skip} showSkip={elapsedSec >= SKIP_AFTER_SEC} />;
  }
  if (status === "unreachable") {
    return <BackendUnreachableScreen onRetry={() => { alerted.current = false; retry(); }} onSkip={skip} />;
  }

  return children;
}
