import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { Plus, Share2, Filter, Search, X, Printer } from "lucide-react";
import ShareCatalogueButton from "../components/ShareCatalogueButton";
import ProductFilterSheet from "../components/ProductFilterSheet";

const CATEGORIES = [
  { value: "All", label: "All" }, { value: "1 PC", label: "1 PC" },
  { value: "2 PC", label: "2 PC" }, { value: "3 PC", label: "3 PC" },
];
const SORTS = [
  { value: "recently_added", label: "Recently Added" },
  { value: "fast_selling", label: "Fast Selling" },
  { value: "slow_selling", label: "Slow Selling" },
  { value: "low_stock", label: "Low Stock" },
  { value: "price_asc", label: "Price ↑" },
  { value: "price_desc", label: "Price ↓" },
];

export default function Products() {
  const [items, setItems] = useState([]);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("All");
  const [sort, setSort] = useState("recently_added");
  const [vendor, setVendor] = useState("All");
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);
  const navigate = useNavigate();

  const load = async () => {
    setLoading(true);
    const params = { sort };
    if (q) params.q = q;
    if (cat !== "All") params.category = cat;
    if (vendor !== "All") params.vendor = vendor;
    const { data } = await api.get("/products", { params });
    setItems(data);
    setLoading(false);
  };

  useEffect(() => { api.get("/products/vendors-list").then((r) => setVendors(r.data)); }, []);
  useEffect(() => {
    // Debounce search + filter changes.
    const t = setTimeout(load, 200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, cat, sort, vendor]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (cat !== "All") n += 1;
    if (sort !== "recently_added") n += 1;
    if (vendor !== "All") n += 1;
    return n;
  }, [cat, sort, vendor]);

  const filterGroups = [
    { key: "cat", label: "Category", value: cat, onChange: setCat, options: CATEGORIES },
    { key: "sort", label: "Sort by", value: sort, onChange: setSort, options: SORTS },
    ...(vendors.length > 0
      ? [{ key: "vendor", label: "Vendor", value: vendor, onChange: setVendor, options: [{ value: "All", label: "All" }, ...vendors.map((v) => ({ value: v, label: v }))] }]
      : []),
  ];

  const reset = () => { setCat("All"); setSort("recently_added"); setVendor("All"); };

  return (
    <div className="space-y-5">
      <SectionTitle overline="Inventory" title="Products" action={
        <div className="flex items-center gap-2">
          <button
            data-testid="products-qr-print"
            onClick={() => navigate("/products/qr-print")}
            className="rounded-full bg-white/5 border border-white/10 px-4 py-2.5 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2"
            title="Bulk QR Print"
          >
            <Printer className="w-4 h-4 text-[#ebd281]" /> <span className="hidden sm:inline">QR Print</span>
          </button>
          <button data-testid="products-add" onClick={() => navigate("/products/new")} className="btn-gold rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Add Product</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      } />

      {/* Search + single Filter button. Everything else is folded into the sheet. */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <input
            data-testid="products-search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by SR or product name…"
            className="aura-input pl-10"
          />
          {q && (
            <button onClick={() => setQ("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white" aria-label="Clear">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          data-testid="products-filter-open"
          onClick={() => setFilterOpen(true)}
          className="rounded-full bg-white/5 border border-white/10 px-4 py-3 text-xs uppercase tracking-[0.2em] hover:bg-white/10 inline-flex items-center gap-2 relative"
        >
          <Filter className="w-4 h-4 text-[#ebd281]" />
          <span className="hidden sm:inline">Filter</span>
          {activeFilterCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-[#d4af37] text-black text-[10px] font-bold grid place-items-center px-1">{activeFilterCount}</span>
          )}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <div key={i} className="aspect-[3/4] rounded-2xl shimmer" />)}
        </div>
      ) : items.length === 0 ? (
        <GlassCard className="text-center py-12">
          <div className="font-display text-lg">No products match</div>
          <div className="text-sm text-white/50 mt-1">Try clearing filters or add a new product.</div>
        </GlassCard>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {items.map(p => <ProductTile key={p.id} p={p} />)}
        </div>
      )}

      <ProductFilterSheet
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onReset={reset}
        groups={filterGroups}
      />
    </div>
  );
}

function ProductTile({ p }) {
  const total = p.quantity;
  const tone = total <= 10 ? "danger" : total <= 25 ? "warning" : "gold";
  const shared = !!p.last_shared_at;
  return (
    <Link to={`/products/${p.id}`} data-testid={`product-tile-${p.sr_number}`} className="glass rounded-2xl overflow-hidden block group relative">
      <div className="aspect-[3/4] bg-white/5 overflow-hidden relative">
        {p.images?.[0] ? <img src={p.images[0]} className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform" alt="" /> : <div className="w-full h-full grid place-items-center text-white/30 text-xs">No image</div>}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          <Pill tone="default">{p.category}</Pill>
          {shared && <Pill tone="success"><Share2 className="w-2.5 h-2.5" /> Shared</Pill>}
        </div>
        <div className="absolute top-2 right-2"><Pill tone={tone}>{total} pcs</Pill></div>
        <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <ShareCatalogueButton product={p} variant="icon" />
        </div>
      </div>
      <div className="p-3">
        <div className="text-[10px] uppercase tracking-[0.2em] text-[#ebd281]">{p.sr_number}</div>
        <div className="text-sm mt-0.5 truncate">{p.title}</div>
        <div className="flex items-center justify-between mt-1">
          <span className="text-xs text-white/50">{p.size_preset}</span>
          <span className="font-display text-base gold-text">₹{Number(p.price).toLocaleString("en-IN")}</span>
        </div>
      </div>
    </Link>
  );
}
