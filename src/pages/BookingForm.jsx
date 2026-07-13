import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { SizeQuantityEditor } from "../components/SizeWidgets";
import { Plus, X, Search, Loader2, ScanLine } from "lucide-react";
import QRScanner from "../components/QRScanner";

/**
 * Unified booking form — handles BOTH create and edit (when /bookings/:id/edit).
 * - Auto-feeds size_preset, prices, image, title on product add
 * - Payments section: Item Total, Advance Received, Remaining
 * - Allows direct confirmation when full payment received
 * - QR scan to add product
 * - Multiple modifications supported in edit mode
 */
export default function BookingForm({ editMode = false }) {
  const navigate = useNavigate();
  const loc = useLocation();
  const { id: bookingId } = useParams();
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [customerId, setCustomerId] = useState(loc.state?.preselectCustomer?.id || "");
  const [productPicker, setProductPicker] = useState(false);
  const [productQuery, setProductQuery] = useState("");
  const [scanOpen, setScanOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [advance, setAdvance] = useState(0);
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // initial loads
  useEffect(() => {
    api.get("/customers").then((r) => setCustomers(r.data));
    api.get("/products").then((r) => setProducts(r.data));
  }, []);

  // edit mode — load existing booking
  useEffect(() => {
    if (!editMode || !bookingId) return;
    setLoading(true);
    api.get(`/bookings/${bookingId}`).then((r) => {
      const b = r.data;
      setCustomerId(b.customer_id || "");
      setAdvance(b.advance_received || 0);
      setNotes(b.notes || "");
      // Hydrate items with size_preset
      Promise.all(
        (b.items || []).map((it) => api.get(`/products/${it.product_id}`).then((rr) => ({ ...it, size_preset: rr.data.size_preset, image: it.image || rr.data.images?.[0] })))
      ).then((hydrated) => {
        setItems(hydrated);
        setLoading(false);
      }).catch(() => setLoading(false));
    });
  }, [editMode, bookingId]);

  // preselect product from state (only in create mode)
  useEffect(() => {
    if (!editMode && loc.state?.preselectProduct) addProduct(loc.state.preselectProduct);
    // eslint-disable-next-line
  }, []);

  const itemTotal = useMemo(
    () => items.reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0) * Number(it.unit_price || 0), 0),
    [items]
  );
  const remaining = Math.max(0, itemTotal - (Number(advance) || 0));
  const fullyPaid = (Number(advance) || 0) >= itemTotal && itemTotal > 0;

  const addProduct = (p) => {
    if (items.find((i) => i.product_id === p.id)) return;
    setItems((prev) => [
      ...prev,
      {
        product_id: p.id,
        sr_number: p.sr_number,
        title: p.title,
        size_preset: p.size_preset,
        sizes: {},
        unit_price: p.price,
        image: p.images?.[0] || "",
      },
    ]);
    setProductPicker(false);
    setProductQuery("");
  };

  const onScan = async (text) => {
    setScanOpen(false);
    try {
      const { data } = await api.get(`/products/by-sr/${text}`);
      addProduct(data);
    } catch {
      setError(`No product found with SR ${text}`);
    }
  };

  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const setItemSizes = (idx, sizes) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, sizes } : it)));
  const setUnitPrice = (idx, v) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unit_price: Math.max(0, Number(v) || 0) } : it)));

  const buildPayload = () => {
    const cleaned = items.map((it) => ({
      product_id: it.product_id,
      sr_number: it.sr_number,
      title: it.title,
      sizes: Object.fromEntries(Object.entries(it.sizes || {}).filter(([, v]) => v > 0)),
      unit_price: Number(it.unit_price) || 0,
      image: it.image || "",
    }));
    return {
      customer_id: customerId,
      items: cleaned,
      advance_received: Number(advance) || 0,
      notes,
    };
  };

  const submit = async () => {
    setError("");
    if (!customerId) return setError("Select a customer");
    if (items.length === 0) return setError("Add at least one product");
    const payload = buildPayload();
    if (payload.items.some((it) => Object.keys(it.sizes).length === 0))
      return setError("Each item needs at least one size with quantity");
    setBusy(true);
    try {
      if (editMode && bookingId) {
        await api.patch(`/bookings/${bookingId}`, payload);
        navigate(`/bookings/${bookingId}`);
      } else {
        const { data } = await api.post("/bookings", payload);
        navigate(`/bookings/${data.id}`);
      }
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const filtered = products.filter(
    (p) =>
      !productQuery ||
      p.title.toLowerCase().includes(productQuery.toLowerCase()) ||
      p.sr_number.toLowerCase().includes(productQuery.toLowerCase())
  );

  if (loading) return <div className="h-64 rounded-2xl shimmer" />;

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SectionTitle overline="Operations" title={editMode ? "Edit Booking" : "New Booking"} />

      <GlassCard>
        <label className="block">
          <span className="text-xs text-white/60 mb-1.5 inline-block">Customer</span>
          <select
            data-testid="booking-customer"
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="aura-input"
            disabled={editMode}
          >
            <option value="">— Select customer —</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}{c.shop_name ? ` · ${c.shop_name}` : ""} · {c.phone}
              </option>
            ))}
          </select>
          {editMode && <div className="text-[11px] text-white/40 mt-1">Customer cannot be changed after booking is created.</div>}
        </label>
      </GlassCard>

      <GlassCard>
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <div className="text-[10px] uppercase tracking-[0.3em] text-white/40">Items</div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setScanOpen(true)}
              data-testid="booking-scan-qr"
              className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2"
            >
              <ScanLine className="w-3.5 h-3.5 text-[#ebd281]" /> Scan
            </button>
            <button
              type="button"
              onClick={() => setProductPicker(true)}
              data-testid="booking-add-item"
              className="rounded-full glass px-3 py-2 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" /> Add product
            </button>
          </div>
        </div>
        {items.length === 0 && <div className="text-sm text-white/50 py-6 text-center">No items added.</div>}
        <div className="space-y-3">
          {items.map((it, idx) => (
            <div key={it.product_id} className="rounded-2xl border border-white/10 p-4" data-testid={`booking-item-${it.sr_number}`}>
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
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={it.unit_price}
                        onChange={(e) => setUnitPrice(idx, e.target.value)}
                        className="w-24 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs"
                        data-testid={`booking-price-${it.sr_number}`}
                      />
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
        <SectionTitle overline="Payment" title="Amount" />
        <div className="grid sm:grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Item Total</div>
            <div className="font-display text-2xl mt-1 gold-text">₹{itemTotal.toLocaleString("en-IN")}</div>
          </div>
          <label className="rounded-2xl border border-white/10 p-4 block">
            <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Advance Received</span>
            <input
              data-testid="booking-advance"
              type="number"
              min={0}
              step="0.01"
              value={advance}
              onChange={(e) => setAdvance(e.target.value)}
              className="w-full bg-transparent font-display text-2xl mt-1 text-white outline-none"
            />
          </label>
          <div className="rounded-2xl border border-white/10 p-4">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Remaining</div>
            <div className={`font-display text-2xl mt-1 ${remaining > 0 ? "text-amber-200" : "text-emerald-300"}`}>
              ₹{remaining.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
        {fullyPaid && (
          <div className="mt-3 text-[11px] text-emerald-300/90 uppercase tracking-[0.2em]">
            Full payment received — you can dispatch directly.
          </div>
        )}
        <label className="block mt-3">
          <span className="text-xs text-white/60 mb-1.5 inline-block">Notes</span>
          <input value={notes} onChange={(e) => setNotes(e.target.value)} className="aura-input" placeholder="Optional" />
        </label>
      </GlassCard>

      {error && (
        <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>
      )}

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full glass px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white/10">
          Cancel
        </button>
        <button data-testid="booking-submit" disabled={busy} onClick={submit} className="btn-gold rounded-full px-8 py-3 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {editMode ? "Save Changes" : "Create Booking"}
        </button>
      </div>

      <QRScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={onScan} />

      {productPicker && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm grid place-items-end sm:place-items-center p-0 sm:p-4">
          <div className="glass-strong w-full sm:max-w-xl rounded-t-3xl sm:rounded-3xl p-5 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-display text-xl">Pick a product</h3>
              <button onClick={() => setProductPicker(false)} className="text-white/50 hover:text-white"><X className="w-5 h-5" /></button>
            </div>
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input autoFocus placeholder="Search SR or name…" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} className="aura-input pl-10" />
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {filtered.map((p) => (
                <button
                  key={p.id}
                  onClick={() => addProduct(p)}
                  data-testid={`pick-product-${p.sr_number}`}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 text-left transition"
                >
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 flex-shrink-0">
                    {p.images?.[0] && <img src={p.images[0]} alt="" className="w-full h-full object-cover" />}
                  </div>
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
