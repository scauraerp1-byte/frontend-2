import { Filter, X } from "lucide-react";

/**
 * Universal FilterBar — renders a horizontally scrollable bar of chip filters
 * plus an optional search input. Use across all listing screens.
 *
 * filters: [{ key, label, options: [{value, label}], value, onChange }]
 */
export default function FilterBar({ filters = [], search, onSearchChange, searchPlaceholder = "Search…", onReset, rightSlot }) {
  return (
    <div className="flex flex-col gap-3">
      {search !== undefined && (
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/40" />
            <input
              data-testid="filter-search"
              value={search}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder={searchPlaceholder}
              className="aura-input pl-9"
            />
            {search && (
              <button
                onClick={() => onSearchChange?.("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          {rightSlot}
        </div>
      )}
      {filters.length > 0 && (
        <div className="flex flex-wrap gap-2 items-center">
          {filters.map((f) => (
            <div key={f.key} className="inline-flex items-center gap-1 overflow-x-auto scroll-hide">
              {f.options.map((o) => {
                const active = String(f.value) === String(o.value);
                return (
                  <button
                    key={String(o.value)}
                    data-testid={`filter-${f.key}-${o.value}`}
                    onClick={() => f.onChange(o.value)}
                    className={`px-3 py-1.5 rounded-full text-[10px] uppercase tracking-[0.18em] border whitespace-nowrap transition ${
                      active
                        ? "bg-[#d4af37] text-black border-[#d4af37]"
                        : "bg-white/5 border-white/10 text-white/70 hover:bg-white/10"
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          ))}
          {onReset && (
            <button
              data-testid="filter-reset"
              onClick={onReset}
              className="ml-auto text-[10px] uppercase tracking-[0.2em] text-white/50 hover:text-white"
            >
              Reset
            </button>
          )}
        </div>
      )}
    </div>
  );
}
