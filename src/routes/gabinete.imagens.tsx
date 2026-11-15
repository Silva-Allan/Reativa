import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/store/app";
import { agreement, missionArea, observedFlood } from "@/mock/risk";
import { at, fmtDateTime, floodPolygon } from "@/mock/data";
import { Chip, PageHead } from "@/components/reativa/bits";
import { ThermalFrame } from "@/components/reativa/ThermalFrame";
import { LazyMap } from "@/components/reativa/LazyMap";
import { mc } from "@/components/reativa/mapColors";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gabinete/imagens")({ head: () => seo("Imagens e sensoriamento", "Missões de drone, detecções térmicas e observação radar de Vale Sereno."), component: Images });
function Images() {
  const s = useApp();
  const [tab, setTab] = useState("thermal");
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const ready = s.missionStatus === "pronto";
  return <div>
    <PageHead phase="2 Resposta" title="Imagens e sensoriamento" sub="Vale Sereno · observações sintéticas · confirmação humana" />
    <Tabs value={tab} onValueChange={setTab}><TabsList className="mb-4 h-auto flex-wrap"><TabsTrigger value="thermal">Drone térmico</TabsTrigger><TabsTrigger value="rgb">Drone RGB</TabsTrigger><TabsTrigger value="radar">Satélite radar (Sentinel-1)</TabsTrigger><TabsTrigger value="field">Cidadão e campo</TabsTrigger></TabsList></Tabs>
    <div className="mb-4 flex flex-wrap items-center gap-3 border-y py-3 text-sm"><b>Missão CBM-D01</b><span>Início: {fmtDateTime(at(100))}</span><Chip tone={ready ? "green" : "orange"}>{s.missionStatus}</Chip><span className="text-xs text-muted-foreground">em voo → processando → pronto · Ponte Velha — Rua Sete</span></div>
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <div className="space-y-4">
        {tab === "thermal" && <><ThermalFrame /><p className="text-xs text-muted-foreground">Imagem térmica sintética · pontos de calor não identificam pessoas sem confirmação.</p></>}
        {tab === "rgb" && <><LazyMap className="h-[380px]" zoom={15} layers={() => ({ polygons: [{ positions: observedFlood, color: mc.blue(), fill: 0.5, label: "Segmentação de água · ortomosaico sintético" }, { positions: missionArea, color: mc.green(), fill: 0.1, label: "Área voada CBM-D01" }] })} /><p className="text-xs text-muted-foreground">Ortomosaico sintético · máscara de água</p><div className="flex flex-wrap gap-2"><Button onClick={s.updateFlood}>Atualizar mancha de alagamento</Button><Button variant="outline" onClick={s.reportBlockage} disabled={s.blockages.length > 0}>Criar bloqueio</Button></div>{s.blockages.length > 0 && <Chip tone="orange">Ponte Velha · bloqueio registrado</Chip>}</>}
        {tab === "radar" && <><LazyMap className="h-[380px]" zoom={13} layers={() => ({ polygons: [{ positions: floodPolygon, color: mc.slate(), fill: 0.2, dashed: true, label: `Antes · ${fmtDateTime(at(-1440))}` }, { positions: observedFlood, color: mc.blue(), fill: 0.4, label: `Depois · ${fmtDateTime(at(120))}` }] })} /><p className="text-sm">Antes: {fmtDateTime(at(-1440))} · Depois: {fmtDateTime(at(120))}</p><p className="text-xs text-muted-foreground">passagem a cada alguns dias — complementa, não substitui o drone</p><Button onClick={() => s.calibrate(agreement(s.riverLevel))}>Calibrar gêmeo digital</Button>{s.calibration !== null && <p className="text-sm">Concordância HAND × extensão observada: <b>{s.calibration}%</b> · cenário +{s.riverLevel.toFixed(1)} m (interseção / união)</p>}</>}
        {tab === "field" && <div className="grid gap-3 sm:grid-cols-2">{s.photos.map((p) => <figure key={p.id}>{p.imageId ? <ThermalFrame /> : <div className="flex aspect-[4/3] items-center justify-center rounded-md bg-muted text-sm text-muted-foreground">Registro sintético de campo</div>}<figcaption className="mt-1 text-xs">{p.caption} · {fmtDateTime(p.at)}</figcaption></figure>)}{!s.photos.length && <p className="text-sm text-muted-foreground">Nenhum registro recebido.</p>}</div>}
      </div>
      <aside className="space-y-4">
        <LazyMap className="h-[220px]" zoom={15} layers={() => ({ polygons: [{ positions: missionArea, color: mc.blue(), fill: 0.2, label: "Área voada · CBM-D01" }] })} />
        {tab === "thermal" && <><h2 className="text-sm font-semibold">2 pontos de calor · Rua Sete</h2>{s.detections.map((d) => <div key={d.id} className="border-b pb-4"><p className="font-medium">{d.label}</p><p className="text-sm">Confiança {d.confidence.toFixed(2).replace(".", ",")}</p><p className="my-2 text-xs text-sev-severo">sugestão automática — confirmar</p>{d.status === "pendente" ? <div className="space-y-2"><Button size="sm" disabled={!ready} onClick={() => s.decideDetection(d.id, true)}>Enviar para triagem</Button><Input aria-label={`Motivo do descarte ${d.id}`} placeholder="Motivo do descarte" value={reasons[d.id] ?? ""} onChange={(e) => setReasons({ ...reasons, [d.id]: e.target.value })} /><Button size="sm" variant="outline" disabled={!ready || !reasons[d.id]?.trim()} onClick={() => s.decideDetection(d.id, false, reasons[d.id])}>Descartar</Button></div> : <><Chip tone={d.status === "enviada" ? "green" : "muted"}>{d.status}</Chip><p className="text-xs text-muted-foreground">{d.reason}</p>{d.status === "enviada" && <Link to="/gabinete/triagem" className="mt-2 block text-sm text-ops">Abrir relato vinculado →</Link>}</>}</div>)}</>}
      </aside>
    </div>
  </div>;
}