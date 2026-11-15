import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useApp } from "@/store/app";
import { classCounts, handClass, handLabels, riskCells, riskFactors, riskClasses, scenario } from "@/mock/risk";
import { rainSeries, riskAreas, riverLine } from "@/mock/data";
import { LazyMap } from "@/components/reativa/LazyMap";
import { mc } from "@/components/reativa/mapColors";
import { Chip, Kpi, PageHead } from "@/components/reativa/bits";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gabinete/risco")({
  validateSearch: (search: Record<string, unknown>): { level?: number } => (search["level"] === undefined ? {} : { level: Number(search["level"]) }),
  head: () => seo("Gêmeo digital · mapa de risco", "Cenário HAND e exposição por hexágonos em Vale Sereno."),
  component: Risk,
});

type Layer = "risk" | "hand" | "exposure" | "history";
function Risk() {
  const s = useApp();
  const { level } = Route.useSearch();
  const [layer, setLayer] = useState<Layer>("risk");
  useEffect(() => { if (level !== undefined && Number.isFinite(level)) s.setRiverLevel(level); }, [level, s.setRiverLevel]);
  const rain = rainSeries(s.step).at(-1)?.mm ?? 0;
  const exposed = scenario(s.riverLevel, s.shelters, s.resources);
  const flooded = new Set(exposed.flooded.map((c) => c.id));
  const proposals = s.suggestions.filter((x) => x.id.startsWith("move:") || x.id.startsWith("activate:"));
  const counts = classCounts(rain);
  const handCounts = [0, 0, 0, 0, 0];
  for (const c of riskCells) handCounts[handClass(c.handM)]!++;
  const isHand = layer === "hand";
  return <div>
    <PageHead phase="0 Prontidão" title="Gêmeo digital · mapa de risco" sub="Vale Sereno · H3 resolução 9 · cenário sintético" />
    <Tabs value={layer} onValueChange={(v) => setLayer(v as Layer)}><TabsList className="mb-4 h-auto flex-wrap"><TabsTrigger value="risk">Índice de risco</TabsTrigger><TabsTrigger value="hand">Relevo (HAND)</TabsTrigger><TabsTrigger value="exposure">Exposição</TabsTrigger><TabsTrigger value="history">Histórico</TabsTrigger></TabsList></Tabs>
    <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
      <div>
        <LazyMap className="h-[520px]" zoom={13} layers={() => ({
          polygons: [
            ...riskCells.map((c) => {
              const f = riskFactors(c, rain);
              const index = layer === "exposure" ? Math.min(4, Math.floor(f.exposure * 5)) : layer === "history" ? Math.min(4, Math.floor(c.historyEvents / 1.5)) : f.classIndex;
              const color = flooded.has(c.id) ? mc.blue() : isHand ? mc.hand(handClass(c.handM)) : mc.risk(index);
              return { positions: c.polygon, color, weight: 0.5, fill: flooded.has(c.id) ? 0.8 : 0.65, label: `${riskClasses[f.classIndex]} · HAND ${c.handM} m`, popup: <div className="space-y-1 text-xs"><b>{riskClasses[f.classIndex]} · {c.id}</b><p>HAND: {c.handM} m · peso 60%</p><p>Declividade: {c.slopePct}% · peso 15%</p><p>Histórico: {c.historyEvents} eventos · peso 25%</p><p>População: {c.population} · peso 50%</p><p>Edificações: {c.buildings} · peso 30%</p><p>Vulneráveis: {c.vulnerableCount} · peso 20%</p><p>Suscetibilidade: {f.susceptibility.toFixed(2)} × exposição: {f.exposure.toFixed(2)} × gatilho: {f.trigger.toFixed(2)} ({rain} / 120 mm; mínimo 1)</p><b>Índice: {f.riskIndex.toFixed(3)}</b></div> };
            }),
            // Neighbourhood outlines on top of the hexes; non-interactive so cell popups still open.
            ...riskAreas.map((r) => ({ positions: r.polygon, color: mc.paper(), weight: 2, fill: 0, dashed: true, interactive: false })),
          ],
          // River with a light casing so it reads on every palette, including flooded (blue) cells.
          lines: [{ positions: riverLine, color: mc.paper(), weight: 7, interactive: false }, { positions: riverLine, color: mc.navy(), weight: 3.5, interactive: false }],
          points: s.shelters.map((sh) => ({ pos: sh.pos, color: exposed.shelters.some((x) => x.id === sh.id) ? mc.red() : mc.green(), radius: 8, label: sh.name })),
        })} />
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
          {isHand
            ? handLabels.map((name, i) => <span key={name} className="flex items-center gap-1.5"><span className={`risk-swatch hand-swatch-${i}`} />{name} <span className="tabular-nums text-muted-foreground">({handCounts[i]})</span></span>)
            : riskClasses.map((name, i) => <span key={name} className="flex items-center gap-1.5"><span className={`risk-swatch risk-swatch-${i}`} />{name}{layer === "risk" && <span className="tabular-nums text-muted-foreground">({counts[i]})</span>}</span>)}
          <span className="text-ops">Azul · água simulada</span>
        </div>
        {isHand && <p className="mt-1 text-xs text-muted-foreground">HAND: altura acima da drenagem mais próxima. Verde-azulado escuro = perto do rio; areia = terreno alto.</p>}
        <p className="mt-3 text-xs text-muted-foreground">HAND é uma aproximação. Modelo hidrodinâmico calibrado: fase 2.</p>
      </div>
      <aside className="space-y-4">
        <label className="block text-sm font-semibold" htmlFor="river-level">Simular nível do rio: +{s.riverLevel.toFixed(1).replace(".", ",")} m</label>
        <Slider id="river-level" aria-label="Simular nível do rio" value={[s.riverLevel]} onValueChange={([v]) => s.setRiverLevel(v ?? 0)} min={0} max={4} step={0.5} />
        <div className="grid grid-cols-2 gap-2"><Kpi label="Células alagadas" value={exposed.flooded.length} /><Kpi label="Pessoas expostas" value={exposed.people} /><Kpi label="Edificações" value={exposed.buildings} /><Kpi label="Vulneráveis" value={exposed.vulnerable} /></div>
        <div className="text-sm"><b>Abrigos atingidos: {exposed.shelters.length}</b>{s.shelters.filter((sh) => sh.active).map((sh) => <div key={sh.id} className="mt-1"><Chip tone="green">{sh.name} · ativado</Chip></div>)}{exposed.shelters.map((sh) => <div key={sh.id} className="mt-2">{sh.name}<br /><Chip tone="red">abrigo em área alagável</Chip></div>)}</div>
        <div className="text-sm"><b>Recursos dentro da área: {exposed.resources.length}</b><p className="text-xs text-muted-foreground">{exposed.resources.map((r) => r.callsign).join(" · ") || "Nenhum"}</p></div>
        <Button className="w-full whitespace-normal" onClick={s.generatePreposition}>Gerar sugestões de pré-posicionamento</Button>
        {proposals.map((p) => <div key={p.id} className="border-b pb-3 text-sm"><b>{p.text}</b><p className="text-xs text-muted-foreground">{p.detail}</p>{p.status === "pendente" ? <div className="mt-2 flex gap-2"><Button size="sm" onClick={() => s.acceptSuggestion(p.id, true)}>Aceitar</Button><Button size="sm" variant="outline" onClick={() => s.acceptSuggestion(p.id, false)}>Ignorar</Button></div> : <Chip>{p.status}</Chip>}</div>)}
      </aside>
    </div>
  </div>;
}
