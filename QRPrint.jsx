import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { ArrowLeft, Printer, Loader2, CheckSquare, Square } from "lucide-react";
import { formatRupee } from "../lib/share";
import { useBranding } from "../contexts/BrandingContext";

/**
 * Bulk QR label printing — A4-ready.
 * Layout: 4 columns × 8 rows = 32 labels per page (55mm × 34mm each).
 * User selects products, then hits Print. Cut lines are printed too.
 */
export default function QRPrint() {
  const navigate = useNavigate();
  const { branding } = useBranding();
  const [products, setProducts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [q, setQ] = useState("");
  const [qrs, setQrs] = useState({});
  const [loadingQr, setLoadingQr] = useState(false);

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
  }, []);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return products.filter(
      (p) => !n || p.title?.toLowerCase().includes(n) || p.sr_number?.toLowerCase().includes(n)
    );
  }, [products, q]);

  const toggle = (id) =>
    setSelected((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const allVisibleSelected = filtered.length > 0 && filtered.every((p) => selected.has(p.id));
  const toggleAll = () => {
    setSelected((s) => {
      const next = new Set(s);
      if (allVisibleSelected) filtered.forEach((p) => next.delete(p.id));
      else filtered.forEach((p) => next.add(p.id));
      return next;
    });
  };

  const ensureQrs = async (ids) => {
    const missing = ids.filter((id) => !qrs[id]);
    if (missing.length === 0) return;
    setLoadingQr(true);
    try {
      const results = await Promise.all(
        missing.map((id) => api.get(`/products/${id}/qr`).then((r) => [id, r.data]).catch(() => [id, null]))
      );
      setQrs((prev) => {
        const next = { ...prev };
        results.forEach(([id, data]) => { if (data) next[id] = data; });
        return next;
      });
    } finally {
      setLoadingQr(false);
    }
  };

  const chosenProducts = products.filter((p) => selected.has(p.id));

  const openPrint = async () => {
    if (chosenProducts.length === 0) return;
    await ensureQrs(chosenProducts.map((p) => p.id));
    const brandName = branding?.company_name || "SC Aura Kurtis";
    const html = `<!DOCTYPE html>
<html><head><title>QR Labels — ${brandName}</title><meta charset="utf-8" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { background: #fff; color: #000; font-family: 'Helvetica Neue', Arial, sans-serif; }
  @page { size: A4; margin: 8mm; }
  .sheet { display: grid; grid-template-columns: repeat(4, 1fr); gap: 3mm; }
  .label {
    border: 1px dashed #999;
    padding: 4mm 3mm;
    border-radius: 4px;
    text-align: center;
    break-inside: avoid;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    min-height: 34mm;
  }
  .brand { font-size: 6pt; letter-spacing: 2px; text-transform: uppercase; color: #7a5f0e; margin-bottom: 1mm; }
  img.qr { width: 22mm; height: 22mm; display: block; margin: 0 auto 1mm; }
  .sr { font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 8pt; font-weight: 700; letter-spacing: 1px; }
  .title { font-size: 7pt; margin-top: 0.5mm; line-height: 1.2; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
  .meta { font-size: 6.5pt; color: #444; margin-top: 0.5mm; }
  .price { font-size: 8.5pt; font-weight: 700; color: #7a5f0e; margin-top: 0.5mm; }
  .toolbar { position: fixed; top: 0; left: 0; right: 0; padding: 10px 16px; background: #111; color: #fff; display: flex; align-items: center; justify-content: space-between; z-index: 999; }
  .toolbar button { background: #d4af37; color: #000; padding: 8px 20px; border: 0; border-radius: 999px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px; font-size: 10px; cursor: pointer; }
  .toolbar .count { font-size: 12px; opacity: .8; letter-spacing: 1px; }
  main.print-area { margin-top: 56px; padding: 16px; }
  @media print {
    .toolbar { display: none; }
    main.print-area { margin: 0; padding: 0; }
    .label { border: 1px dashed #666; }
  }
</style>
</head><body>
  <div class="toolbar">
    <div class="count">${brandName} · ${chosenProducts.length} labels · A4</div>
    <button onclick="window.print()">Print</button>
  </div>
  <main class="print-area">
    <div class="sheet">
      ${chosenProducts.map((p) => {
        const qr = qrs[p.id];
        return `<div class="label">
          <div class="brand">${brandName}</div>
          ${qr?.qr_data_url ? `<img class="qr" src="${qr.qr_data_url}" alt="qr" />` : `<div class="qr" style="border:1px solid #ccc;"></div>`}
          <div class="sr">${p.sr_number}</div>
          <div class="title">${(p.title || "").replace(/</g, "&lt;")}</div>
          <div class="meta">${p.category || ""} · ${p.size_preset || ""}</div>
          <div class="price">${formatRupee(p.price || 0)}</div>
        </div>`;
      }).join("\n")}
    </div>
  </main>
  <script>window.onload = function(){ setTimeout(function(){ try{ window.print(); }catch(e){} }, 300); };</script>
</body></html>`;
    const win = window.open("", "_blank", "width=900,height=1100");
    if (!win) { window.alert("Please allow pop-ups to open the print preview."); return; }
    win.document.write(html);
    win.document.close();
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto">
      <button
        onClick={() => navigate(-1)}
        className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <SectionTitle
        overline="Inventory · Labels"
        title="Bulk QR Print (A4)"
        action={
          <button
            data-testid="qr-print-open"
            onClick={openPrint}
            disabled={selected.size === 0 || loadingQr}
            className="btn-gold rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2 disabled:opacity-50"
          >
            {loadingQr ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
            Print {selected.size > 0 ? `(${selected.size})` : ""}
          </button>
        }
      />

      <GlassCard className="p-4 sm:p-5">
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
          <input
            data-testid="qr-print-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by SR or product name…"
            className="aura-input flex-1"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={toggleAll}
              data-testid="qr-print-toggle-all"
              className="rounded-full bg-white/5 hover:bg-white/10 px-4 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2"
            >
              {allVisibleSelected ? <CheckSquare className="w-4 h-4 text-[#ebd281]" /> : <Square className="w-4 h-4 text-white/60" />}
              {allVisibleSelected ? "Unselect visible" : "Select visible"}
            </button>
            <Pill tone="gold">{selected.size} selected</Pill>
          </div>
        </div>
      </GlassCard>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {filtered.map((p) => {
          const active = selected.has(p.id);
          return (
            <button
              key={p.id}
              onClick={() => toggle(p.id)}
              data-testid={`qr-print-item-${p.sr_number}`}
              className={`glass rounded-2xl overflow-hidden text-left transition ${
                active ? "ring-2 ring-[#d4af37] bg-[#d4af37]/[0.08]" : "hover:bg-white/[0.06]"
              }`}
            >
              <div className="aspect-[3/4] bg-white/5 relative">
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full grid place-items-center text-white/25 text-xs">No image</div>
                )}
                <div className={`absolute top-2 right-2 w-6 h-6 rounded-full grid place-items-center border ${
                  active ? "bg-[#d4af37] text-black border-[#d4af37]" : "bg-black/60 border-white/20 text-white/50"
                }`}>
                  {active ? "✓" : ""}
                </div>
              </div>
              <div className="p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281]">{p.sr_number}</div>
                <div className="text-sm mt-0.5 truncate">{p.title}</div>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-white/50">{p.size_preset}</span>
                  <span className="font-display text-sm gold-text">{formatRupee(p.price)}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <GlassCard className="text-center py-12">
          <div className="text-sm text-white/60">No products found.</div>
        </GlassCard>
      )}
    </div>
  );
}
