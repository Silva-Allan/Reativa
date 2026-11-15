import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp, isCheckInLate } from "@/store/app";
import { agencies, rainSeries, RAIN_THRESHOLD, riskAreas, riverLine, fmtDateTime } from "@/mock/data";
import { Kpi, PageHead, Panel, Chip } from "@/components/reativa/bits";
import { LazyMap } from "@/components/reativa/LazyMap";
import { mc } from "@/components/reativa/mapColors";
import { selectAssistance } from "@/store/selectors";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gabinete/prontidao")({
  head: () => seo("Prontidão", "Recursos, check-in de turno, abrigos e áreas de risco de Vale Sereno."),
  component: Prontidao,
});

function Prontidao() {
  const state = useApp();
  const { resources, shelters, step, stage, floodExtent } = state;
  const avail = resources.filter((r) => r.status === "disponível").length;
  const valid = resources.filter((r) => !isCheckInLate(r, step)).length;
  const vagas = selectAssistance(state).vacancies;
  const rain = rainSeries(step).at(-1)?.mm ?? 0;
  return (
    <div>
      <PageHead phase="0 Prontidão" title="Painel de prontidão" sub="Situação dos órgãos, abrigos e áreas de risco" />
      {step === 0 && <Link to="/gabinete/risco" className="mb-4 flex items-center justify-between rounded-md border border-ops/40 bg-ops/10 px-4 py-3 text-sm"><b>Risco atual da cidade</b><span className="text-ops">Ver gêmeo digital →</span></Link>}
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi label="Recursos disponíveis" value={`${avail}/${resources.length}`} />
        <Kpi label="Check-in válido" value={`${Math.round((valid / resources.length) * 100)}%`} hint="Turno de 12 h" />
        <Kpi label="Vagas em abrigos" value={vagas} hint={`${shelters.length} abrigos`} />
        <Kpi label="Chuva 72h" value={`${rain} mm`} hint={`Limiar ${RAIN_THRESHOLD} mm`} tone={rain > RAIN_THRESHOLD ? "red" : undefined} />
        <Kpi label="Estágio" value={stage} tone={stage === "Crise" ? "red" : "blue"} />
      </div>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <LazyMap className="h-[520px]" layers={() => ({
          polygons: [
            { positions: floodExtent, color: mc.blue(), fill: 0.12, dashed: true, label: "Mancha de alagamento atual" },
            ...riskAreas.map((a) => ({ positions: a.polygon, color: mc.red(), fill: 0.2, label: `Área de risco: ${a.name}` })),
          ],
          lines: [{ positions: riverLine, color: mc.blue(), weight: 3, label: "Rio Sereno" }],
          points: [
            ...resources.map((r) => ({ pos: r.pos, color: r.status === "disponível" ? mc.blue() : mc.slate(), label: `${r.callsign} · ${r.type} · ${r.status}` })),
            ...shelters.map((s) => ({ pos: s.pos, color: mc.green(), radius: 9, label: `Abrigo: ${s.name} (${s.capacity})` })),
          ],
        })} />
        <Panel title="Prontidão por órgão">
          <ul className="divide-y">
            {agencies.map((a) => {
              const rs = resources.filter((r) => r.agency === a.id);
              const late = rs.filter((r) => isCheckInLate(r, step));
              return (
                <li key={a.id} className="py-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="font-medium">{a.name}</span>
                    <span className="tabular-nums text-muted-foreground">{rs.length - late.length}/{rs.length || "—"}</span>
                  </div>
                  {late.map((r) => (
                    <div key={r.id} className="mt-1 flex items-center justify-between text-xs">
                      <Chip tone="red">check-in atrasado · {r.callsign}</Chip>
                      <span className="text-muted-foreground">{fmtDateTime(r.lastCheckIn)}</span>
                    </div>
                  ))}
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
