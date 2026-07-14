/**
 * Global modal presence tracker.
 * Any full-screen overlay (modal / drawer / bottom-sheet / notification panel)
 * registers itself when opened so:
 *   1. background scroll is locked while any overlay is up
 *   2. the FloatingFAB hides so it never overlaps modals
 */

let count = 0;
const listeners = new Set();

function apply() {
  if (typeof document === "undefined") return;
  if (count > 0) {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  } else {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  }
  listeners.forEach((fn) => {
    try {
      fn(count);
    } catch {
      // ignore listener errors
    }
  });
}

export function pushModal() {
  count += 1;
  apply();
}

export function popModal() {
  count = Math.max(0, count - 1);
  apply();
}

export function subscribeModal(fn) {
  listeners.add(fn);
  fn(count);
  return () => listeners.delete(fn);
}

export function isAnyModalOpen() {
  return count > 0;
}
