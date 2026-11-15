import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/store/app";
import { fmtTime } from "@/mock/data";
import { Kpi, PageHead, Panel } from "@/components/reativa/bits";
import { selectMetrics, selectAssistance } from "@/store/selectors";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gabinete/linha-do-tempo")({
  head: () => seo("Linha do tempo", "Registro de auditoria e métricas de resposta do evento."),
  component: Timeline,
});
function Timeline() {
  const state = useApp();
  const { audit, assignments } = state;
  const metrics = selectMetrics(state);
  const assistance = selectAssistance(state);
  return (
    <div>
      <PageHead phase="4 Relatórios" title="Linha do tempo e métricas" />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Kpi label="Relato → plano aprovado" value={metrics.reportToPlan !== null ? `${metrics.reportToPlan} min` : "—"} hint={metrics.first && metrics.approval ? `${fmtTime(metrics.first.at)} → ${fmtTime(metrics.approval.at)}` : "Sem aprovação registrada"} tone="blue" />
        <Kpi label="Plano → equipe no local" value={metrics.planToArrival !== null ? `${metrics.planToArrival} min` : "—"} hint={metrics.approval && metrics.arrival ? `CBM-B07 · ${fmtTime(metrics.approval.at)} → ${fmtTime(metrics.arrival.at)}` : "CBM-B07"} tone="blue" />
        <Kpi label="Linhas aprovadas sem alteração" value={assignments.length ? `${metrics.unchanged}%` : "—"} hint={`${assignments.length} linhas no plano`} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-3"><Kpi label="Desabrigados" value={assistance.homeless} /><Kpi label="Desalojados com parentes" value={assistance.displaced} /></div>
      <Panel title={`${audit.length} eventos registrados`}>
        <ol className="relative ml-2 border-l">
          {[...audit].reverse().map((e, i) => (
            <li key={i} className="mb-3 ml-4">
              <span className="absolute -left-[5px] mt-1.5 h-2.5 w-2.5 rounded-full bg-ops" />
              <div className="text-xs tabular-nums text-muted-foreground">{fmtTime(e.at)} · {e.actor}</div>
              <div className="text-sm">{e.action}</div>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}
