import { useEffect, useMemo, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { useAuth } from "../contexts/AuthContext";
import { Printer, Truck, ClipboardList, ArrowLeft, Pencil, ChevronLeft, ChevronRight, Share2 } from "lucide-react";
import ShareCatalogueButton from "../components/ShareCatalogueButton";
import { formatRupee } from "../lib/share";

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [p, setP] = useState(null);
  const [qr, setQr] = useState(null);
  const [imgIdx, setImgIdx] = useState(0);

  const load = () => {
    api.get(`/products/${id}`).then(r => setP(r.data));
    api.get(`/products/${id}/qr`).then(r => setQr(r.data));
  };
  useEffect(load, [id]);

  const images = useMemo(() => (p?.images?.length ? p.images : [null]), [p]);

  if (!p) return <div className="h-64 rounded-2xl shimmer" />;

  const openPrint = () => {
    if (!qr) return;
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) { window.alert("Please allow pop-ups to print the QR label."); return; }
    win.document.write(`<!DOCTYPE html>
<html><head><title>${qr.sr_number} — SC Aura Kurtis</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; padding: 16px; background: #fff; color: #000; }
  .label { width: 320px; margin: 0 auto; text-align: center; border: 1px solid #ddd; border-radius: 12px; padding: 20px; }
  .brand { font-size: 10px; letter-spacing: 4px; text-transform: uppercase; color: #997a15; margin-bottom: 6px; }
  .sr { font-family: monospace; font-size: 14px; font-weight: 700; letter-spacing: 3px; margin-bottom: 4px; }
  .title { font-size: 13px; font-weight: 600; margin-bottom: 4px; }
  .meta { font-size: 11px; color: #444; margin-bottom: 12px; }
  .price { font-size: 20px; font-weight: 700; color: #997a15; margin-top: 6px; }
  img { width: 220px; height: 220px; display: block; margin: 8px auto; }
  @media print {
    body { padding: 0; }
    .label { border: none; padding: 8px; }
    button { display: none; }
  }
  .actions { text-align: center; margin-top: 14px; }
  button { padding: 8px 18px; border-radius: 999px; background: #d4af37; color: #000; border: 0; cursor: pointer; letter-spacing: 2px; font-size: 11px; text-transform: uppercase; }
</style>
</head><body>
  <div class="label">
    <div class="brand">SC Aura Kurtis</div>
    <img src="${qr.qr_data_url}" alt="qr" />
    <div class="sr">${qr.sr_number}</div>
    <div class="title">${(qr.title || "").replace(/</g, "&lt;")}</div>
    <div class="meta">${qr.category || ""}</div>
    <div class="price">${formatRupee(qr.price || 0)}</div>
  </div>
  <div class="actions"><button onclick="window.print()">Print</button></div>
  <script>window.onload = function(){ setTimeout(function(){ window.print(); }, 350); };</script>
</body></html>`);
    win.document.close();
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
        <ArrowLeft className="w-4 h-4" /> Back
      </button>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 space-y-4">
          <GlassCard className="p-4">
            <div className="relative aspect-[4/5] rounded-2xl overflow-hidden bg-white/5">
              {images[imgIdx] ? <img src={images[imgIdx]} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full grid place-items-center text-white/30">No image</div>}
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center hover:bg-black/80" data-testid="prod-img-prev"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setImgIdx(i => (i + 1) % images.length)} className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur grid place-items-center hover:bg-black/80" data-testid="prod-img-next"><ChevronRight className="w-4 h-4" /></button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto scroll-hide">
                {images.map((src, i) => (
                  <button key={i} onClick={() => setImgIdx(i)} className={`w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border ${imgIdx === i ? "border-[#d4af37]" : "border-white/10"}`}>
                    {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full bg-white/5 grid place-items-center text-white/30 text-xs">—</div>}
                  </button>
                ))}
              </div>
            )}
          </GlassCard>
          <GlassCard>
            <SectionTitle overline="Stock by size" title="Inventory map" />
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {Object.entries(p.stock_by_size || {}).map(([s, q]) => (
                <div key={s} className="rounded-xl border border-white/10 p-3 text-center">
                  <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">{s}</div>
                  <div className="font-display text-2xl gold-text mt-1">{q}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <GlassCard>
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.4em] text-[#ebd281] mb-1">SR Number</div>
                <div className="font-mono-receipt text-3xl sm:text-4xl font-bold tracking-[0.15em] text-white break-all leading-tight" data-testid="prod-sr-large">{p.sr_number}</div>
                <h1 className="font-display text-2xl sm:text-3xl tracking-tight mt-3">{p.title}</h1>
              </div>
              {p.last_shared_at && <Pill tone="success" data-testid="prod-shared-badge"><Share2 className="w-2.5 h-2.5" /> Shared</Pill>}
            </div>
            <p className="text-sm text-white/60 mt-2">{p.description || "—"}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Pill tone="gold">{p.category}</Pill>
              <Pill>{p.size_preset}</Pill>
              <Pill tone={p.quantity <= 20 ? "warning" : "success"}>{p.quantity} pcs</Pill>
            </div>
            <div className="mt-4 flex items-baseline gap-2">
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Price</span>
              <span className="font-display text-3xl gold-text">₹{Number(p.price).toLocaleString("en-IN")}</span>
            </div>
            {(user.role === "admin" || user.role === "manager") && (p.factory_name || p.vendor_name) && (
              <div className="mt-4 p-3 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/40">Vendor / Factory (internal)</div>
                <div className="text-sm mt-0.5">{p.vendor_name || p.factory_name}</div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2 mt-5">
              <Link to="/bookings/new" state={{ preselectProduct: p }} data-testid="prod-book" className="rounded-full glass px-4 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 hover:bg-white/10">
                <ClipboardList className="w-3 h-3" /> Book
              </Link>
              <Link to="/dispatch/new" state={{ preselectProduct: p }} data-testid="prod-dispatch" className="btn-gold rounded-full px-4 py-2.5 text-xs uppercase tracking-[0.25em] inline-flex items-center justify-center gap-2">
                <Truck className="w-3 h-3" /> Dispatch
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2">
              <ShareCatalogueButton product={p} className="w-full justify-center" onShared={load} />
              {(user.role === "admin" || user.role === "manager") && (
                <Link to={`/products/${p.id}/edit`} data-testid="prod-edit" className="rounded-full glass px-4 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center justify-center gap-2 hover:bg-white/10">
                  <Pencil className="w-3 h-3" /> Edit
                </Link>
              )}
            </div>
          </GlassCard>

          {qr && (
            <GlassCard>
              <SectionTitle overline="Label" title="QR Code" action={
                <button onClick={openPrint} data-testid="prod-qr-print" className="text-xs text-[#ebd281] hover:text-white inline-flex items-center gap-1"><Printer className="w-3 h-3" /> Print</button>
              } />
              <div className="bg-white rounded-2xl p-4 mx-auto max-w-[220px]">
                <img src={qr.qr_data_url} alt="qr" className="w-full" />
                <div className="text-center mt-2 font-mono-receipt text-black">
                  <div className="text-xs font-semibold">{qr.sr_number}</div>
                  <div className="text-[10px] uppercase tracking-[0.2em] text-black/70 truncate">{qr.title}</div>
                  <div className="text-[10px] text-black/50">{qr.category}</div>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
