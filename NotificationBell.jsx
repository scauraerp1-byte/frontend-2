import { useEffect, useRef, useState } from "react";
import { Bell, X, CheckCheck, ClipboardList, Truck, FileText, RotateCcw, Package, AlertTriangle, IndianRupee } from "lucide-react";
import api from "../lib/api";
import { useNavigate } from "react-router-dom";
import { useModal } from "../hooks/useModal";

const ICONS = {
  booking: ClipboardList,
  dispatch: Truck,
  estimate: FileText,
  return: RotateCcw,
  product: Package,
  low_stock: AlertTriangle,
  payment: IndianRupee,
  user: Bell,
};

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unread, setUnread] = useState(0);
  const btnRef = useRef();
  const navigate = useNavigate();
  useModal(open);

  const load = async () => {
    try {
      const { data } = await api.get("/notifications");
      setItems(data.items || []);
      setUnread(data.unread || 0);
    } catch {}
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 45000);
    return () => clearInterval(t);
  }, []);

  const openAndLoad = async () => {
    setOpen((v) => !v);
    if (!open) await load();
  };

  const markAll = async () => {
    await api.post("/notifications/mark-all-read");
    load();
  };

  const clickItem = async (n) => {
    if (!n.read) await api.patch(`/notifications/${n.id}/read`);
    setOpen(false);
    const ref = n.ref || {};
    if (n.kind === "booking" && ref.booking_id) navigate(`/bookings/${ref.booking_id}`);
    else if (n.kind === "dispatch") navigate(`/dispatch`);
    else if (n.kind === "estimate") navigate(`/estimates`);
    else if (n.kind === "return") navigate(`/vendor-returns`);
    else if (n.kind === "product" && ref.product_id) navigate(`/products/${ref.product_id}`);
    else if (n.kind === "low_stock" && ref.product_id) navigate(`/products/${ref.product_id}`);
    load();
  };

  return (
    <>
      <button
        ref={btnRef}
        onClick={openAndLoad}
        data-testid="topbar-notifications"
        className="relative w-9 h-9 grid place-items-center rounded-full glass hover:bg-white/10 transition"
      >
        <Bell className="w-4 h-4 text-white/70" />
        {unread > 0 && (
          <span className="absolute top-0 right-0 min-w-[16px] h-[16px] rounded-full bg-[#d4af37] text-black text-[9px] font-bold grid place-items-center px-1">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="fixed z-50 right-3 sm:right-6 top-14 w-[92vw] sm:w-[380px] max-h-[70vh] flex flex-col bg-neutral-950 rounded-3xl border border-white/15 shadow-[0_24px_60px_rgba(0,0,0,0.7)] fade-up" data-testid="notification-panel">
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div>
                <div className="text-[10px] uppercase tracking-[0.3em] text-[#ebd281]">Updates</div>
                <div className="font-display text-lg">Notifications</div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={markAll} data-testid="notif-mark-all" title="Mark all read" className="text-xs text-white/60 hover:text-white inline-flex items-center gap-1">
                  <CheckCheck className="w-3.5 h-3.5" /> All read
                </button>
                <button onClick={() => setOpen(false)} className="text-white/50 hover:text-white"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {items.length === 0 && <div className="text-center py-10 text-white/50 text-sm">No notifications yet.</div>}
              {items.map((n) => {
                const Icon = ICONS[n.kind] || Bell;
                return (
                  <button
                    key={n.id}
                    onClick={() => clickItem(n)}
                    data-testid={`notif-item-${n.kind}`}
                    className={`w-full text-left px-5 py-3 border-b border-white/5 hover:bg-white/5 flex items-start gap-3 transition ${!n.read ? "bg-white/[0.03]" : ""}`}
                  >
                    <div className={`w-9 h-9 rounded-xl grid place-items-center flex-shrink-0 ${!n.read ? "bg-[#d4af37]/15 text-[#ebd281]" : "bg-white/5 text-white/60"}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate flex items-center gap-2">
                        <span>{n.title}</span>
                        {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-[#d4af37] flex-shrink-0" />}
                      </div>
                      <div className="text-xs text-white/50 truncate">{n.body}</div>
                      <div className="text-[10px] text-white/40 mt-0.5">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </>
  );
}
