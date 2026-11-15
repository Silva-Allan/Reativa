import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import type { ReactNode } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import type { Severity } from "@/mock/data";

export function Fase2({ label = "Via convênio · fase 2" }: { label?: string }) {
  return <span className="inline-flex items-center rounded border border-dashed border-muted-foreground/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{label}</span>;
}
const sevCls: Record<Severity, string> = {
  Extremo: "bg-sev-extremo text-paper", Severo: "bg-sev-severo text-navy", Moderado: "bg-sev-moderado text-navy", Menor: "bg-sev-menor text-navy",
};
export function Sev({ s }: { s: Severity }) {
  return <span className={cn("inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold", sevCls[s])}>{s}</span>;
}
export function Chip({ children, tone = "muted" }: { children: ReactNode; tone?: "muted" | "blue" | "red" | "green" | "orange" }) {
  const t = { muted: "bg-muted text-muted-foreground", blue: "bg-ops/15 text-ops", red: "bg-signal/15 text-signal", green: "bg-success/15 text-success", orange: "bg-sev-severo/20 text-sev-severo" }[tone];
  return <span className={cn("inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-medium", t)}>{children}</span>;
}
export function Panel({ title, action, children, className }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-lg border bg-card text-card-foreground", className)}>
      {title && (
        <header className="flex items-center justify-between gap-2 border-b px-4 py-2.5">
          <h2 className="text-sm font-semibold">{title}</h2>
          {action}
        </header>
      )}
      <div className="p-4">{children}</div>
    </section>
  );
}
export function PageHead({ phase, title, sub, right }: { phase: string; title: string; sub?: string; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <div className="label-phase text-muted-foreground">{phase}</div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {sub && <p className="text-sm text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </div>
  );
}
export function Kpi({ label, value, hint, tone }: { label: string; value: ReactNode; hint?: ReactNode; tone?: "red" | "blue" | undefined }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn("mt-1 text-2xl font-semibold tabular-nums", tone === "red" && "text-signal", tone === "blue" && "text-ops")}>{value}</div>
      {hint && <div className="mt-0.5 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
/** Number with clickable provenance: shows the source records it was computed from. */
export function Prov({ value, title, sources }: { value: ReactNode; title: string; sources: { label: string; meta?: string; to?: "/gabinete/imagens" }[] }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto rounded border-b border-dashed border-ops px-0.5 py-0 font-semibold text-ops tabular-nums hover:bg-ops/10">{value}</Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 text-sm">
        <div className="label-phase mb-2 text-muted-foreground">Origem do dado · {title}</div>
        <ul className="space-y-1.5">
          {sources.map((s, i) => (
            <li key={i} className="rounded border px-2 py-1.5">
              <div>{s.label}</div>
              {s.to && <Link to={s.to} className="block text-xs text-ops">Abrir imagem vinculada →</Link>}
              {s.meta && <div className="text-xs text-muted-foreground">{s.meta}</div>}
            </li>
          ))}
          {!sources.length && <li className="text-muted-foreground">Nenhum registro.</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}
