import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Smartphone, Truck, ScanLine, Layers } from "lucide-react";
import { useApp } from "@/store/app";
import { fmtTime, type ReportSource } from "@/mock/data";
import { Chip, PageHead, Panel, Sev } from "@/components/reativa/bits";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gabinete/triagem")({
  head: () => seo("Triagem", "Fila de relatos de cidadãos e do 193 com agrupamento sugerido."),
  component: Triagem,
});
const srcIcon: Record<ReportSource, typeof Phone> = { cidadao: Smartphone, ssp193: Phone, campo: Truck, drone: ScanLine };
const srcLabel: Record<ReportSource, string> = { cidadao: "Cidadão", ssp193: "SSP 193", campo: "Campo", drone: "Drone térmico" };

function Triagem() {
  const { reports, clusterMerged, mergeCluster, confirmIncident, incidents } = useApp();
  const navigate = useNavigate();
  const [sel, setSel] = useState<string | null>(null);
  const cluster = reports.filter((r) => r.place === "Ponte Velha");
  const current = reports.find((r) => r.id === sel) ?? cluster[0];
  return (
    <div>
      <PageHead phase="2 Resposta" title="Triagem de relatos" sub={`${reports.length} relatos na fila`} />
      <div className="grid gap-4 lg:grid-cols-[1fr_380px]">
        <div className="space-y-3">
          {cluster.length >= 3 && !clusterMerged && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-ops/50 bg-ops/10 p-3">
              <span className="flex items-center gap-2 text-sm"><Layers className="h-4 w-4 text-ops" /><b>{cluster.length} relatos prováveis do mesmo local</b> · Ponte Velha, raio de 50 m</span>
              <Button size="sm" onClick={mergeCluster}>Mesclar</Button>
            </div>
          )}
          {!reports.length && <Panel><p className="text-sm text-muted-foreground">Fila vazia. Avance para o passo 2.</p></Panel>}
          {reports.map((r) => {
            const Icon = srcIcon[r.source];
            return (
              <Button variant="ghost" key={r.id} onClick={() => setSel(r.id)} className={cn("flex w-full items-start gap-3 rounded-lg border h-auto whitespace-normal bg-card p-3 text-left hover:border-ops", current?.id === r.id && "border-ops")}>
                <span className="mt-0.5 rounded bg-muted p-1.5"><Icon className="h-4 w-4" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{srcLabel[r.source]} · {fmtTime(r.at)} · {r.protocol}
                    {r.kind === "socorro" && <Chip tone="red">socorro</Chip>}
                    {r.status === "agrupado" && <Chip tone="blue">agrupado</Chip>}
                  </span>
                  <span className="block font-medium">{r.text}</span>
                  <span className="text-xs text-muted-foreground">{r.place} · {r.people} pessoas{r.vulnerable.length ? ` · ${r.vulnerable.join(", ")}` : ""}</span>
                </span>
              </Button>
            );
          })}
        </div>
        {current && (
          <Panel title="Classificação" className="h-fit lg:sticky lg:top-24">
            <p className="text-xs text-muted-foreground">sugestão — confirme</p>
            <div className="my-2 flex gap-3">{[...new Set(cluster.map((r) => r.source))].map((source) => { const Icon = srcIcon[source]; return <span key={source} className="flex items-center gap-1 text-xs"><Icon className="h-4 w-4" />{srcLabel[source]}</span>; })}</div>
            <dl className="mt-2 space-y-2 text-sm">
              <div className="flex justify-between"><dt className="text-muted-foreground">COBRADE</dt><dd className="font-medium">1.2.1.0.0 Inundação</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Severidade</dt><dd><Sev s="Severo" /></dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Vítimas estimadas</dt><dd>4</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Vulneráveis</dt><dd>1 acamado, 1 idoso</dd></div>
              <div className="flex justify-between"><dt className="text-muted-foreground">Relatos vinculados</dt><dd>{clusterMerged ? cluster.length : 1}</dd></div>
            </dl>
            <Button className="mt-4 w-full" onClick={() => { if (!incidents.length) confirmIncident(); navigate({ to: "/gabinete/ocorrencias/$id/plano", params: { id: "1" } }); }}>
              {incidents.length ? "Abrir Ocorrência #1" : "Confirmar ocorrência"}
            </Button>
          </Panel>
        )}
      </div>
    </div>
  );
}
