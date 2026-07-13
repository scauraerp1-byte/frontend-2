import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "../lib/api";
import { GlassCard, Pill, SectionTitle } from "../components/Primitives";
import { Plus, Share2 } from "lucide-react";
import ShareCatalogueButton from "../components/ShareCatalogueButton";
import FilterBar from "../components/FilterBar";

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
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [q, cat, sort, vendor]);

  return (
    <div className="space-y-5">
      <SectionTitle overline="Inventory" title="Products" action={
        <button data-testid="products-add" onClick={() => navigate("/products/new")} className="btn-gold rounded-full px-5 py-2.5 text-xs uppercase tracking-[0.2em] inline-flex items-center gap-2">
          <Plus className="w-4 h-4" /> Add Product
        </button>
      } />

      <FilterBar
        search={q}
        onSearchChange={setQ}
        searchPlaceholder="Search by SR or product name…"
        filters={[
          { key: "cat", label: "Category", value: cat, onChange: setCat, options: CATEGORIES },
          { key: "sort", label: "Sort", value: sort, onChange: setSort, options: SORTS },
          ...(vendors.length > 0
            ? [{ key: "vendor", label: "Vendor", value: vendor, onChange: setVendor, options: [{ value: "All", label: "All" }, ...vendors.map((v) => ({ value: v, label: v }))] }]
            : []),
        ]}
      />

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
