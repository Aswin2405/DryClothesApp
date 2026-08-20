import { useCallback, useRef } from "react";
import { Platform } from "react-native";

const GAP = 16; // breathing room kept around the focused field

// Keeps the focused TextInput on screen while typing.
//
// Pair it with a <KeyboardAvoidingView behavior="padding"> wrapper: that shrinks
// the scroll area to the space above the keyboard, and this hook scrolls the
// focused field into that space. Android needs an explicit `behavior` since
// edge-to-edge became mandatory (SDK 54+) — the window no longer resizes itself
// when the keyboard opens, so `behavior={undefined}` does nothing at all there
// and inputs simply end up underneath the keyboard.
export function useKeyboardAwareScroll() {
  const scrollRef  = useRef(null);
  const viewportH  = useRef(0);
  const offsetY    = useRef(0);
  const fields     = useRef({}); // key -> { y, height } within the scroll content
  const focusedKey = useRef(null);
  const pending    = useRef(null);

  // Scrolls the shortest distance that brings the focused field fully into the
  // visible area, so nothing jumps when it is already comfortably in view.
  const reveal = useCallback(() => {
    const f = fields.current[focusedKey.current];
    if (!f || !viewportH.current) return;

    const top    = offsetY.current;
    const bottom = top + viewportH.current;

    let y = null;
    if (f.y + f.height + GAP > bottom) y = f.y + f.height + GAP - viewportH.current;
    else if (f.y - GAP < top)          y = f.y - GAP;
    if (y === null) return;

    scrollRef.current?.scrollTo({ y: Math.max(y, 0), animated: true });
  }, []);

  const scrollProps = {
    keyboardShouldPersistTaps: "handled", // taps on results/buttons land on the first try
    keyboardDismissMode: Platform.OS === "ios" ? "interactive" : "on-drag",
    scrollEventThrottle: 16,
    onScroll: e => { offsetY.current = e.nativeEvent.contentOffset.y; },
    onLayout: e => {
      viewportH.current = e.nativeEvent.layout.height;
      // Fires again when KeyboardAvoidingView shrinks us for the keyboard —
      // exactly the moment the focused field needs re-revealing. Wait a frame
      // so the fields have reported their new positions first.
      if (pending.current != null) cancelAnimationFrame(pending.current);
      pending.current = requestAnimationFrame(reveal);
    },
  };

  // Spread onto a TextInput that is a direct child of the scroll content.
  const field = useCallback(key => ({
    onLayout: e => {
      const { y, height } = e.nativeEvent.layout;
      fields.current[key] = { y, height };
    },
    onFocus: () => {
      focusedKey.current = key;
      reveal(); // covers moving between fields while the keyboard is already up
    },
  }), [reveal]);

  return { scrollRef, scrollProps, field };
}
