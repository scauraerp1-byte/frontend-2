import { NavLink, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Package, Users, ClipboardList, Truck, FileText,
  RotateCcw, BarChart3, History as HistoryIcon, Settings, LogOut,
  ScanLine, Menu, X, UserCog, User as UserIcon, Sun, Moon,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { useBranding } from "../contexts/BrandingContext";
import { useTheme } from "../contexts/ThemeContext";
import FloatingFAB from "./FloatingFAB";
import NotificationBell from "./NotificationBell";

const SIDE = [
  { to: "/", icon: LayoutDashboard, label: "Home", roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/products", icon: Package, label: "Products", roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/customers", icon: Users, label: "Customers", roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/bookings", icon: ClipboardList, label: "Bookings", roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/dispatch", icon: Truck, label: "Dispatch", roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/estimates", icon: FileText, label: "Estimates", roles: ["admin", "manager", "staff", "super_staff"] },
  { to: "/vendor-returns", icon: RotateCcw, label: "Vendor Returns", roles: ["admin", "super_staff"] },
  { to: "/analytics", icon: BarChart3, label: "Analytics", roles: ["admin", "manager"] },
  { to: "/history", icon: HistoryIcon, label: "History", roles: ["admin", "manager"] },
  { to: "/users", icon: UserCog, label: "Users", roles: ["admin"] },
  { to: "/settings", icon: Settings, label: "Settings", roles: ["admin"] },
];

const BOTTOM = [
  { to: "/", icon: LayoutDashboard, label: "Home" },
  { to: "/products", icon: Package, label: "Products" },
  { to: "/bookings", icon: ClipboardList, label: "Bookings" },
  { to: "/dispatch", icon: Truck, label: "Dispatch" },
];

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const { branding } = useBranding();
  const { theme, toggle: toggleTheme } = useTheme();
  const navigate = useNavigate();
  const loc = useLocation();
  const [drawer, setDrawer] = useState(false);

  const handleLogout = async () => { await logout(); navigate("/login"); };
  const allowed = (r) => !r || r.includes(user.role);
  const brandName = branding?.company_name || "SC Aura Kurtis";
  const logo = branding?.logo_url;

  return (
    <div className="min-h-screen flex bg-black text-white">
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-60 flex-col border-r border-white/5 bg-black/40 backdrop-blur-xl">
        <div className="px-5 py-6 flex items-center gap-3">
          {logo ? (
            <img src={logo} alt="logo" className="w-10 h-10 rounded-full object-cover ring-1 ring-[#d4af37]/40" />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ebd281] to-[#997a15] grid place-items-center font-display text-black font-semibold">SC</div>
          )}
          <div className="min-w-0">
            <div className="font-display text-sm tracking-tight truncate">{brandName}</div>
            <div className="text-[9px] uppercase tracking-[0.28em] text-white/40">Wholesale ERP</div>
          </div>
        </div>
        <nav className="flex-1 px-2 space-y-0.5 overflow-y-auto scroll-hide">
          {SIDE.filter((i) => allowed(i.roles)).map((item) => {
            const Icon = item.icon;
            const active = loc.pathname === item.to || (item.to !== "/" && loc.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                data-testid={`sidebar-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                  active
                    ? "bg-[#d4af37]/10 text-[#ebd281] border border-[#d4af37]/30"
                    : "text-white/70 hover:bg-white/5 hover:text-white border border-transparent"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-white/5">
          <div onClick={() => navigate("/profile")} className="glass rounded-2xl p-3 flex items-center gap-3 cursor-pointer hover:bg-white/[0.07] transition" data-testid="sidebar-profile-link">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#ebd281] to-[#997a15] grid place-items-center text-black font-semibold text-sm">
              {(user?.name || "?").charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{user?.name}</div>
              <div className="text-[10px] uppercase tracking-[0.25em] text-[#ebd281]/80">{(user?.role || "").replace("_", " ")}</div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleLogout(); }} data-testid="logout-btn" className="text-white/50 hover:text-white">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      {drawer && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/70 backdrop-blur-md" onClick={() => setDrawer(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-black border-r border-white/10 p-4 fade-up" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div className="font-display text-lg">{brandName}</div>
              <button onClick={() => setDrawer(false)} className="text-white/60"><X className="w-5 h-5" /></button>
            </div>
            <nav className="space-y-1">
              {SIDE.filter((i) => allowed(i.roles)).map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    data-testid={`drawer-nav-${item.label.toLowerCase().replace(/\s+/g, "-")}`}
                    onClick={() => setDrawer(false)}
                    className={({ isActive }) => `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors ${
                      isActive ? "bg-[#d4af37]/10 text-[#ebd281] border border-[#d4af37]/30" : "text-white/70 hover:bg-white/5 border border-transparent"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </NavLink>
                );
              })}
              <button onClick={handleLogout} className="w-full mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm bg-red-500/10 text-red-200">
                <LogOut className="w-4 h-4" /> <span>Logout</span>
              </button>
            </nav>
          </div>
        </div>
      )}

      {/* Main column */}
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 px-4 lg:px-7 py-3.5 bg-black/65 backdrop-blur-xl border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3 lg:hidden">
            <button onClick={() => setDrawer(true)} data-testid="mobile-drawer-toggle" className="w-9 h-9 rounded-full glass grid place-items-center">
              <Menu className="w-4 h-4" />
            </button>
            {logo ? (
              <img src={logo} alt="logo" className="w-8 h-8 rounded-full object-cover ring-1 ring-[#d4af37]/40" />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#ebd281] to-[#997a15] grid place-items-center font-display text-black font-semibold text-xs">SC</div>
            )}
            <div className="font-display text-sm truncate max-w-[140px]">{brandName}</div>
          </div>
          <div className="hidden lg:block">
            <div className="text-[10px] uppercase tracking-[0.28em] text-white/40">{titleOverline(user?.role)}</div>
            <div className="font-display text-xl tracking-tight">{getPageTitle(loc.pathname)}</div>
          </div>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              onClick={toggleTheme}
              data-testid="topbar-theme"
              title="Toggle theme"
              className="hidden md:grid w-9 h-9 place-items-center rounded-full glass hover:bg-white/10 transition"
            >
              {theme === "dark" ? <Sun className="w-4 h-4 text-[#ebd281]" /> : <Moon className="w-4 h-4 text-[#ebd281]" />}
            </button>
            <button
              onClick={() => navigate("/profile")}
              data-testid="topbar-profile"
              title="My profile"
              className="w-9 h-9 grid place-items-center rounded-full bg-gradient-to-br from-[#ebd281] to-[#997a15] text-black text-xs font-semibold"
            >
              {(user?.name || "?").charAt(0).toUpperCase()}
            </button>
          </div>
        </header>

        <main className="flex-1 px-4 lg:px-7 py-5 pb-32 lg:pb-10 fade-up">
          {children}
        </main>

        {/* Mobile bottom nav (no FAB inline — the global FloatingFAB handles creation) */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-30 px-3 pb-4 pt-2 bg-black/75 backdrop-blur-xl border-t border-white/10">
          <div className="grid grid-cols-4 gap-1 max-w-md mx-auto">
            {BOTTOM.map((item) => <BottomItem key={item.to} item={item} />)}
          </div>
        </nav>
      </div>

      {/* Global floating action button (universal Plus) */}
      <FloatingFAB />
    </div>
  );
}

function BottomItem({ item }) {
  const loc = useLocation();
  const active = loc.pathname === item.to || (item.to !== "/" && loc.pathname.startsWith(item.to));
  const Icon = item.icon;
  return (
    <NavLink to={item.to}
      data-testid={`bottom-nav-${item.label.toLowerCase()}`}
      className={`flex flex-col items-center gap-1 py-1.5 rounded-xl ${active ? "text-[#ebd281]" : "text-white/55"}`}>
      <Icon className="w-5 h-5" />
      <span className="text-[10px] uppercase tracking-[0.2em]">{item.label}</span>
    </NavLink>
  );
}

function titleOverline(role) {
  if (role === "admin") return "Super Admin";
  if (role === "manager") return "Manager Console";
  if (role === "super_staff") return "Super Staff";
  return "Operations";
}

function getPageTitle(path) {
  if (path === "/") return "Dashboard";
  if (path.startsWith("/products/new")) return "Add Product";
  if (path.startsWith("/products")) return "Inventory";
  if (path.startsWith("/customers")) return "Customers";
  if (path.startsWith("/bookings/new")) return "New Booking";
  if (path.startsWith("/bookings")) return "Bookings";
  if (path.startsWith("/dispatch/new")) return "New Dispatch";
  if (path.startsWith("/dispatch")) return "Dispatch";
  if (path.startsWith("/estimates/new")) return "New Estimate";
  if (path.startsWith("/estimates")) return "Estimates";
  if (path.startsWith("/vendor-returns/new")) return "New Vendor Return";
  if (path.startsWith("/vendor-returns")) return "Vendor Returns";
  if (path.startsWith("/analytics")) return "Analytics";
  if (path.startsWith("/history")) return "History";
  if (path.startsWith("/users")) return "User Management";
  if (path.startsWith("/profile")) return "My Profile";
  if (path.startsWith("/settings")) return "Settings";
  return "SC Aura";
}
