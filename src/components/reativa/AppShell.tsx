import { useEffect, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { AlertTriangle, BarChart3, BellRing, BookOpen, ChevronLeft, ChevronRight, ClipboardList, FileText, History, Home, Map, ScanLine, Inbox, ListChecks, RotateCcw, ShieldCheck, Truck, Wrench } from "lucide-react";
import { useApp } from "@/store/app";
import { stepNames, stepRoutes, type Role, type Stage } from "@/mock/data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const phases = [
  { label: "0 Prontidão", items: [
    { to: "/gabinete/prontidao", label: "Prontidão", icon: ShieldCheck },
    { to: "/orgao/recursos", label: "Recursos do órgão", icon: Truck },
    { to: "/gabinete/risco", label: "Gêmeo digital · risco", icon: Map },
    { to: "/gabinete/playbooks", label: "Playbooks", icon: BookOpen },
  ] },
  { label: "1 Gatilho", items: [{ to: "/gabinete/alertas", label: "Alertas", icon: BellRing }] },
  { label: "2 Resposta", items: [
    { to: "/gabinete/mapa", label: "Mapa operacional", icon: Map },
    { to: "/gabinete/imagens", label: "Imagens e sensoriamento", icon: ScanLine },
    { to: "/gabinete/triagem", label: "Triagem", icon: Inbox },
    { to: "/gabinete/ocorrencias/$id/plano", params: { id: "1" }, label: "Plano · Ocorrência #1", icon: ListChecks },
    { to: "/orgao/tarefas", label: "Tarefas do órgão", icon: ClipboardList },
  ] },
  { label: "3 Assistência", items: [
    { to: "/gabinete/abrigos", label: "Abrigos e estoques", icon: Home },
    { to: "/orgao/danos", label: "Registro de danos", icon: Wrench },
  ] },
  { label: "4 Relatórios", items: [
    { to: "/relatorios", label: "Documentos", icon: FileText },
    { to: "/gabinete/linha-do-tempo", label: "Linha do tempo", icon: History },
  ] },
] as const;

const stageCls: Record<Stage, string> = {
  Normalidade: "bg-success/20 text-success", Atenção: "bg-sev-moderado/25 text-sev-moderado", Alerta: "bg-sev-severo/25 text-sev-severo", Crise: "bg-signal text-paper",
};
const roleHome: Record<Role, string> = { Coordenador: "/gabinete/prontidao", "Operador de órgão": "/orgao/recursos", "Equipe de campo": "/campo", Cidadão: "/cidadao" };

function DemoControls({ compact }: { compact?: boolean }) {
  const { step, applyStep } = useApp();
  const navigate = useNavigate();
  const go = (n: number) => {
    const k = Math.max(0, Math.min(9, n));
    applyStep(k);
    navigate({ to: stepRoutes[k] as string });
  };
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName) || t.isContentEditable) return;
      if (e.key === "ArrowRight") go(useApp.getState().step + 1);
      if (e.key === "ArrowLeft") go(useApp.getState().step - 1);
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  });
  return (
    <div className="flex items-center gap-1 rounded-md border border-sidebar-border bg-sidebar-accent/60 px-1 py-0.5">
      <Button size="icon" variant="ghost" className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-border hover:text-sidebar-accent-foreground" onClick={() => go(step - 1)} disabled={step === 0} aria-label="Voltar"><ChevronLeft /></Button>
      <span className={cn("px-1 text-xs tabular-nums text-sidebar-accent-foreground", compact ? "w-[90px] truncate" : "w-[340px] truncate")}>
        Passo {step}/9{!compact && <span className="text-sidebar-foreground"> — {stepNames[step]}</span>}
      </span>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-border hover:text-sidebar-accent-foreground" onClick={() => go(step + 1)} disabled={step === 9} aria-label="Próximo"><ChevronRight /></Button>
      <Button size="icon" variant="ghost" className="h-7 w-7 text-sidebar-foreground hover:bg-sidebar-border hover:text-sidebar-accent-foreground" onClick={() => go(0)} aria-label="Reiniciar"><RotateCcw /></Button>
    </div>
  );
}

