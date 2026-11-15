import { useEffect, useRef } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Bell, FastForward, Pause, Play } from "lucide-react";
import { toast } from "sonner";
import { at, fmtTime } from "@/mock/data";
import { nextEventAt, nextHumanTask, SPEEDS, useApp } from "@/store/app";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const fmtDay = (clock: number) => new Date(at(clock)).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
const ghost = "h-7 text-sidebar-foreground hover:bg-sidebar-border hover:text-sidebar-accent-foreground";

/** Drives the scenario clock (1 real second per tick) and turns fresh notifications into toasts. */
export function ScenarioRuntime({ audience }: { audience: boolean }) {
  const navigate = useNavigate();
  const notifications = useApp((s) => s.notifications);
  useEffect(() => {
    const id = setInterval(() => useApp.getState().tick(1), 1000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    const fresh = notifications.filter((n) => n.fresh);
    if (!fresh.length) return;
    if (!audience) {
      for (const n of [...fresh].reverse()) {
        const show = n.level === "crit" ? toast.error : n.level === "warn" ? toast.warning : toast.info;
        show(n.text, { description: fmtTime(n.at), action: { label: "Abrir", onClick: () => { useApp.getState().markRead(n.id); navigate({ to: n.to }); } } });
      }
    }
    useApp.getState().ackFresh();
  }, [notifications, audience, navigate]);
  return null;
}

/** Scenario time with play/pause, speed and "next event" controls. */
export function ClockBar({ compact }: { compact?: boolean }) {
  const s = useApp();
  const lastSpeed = useRef(3);
  const running = s.speed > 0;
  const next = nextEventAt(s);
  const toggle = () => {
    if (running) { lastSpeed.current = s.speed; s.setSpeed(0); } else s.setSpeed(lastSpeed.current || 3);
  };
  return (
    <div className="flex shrink-0 items-center gap-1 rounded-md border border-sidebar-border bg-sidebar-accent/60 px-1 py-0.5">
      <Button size="icon" variant="ghost" className={cn(ghost, "w-7")} onClick={toggle} aria-label={running ? "Pausar relógio do cenário" : "Iniciar relógio do cenário"} title={running ? "Pausar" : "Iniciar o relógio do cenário"}>
        {running ? <Pause /> : <Play />}
      </Button>
      <span className="px-1 text-sm font-semibold tabular-nums text-sidebar-accent-foreground" title="Relógio do cenário">
        {fmtTime(at(s.clock))}{!compact && <span className="ml-1 text-[10px] font-normal text-sidebar-foreground">{fmtDay(s.clock)}</span>}
      </span>
      {!compact && <div className="flex" role="group" aria-label="Velocidade do cenário">
        {SPEEDS.slice(1).map((sp, i) => (
          <Button key={sp.label} size="sm" variant="ghost" aria-pressed={s.speed === i + 1} onClick={() => s.setSpeed(i + 1)} className={cn(ghost, "px-1.5 text-[11px]", s.speed === i + 1 && "bg-sidebar-border text-sidebar-accent-foreground")}>{sp.label}</Button>
        ))}
      </div>}
      <Button size="icon" variant="ghost" className={cn(ghost, "w-7")} onClick={s.skipToNextEvent} disabled={next === null} aria-label="Avançar para o próximo evento" title={next === null ? "Nenhum evento programado: o cenário aguarda uma decisão" : `Próximo evento às ${fmtTime(at(next))}`}>
        <FastForward />
      </Button>
    </div>
  );
}

const dot = { crit: "bg-signal", warn: "bg-sev-severo", info: "bg-ops" } as const;
export function NotificationBell() {
  const { notifications, markRead, markAllRead } = useApp();
  const navigate = useNavigate();
  const unread = notifications.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="icon" variant="ghost" className={cn(ghost, "relative h-8 w-8")} aria-label={`Notificações${unread ? `: ${unread} não lidas` : ""}`}>
          <Bell />
          {unread > 0 && <span className="absolute -right-0.5 -top-0.5 min-w-4 rounded-full bg-signal px-1 text-[10px] font-semibold leading-4 text-paper tabular-nums">{unread}</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="z-[1100] w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificações</span>
          {unread > 0 && <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={markAllRead}>Marcar todas como lidas</Button>}
        </div>
        <ul className="max-h-96 divide-y overflow-y-auto">
          {notifications.map((n) => (
            <li key={n.id}>
              <button type="button" onClick={() => { markRead(n.id); navigate({ to: n.to }); }} className={cn("flex w-full items-start gap-2 px-3 py-2 text-left text-sm hover:bg-muted", n.read && "text-muted-foreground")}>
                <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-muted-foreground/40" : dot[n.level])} />
                <span className="min-w-0 flex-1">{n.text}<span className="block text-xs text-muted-foreground tabular-nums">{fmtTime(n.at)}</span></span>
              </button>
            </li>
          ))}
          {!notifications.length && <li className="px-3 py-6 text-center text-sm text-muted-foreground">Nenhuma notificação. Inicie o relógio para o cenário avançar.</li>}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** "What the coordinator owes right now", shown above every coordinator page. */
export function AgendaStrip() {
  const s = useApp();
  const task = nextHumanTask(s);
  const next = nextEventAt(s);
  if (task) return (
    <Link to={task.to} className="mb-4 flex items-center justify-between gap-3 rounded-md border border-sev-severo/50 bg-sev-severo/10 px-3 py-2 text-sm hover:border-sev-severo">
      <span><span className="mr-2 text-xs font-semibold uppercase tracking-wide text-sev-severo">Aguardando você</span>{task.text}</span>
      <span className="text-sev-severo">Abrir →</span>
    </Link>
  );
  if (s.speed === 0 && next !== null) return (
    <div className="mb-4 rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
      Relógio do cenário pausado às {fmtTime(at(s.clock))}. Use ▶ no topo para o tempo andar, ou ⏩ para ir ao próximo evento ({fmtTime(at(next))}).
    </div>
  );
  return null;
}
