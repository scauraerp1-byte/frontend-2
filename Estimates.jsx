import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { Plus, X, Loader2, ScanLine, Download, Share2, Truck } from "lucide-react";
import { SizeQuantityEditor, initSizesForPreset } from "../components/SizeWidgets";
import QRScanner from "../components/QRScanner";
import ProductPicker from "../components/ProductPicker";
import FilterBar from "../components/FilterBar";
import { useBranding } from "../contexts/BrandingContext";
import { buildEstimatePDF, downloadPDF, sharePDF } from "../lib/pdf";
import { formatRupee } from "../lib/share";

export function EstimatesList() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState("");
  const navigate = useNavigate();
  const { branding } = useBranding();

  const load = () => {
    const params = {};
    if (status !== "All") params.status = status;
    if (search.trim()) params.q = search.trim();
    api.get("/estimates", { params }).then((r) => setItems(r.data));
  };
  useEffect(load, [status, search]);

  const cancel = async (e) => {
    if (!window.confirm(`Cancel estimate ${e.estimate_no}?`)) return;
    // Optimistic remove — revert if API fails.
    const prev = items;
    setItems((cur) => cur.filter((x) => x.id !== e.id));
    try {
      await api.delete(`/estimates/${e.id}`);
    } catch {
      setItems(prev);
    }
  };
  const confirmDispatch = async (e) => {
    setBusy(e.id);
    try {
      const fresh = await api.get(`/estimates/${e.id}`);
      navigate(`/dispatch/new`, { state: { estimate: fresh.data } });
    } finally { setBusy(""); }
  };
  const downloadPdf = async (e) => {
    setBusy(e.id);
    try {
      const doc = await buildEstimatePDF(e, branding);
      await downloadPDF(doc, `${e.estimate_no}.pdf`);
    } finally { setBusy(""); }
  };
  const sharePdf = async (e) => {
    setBusy(e.id);
    try {
      const doc = await buildEstimatePDF(e, branding);
      await sharePDF(doc, `${e.estimate_no}.pdf`, e.customer_phone);
    } finally { setBusy(""); }
  };

  return (
    <div className="space-y-5">
      <SectionTitle
        overline="Operations"
        title="Estimates / Draft Orders"
        action={
          <button onClick={() => navigate("/estimates/new")} data-testid="estimate-new" className="btn-gold rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Estimate
          </button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search estimate no, customer, phone…"
        filters={[
          {
            key: "status",
            label: "Status",
            value: status,
            onChange: setStatus,
            options: [
              { value: "All", label: "All" },
              { value: "active", label: "Active" },
              { value: "converted", label: "Converted" },
              { value: "expired", label: "Expired" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
        ]}
      />

      <div className="grid lg:grid-cols-2 gap-3">
        {items.length === 0 && <GlassCard className="lg:col-span-2 text-center py-10 text-white/50">No estimates.</GlassCard>}
        {items.map((e) => {
          const qty = (e.items || []).reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + b, 0), 0);
          return (
            <GlassCard key={e.id} data-testid={`estimate-card-${e.estimate_no}`} className="!p-5">
              <div className="flex items-start justify-between mb-2 gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">{e.estimate_no}</div>
                  <div className="font-display text-xl mt-0.5 truncate">{e.customer_name || "Walk-in"}</div>
                  <div className="text-xs text-white/50">{e.customer_phone || "—"}</div>
                </div>
                <Pill tone={e.status === "active" ? "gold" : e.status === "converted" ? "success" : e.status === "expired" ? "warning" : "danger"}>{e.status}</Pill>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {(e.items || []).slice(0, 4).map((it, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[11px]">{it.sr_number}</span>
                ))}
                {(e.items || []).length > 4 && <span className="text-[11px] text-white/40">+{e.items.length - 4} more</span>}
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
                <div className="rounded-lg bg-white/5 px-2 py-1.5"><div className="text-[9px] uppercase text-white/40">Pieces</div><div className="font-display">{qty}</div></div>
                <div className="rounded-lg bg-white/5 px-2 py-1.5"><div className="text-[9px] uppercase text-white/40">Grand</div><div className="font-display gold-text">{formatRupee(e.grand_total)}</div></div>
                <div className="rounded-lg bg-white/5 px-2 py-1.5"><div className="text-[9px] uppercase text-white/40">Remaining</div><div className="font-display">{formatRupee(e.remaining)}</div></div>
              </div>
              <div className="text-[10px] text-white/40 mt-2">{new Date(e.created_at).toLocaleString()}</div>
              <div className="flex flex-wrap gap-2 mt-3">
                {e.status === "active" && (
                  <>
                    <button data-testid={`estimate-confirm-${e.estimate_no}`} onClick={() => confirmDispatch(e)} disabled={busy === e.id} className="btn-gold rounded-full px-3 py-2 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5" /> Confirm Dispatch
                    </button>
                    <button onClick={() => navigate(`/estimates/${e.id}/edit`)} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10">Edit</button>
                  </>
                )}
                <button onClick={() => downloadPdf(e)} disabled={busy === e.id} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-1.5">
                  {busy === e.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5 text-[#ebd281]" />} PDF
                </button>
                <button onClick={() => sharePdf(e)} disabled={busy === e.id} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-1.5">
                  <Share2 className="w-3.5 h-3.5 text-[#ebd281]" /> Share
                </button>
                {e.status === "active" && (
                  <button onClick={() => cancel(e)} className="rounded-full bg-red-500/10 border border-red-500/30 text-red-200 px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-red-500/20">Cancel</button>
                )}
              </div>
            </GlassCard>
          );
        })}
      </div>
    </div>
  );
}

export function EstimateForm({ editMode = false }) {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [advance, setAdvance] = useState(0);
  const [delivery, setDelivery] = useState(0);
  const [notes, setNotes] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);
  const [sr, setSr] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const { branding } = useBranding();

  // edit mode load
  const editId = editMode ? window.location.pathname.split("/")[2] : null;
  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/customers").then((r) => setCustomers(r.data));
    if (editId) {
      api.get(`/estimates/${editId}`).then((r) => {
        const e = r.data;
        setCustomerId(e.customer_id || "");
        setCustomerName(e.customer_name || "");
        setCustomerPhone(e.customer_phone || "");
        setAdvance(e.advance_received || 0);
        setDelivery(e.delivery_charges || 0);
        setNotes(e.notes || "");
        Promise.all((e.items || []).map((it) => api.get(`/products/${it.product_id}`).then((rr) => ({ ...it, size_preset: rr.data.size_preset, image: it.image || rr.data.images?.[0] })))).then(setItems);
      });
    }
  }, [editId]);

  useEffect(() => {
    const c = customers.find((x) => x.id === customerId);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
    }
  }, [customerId, customers]);

  const itemTotal = useMemo(
    () => items.reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0) * Number(it.unit_price || 0), 0),
    [items]
  );
  const grandTotal = itemTotal + (Number(delivery) || 0);
  const remaining = Math.max(0, grandTotal - (Number(advance) || 0));

  const addProduct = (p) => {
    if (items.find((i) => i.product_id === p.id)) return;
    const sizes = initSizesForPreset(p.size_preset, 1);
    setItems((prev) => [
      ...prev,
      { product_id: p.id, sr_number: p.sr_number, title: p.title, size_preset: p.size_preset, sizes, unit_price: p.price, image: p.images?.[0] || "" },
    ]);
    setPickerOpen(false);
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

  const buildPayload = () => ({
    customer_id: customerId || null,
    customer_name: customerName,
    customer_phone: customerPhone,
    items: items.map((it) => ({
      product_id: it.product_id,
      sr_number: it.sr_number,
      title: it.title,
      sizes: Object.fromEntries(Object.entries(it.sizes || {}).filter(([, v]) => v > 0)),
      unit_price: Number(it.unit_price) || 0,
      image: it.image || "",
    })),
    advance_received: Number(advance) || 0,
    delivery_charges: Number(delivery) || 0,
    notes,
  });

  const save = async () => {
    setError("");
    if (items.length === 0) return setError("Add at least one product");
    const payload = buildPayload();
    if (payload.items.some((it) => Object.keys(it.sizes).length === 0))
      return setError("Each item needs at least one size with quantity");
    setBusy(true);
    try {
      if (editId) {
        await api.patch(`/estimates/${editId}`, payload);
      } else {
        await api.post("/estimates", payload);
      }
      navigate("/estimates");
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = products;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SectionTitle overline="Operations" title={editId ? "Edit Estimate" : "New Estimate / Draft Order"} />

      <GlassCard>
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block sm:col-span-2">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Saved customer (optional)</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="aura-input">
              <option value="">— Walk-in / Custom —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Customer name</span>
            <input data-testid="estimate-customer-name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} className="aura-input" placeholder="Walk-in customer" />
          </label>
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Phone</span>
            <input data-testid="estimate-customer-phone" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} className="aura-input" placeholder="+91 …" />
          </label>
        </div>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Items (no stock will be reduced)</div>
          <div className="flex gap-2">
            <button onClick={() => setScanOpen(true)} className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2">
              <ScanLine className="w-3.5 h-3.5 text-[#ebd281]" /> Scan
            </button>
            <button onClick={() => setPickerOpen(true)} data-testid="estimate-add-item" className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2">
              <Plus className="w-3.5 h-3.5" /> Add
            </button>
          </div>
        </div>
        <div className="flex gap-2 mb-3">
          <div className="flex-1 relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ebd281]" />
            <input
              data-testid="estimate-sr-input"
              value={sr}
              onChange={(e) => setSr(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), loadBySr())}
              placeholder="SCA-00001"
              className="aura-input pl-10 uppercase font-mono-receipt"
            />
          </div>
          <button onClick={loadBySr} className="btn-gold rounded-full px-5 py-3 text-xs uppercase tracking-[0.25em]">Add by SR</button>
        </div>
        {items.length === 0 && <div className="text-sm text-white/50 py-6 text-center">No items added.</div>}
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.product_id} className="rounded-2xl border border-white/10 p-4">
              <div className="flex items-start justify-between mb-2 gap-3">
                <div className="flex items-start gap-3 min-w-0 flex-1">
                  <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden flex-shrink-0 border border-white/10">
                    {it.image && <img src={it.image} alt="" className="w-full h-full object-cover" />}
                  </div>
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
              <SizeQuantityEditor preset={it.size_preset} value={it.sizes} onChange={(s) => setItemSizes(idx, s)} />
            </div>
          ))}
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle overline="Payment & Delivery" title="Summary" />
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Delivery Charges (₹)</span>
            <input data-testid="estimate-delivery" type="number" min={0} step="0.01" value={delivery} onChange={(e) => setDelivery(e.target.value)} className="aura-input" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Advance Received (₹)</span>
            <input data-testid="estimate-advance" type="number" min={0} step="0.01" value={advance} onChange={(e) => setAdvance(e.target.value)} className="aura-input" />
          </label>
          <label className="block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="aura-input" />
          </label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm mt-4">
          <div className="rounded-xl border border-white/10 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Item Total</div>
            <div className="font-display gold-text">{formatRupee(itemTotal)}</div>
          </div>
          <div className="rounded-xl border border-white/10 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Delivery</div>
            <div className="font-display">{formatRupee(delivery)}</div>
          </div>
          <div className="rounded-xl border border-white/10 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Grand Total</div>
            <div className="font-display">{formatRupee(grandTotal)}</div>
          </div>
          <div className="rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281]">Remaining</div>
            <div className="font-display gold-text">{formatRupee(remaining)}</div>
          </div>
        </div>
      </GlassCard>

      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}

      <div className="flex justify-end gap-3 flex-wrap">
        <button onClick={() => navigate(-1)} className="rounded-full glass px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white/10">Cancel</button>
        <button data-testid="estimate-submit" disabled={busy} onClick={save} className="btn-gold rounded-full px-8 py-3 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />} {editId ? "Save Changes" : "Save Estimate"}
        </button>
      </div>

      <QRScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />

      {pickerOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4">
          <div className="glass-strong w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl">Pick a product</h3>
              <button onClick={() => setPickerOpen(false)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input autoFocus placeholder="Search SR or name…" value={picQ} onChange={(e) => setPicQ(e.target.value)} className="aura-input pl-10" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filtered.map((p) => (
                <button key={p.id} onClick={() => addProduct(p)} className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-left transition">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">{p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}</div>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281]">{p.sr_number}</div>
                    <div className="text-sm truncate">{p.title}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-display gold-text">₹{p.price}</div>
                    <Pill>{p.size_preset}</Pill>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