function TopBar({ mobile, audience = false }: { mobile: boolean; audience?: boolean }) {
  const { stage, role, setRole } = useApp();
  const navigate = useNavigate();
  return (
    <header className="flex flex-wrap items-center gap-x-3 gap-y-2 bg-sidebar px-3 py-2 text-sidebar-foreground">
      <Link to="/gabinete/prontidao" className="flex items-center gap-2">
        <img src="/reativa-icon.png" alt="" className="h-8 w-8 rounded-full" />
        <span className="text-base font-semibold tracking-tight text-sidebar-accent-foreground">Reativa</span>
      </Link>
      {!audience && <>
      <span className="hidden text-xs sm:inline">Vale Sereno (município fictício)</span>
      <span className={cn("rounded px-2 py-0.5 text-xs font-semibold", stageCls[stage])}>{stage}</span>
      <span className="flex items-center gap-1.5 text-xs font-medium text-sidebar-accent-foreground"><span className="live-dot" />ao vivo</span>
      <div className="ml-auto flex flex-wrap items-center gap-2">
        <DemoControls compact={mobile} />
        <Select value={role} onValueChange={(v) => { setRole(v as Role); navigate({ to: roleHome[v as Role] }); }}>
          <SelectTrigger className="h-8 w-[170px] border-sidebar-border bg-sidebar-accent text-xs text-sidebar-accent-foreground"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(roleHome) as Role[]).map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      </>}
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const mobileOnly = path.startsWith("/campo") || path.startsWith("/cidadao") || path.startsWith("/login");
  const isActive = (to: string) => path === to.replace("$id", "1") || (to === "/relatorios" && path.startsWith("/relatorios"));

  const banner = <div className="no-print bg-signal py-0.5 text-center text-[11px] font-medium text-paper">Protótipo — dados fictícios</div>;

  if (mobileOnly) {
    return (
      <div className="min-h-screen bg-background">
        <div className="no-print sticky top-0 z-[1000]">{banner}<TopBar mobile audience={path.startsWith("/cidadao")} /></div>
        <main className="mx-auto max-w-[420px] px-4 py-4">{children}</main>
      </div>
    );
  }
  return (
    <div className="dark min-h-screen bg-background text-foreground">
      <div className="no-print sticky top-0 z-[1000]">{banner}<TopBar mobile={false} /></div>
      <div className="flex">
        <aside className="no-print sticky top-[78px] hidden h-[calc(100vh-78px)] w-56 shrink-0 overflow-y-auto border-r border-sidebar-border bg-sidebar px-2 py-3 md:block">
          {phases.map((ph) => (
            <div key={ph.label} className="mb-4">
              <div className="label-phase px-2 pb-1 text-sidebar-foreground/60">{ph.label}</div>
              {ph.items.map((it) => (
                <Link key={it.to} to={it.to} {...("params" in it ? { params: it.params } : {})} className={cn("flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent", isActive(it.to) && "bg-sidebar-accent font-medium text-sidebar-accent-foreground")}>
                  <it.icon className="h-4 w-4" />{it.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="label-phase px-2 pb-1 text-sidebar-foreground/60">Outros perfis</div>
          <Link to="/campo" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"><Truck className="h-4 w-4" />Equipe de campo</Link>
          <Link to="/cidadao" className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"><AlertTriangle className="h-4 w-4" />Cidadão</Link>
        </aside>
        <main className="min-w-0 flex-1 p-4 pb-24 md:p-6 md:pb-6">{children}</main>
      </div>
      <nav className="no-print fixed inset-x-0 bottom-0 z-[1000] flex justify-around border-t border-sidebar-border bg-sidebar py-1.5 md:hidden">
        {[{ to: "/gabinete/prontidao", l: "Prontidão", i: ShieldCheck }, { to: "/gabinete/alertas", l: "Gatilho", i: BellRing }, { to: "/gabinete/triagem", l: "Resposta", i: Inbox }, { to: "/gabinete/abrigos", l: "Assistência", i: Home }, { to: "/relatorios", l: "Relatórios", i: BarChart3 }].map((x) => (
          <Link key={x.to} to={x.to} className={cn("flex flex-col items-center gap-0.5 px-2 text-[10px] text-sidebar-foreground", isActive(x.to) && "text-sidebar-accent-foreground")}>
            <x.i className="h-5 w-5" />{x.l}
          </Link>
        ))}
      </nav>
    </div>
  );
}
