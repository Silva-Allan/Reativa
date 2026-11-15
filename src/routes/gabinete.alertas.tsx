import { createFileRoute, Link } from "@tanstack/react-router";
import { Area, AreaChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp } from "@/store/app";
import { fmtDateTime, rainSeries, RAIN_THRESHOLD, riskAreas } from "@/mock/data";
import { Chip, PageHead, Panel } from "@/components/reativa/bits";
import { LazyMap } from "@/components/reativa/LazyMap";
import { mc } from "@/components/reativa/mapColors";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gabinete/alertas")({
  head: () => seo("Alertas", "Alertas CAP recebidos, chuva acumulada e sugestões de ação."),
  component: Alertas,
});
const pt = { Severe: "Severo", Extreme: "Extremo", Moderate: "Moderado", Expected: "Esperada", Immediate: "Imediata", Likely: "Provável", Observed: "Observada" } as const;

function Alertas() {
  const { alerts, step, suggestions, acceptSuggestion } = useApp();
  const data = rainSeries(step);
  return (
    <div>
      <PageHead phase="1 Gatilho" title="Alertas e monitoramento" sub="Fonte: IDAP · CAP 1.2 (somente leitura) e Cemaden VS-03 (fictício)" />
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          {!alerts.length && <Panel><p className="text-sm text-muted-foreground">Nenhum alerta ativo. Avance para o passo 1 para receber o alerta CAP.</p></Panel>}
          {alerts.map((a) => (
            <Panel key={a.id} title={<span className="flex items-center gap-2"><span className="live-dot" />{a.event}</span>} action={<span className="text-xs text-muted-foreground">IDAP · CAP 1.2 (somente leitura)</span>}>
              <p className="font-medium">{a.headline}</p>
              <div className="my-2 flex flex-wrap gap-1.5">
                <Chip tone="orange">{pt[a.severity]}</Chip><Chip>{pt[a.urgency]}</Chip><Chip>{pt[a.certainty]}</Chip>
              </div>
              <p className="text-sm text-muted-foreground">{a.instruction}</p>
              <p className="mt-2 text-xs text-muted-foreground">Vigência: {fmtDateTime(a.effective)} → {fmtDateTime(a.expires)} · Emissor {a.sender}</p>
              <Collapsible className="mt-3">
                <CollapsibleTrigger asChild><Button size="sm" variant="outline">Ver CAP</Button></CollapsibleTrigger>
                <CollapsibleContent>
                  <pre className="mt-2 overflow-x-auto rounded bg-muted p-3 text-[11px] leading-relaxed">{`<alert xmlns="urn:oasis:names:tc:emergency:cap:1.2">
  <identifier>${a.id}</identifier>
  <sender>${a.sender}</sender>
  <sent>${a.effective}</sent>
  <status>Actual</status><msgType>Alert</msgType><scope>Public</scope>
  <info>
    <language>pt-BR</language>
    <category>Met</category>
    <event>${a.event}</event>
    <urgency>${a.urgency}</urgency>
    <severity>${a.severity}</severity>
    <certainty>${a.certainty}</certainty>
    <expires>${a.expires}</expires>
    <headline>${a.headline}</headline>
    <instruction>${a.instruction}</instruction>
    <area><areaDesc>Vale Sereno</areaDesc><polygon>${a.polygon.map((p) => p.map((n) => n.toFixed(4)).join(",")).join(" ")}</polygon></area>
  </info>
</alert>`}</pre>
                </CollapsibleContent>
              </Collapsible>
            </Panel>
          ))}
          <Panel title="Chuva acumulada 72h — Cemaden VS-03 (fictício)">
            <div className="h-56">
              <ResponsiveContainer>
                <AreaChart data={data} margin={{ left: -16, right: 8, top: 8 }}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="h" tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: "var(--muted-foreground)" }} domain={[0, 150]} />
                  <Tooltip contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", fontSize: 12 }} formatter={(v) => [`${v} mm`, "Acumulado"]} />
                  <ReferenceLine y={RAIN_THRESHOLD} stroke="var(--signal-red)" strokeDasharray="6 4" label={{ value: `Limiar ${RAIN_THRESHOLD} mm`, fill: "var(--signal-red)", fontSize: 11, position: "insideTopLeft" }} />
                  <Area dataKey="mm" stroke="var(--ops-blue)" fill="var(--ops-blue)" fillOpacity={0.2} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Panel>
        </div>
        <div className="space-y-4">
          <Button asChild variant="outline"><Link to="/gabinete/risco" search={{ level: 2 }}>Ver cenário no gêmeo digital</Link></Button>
          <LazyMap className="h-[360px]" zoom={13} layers={() => ({
            polygons: [
              ...alerts.map((a) => ({ positions: a.polygon, color: mc.orange(), fill: 0.18, dashed: true, label: `Polígono CAP: ${a.event}` })),
              ...riskAreas.map((r) => ({ positions: r.polygon, color: mc.red(), fill: 0.25, label: r.name })),
            ],
          })} />
          <Panel title="Sugestões do sistema" action={<span className="text-xs text-muted-foreground">O sistema propõe; você decide</span>}>
            {!suggestions.length && <p className="text-sm text-muted-foreground">Sem sugestões no momento.</p>}
            <div className="space-y-3">
              {suggestions.map((s) => (
                <div key={s.id} className="rounded-md border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div><p className="font-medium">{s.text}</p><p className="text-sm text-muted-foreground">{s.detail}</p></div>
                    {s.status !== "pendente" && <Chip tone={s.status === "aceita" ? "green" : "muted"}>{s.status}</Chip>}
                  </div>
                  {s.status === "pendente" && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" onClick={() => acceptSuggestion(s.id, true)}>Aceitar</Button>
                      <Button size="sm" variant="outline" onClick={() => acceptSuggestion(s.id, false)}>Ignorar</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
