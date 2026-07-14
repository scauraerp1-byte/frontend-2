import { useEffect, useMemo, useState } from "react";
import { Search, X, ScanLine, ArrowLeft, Package } from "lucide-react";
import { Pill } from "./Primitives";
import { formatRupee } from "../lib/share";
import { useModal } from "../hooks/useModal";

/**
 * Reusable full-screen product picker used across Booking, Estimate, Dispatch
 * and Vendor Return forms. Presents a searchable grid with product image,
 * SR number, price, stock, category and size preset. Locks scroll + hides
 * the global FAB while open.
 */
export default function ProductPicker({
  open,
  products = [],
  excludeIds = [],
  onClose,
  onPick,
  onScan,
  title = "Pick a product",
  emptyText = "No matching products.",
}) {
  const [q, setQ] = useState("");

  useModal(open);
  useEffect(() => { if (open) setQ(""); }, [open]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return products.filter((p) => {
      if (excludeIds.includes(p.id)) return false;
      if (!needle) return true;
      return (
        p.title?.toLowerCase().includes(needle) ||
        p.sr_number?.toLowerCase().includes(needle) ||
        p.category?.toLowerCase().includes(needle)
      );
    });
  }, [products, q, excludeIds]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md fade-up flex flex-col"
      data-testid="product-picker"
      role="dialog"
      aria-modal="true"
    >
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-black/70">
        <button
          onClick={onClose}
          data-testid="product-picker-back"
          className="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/15 transition"
          aria-label="Back"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">Inventory</div>
          <div className="font-display text-lg truncate">{title}</div>
        </div>
        {onScan && (
          <button
            onClick={onScan}
            data-testid="product-picker-scan"
            className="hidden sm:inline-flex rounded-full bg-white/5 hover:bg-white/15 px-3 py-2 text-xs uppercase tracking-[0.2em] items-center gap-2"
          >
            <ScanLine className="w-3.5 h-3.5 text-[#ebd281]" /> Scan
          </button>
        )}
        <button
          onClick={onClose}
          data-testid="product-picker-close"
          className="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/15 transition"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 sm:px-6 pt-4 pb-2">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            autoFocus
            data-testid="product-picker-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by SR, name or category…"
            className="aura-input pl-10"
          />
          {q && (
            <button
              onClick={() => setQ("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
              aria-label="Clear"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="mt-2 text-[10px] uppercase tracking-[0.25em] text-white/40">
          {filtered.length} result{filtered.length !== 1 ? "s" : ""}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 sm:px-6 pb-8">
        {filtered.length === 0 ? (
          <div className="glass rounded-3xl p-10 text-center">
            <Package className="w-8 h-8 mx-auto text-white/30 mb-2" />
            <div className="text-sm text-white/60">{emptyText}</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
            {filtered.map((p) => {
              const stock = Number(p.quantity || 0);
              const stockTone = stock <= 10 ? "danger" : stock <= 25 ? "warning" : "gold";
              return (
                <button
                  key={p.id}
                  data-testid={`picker-product-${p.sr_number}`}
                  onClick={() => onPick?.(p)}
                  className="text-left glass rounded-2xl overflow-hidden hover:bg-white/[0.08] transition flex flex-col"
                >
                  <div className="aspect-[3/4] bg-white/5 relative overflow-hidden">
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full grid place-items-center text-white/25 text-xs">No image</div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Pill tone="default">{p.category}</Pill>
                    </div>
                    <div className="absolute top-2 right-2">
                      <Pill tone={stockTone}>{stock} pcs</Pill>
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281]">{p.sr_number}</div>
                    <div className="text-sm mt-0.5 truncate">{p.title}</div>
                    <div className="flex items-center justify-between mt-1.5">
                      <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">{p.size_preset}</span>
                      <span className="font-display text-base gold-text">{formatRupee(p.price)}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
