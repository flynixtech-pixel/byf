"use client";

import { useEffect, useRef } from "react";

/**
 * Makes the device / browser Back button close an open overlay instead of
 * navigating away from the whole page.
 *
 * On mobile the vendor kept hitting the hardware Back button while a modal,
 * sheet or full-screen dial was open and getting thrown out of the page
 * entirely (their words: "back krte hi direct bahar a jaate h"). The fix is to
 * push one throwaway history entry when the overlay opens; the next Back press
 * pops that entry — which we catch here and turn into an `onDismiss()` call —
 * so the underlying page never moves.
 *
 * Usage:
 *   useBackDismiss(isOpen, onClose);
 *
 * `onDismiss` is kept in a ref internally, so you can pass an inline arrow
 * without re-subscribing on every render.
 */
export function useBackDismiss(active: boolean, onDismiss: () => void) {
  // Keep the latest callback in a ref so we never re-subscribe (which would push
  // a second history entry) yet never fire a stale closure either — important
  // when the handler depends on changing state (e.g. a multi-step wizard).
  const cb = useRef(onDismiss);
  useEffect(() => {
    cb.current = onDismiss;
  });

  useEffect(() => {
    if (!active || typeof window === "undefined") return;

    const id = Math.random().toString(36).substring(2, 11);
    window.history.pushState({ __byvOverlay: id }, "");

    let dismissed = false;
    const handlePop = () => {
      if (dismissed) return;
      dismissed = true;
      cb.current();
    };
    window.addEventListener("popstate", handlePop);

    return () => {
      window.removeEventListener("popstate", handlePop);
      if (!dismissed) {
        // Defer checking to allow any synchronous remounts (Strict Mode / Fast Refresh) to complete
        setTimeout(() => {
          const currentState = window.history.state as { __byvOverlay?: string } | null;
          if (currentState && currentState.__byvOverlay === id) {
            window.history.back();
          }
        }, 50);
      }
    };
  }, [active]);
}
