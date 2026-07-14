import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ClipboardList, Truck, Package, RotateCcw, FileText, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAnyModalOpen, useModal } from "../hooks/useModal";

/**
 * Floating action button — global, available on every authenticated page.
 * Provides quick creation access for:
 *   - Booking, Dispatch, Estimate, Product, Vendor Return (super_staff/admin only)
 *
 * Auto-hides whenever any modal / drawer / picker / notification panel is
 * currently mounted so it never overlaps other UI.
 */
export default function FloatingFAB() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const anyModal = useAnyModalOpen();
  // Register our own menu overlay so nested modals stack correctly.
  useModal(open);

  if (!user) return null;
  const role = user.role;
  const canReturn = role === "admin" || role === "super_staff";

  const actions = [
    { label: "Booking", icon: ClipboardList, to: "/bookings/new", testid: "fab-booking" },
    { label: "Dispatch", icon: Truck, to: "/dispatch/new", testid: "fab-dispatch" },
    { label: "Estimate", icon: FileText, to: "/estimates/new", testid: "fab-estimate" },
    { label: "Product", icon: Package, to: "/products/new", testid: "fab-product" },
    canReturn && { label: "Return", icon: RotateCcw, to: "/vendor-returns/new", testid: "fab-return" },
  ].filter(Boolean);

  // Hide the FAB whenever some OTHER modal/drawer/picker is on screen.
  // Our own action-menu registers itself via `useModal(open)`, so we ignore
  // that presence by checking `!open`.
  if (anyModal && !open) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm fade-up"
          onClick={() => setOpen(false)}
          data-testid="fab-backdrop"
        />
      )}
      <div className="fixed z-50 right-6 bottom-24 lg:bottom-8 flex flex-col items-end gap-3">
        {open && (
          <div className="flex flex-col items-end gap-2 fade-up">
            {actions.map((a) => {
              const Icon = a.icon;
              return (
                <button
                  key={a.label}
                  data-testid={a.testid}
                  onClick={() => { setOpen(false); navigate(a.to); }}
                  className="inline-flex items-center gap-2 rounded-full bg-neutral-900 border border-white/10 px-4 py-2.5 hover:bg-white/10 text-sm transition shadow-lg"
                >
                  <Icon className="w-4 h-4 text-[#ebd281]" />
                  <span>{a.label}</span>
                </button>
              );
            })}
          </div>
        )}
        <button
          data-testid="fab-toggle"
          onClick={() => setOpen((v) => !v)}
          className="w-14 h-14 rounded-full bg-gradient-to-br from-[#ebd281] to-[#d4af37] text-black grid place-items-center shadow-[0_12px_36px_rgba(212,175,55,0.45)] hover:scale-105 active:scale-95 transition"
          aria-label="Quick create"
        >
          {open ? <X className="w-6 h-6" /> : <Plus className="w-7 h-7" />}
        </button>
      </div>
    </>
  );
}
