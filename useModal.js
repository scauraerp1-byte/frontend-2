import { useEffect } from "react";
import { pushModal, popModal, subscribeModal } from "../lib/modal-bus";
import { useState } from "react";

/**
 * Locks page scroll + registers a modal presence so the FAB auto-hides
 * while any overlay is on screen. Call from any component that renders
 * a fixed-position overlay: `useModal(open)`.
 */
export function useModal(open) {
  useEffect(() => {
    if (!open) return undefined;
    pushModal();
    return () => popModal();
  }, [open]);
}

/**
 * Subscribes to the global modal count. Returns true when at least one
 * modal / overlay is currently mounted.
 */
export function useAnyModalOpen() {
  const [any, setAny] = useState(false);
  useEffect(() => subscribeModal((c) => setAny(c > 0)), []);
  return any;
}
