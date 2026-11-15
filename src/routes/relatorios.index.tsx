import { createFileRoute, Link } from "@tanstack/react-router";
import { useApp } from "@/store/app";
import { Chip, PageHead } from "@/components/reativa/bits";
import { Progress } from "@/components/ui/progress";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/relatorios/")({
  head: () => seo("Relatórios", "FIDE, DMATE, decreto, relatório fotográfico e solicitação de recursos."),
  component: Lista,
});
const tone = { rascunho: "muted", pendente: "orange", pronto: "blue", enviado: "green" } as const;
function Lista() {
  const docs = useApp((s) => s.docs);
  return (
    <div>
      <PageHead phase="4 Relatórios" title="Documentos do evento" sub="O envio ao S2iD é feito pelo coordenador no sistema oficial." />
      <div className="grid gap-3 md:grid-cols-2">
        {docs.map((d) => (
          <Link key={d.id} to="/relatorios/$docId" params={{ docId: d.id }} className="rounded-lg border bg-card p-4 hover:border-ops">
            <div className="flex items-start justify-between gap-2"><span className="font-medium">{d.title}</span><Chip tone={tone[d.status]}>{d.status}</Chip></div>
            <div className="mt-3 flex items-center gap-2"><Progress value={d.pct} className="h-2" /><span className="text-xs tabular-nums text-muted-foreground">{d.pct}%</span></div>
            {d.pending.length > 0 && <ul className="mt-2 space-y-0.5 text-xs text-muted-foreground">{d.pending.map((p) => <li key={p.item}>Pendente · <b>{p.agency}</b>: {p.item}</li>)}</ul>}
            {d.protocol && <p className="mt-2 text-xs">Protocolo S2iD: {d.protocol}</p>}
          </Link>
        ))}
      </div>
    </div>
  );
}
