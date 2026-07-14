/**
 * Direct PDF generation for booking/dispatch/estimate/return receipts.
 * Uses jsPDF + autoTable. Generates a thermal-style receipt with product images.
 */
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatRupee } from "./share";

const PAGE_W = 80; // mm — thermal receipt width
const MARGIN = 5;

async function imgToDataUrl(src) {
  if (!src) return null;
  if (src.startsWith("data:")) return src;
  try {
    const res = await fetch(src, { mode: "cors" });
    const blob = await res.blob();
    return await new Promise((r) => {
      const reader = new FileReader();
      reader.onloadend = () => r(reader.result);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export function newReceiptDoc() {
  const doc = new jsPDF({
    unit: "mm",
    format: [PAGE_W, 297],
    orientation: "portrait",
  });
  return doc;
}

export function headerBlock(doc, branding, title, subTitle) {
  let y = MARGIN + 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text(branding?.company_name || "SC AURA KURTIS", PAGE_W / 2, y, { align: "center" });
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  if (branding?.address) {
    const addr = doc.splitTextToSize(branding.address, PAGE_W - 2 * MARGIN);
    doc.text(addr, PAGE_W / 2, y, { align: "center" });
    y += addr.length * 2.8;
  }
  if (branding?.phone || branding?.gst) {
    doc.text(`${branding?.phone || ""}${branding?.gst ? ` · GST ${branding.gst}` : ""}`, PAGE_W / 2, y, { align: "center" });
    y += 3;
  }
  doc.setDrawColor(120);
  doc.setLineDashPattern([0.6, 0.6], 0);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 3;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text(title, PAGE_W / 2, y, { align: "center" });
  y += 3.2;
  if (subTitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.text(subTitle, PAGE_W / 2, y, { align: "center" });
    y += 3;
  }
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  return y + 2;
}

export function kv(doc, label, value, y) {
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.text(`${label}:`, MARGIN, y);
  const v = doc.splitTextToSize(String(value || "—"), PAGE_W - 2 * MARGIN - 22);
  doc.text(v, PAGE_W - MARGIN, y, { align: "right" });
  return y + Math.max(3, v.length * 2.7);
}

export async function itemsTable(doc, items, startY, { withImages = true, showPrice = true } = {}) {
  const head = showPrice ? [["#", "Item", "Qty", "Price"]] : [["#", "Item", "Qty"]];
  const rows = [];
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    const totalQty = Object.values(it.sizes || {}).reduce((a, b) => a + b, 0);
    const sizeBlock = Object.entries(it.sizes || {}).map(([s, n]) => `${s}:${n}`).join("  ");
    const itemText = `${it.sr_number}\n${it.title}\n${sizeBlock}`;
    if (showPrice) {
      const lineTotal = totalQty * (Number(it.unit_price) || 0);
      rows.push([String(i + 1), itemText, String(totalQty), `${(Number(it.unit_price) || 0).toFixed(0)}\n=${lineTotal.toFixed(0)}`]);
    } else {
      rows.push([String(i + 1), itemText, String(totalQty)]);
    }
  }
  autoTable(doc, {
    startY,
    head,
    body: rows,
    theme: "plain",
    styles: { fontSize: 6.8, cellPadding: 1.2, valign: "top" },
    headStyles: { fillColor: [232, 232, 232], textColor: 20, fontStyle: "bold" },
    columnStyles: showPrice
      ? { 0: { cellWidth: 5 }, 1: { cellWidth: "auto" }, 2: { cellWidth: 8, halign: "right" }, 3: { cellWidth: 14, halign: "right" } }
      : { 0: { cellWidth: 5 }, 1: { cellWidth: "auto" }, 2: { cellWidth: 8, halign: "right" } },
    margin: { left: MARGIN, right: MARGIN },
  });
  // Add images underneath as a strip if requested
  let y = doc.lastAutoTable.finalY + 2;
  if (withImages) {
    const imgs = items.map((it) => it.image).filter(Boolean).slice(0, 6);
    if (imgs.length) {
      const W = 14;
      const PAD = 1.5;
      const xStart = MARGIN;
      let xCursor = xStart;
      for (const src of imgs) {
        const data = await imgToDataUrl(src);
        if (!data) continue;
        if (xCursor + W > PAGE_W - MARGIN) {
          xCursor = xStart;
          y += W + PAD;
        }
        try {
          doc.addImage(data, "JPEG", xCursor, y, W, W);
        } catch {
          try { doc.addImage(data, "PNG", xCursor, y, W, W); } catch {}
        }
        xCursor += W + PAD;
      }
      y += W + 2;
    }
  }
  return y;
}

export function totalsBlock(doc, lines, y) {
  doc.setDrawColor(120);
  doc.setLineDashPattern([0.6, 0.6], 0);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 3;
  doc.setFontSize(7.5);
  for (const [label, value, bold] of lines) {
    doc.setFont("helvetica", bold ? "bold" : "normal");
    doc.text(label, MARGIN, y);
    doc.text(String(value), PAGE_W - MARGIN, y, { align: "right" });
    y += 3.2;
  }
  return y;
}

export function footerNote(doc, branding, y, customLine) {
  doc.setDrawColor(120);
  doc.setLineDashPattern([0.6, 0.6], 0);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 3;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(6.5);
  doc.text(customLine || "Thank you · Visit us again", PAGE_W / 2, y, { align: "center" });
  y += 3;
  if (branding?.whatsapp) {
    doc.text(`WhatsApp: ${branding.whatsapp}`, PAGE_W / 2, y, { align: "center" });
    y += 3;
  }
  return y;
}

export async function buildBookingPDF(b, branding) {
  const doc = newReceiptDoc();
  let y = headerBlock(doc, branding, "BOOKING RECEIPT", b.booking_no);
  y = kv(doc, "Date", new Date(b.created_at).toLocaleString(), y);
  y = kv(doc, "Customer", b.customer_snapshot?.name || "", y);
  if (b.customer_snapshot?.shop_name) y = kv(doc, "Shop", b.customer_snapshot.shop_name, y);
  if (b.customer_snapshot?.phone) y = kv(doc, "Phone", b.customer_snapshot.phone, y);
  y += 1;
  y = await itemsTable(doc, b.items || [], y, { withImages: true, showPrice: true });
  const totalPcs = (b.items || []).reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, n) => a + n, 0), 0);
  y = totalsBlock(doc, [
    ["Item Total", formatRupee(b.item_total), false],
    ["Advance Received", formatRupee(b.advance_received), false],
    ["Remaining", formatRupee(b.remaining), true],
    ["Total Pieces", totalPcs, false],
  ], y);
  footerNote(doc, branding, y);
  return doc;
}

