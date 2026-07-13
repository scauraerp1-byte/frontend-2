import { useEffect, useRef, useState } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { X, Camera } from "lucide-react";

/**
 * QR Scanner modal — uses html5-qrcode for camera scanning.
 * Calls onScan(text) when a code is detected. Closes on success or X.
 */
export default function QRScanner({ open, onClose, onScan }) {
  const containerRef = useRef(null);
  const scannerRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    const id = "qr-scanner-region";
    const elem = document.getElementById(id);
    if (!elem) return;
    const scanner = new Html5Qrcode(id);
    scannerRef.current = scanner;
    setError("");
    scanner.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 240, height: 240 } },
      (text) => {
        try {
          scanner.stop().then(() => scanner.clear()).catch(() => {});
        } catch {}
        onScan && onScan(String(text).trim().toUpperCase());
      },
      () => {}
    ).catch((e) => setError(e?.message || "Camera unavailable. Use manual entry."));
    return () => {
      try {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      } catch {}
    };
    // eslint-disable-next-line
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md grid place-items-center p-4 fade-up">
      <div className="w-full max-w-sm glass-strong rounded-3xl p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="inline-flex items-center gap-2 text-sm">
            <Camera className="w-4 h-4 text-[#ebd281]" />
            <span className="font-display text-lg">Scan SR / QR</span>
          </div>
          <button onClick={onClose} data-testid="qr-close" className="text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
        </div>
        <div id="qr-scanner-region" ref={containerRef} className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black aspect-square" />
        {error && <div className="mt-3 text-xs text-amber-300/90">{error}</div>}
        <div className="text-[11px] text-white/50 mt-3 text-center">
          Point your camera at a product QR / SR code
        </div>
      </div>
    </div>
  );
}
