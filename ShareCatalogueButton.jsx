import { Share2 } from "lucide-react";
import { shareWhatsApp, formatRupee } from "../lib/share";
import api from "../lib/api";
import { PRESETS } from "./SizeWidgets";

/**
 * Wholesale-style catalogue share.
 *
 * Design rule (per client): do NOT expose ERP application URLs. The customer
 * only receives product information + images — never a link back to the app.
 * On devices that support `navigator.share` with files we attach the product
 * images directly; otherwise we fall back to a WhatsApp deep link that opens
 * pre-filled text and lets the sender attach images from their gallery.
 */
export default function ShareCatalogueButton({ product, phone, variant = "default", className = "", onShared }) {
  const markShared = async () => {
    try {
      await api.post(`/products/${product.id}/mark-shared`);
      onShared?.();
    } catch { /* ignore */ }
  };

  const buildText = () => {
    const sizes =
      product.size_preset && PRESETS[product.size_preset]
        ? PRESETS[product.size_preset].join(", ")
        : (product.available_sizes || []).join(", ");
    const lines = [
      `*${product.title}*`,
      `SR: ${product.sr_number}`,
      `Category: ${product.category}`,
      sizes ? `Sizes: ${sizes}` : "",
      `Price: ${formatRupee(product.price)}`,
      product.description ? "" : null,
      product.description || null,
    ].filter((l) => l !== null && l !== "");
    return lines.join("\n");
  };

  const fetchImageAsFile = async (url, i) => {
    try {
      const res = await fetch(url, { mode: "cors" });
      if (!res.ok) return null;
      const blob = await res.blob();
      const ext = (blob.type.split("/")[1] || "jpg").split(";")[0];
      return new File([blob], `${product.sr_number}-${i + 1}.${ext}`, { type: blob.type });
    } catch {
      return null;
    }
  };

  const onShare = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const text = buildText();
    let shared = false;

    // Prefer native share with files (photos included) — no URL, ever.
    if (navigator.share) {
      let files = [];
      const imgs = (product.images || []).slice(0, 8);
      if (imgs.length > 0 && typeof File !== "undefined") {
        const loaded = await Promise.all(imgs.map((u, i) => fetchImageAsFile(u, i)));
        files = loaded.filter(Boolean);
      }
      const canShareFiles = files.length > 0 && navigator.canShare?.({ files });
      try {
        await navigator.share(canShareFiles ? { title: product.title, text, files } : { title: product.title, text });
        shared = true;
      } catch { /* user cancelled — fall through */ }
    }

    if (!shared) {
      shareWhatsApp({ phone, text });
      shared = true;
    }
    if (shared) markShared();
  };

  if (variant === "icon") {
    return (
      <button
        onClick={onShare}
        data-testid={`share-catalogue-${product.sr_number}`}
        className={`w-8 h-8 rounded-full bg-black/50 border border-white/10 hover:bg-white/15 grid place-items-center transition ${className}`}
        title="Share catalogue"
      >
        <Share2 className="w-3.5 h-3.5 text-[#ebd281]" />
      </button>
    );
  }

  return (
    <button
      onClick={onShare}
      data-testid={`share-catalogue-${product.sr_number}`}
      className={`rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2 ${className}`}
    >
      <Share2 className="w-4 h-4 text-[#ebd281]" /> Share Catalogue
    </button>
  );
}
