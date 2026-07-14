import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { Plus, X, Search, Loader2, ScanLine, Download, Share2, RotateCcw } from "lucide-react";
import { SizeQuantityEditor } from "../components/SizeWidgets";
import QRScanner from "../components/QRScanner";
import { useBranding } from "../contexts/BrandingContext";
import { buildReturnPDF, downloadPDF, sharePDF } from "../lib/pdf";
import { formatRupee } from "../lib/share";
import FilterBar from "../components/FilterBar";

export function VendorReturnsList() {
  const [items, setItems] = useState([]);
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const navigate = useNavigate();
  const { branding } = useBranding();

  const load = () => {
    const params = {};
    if (search.trim()) params.q = search.trim();
    api.get("/vendor-returns", { params }).then((r) => setItems(r.data));
  };
  useEffect(load, [search]);

  const downloadPdf = async (r) => {
    setBusy(r.id);
    try { const doc = await buildReturnPDF(r, branding); await downloadPDF(doc, `${r.return_no}.pdf`); }
    finally { setBusy(""); }
  };
  const sharePdf = async (r) => {
    setBusy(r.id);
    try { const doc = await buildReturnPDF(r, branding); await sharePDF(doc, `${r.return_no}.pdf`); }
    finally { setBusy(""); }
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        overline="Operations"
        title="Vendor Returns"
        action={
          <button onClick={() => navigate("/vendor-returns/new")} data-testid="return-new" className="btn-gold rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Return
          </button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search return no, vendor…"
      />

      <div className="grid lg:grid-cols-2 gap-3">
        {items.length === 0 && <GlassCard className="lg:col-span-2 text-center py-10 text-white/50">No vendor returns yet.</GlassCard>}
        {items.map((r) => {
          const qty = r.items.reduce((s, it) => s + Object.values(it.sizes).reduce((a, b) => a + b, 0), 0);
          return (
            <GlassCard key={r.id} data-testid={`return-card-${r.return_no}`} className="!p-5">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">{r.return_no}</div>
                  <div className="font-display text-xl mt-0.5 truncate">{r.vendor_name}</div>
                  {r.reason && <div className="text-xs text-white/50">Reason: {r.reason}</div>}
                </div>
                <Pill tone="warning">Returned</Pill>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {r.items.slice(0, 5).map((it, i) => <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px]">{it.sr_number}</span>)}
                {r.items.length > 5 && <span className="text-[11px] text-white/40">+{r.items.length - 5} more</span>}
              </div>
              <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                <div className="rounded-lg bg-white/5 px-2 py-1.5"><div className="text-[9px] uppercase text-white/40">Pieces</div><div className="font-display">{qty}</div></div>
                <div className="rounded-lg bg-white/5 px-2 py-1.5"><div className="text-[9px] uppercase text-white/40">Item Total</div><div className="font-display gold-text">{formatRupee(r.item_total)}</div></div>
              </div>
              <div className="text-[10px] text-white/40 mt-2">{new Date(r.created_at).toLocaleString()} · by {r.created_by}</div>
              <div className="flex gap-2 mt-3 flex-wrap">
                <button onClick={() => downloadPdf(r)} disabled={busy === r.id} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-1.5">
                  {busy === r.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-[#ebd281]" />} PDF
                </button>
                <button onClick={() => sharePdf(r)} disabled={busy === r.id} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-[#ebd281]" /> Share
                </button>
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

export function VendorReturnForm() {
  const navigate = useNavigate();
  const [vendorName, setVendorName] = useState("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [sr, setSr] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { api.get("/products").then((r) => setProducts(r.data)); }, []);

  // Collect vendors from products for suggestions
  const vendors = useMemo(() => Array.from(new Set(products.map((p) => p.vendor_name || p.factory_name).filter(Boolean))), [products]);

  const addProduct = (p) => {
    if (items.find((i) => i.product_id === p.id)) return;
    const sizes = initSizesForPreset(p.size_preset, 1, p.stock_by_size);
    setItems((prev) => [
      ...prev,
      { product_id: p.id, sr_number: p.sr_number, title: p.title, size_preset: p.size_preset, sizes, unit_price: p.price, stock_by_size: p.stock_by_size, image: p.images?.[0] || "" },
    ]);
    setPickerOpen(false);
    if (!vendorName && (p.vendor_name || p.factory_name)) setVendorName(p.vendor_name || p.factory_name);
  };
  const onScan = async (code) => {
    setScanOpen(false);
    try { const { data } = await api.get(`/products/by-sr/${code}`); addProduct(data); }
    catch { setError(`No product with SR ${code}`); }
  };
  const loadBySr = async () => {
    if (!sr.trim()) return;
    try { const { data } = await api.get(`/products/by-sr/${sr.trim()}`); addProduct(data); setSr(""); }
    catch { setError(`No product with SR ${sr}`); }
  };
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));
  const setItemSizes = (idx, sizes) => setItems((p) => p.map((it, i) => (i === idx ? { ...it, sizes } : it)));
  const setUnitPrice = (idx, v) => setItems((p) => p.map((it, i) => (i === idx ? { ...it, unit_price: Math.max(0, Number(v) || 0) } : it)));

  const itemTotal = useMemo(() => items.reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0) * Number(it.unit_price || 0), 0), [items]);

  const submit = async () => {
    setError("");
    if (!vendorName.trim()) return setError("Vendor name is required");
    if (items.length === 0) return setError("Add at least one product");
    const cleaned = items.map((it) => ({
      product_id: it.product_id, sr_number: it.sr_number, title: it.title,
      sizes: Object.fromEntries(Object.entries(it.sizes || {}).filter(([, v]) => v > 0)),
      unit_price: Number(it.unit_price) || 0, image: it.image || "",
    }));
    if (cleaned.some((it) => Object.keys(it.sizes).length === 0))
      return setError("Each item needs at least one size with quantity");
    setBusy(true);
    try {
      await api.post("/vendor-returns", { vendor_name: vendorName, items: cleaned, reason, notes });
      navigate("/vendor-returns");
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally { setBusy(false); }
  };

  const filtered = products;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SectionTitle overline="Operations" title="New Vendor Return" />

      <GlassCard>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Vendor *</span>
            <input list="vendors-list" data-testid="return-vendor" value={vendorName} onChange={(e) => setVendorName(e.target.value)} className="aura-input" placeholder="Surat Mills" />
            <datalist id="vendors-list">{vendors.map((v) => <option key={v} value={v} />)}</datalist>
          </label>
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Reason</span>
            <input value={reason} onChange={(e) => setReason(e.target.value)} className="aura-input" placeholder="Defective / Wrong size / Damaged…" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="aura-input" />
          </label>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Items to return (stock will be reduced)</div>
          <div className="flex gap-2">
            <button onClick={() => setScanOpen(true)} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2"><ScanLine className="w-3.5 h-3.5 text-[#ebd281]" /> Scan</button>
            <button onClick={() => setPickerOpen(true)} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2"><Plus className="w-3.5 h-3.5" /> Add</button>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ebd281]" />
            <input data-testid="return-sr-input" value={sr} onChange={(e) => setSr(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), loadBySr())} placeholder="SCA-00001" className="aura-input pl-10 uppercase font-mono-receipt" />
          </div>
          <button onClick={loadBySr} className="btn-gold rounded-full px-5 py-3 text-xs uppercase tracking-[0.25em]">Add</button>
        </div>
        {items.length === 0 && <div className="text-sm text-white/50 py-6 text-center">No items added.</div>}
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.product_id} className="rounded-2xl border border-white/10 p-4">
              <div className="flex items-start justify-between mb-2 gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">{it.image && <img src={it.image} alt="" className="w-full h-full object-cover" />}</div>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281]">{it.sr_number}</div>
                    <div className="text-sm truncate">{it.title}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-[11px] text-white/50">₹</span>
                      <input type="number" min={0} step="0.01" value={it.unit_price} onChange={(e) => setUnitPrice(idx, e.target.value)} className="w-24 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs" />
                      <Pill>{it.size_preset}</Pill>
                    </div>
                  </div>
                </div>
                <button onClick={() => removeItem(idx)} className="text-white/40 hover:text-red-400"><X className="w-4 h-4" /></button>
              </div>
              <SizeQuantityEditor preset={it.size_preset} value={it.sizes} onChange={(s) => setItemSizes(idx, s)} max={it.stock_by_size} />
            </div>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-sm">
          <span className="text-white/60">Item Total</span>
          <span className="font-display gold-text">{formatRupee(itemTotal)}</span>
        </div>
      </GlassCard>

      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full glass px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white/10">Cancel</button>
        <button data-testid="return-submit" disabled={busy} onClick={submit} className="btn-gold rounded-full px-8 py-3 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} <RotateCcw className="w-4 h-4" /> Generate Return Receipt
        </button>
      </div>

      <QRScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />

      <ProductPicker
        open={pickerOpen}
        products={filtered}
        excludeIds={items.map((i) => i.product_id)}
        onClose={() => setPickerOpen(false)}
        onPick={addProduct}
        onScan={() => { setPickerOpen(false); setScanOpen(true); }}
        title="Add product to return"
      />
    </div>
  );
}
