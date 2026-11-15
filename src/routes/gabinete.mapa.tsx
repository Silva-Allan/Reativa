import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/store/app";
import { riskAreas, riverLine } from "@/mock/data";
import { LazyMap } from "@/components/reativa/LazyMap";
import { mc } from "@/components/reativa/mapColors";
import { PageHead } from "@/components/reativa/bits";
import { seo } from "@/lib/seo";
export const Route = createFileRoute("/gabinete/mapa")({ head: () => seo("Mapa operacional", "Ocorrências, recursos, rotas e bloqueios do evento em Vale Sereno."), component: OperationalMap });
function OperationalMap() {
  const s = useApp();
  return <div><PageHead phase="2 Resposta" title="Mapa operacional" /><LazyMap className="h-[600px]" zoom={13} layers={() => ({ polygons: riskAreas.map((r) => ({ positions: r.polygon, color: mc.red(), fill: 0.1, label: r.name })), lines: [{ positions: riverLine, color: mc.blue(), label: "Rio Sereno" }, ...s.assignments.map((a) => ({ positions: a.polyline, color: a.id === "a1" ? mc.blue() : mc.orange(), label: `${a.resourceId} · ${a.id === "a1" ? "rota aquática" : "rota terrestre"}` }))], points: [...s.resources.map((r) => ({ pos: r.pos, color: mc.slate(), label: r.callsign })), ...s.shelters.map((sh) => ({ pos: sh.pos, color: mc.green(), radius: 8, label: sh.name })), ...s.incidents.map((i) => ({ pos: i.pos, color: mc.red(), radius: 10, label: `Ocorrência #${i.id} · ${i.place}` })), ...s.blockages.map((b) => ({ pos: b.pos, color: mc.red(), label: b.desc }))] })} /></div>;
}