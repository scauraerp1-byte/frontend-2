import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { Plus, FileText, Eye } from "lucide-react";
import { StatusBadge } from "../components/StatusTracker";
import FilterBar from "../components/FilterBar";

export default function Bookings() {
  const [items, setItems] = useState([]);
  const [status, setStatus] = useState("All");
  const [archive, setArchive] = useState("active"); // active | archived | all
  const [search, setSearch] = useState("");
  const navigate = useNavigate();

  const load = () => {
    const params = {};
    if (status !== "All") params.status = status;
    if (archive === "archived") params.include_dispatched = true;
    if (archive === "all") params.include_dispatched = true;
    if (search.trim()) params.q = search.trim();
    api.get("/bookings", { params }).then((r) => {
      let rows = r.data;
      if (archive === "archived") rows = rows.filter((b) => b.dispatched);
      setItems(rows);
    });
  };
  useEffect(load, [status, archive, search]);

  return (
    <div className="space-y-5">
      <SectionTitle
        overline="Operations"
        title="Bookings"
        action={
          <button
            data-testid="booking-add"
            onClick={() => navigate("/bookings/new")}
            className="btn-gold rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> New Booking
          </button>
        }
      />

      <FilterBar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search booking no, customer, phone…"
        filters={[
          {
            key: "status",
            label: "Status",
            value: status,
            onChange: setStatus,
            options: [
              { value: "All", label: "All" },
              { value: "confirmed", label: "Confirmed" },
              { value: "cancelled", label: "Cancelled" },
            ],
          },
          {
            key: "view",
            label: "View",
            value: archive,
            onChange: setArchive,
            options: [
              { value: "active", label: "Active" },
              { value: "archived", label: "Dispatched" },
              { value: "all", label: "Include All" },
            ],
          },
        ]}
      />

      <GlassCard className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-[10px] uppercase tracking-[0.2em] text-white/40">
              <tr className="border-b border-white/5">
                <th className="text-left px-5 py-3">Booking</th>
                <th className="text-left px-5 py-3">Customer</th>
                <th className="text-left px-5 py-3">Items</th>
                <th className="text-right px-5 py-3">Total</th>
                <th className="text-right px-5 py-3">Advance</th>
                <th className="text-right px-5 py-3">Pending</th>
                <th className="text-left px-5 py-3">Status</th>
                <th className="text-left px-5 py-3">Date</th>
                <th className="text-right px-5 py-3">View</th>
              </tr>
            </thead>
            <tbody>
              {items.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center py-10 text-white/50">No bookings.</td>
                </tr>
              )}
              {items.map((b) => (
                <tr
                  key={b.id}
                  data-testid={`booking-row-${b.booking_no}`}
                  onClick={() => navigate(`/bookings/${b.id}`)}
                  className="border-b border-white/5 hover:bg-white/[0.04] cursor-pointer"
                >
                  <td className="px-5 py-4 font-display">
                    <div>{b.booking_no}</div>
                    {b.dispatched && <span className="text-[10px] uppercase tracking-[0.2em] text-emerald-300/80">Dispatched</span>}
                  </td>
                  <td className="px-5 py-4">
                    {b.customer_snapshot?.name}
                    <div className="text-[11px] text-white/40">{b.customer_snapshot?.shop_name || b.customer_snapshot?.phone}</div>
                  </td>
                  <td className="px-5 py-4 text-white/70">{b.items.length}</td>
                  <td className="px-5 py-4 text-right gold-text font-display">₹{Number(b.item_total || 0).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-4 text-right text-white/80">₹{Number(b.advance_received || 0).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-4 text-right">
                    {Number(b.remaining || 0) <= 0
                      ? <Pill tone="success">Paid</Pill>
                      : <span className="text-amber-200">₹{Number(b.remaining || 0).toLocaleString("en-IN")}</span>}
                  </td>
                  <td className="px-5 py-4"><StatusBadge status={b.status} /></td>
                  <td className="px-5 py-4 text-white/60 text-xs">{new Date(b.created_at).toLocaleDateString()}</td>
                  <td className="px-5 py-4 text-right"><Eye className="w-4 h-4 text-white/40" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