export async function buildDispatchPDF(d, branding) {
  const doc = newReceiptDoc();
  let y = headerBlock(doc, branding, "DISPATCH RECEIPT", d.dispatch_no);
  y = kv(doc, "Date", new Date(d.created_at).toLocaleString(), y);
  y = kv(doc, "Dispatch To", d.dispatch_to, y);
  if (d.phone) y = kv(doc, "Phone", d.phone, y);
  if (d.payment_mode) y = kv(doc, "Payment Mode", String(d.payment_mode).toUpperCase(), y);
  y += 1;
  y = await itemsTable(doc, d.items || [], y, { withImages: true, showPrice: true });
  const totalPcs = (d.items || []).reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, n) => a + n, 0), 0);
  y = totalsBlock(doc, [
    ["Item Total", formatRupee(d.item_total), false],
    ["Advance Received", formatRupee(d.advance_received), false],
    ["Delivery Charges", formatRupee(d.delivery_charges), false],
    ["Grand Total", formatRupee(d.grand_total), false],
    ["Final Payable", formatRupee(d.final_payable), true],
    ["Total Pieces", totalPcs, false],
  ], y);
  footerNote(doc, branding, y);
  return doc;
}

export async function buildEstimatePDF(est, branding) {
  const doc = newReceiptDoc();
  let y = headerBlock(doc, branding, "ESTIMATE / DRAFT ORDER", est.estimate_no);
  y = kv(doc, "Date", new Date(est.created_at).toLocaleString(), y);
  if (est.customer_name) y = kv(doc, "Customer", est.customer_name, y);
  if (est.customer_phone) y = kv(doc, "Phone", est.customer_phone, y);
  y += 1;
  y = await itemsTable(doc, est.items || [], y, { withImages: true, showPrice: true });
  y = totalsBlock(doc, [
    ["Item Total", formatRupee(est.item_total), false],
    ["Delivery Charges", formatRupee(est.delivery_charges), false],
    ["Grand Total", formatRupee(est.grand_total), false],
    ["Advance Received", formatRupee(est.advance_received), false],
    ["Remaining", formatRupee(est.remaining), true],
  ], y);
  footerNote(doc, branding, y, "Estimate · Valid for 72 hours");
  return doc;
}

export async function buildReturnPDF(r, branding) {
  const doc = newReceiptDoc();
  let y = headerBlock(doc, branding, "GOODS RETURN RECEIPT", r.return_no);
  y = kv(doc, "Date", new Date(r.created_at).toLocaleString(), y);
  y = kv(doc, "Vendor", r.vendor_name, y);
  if (r.reason) y = kv(doc, "Reason", r.reason, y);
  y += 1;
  y = await itemsTable(doc, r.items || [], y, { withImages: false, showPrice: true });
  y = totalsBlock(doc, [
    ["Item Total", formatRupee(r.item_total), true],
    ["Pieces Returned", (r.items || []).reduce((s, it) => s + Object.values(it.sizes || {}).reduce((a, n) => a + n, 0), 0), false],
  ], y);
  footerNote(doc, branding, y, "Stock has been reduced");
  return doc;
}

export async function downloadPDF(doc, filename) {
  doc.save(filename);
}

export async function sharePDF(doc, filename, phone) {
  // Try Web Share API with file first; fallback to download + open wa.me
  const blob = doc.output("blob");
  const file = new File([blob], filename, { type: "application/pdf" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: filename });
      return true;
    } catch {
      // fall through
    }
  }
  // Fallback: download + open WhatsApp with text
  doc.save(filename);
  const clean = (p) => (p || "").replace(/[^\d+]/g, "").replace(/^\+/, "");
  const text = encodeURIComponent(`${filename} — Please find the receipt attached.`);
  const url = phone ? `https://wa.me/${clean(phone)}?text=${text}` : `https://wa.me/?text=${text}`;
  window.open(url, "_blank", "noopener");
  return false;
}
