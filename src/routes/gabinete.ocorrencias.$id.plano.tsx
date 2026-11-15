import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronDown, Clock, MapPin, Repeat, Users } from "lucide-react";
import { FIELD_STEPS, useApp } from "@/store/app";
import { fmtTime, INCIDENT_POS, playbook, riskAreas } from "@/mock/data";
import { Chip, Fase2, PageHead, Panel, Sev } from "@/components/reativa/bits";
import { LazyMap } from "@/components/reativa/LazyMap";
import { mc } from "@/components/reativa/mapColors";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gabinete/ocorrencias/$id/plano")({
  head: () => seo("Plano de resposta", "Plano proposto pelo sistema para aprovação do coordenador."),
  component: Plano,
});

function Plano() {
  const { incidents, assignments, resources, blockages, approveRow, approvePlan, swapRow, suggestions, acceptSuggestion, closed, closeEvent, fieldStatus } = useApp();
  const [open, setOpen] = useState<string | null>(null);
  const inc = incidents[0];
  if (!inc) return (
    <Panel><p className="text-sm text-muted-foreground">Nenhuma ocorrência confirmada ainda. <Link to="/gabinete/triagem" className="text-ops underline">Ir para a triagem</Link>.</p></Panel>
  );
  const allApproved = assignments.every((a) => a.status !== "proposta");
  const approver = assignments.find((a) => a.approvedBy);
  const res = (id: string) => resources.find((r) => r.id === id);
  const lineColor = (id: string) => (id === "a1" ? mc.blue() : id === "a2" ? mc.orange() : mc.slate());
  return (
    <div>
      <PageHead phase="2 Resposta" title={`Ocorrência #${inc.id} — ${inc.title}`} right={
        allApproved
          ? <div className="rounded-md border border-success/40 bg-success/10 px-3 py-2 text-sm"><span className="flex items-center gap-1.5 font-medium text-success"><Check className="h-4 w-4" />Plano aprovado</span><span className="text-xs text-muted-foreground">por {approver?.approvedBy} às {approver?.approvedAt && fmtTime(approver.approvedAt)}</span></div>
          : <Button size="lg" onClick={approvePlan}><Check />Aprovar plano</Button>
      } />
      {allApproved && !closed && <div className="mb-4 flex flex-wrap gap-3 border-y py-3">
        {suggestions.filter((s) => s.id === "crisis" && s.status === "pendente").map((s) => <div key={s.id} className="flex flex-wrap items-center gap-3"><b>{s.text}</b><Button size="sm" onClick={() => acceptSuggestion(s.id, true)}>Aceitar</Button><Button size="sm" variant="outline" onClick={() => acceptSuggestion(s.id, false)}>Ignorar</Button></div>)}
        {fieldStatus >= FIELD_STEPS.length - 1 && <Button variant="outline" onClick={closeEvent}>Encerrar e desmobilizar</Button>}
      </div>}
      <div className="mb-4 grid gap-3 rounded-lg border bg-card p-4 sm:grid-cols-2 lg:grid-cols-5">
        <div><div className="text-xs text-muted-foreground">COBRADE</div><div className="font-medium">{inc.cobrade}</div></div>
        <div><div className="text-xs text-muted-foreground">Severidade</div><Sev s={inc.severity} /></div>
        <div><div className="text-xs text-muted-foreground">Local</div><div className="flex items-center gap-1 font-medium"><MapPin className="h-3.5 w-3.5" />{inc.place}</div></div>
        <div><div className="text-xs text-muted-foreground">Vítimas</div><div className="flex items-center gap-1 font-medium"><Users className="h-3.5 w-3.5" />{inc.victims} · {inc.vulnerable.join(", ")}</div></div>
        <div><div className="text-xs text-muted-foreground">Status</div><Chip tone={inc.status === "encerrada" ? "green" : "orange"}>{inc.status}</Chip></div>
      </div>
      <div className="mb-4 rounded-lg border bg-card p-4">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2"><h2 className="text-sm font-semibold">Necessidades</h2><span className="text-xs text-muted-foreground">Fonte: Playbook Inundação · Severo · PLANCON 4.2</span></div>
        <div className="flex flex-wrap gap-2">{playbook["1.2.1.0.0 Inundação"]?.Severo.map((n) => <Chip key={n} tone="blue">{n}</Chip>)}</div>
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_440px]">
        <div className="space-y-3">
          {assignments.map((a) => {
            const r = res(a.resourceId);
            return (
              <div key={a.id} className={cn("rounded-lg border bg-card", a.status !== "proposta" && "border-success/40")}>
                <div className="flex flex-wrap items-start gap-4 p-4">
                  <span className="mt-1 h-10 w-1 rounded" style={{ background: lineColor(a.id) }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-lg font-semibold tabular-nums">{a.resourceId}</span>
                      <span className="text-sm text-muted-foreground">{r?.type} · {a.capability}</span>
                      {a.resourceId.startsWith("CBM") && <><Chip>Espelhado no Sinesp CAD</Chip><Fase2 /></>}
                    </div>
                    <p className="mt-1 text-sm">{a.rationale}</p>
                    {a.approvedBy && a.approvedAt && <p className="mt-2 text-xs text-success">Aprovado por {a.approvedBy} às {fmtTime(a.approvedAt)}</p>}
                  </div>
                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-2xl font-semibold tabular-nums"><Clock className="h-4 w-4 text-muted-foreground" />{a.etaMin}<span className="text-sm font-normal text-muted-foreground">min</span></div>
                    <div className="mt-2 flex justify-end gap-2">
                      {a.status === "proposta" ? (
                        <>
                          <Button size="sm" variant="outline" onClick={() => setOpen(open === a.id ? null : a.id)}><Repeat />Trocar</Button>
                          <Button size="sm" onClick={() => approveRow(a.id)}><Check />Aprovar</Button>
                        </>
                      ) : <Chip tone="green">{a.status === "trocada" ? "trocada e aprovada" : "aprovada"}</Chip>}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" onClick={() => setOpen(open === a.id ? null : a.id)} className="flex w-full items-center gap-1 border-t px-4 py-2 text-xs text-muted-foreground hover:text-foreground">
                  <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", open === a.id && "rotate-180")} />{a.alternatives.length} alternativas consideradas
                </Button>
                {open === a.id && (
                  <ul className="divide-y border-t">
                    {a.alternatives.map((alt, i) => (
                      <li key={alt.resourceId} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-sm">
                        <span><b className="tabular-nums">{alt.resourceId}</b> · ETA {alt.etaMin} min — <span className="text-muted-foreground">{alt.note}</span></span>
                        {a.status === "proposta" && <Button size="sm" variant="ghost" onClick={() => { swapRow(a.id, i); setOpen(null); }}>Usar esta</Button>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
          <p className="text-xs text-muted-foreground">O sistema propõe; o coordenador aprova. Cada decisão fica registrada na linha do tempo.</p>
        </div>
        <LazyMap className="h-[480px] xl:sticky xl:top-24" zoom={15} center={INCIDENT_POS} layers={() => ({
          polygons: riskAreas.map((r) => ({ positions: r.polygon, color: mc.red(), fill: 0.12, label: r.name })),
          lines: assignments.map((a) => ({ positions: a.polyline, color: lineColor(a.id), weight: 5, label: `${a.resourceId} · ${a.id === "a1" ? "rota aquática · " : ""}${a.etaMin} min` })),
          points: [
            { pos: inc.pos, color: mc.red(), radius: 10, label: `Ocorrência #${inc.id}` },
            ...assignments.map((a) => ({ pos: a.polyline[0] ?? inc.pos, color: lineColor(a.id), label: a.resourceId })),
            ...blockages.map((b) => ({ pos: b.pos, color: mc.navy(), radius: 9, label: `Bloqueio: ${b.desc}` })),
          ],
        })} />
      </div>
    </div>
  );
}
