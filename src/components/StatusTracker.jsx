import { Pill } from "./Primitives";

const LABELS = {
  confirmed: "Confirmed",
  cancelled: "Cancelled",
  // Legacy mapping (shouldn't appear post-migration)
  pending: "Confirmed",
  processing: "Confirmed",
  partial: "Confirmed",
  fulfilled: "Confirmed",
  delivered: "Confirmed",
};

export const STATUS_TONES = {
  confirmed: "gold",
  cancelled: "danger",
};

export function StatusBadge({ status }) {
  return <Pill tone={STATUS_TONES[status] || "gold"}>{LABELS[status] || status}</Pill>;
}

export default function StatusTracker({ status, dispatched }) {
  if (status === "cancelled") {
    return (
      <div className="rounded-2xl bg-red-500/10 border border-red-500/30 px-4 py-3 text-sm text-red-200 inline-flex items-center gap-2">
        Booking cancelled
      </div>
    );
  }
  return (
    <div className="rounded-2xl bg-[#d4af37]/8 border border-[#d4af37]/30 px-4 py-3 text-sm text-[#ebd281] inline-flex items-center gap-3">
      <Pill tone="gold">Confirmed</Pill>
      {dispatched && <Pill tone="success">Dispatched</Pill>}
    </div>
  );
}
