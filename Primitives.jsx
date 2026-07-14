export function GlassCard({ children, className = "", ...rest }) {
  return (
    <div {...rest} className={`glass rounded-3xl p-6 shadow-[0_8px_32px_rgba(0,0,0,0.4)] ${className}`}>
      {children}
    </div>
  );
}

export function StatCard({ label, value, hint, icon: Icon, accent = false, testid }) {
  return (
    <div data-testid={testid} className={`glass rounded-2xl p-5 flex flex-col gap-3 transition-all hover:bg-white/[0.07] ${accent ? "border-[#d4af37]/30" : ""}`}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-[0.25em] text-white/40">{label}</span>
        {Icon && <Icon className={`w-4 h-4 ${accent ? "text-[#ebd281]" : "text-white/40"}`} />}
      </div>
      <div className={`font-display text-3xl ${accent ? "gold-text" : "text-white"} tracking-tight`}>{value}</div>
      {hint && <div className="text-xs text-white/50">{hint}</div>}
    </div>
  );
}

export function Pill({ children, tone = "default", className = "" }) {
  const tones = {
    default: "bg-white/10 text-white/80 border-white/10",
    gold: "bg-[#d4af37]/15 text-[#ebd281] border-[#d4af37]/30",
    success: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    warning: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    danger: "bg-red-500/15 text-red-300 border-red-500/30",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] uppercase tracking-[0.2em] border ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function SectionTitle({ overline, title, action }) {
  return (
    <div className="flex items-end justify-between mb-4">
      <div>
        {overline && <div className="text-[10px] uppercase tracking-[0.3em] text-white/40 mb-1">{overline}</div>}
        <h2 className="font-display text-2xl sm:text-3xl tracking-tight">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ title, subtitle, action }) {
  return (
    <div className="glass rounded-3xl p-10 text-center">
      <div className="font-display text-lg mb-2">{title}</div>
      {subtitle && <div className="text-sm text-white/50 mb-4">{subtitle}</div>}
      {action}
    </div>
  );
}
