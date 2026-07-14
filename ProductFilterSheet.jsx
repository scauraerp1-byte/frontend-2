import { X, Filter, RotateCcw } from "lucide-react";
import { useModal } from "../hooks/useModal";

/**
 * Bottom sheet filter panel for Products (and other listings that opt-in).
 * Keeps the list clean by folding away all secondary controls behind a
 * single "Filter" trigger button.
 */
export default function ProductFilterSheet({
  open,
  onClose,
  onReset,
  groups = [],
}) {
  useModal(open);
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/70 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      data-testid="product-filter-sheet"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-lg bg-neutral-950 border border-white/10 rounded-t-3xl sm:rounded-3xl p-5 sm:p-6 max-h-[85vh] flex flex-col fade-up shadow-[0_-24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="inline-flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#ebd281]" />
            <div>
              <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">Refine</div>
              <div className="font-display text-lg">Filters</div>
            </div>
          </div>
          <button
            onClick={onClose}
            data-testid="filter-sheet-close"
            className="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/15"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {groups.map((g) => (
            <div key={g.key} data-testid={`filter-group-${g.key}`}>
              <div className="text-[10px] uppercase tracking-[0.28em] text-white/50 mb-2">{g.label}</div>
              <div className="flex flex-wrap gap-2">
                {g.options.map((o) => {
                  const active = String(g.value) === String(o.value);
                  return (
                    <button
                      key={String(o.value)}
                      data-testid={`filter-${g.key}-${o.value}`}
                      onClick={() => g.onChange?.(o.value)}
                      className={`px-3 py-1.5 rounded-full text-[11px] uppercase tracking-[0.18em] border transition ${
                        active
                          ? "bg-[#d4af37] text-black border-[#d4af37]"
                          : "bg-white/5 border-white/10 text-white/75 hover:bg-white/10"
                      }`}
                    >
                      {o.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="pt-5 mt-2 border-t border-white/10 flex items-center gap-2">
          {onReset && (
            <button
              onClick={() => { onReset?.(); }}
              data-testid="filter-sheet-reset"
              className="rounded-full bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset
            </button>
          )}
          <button
            onClick={onClose}
            data-testid="filter-sheet-apply"
            className="ml-auto btn-gold rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.25em]"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
