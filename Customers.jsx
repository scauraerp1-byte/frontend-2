import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api, { formatApiError } from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { Plus, Phone, MapPin, Loader2, X, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import FilterBar from "../components/FilterBar";
import { useModal } from "../hooks/useModal";

const COUNTRIES = [
  { code: "+91", label: "IN +91", flag: "🇮🇳" },
  { code: "+1", label: "US +1", flag: "🇺🇸" },
  { code: "+44", label: "UK +44", flag: "🇬🇧" },
  { code: "+971", label: "UAE +971", flag: "🇦🇪" },
  { code: "+61", label: "AU +61", flag: "🇦🇺" },
  { code: "+65", label: "SG +65", flag: "🇸🇬" },
];

export default function Customers() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    const { data } = await api.get("/customers", { params: q ? { q } : {} });
    setItems(data);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q]);

  return (
    <div className="space-y-5">
      <SectionTitle overline="People" title="Customers" action={
        <button onClick={() => setShowAdd(true)} data-testid="customers-add" className="btn-gold rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add
        </button>
      } />

      <FilterBar search={q} onSearchChange={setQ} searchPlaceholder="Search by name, phone or shop…" />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.length === 0 && <GlassCard className="md:col-span-2 lg:col-span-3 text-center py-10 text-white/50">No customers yet.</GlassCard>}
        {items.map(c => (
          <Link key={c.id} to={`/customers/${c.id}`} data-testid={`customer-card-${c.id}`} className="glass rounded-2xl p-5 hover:bg-white/[0.08] transition group">
            <div className="flex items-start justify-between mb-2 gap-2">
              <div className="min-w-0">
                <div className="font-display text-lg truncate">{c.name}</div>
                {c.shop_name && <div className="text-xs text-white/50 truncate">{c.shop_name}</div>}
              </div>
              <Pill tone="gold">Customer</Pill>
            </div>
            <div className="text-xs text-white/60 flex items-center gap-2 mt-1"><Phone className="w-3 h-3" /> {c.country_code || ""} {c.phone}</div>
            {c.address && <div className="text-xs text-white/50 flex items-center gap-2 mt-1"><MapPin className="w-3 h-3" /> {c.address}</div>}
          </Link>
        ))}
      </div>

      {showAdd && <CustomerAddModal onClose={() => setShowAdd(false)} onCreated={(c) => { setShowAdd(false); navigate(`/customers/${c.id}`); }} />}
    </div>
  );
}

function CustomerAddModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    name: "", country_code: "+91", phone: "", address: "", gst: "", shop_name: "", notes: "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useModal(true);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const payload = {
        ...form,
        phone: `${form.country_code} ${form.phone.trim()}`.trim(),
      };
      const { data } = await api.post("/customers", payload);
      toast.success("Customer added");
      onCreated?.(data);
    } catch (err) { setError(formatApiError(err.response?.data?.detail) || err.message); }
    finally { setBusy(false); }
  };

  return (
    <div className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex flex-col fade-up" role="dialog" aria-modal="true">
      <div className="flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-white/10 bg-black/70">
        <button type="button" onClick={onClose} data-testid="cust-back" className="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/15 transition" aria-label="Back">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">People</div>
          <div className="font-display text-lg">Add customer</div>
        </div>
        <button type="button" onClick={onClose} data-testid="cust-close" className="w-9 h-9 grid place-items-center rounded-full bg-white/5 hover:bg-white/15 transition" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </div>
      <form onSubmit={submit} className="flex-1 overflow-y-auto" data-testid="customer-form">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-4">
          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Full name *</span>
            <input data-testid="cust-name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="aura-input" placeholder="Meena Fashion Hub" />
          </label>

          <div>
            <span className="text-xs text-white/60 mb-1.5 inline-block">Mobile number *</span>
            <div className="flex gap-2">
              <select
                data-testid="cust-country-code"
                value={form.country_code}
                onChange={(e) => setForm({ ...form, country_code: e.target.value })}
                className="aura-input w-28 sm:w-32 flex-shrink-0"
              >
                {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.flag} {c.code}</option>)}
              </select>
              <input
                data-testid="cust-phone"
                required
                type="tel"
                inputMode="numeric"
                pattern="[0-9\s\-]{6,15}"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^\d\s-]/g, "") })}
                className="aura-input flex-1 min-w-0"
                placeholder="98765 43210"
              />
            </div>
          </div>

          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Shop name (optional)</span>
            <input data-testid="cust-shop" value={form.shop_name} onChange={(e) => setForm({ ...form, shop_name: e.target.value })} className="aura-input" placeholder="Meena Hub" />
          </label>

          <label className="block">
            <span className="text-xs text-white/60 mb-1.5 inline-block">Address (optional)</span>
            <input data-testid="cust-address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className="aura-input" placeholder="Jaipur, Rajasthan" />
          </label>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">GST (optional)</span>
              <input data-testid="cust-gst" value={form.gst} onChange={(e) => setForm({ ...form, gst: e.target.value })} className="aura-input" />
            </label>
            <label className="block">
              <span className="text-xs text-white/60 mb-1.5 inline-block">Notes (optional)</span>
              <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="aura-input" />
            </label>
          </div>

          {error && <div className="px-3 py-2 rounded-lg bg-red-500/10 border border-red-500/30 text-red-200 text-xs">{error}</div>}
        </div>

        <div className="sticky bottom-0 border-t border-white/10 bg-black/85 backdrop-blur-md">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="rounded-full bg-white/5 border border-white/10 px-5 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-white/10">Cancel</button>
            <button data-testid="cust-submit" disabled={busy} className="btn-gold rounded-full px-6 py-2.5 text-xs uppercase tracking-[0.25em] inline-flex items-center gap-2">
              {busy && <Loader2 className="w-4 h-4 animate-spin" />} Create
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
