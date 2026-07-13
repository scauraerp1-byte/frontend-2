import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, SectionTitle, Pill } from "../components/Primitives";
import { SizeQuantityEditor, PRESETS } from "../components/SizeWidgets";
import { ScanLine, Search, X, Loader2, Plus, CheckCircle2 } from "lucide-react";
import QRScanner from "../components/QRScanner";

/**
 * Unified Dispatch form — works in 3 modes:
 *  1) Direct store sale (no booking, no customer required)
 *  2) From a booking (loc.state.booking)
 *  3) From an estimate (loc.state.estimate) — confirmDispatch flow
 *
 * Flow: pick products → set sizes/prices → enter payment mode, delivery, advance
 *       → confirm modal → reduce stock → done.
 */
export default function DispatchForm() {
  const navigate = useNavigate();
  const loc = useLocation();
  const [sr, setSr] = useState("");
  const [items, setItems] = useState([]);
  const [products, setProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [dispatchTo, setDispatchTo] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [bookingId, setBookingId] = useState(loc.state?.booking?.id || null);
  const [estimateId, setEstimateId] = useState(loc.state?.estimate?.id || null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [scanOpen, setScanOpen] = useState(false);

  // Payment fields
  const [paymentMode, setPaymentMode] = useState("cash");
  const [deliveryCharges, setDeliveryCharges] = useState(0);
  const [advanceReceived, setAdvanceReceived] = useState(0);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    api.get("/products").then((r) => setProducts(r.data));
    api.get("/customers").then((r) => setCustomers(r.data));
    if (loc.state?.preselectProduct) addProductFull(loc.state.preselectProduct);
    if (loc.state?.booking) {
      const b = loc.state.booking;
      setCustomerId(b.customer_id || "");
      setDispatchTo(b.customer_snapshot?.shop_name || b.customer_snapshot?.name || "");
      setPhone(b.customer_snapshot?.phone || "");
      setBookingId(b.id);
      // pre-fill advance from booking
      setAdvanceReceived(b.advance_received || 0);
      Promise.all(b.items.map((it) => api.get(`/products/${it.product_id}`).then((r) => r.data))).then((prods) => {
        setItems(prods.map((p, i) => ({
          product_id: p.id,
          sr_number: p.sr_number,
          title: p.title,
          size_preset: p.size_preset,
          sizes: { ...b.items[i].sizes },
          stock_by_size: p.stock_by_size,
          unit_price: b.items[i].unit_price || p.price,
          image: p.images?.[0] || "",
        })));
      });
    }
    if (loc.state?.estimate) {
      const e = loc.state.estimate;
      setDispatchTo(e.customer_name || "");
      setPhone(e.customer_phone || "");
      setCustomerId(e.customer_id || "");
      setEstimateId(e.id);
      setDeliveryCharges(e.delivery_charges || 0);
      setAdvanceReceived(e.advance_received || 0);
      Promise.all(e.items.map((it) => api.get(`/products/${it.product_id}`).then((r) => r.data))).then((prods) => {
        setItems(prods.map((p, i) => ({
          product_id: p.id,
          sr_number: p.sr_number,
          title: p.title,
          size_preset: p.size_preset,
          sizes: { ...e.items[i].sizes },
          stock_by_size: p.stock_by_size,
          unit_price: e.items[i].unit_price || p.price,
          image: p.images?.[0] || "",
        })));
      });
    }
    // eslint-disable-next-line
  }, []);

  useEffect(() => {
    const c = customers.find((x) => x.id === customerId);
    if (c && !loc.state?.booking && !loc.state?.estimate) {
      setDispatchTo(c.shop_name || c.name);
      setPhone(c.phone);
    }
    // eslint-disable-next-line
  }, [customerId, customers]);

  const itemTotal = useMemo(
    () => items.reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + (Number(b) || 0), 0) * Number(it.unit_price || 0), 0),
    [items]
  );
  const grandTotal = itemTotal + (Number(deliveryCharges) || 0);
  const finalPayable = Math.max(0, grandTotal - (Number(advanceReceived) || 0));

  const addProductFull = (p) => {
    if (items.find((it) => it.product_id === p.id)) return;
    setItems((prev) => [
      ...prev,
      {
        product_id: p.id,
        sr_number: p.sr_number,
        title: p.title,
        size_preset: p.size_preset,
        sizes: Object.fromEntries(PRESETS[p.size_preset].map((s) => [s, Math.min(1, p.stock_by_size?.[s] || 0)])),
        stock_by_size: p.stock_by_size,
        unit_price: p.price,
        image: p.images?.[0] || "",
      },
    ]);
  };

  const loadBySr = async (val) => {
    const code = (val ?? sr).trim();
    if (!code) return;
    setError("");
    try {
      const { data } = await api.get(`/products/by-sr/${code}`);
      addProductFull(data);
      setSr("");
    } catch {
      setError("No product found with SR " + code);
    }
  };

  const setItemSizes = (idx, sizes) => setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, sizes } : it)));
  const removeItem = (idx) => setItems((prev) => prev.filter((_, i) => i !== idx));
  const setUnitPrice = (idx, v) =>
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, unit_price: Math.max(0, Number(v) || 0) } : it)));

  const validate = () => {
    if (!dispatchTo || !phone) return "Dispatch to & phone are required";
    if (items.length === 0) return "Add at least one product";
    if (items.some((it) => !Object.entries(it.sizes || {}).some(([, v]) => v > 0)))
      return "Each item needs at least one size with quantity";
    return null;
  };

  const submit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setBusy(true); setError("");
    try {
      const cleaned = items.map((it) => ({
        product_id: it.product_id,
        sr_number: it.sr_number,
        title: it.title,
        sizes: Object.fromEntries(Object.entries(it.sizes).filter(([, v]) => v > 0)),
        unit_price: Number(it.unit_price) || 0,
        image: it.image || "",
      }));
      let data;
      if (estimateId) {
        // Confirm dispatch from estimate (uses dedicated endpoint that also marks converted)
        // We use the regular dispatch endpoint with estimate_id so server marks it converted.
        const res = await api.post("/dispatches", {
          customer_id: customerId || null,
          booking_id: bookingId || null,
          estimate_id: estimateId,
          dispatch_to: dispatchTo,
          phone,
          items: cleaned,
          payment_mode: paymentMode,
          advance_received: Number(advanceReceived) || 0,
          delivery_charges: Number(deliveryCharges) || 0,
          notes,
        });
        data = res.data;
      } else {
        const res = await api.post("/dispatches", {
          customer_id: customerId || null,
          booking_id: bookingId || null,
          dispatch_to: dispatchTo,
          phone,
          items: cleaned,
          payment_mode: paymentMode,
          advance_received: Number(advanceReceived) || 0,
          delivery_charges: Number(deliveryCharges) || 0,
          notes,
        });
        data = res.data;
      }
      navigate(`/dispatch`);
    } catch (e) {
      setError(formatApiError(e.response?.data?.detail) || e.message);
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-5">
      <SectionTitle overline="Operations" title={estimateId ? "Confirm Estimate → Dispatch" : bookingId ? "Dispatch from Booking" : "New Dispatch / Direct Sale"} />

      <GlassCard>
        <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-2">Add product</div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <ScanLine className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#ebd281]" />
            <input
              data-testid="dispatch-sr-input"
              value={sr}
              onChange={(e) => setSr(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), loadBySr())}
              placeholder="SCA-00001"
              className="aura-input pl-10 font-mono-receipt uppercase"
            />
          </div>
          <button onClick={() => setScanOpen(true)} data-testid="dispatch-scan-qr" className="rounded-full glass px-4 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2">
            <ScanLine className="w-4 h-4 text-[#ebd281]" /> Scan
          </button>
          <button onClick={() => loadBySr()} data-testid="dispatch-sr-add" className="btn-gold rounded-full px-5 py-3 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
      </GlassCard>

      {items.length === 0 && (
        <GlassCard>
          <SectionTitle overline="Or pick from" title="Products" />
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-72 overflow-y-auto pr-1">
            {products.map((p) => (
              <button key={p.id} onClick={() => addProductFull(p)} className="text-left rounded-2xl bg-white/5 hover:bg-white/10 p-3 transition">
                <div className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281]">{p.sr_number}</div>
                <div className="text-xs truncate">{p.title}</div>
                <div className="text-[10px] text-white/40 mt-1">Stock: {p.quantity}</div>
              </button>
            ))}
          </div>
        </GlassCard>
      )}

      {items.length > 0 && (
        <GlassCard>
          <SectionTitle overline="Items" title="Selected products" />
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
                        <input
                          type="number"
                          min={0}
                          step="0.01"
                          value={it.unit_price}
                          onChange={(e) => setUnitPrice(idx, e.target.value)}
                          className="w-24 bg-white/5 border border-white/10 rounded-md px-2 py-1 text-xs"
                          data-testid={`dispatch-price-${it.sr_number}`}
                        />
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
        </GlassCard>
      )}

      <GlassCard>
        <SectionTitle overline="Customer" title="Dispatch to" />
        <div className="grid sm:grid-cols-2 gap-3">
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Linked customer (optional)</span>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="aura-input">
              <option value="">— Direct sale —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.shop_name}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Dispatch to *</span>
            <input data-testid="dispatch-to" required value={dispatchTo} onChange={(e) => setDispatchTo(e.target.value)} className="aura-input" placeholder="Shop / Person" />
          </label>
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Phone *</span>
            <input data-testid="dispatch-phone" required value={phone} onChange={(e) => setPhone(e.target.value)} className="aura-input" placeholder="+91 …" />
          </label>
          <label className="block sm:col-span-2">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Notes</span>
            <input value={notes} onChange={(e) => setNotes(e.target.value)} className="aura-input" />
          </label>
        </div>
      </GlassCard>

      <GlassCard>
        <SectionTitle overline="Payment" title="Amount & mode" />
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Payment mode</span>
            <select data-testid="dispatch-payment-mode" value={paymentMode} onChange={(e) => setPaymentMode(e.target.value)} className="aura-input">
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="bank">Bank Transfer</option>
              <option value="card">Card</option>
              <option value="cheque">Cheque</option>
              <option value="credit">Credit (later)</option>
            </select>
          </label>
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Delivery charges (₹)</span>
            <input data-testid="dispatch-delivery" type="number" min={0} step="0.01" value={deliveryCharges} onChange={(e) => setDeliveryCharges(e.target.value)} className="aura-input" />
          </label>
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Advance received (₹)</span>
            <input data-testid="dispatch-advance" type="number" min={0} step="0.01" value={advanceReceived} onChange={(e) => setAdvanceReceived(e.target.value)} className="aura-input" />
          </label>
        </div>
        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div className="rounded-xl border border-white/10 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Item Total</div>
            <div className="font-display gold-text">₹{itemTotal.toLocaleString("en-IN")}</div>
          </div>
          <div className="rounded-xl border border-white/10 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Delivery</div>
            <div className="font-display">₹{Number(deliveryCharges || 0).toLocaleString("en-IN")}</div>
          </div>
          <div className="rounded-xl border border-white/10 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Grand Total</div>
            <div className="font-display">₹{grandTotal.toLocaleString("en-IN")}</div>
          </div>
          <div className="rounded-xl border border-[#d4af37]/40 bg-[#d4af37]/10 px-3 py-2.5">
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281]">Final Payable</div>
            <div className="font-display gold-text">₹{finalPayable.toLocaleString("en-IN")}</div>
          </div>
        </div>
      </GlassCard>

      {error && <div className="px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-200 text-sm">{error}</div>}

      <div className="flex justify-end gap-3">
        <button onClick={() => navigate(-1)} className="rounded-full glass px-6 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white/10">Cancel</button>
        <button
          data-testid="dispatch-submit"
          disabled={busy}
          onClick={() => { const e = validate(); if (e) setError(e); else { setError(""); setConfirming(true); } }}
          className="btn-gold rounded-full px-8 py-3 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2"
        >
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          Confirm Dispatch
        </button>
      </div>

      <QRScanner open={scanOpen} onClose={() => setScanOpen(false)} onScan={(code) => { setScanOpen(false); loadBySr(code); }} />

      {confirming && (
        <div className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-md grid place-items-center p-4">
          <div className="glass-strong w-full max-w-md rounded-3xl p-6 fade-up">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-[#ebd281]" />
              <h3 className="font-display text-xl">Confirm dispatch?</h3>
            </div>
            <div className="text-sm text-white/70 space-y-1.5 mb-4">
              <div className="flex justify-between"><span>Items</span><span>{items.length}</span></div>
              <div className="flex justify-between"><span>Pieces</span><span>{items.reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, b) => a + b, 0), 0)}</span></div>
              <div className="flex justify-between"><span>Payment mode</span><span className="uppercase">{paymentMode}</span></div>
              <div className="flex justify-between"><span>Delivery</span><span>₹{Number(deliveryCharges || 0).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between"><span>Advance</span><span>₹{Number(advanceReceived || 0).toLocaleString("en-IN")}</span></div>
              <div className="flex justify-between pt-2 border-t border-white/10 font-display">
                <span>Final Payable</span><span className="gold-text">₹{finalPayable.toLocaleString("en-IN")}</span>
              </div>
            </div>
            <div className="text-[11px] text-amber-200/90 mb-4">Stock will be reduced automatically.</div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirming(false)} className="rounded-full glass px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-white/10">Back</button>
              <button data-testid="dispatch-confirm-yes" onClick={submit} disabled={busy} className="btn-gold rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
                {busy && <Loader2 className="w-4 h-4 animate-spin" />} Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
