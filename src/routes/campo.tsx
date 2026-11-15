import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Construction, WifiOff } from "lucide-react";
import { FIELD_STEPS, useApp } from "@/store/app";
import { INCIDENT_POS, fmtTime } from "@/mock/data";
import { LazyMap } from "@/components/reativa/LazyMap";
import { mc } from "@/components/reativa/mapColors";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Chip, Sev } from "@/components/reativa/bits";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/campo")({
  head: () => seo("Equipe de campo", "Tarefa, rota e status da equipe CBM-B07."),
  component: Campo,
});

function Campo() {
  const { assignments, blockages, fieldStatus, advanceField, addPhoto, reportBlockage, offline, setOffline, queued, photos, incidents } = useApp();
  const [caption, setCaption] = useState("");
  const task = assignments.find((a) => a.resourceId === "CBM-B07") ?? assignments[0];
  const amb = assignments.find((a) => a.id === "a2");
  if (!task || fieldStatus < 0) return <div className="rounded-lg border bg-card p-5 text-sm text-muted-foreground">Equipe CBM-B07 em prontidão. Nenhuma tarefa atribuída.</div>;
  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">Tarefa · CBM-B07</span><Sev s={incidents[0]?.severity ?? "Severo"} /></div>
        <p className="mt-1 font-semibold">Resgate aquático — Ponte Velha, Rua Sete</p>
        <p className="text-sm text-muted-foreground">4 pessoas no telhado · 1 idoso acamado · ETA {task.etaMin} min</p>
      </div>
      <LazyMap className="h-64" zoom={15} center={INCIDENT_POS} layers={() => ({
        lines: [{ positions: task.polyline, color: mc.blue(), weight: 5, label: "rota aquática" }, ...(amb ? [{ positions: amb.polyline, color: mc.orange(), weight: 3, dashed: true, label: "SAMU-USB02" }] : [])],
        points: [{ pos: INCIDENT_POS, color: mc.red(), radius: 9, label: "Vítimas" }, ...blockages.map((b) => ({ pos: b.pos, color: mc.navy(), radius: 8, label: b.desc }))],
      })} />
      {blockages.length > 0 && <Chip tone="orange">Ponte Velha bloqueada · rota da ambulância refeita ({amb?.etaMin} min)</Chip>}
      <ol className="grid gap-2">
        {FIELD_STEPS.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-3 rounded-md border px-3 py-2 text-sm", i <= fieldStatus ? "border-ops bg-ops/10 font-medium" : "text-muted-foreground")}>
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs", i <= fieldStatus && "border-ops bg-ops text-paper")}>{i + 1}</span>{s}
          </li>
        ))}
      </ol>
      <Button size="lg" className="w-full" disabled={fieldStatus >= FIELD_STEPS.length - 1} onClick={advanceField}>
        {fieldStatus >= FIELD_STEPS.length - 1 ? "Tarefa concluída" : `Marcar: ${FIELD_STEPS[fieldStatus + 1]}`}
      </Button>
      <div className="flex gap-2">
        <Input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="Legenda da foto" />
        <Button variant="outline" onClick={() => { addPhoto(caption || "Registro de campo"); setCaption(""); }}><Camera />Tirar foto</Button>
      </div>
      <Button variant="outline" className="w-full" onClick={reportBlockage}><Construction />Reportar bloqueio</Button>
      <div className="flex items-center justify-between rounded-lg border bg-card p-3 text-sm">
        <label className="flex items-center gap-2"><WifiOff className="h-4 w-4" />Simular sem sinal</label>
        <div className="flex items-center gap-2">{offline && <Chip tone="orange">{queued} ações na fila</Chip>}<Switch checked={offline} onCheckedChange={setOffline} /></div>
      </div>
      {photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {photos.slice(-6).map((p) => (
            <div key={p.id} className="aspect-square rounded-md p-1.5 text-[10px] leading-tight text-paper" style={{ background: `linear-gradient(160deg, oklch(0.55 0.08 ${p.hue}), oklch(0.3 0.05 ${p.hue}))` }}>
              {fmtTime(p.at)}<br />{p.caption}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
