import { useState } from "react";
import { Share2 } from "lucide-react";
import { shareWhatsApp, publicCatalogueUrl, formatRupee } from "../lib/share";
import api from "../lib/api";

export default function ShareCatalogueButton({ product, phone, variant = "default", className = "", onShared }) {
  const url = publicCatalogueUrl(product.sr_number);

  const markShared = async () => {
    try {
      await api.post(`/products/${product.id}/mark-shared`);
      onShared?.();
    } catch {}
  };

  const onShare = async (e) => {
    e?.preventDefault?.();
    e?.stopPropagation?.();
    const sizes = product.size_preset || (product.available_sizes || []).join(", ");
    const text = `*${product.title}*\nSR: ${product.sr_number}\nCategory: ${product.category}\nSizes: ${sizes}\nPrice: ${formatRupee(product.price)}\n${product.description ? product.description + "\n" : ""}\nView catalogue → ${url}`;
    let shared = false;
    if (navigator.share) {
      try {
        await navigator.share({ title: product.title, text, url });
        shared = true;
      } catch { /* user cancelled or unsupported */ }
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
        className={`w-8 h-8 rounded-full glass hover:bg-white/20 grid place-items-center transition ${className}`}
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
      className={`rounded-full glass px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2 ${className}`}
    >
      <Share2 className="w-4 h-4 text-[#ebd281]" /> Share Catalogue
    </button>
  );
}
