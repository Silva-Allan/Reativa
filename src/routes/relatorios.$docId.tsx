import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Copy, Printer, Send } from "lucide-react";
import { toast } from "sonner";
import { useApp } from "@/store/app";
import { fmtDateTime, riskAreas } from "@/mock/data";
import { Fase2, Prov } from "@/components/reativa/bits";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { selectFide } from "@/store/selectors";
import { ThermalFrame } from "@/components/reativa/ThermalFrame";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/relatorios/$docId")({
  head: () => seo("Editor de documento", "Documento do evento com origem de cada número."),
  component: Editor,
});
const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function Editor() {
  const { docId } = Route.useParams();
  const s = useApp();
  const doc = s.docs.find((d) => d.id === docId);
  const [ask, setAsk] = useState(false);
  const [proto, setProto] = useState("");
  if (!doc) return <p>Documento não encontrado.</p>;
  const fide = selectFide(s);
  const desab = fide.desabrigados;
  const desal = fide.desalojados;
  const dmg = s.damages;
  const H = ({ children }: { children: React.ReactNode }) => <h3 className="mt-6 mb-2 border-b border-navy/20 pb-1 text-sm font-bold uppercase tracking-wide">{children}</h3>;
  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex justify-between border-b border-dotted border-navy/15 py-1 text-sm"><span>{k}</span><span>{v}</span></div>;
  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center gap-2">
        <Link to="/relatorios" className="mr-2 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" />Documentos</Link>
        <Button size="sm" variant="outline" onClick={() => window.print()}><Printer />Exportar PDF</Button>
        <Button size="sm" variant="outline" onClick={() => { navigator.clipboard?.writeText(`${doc.title}\nDesabrigados: ${fide.homeless}\nDesalojados: ${fide.displaced}`); toast.success("Campos copiados para colar no S2iD"); }}><Copy />Copiar campos para o S2iD</Button>
        <Button size="sm" onClick={() => setAsk(true)} disabled={doc.status === "enviado"}><Send />{doc.status === "enviado" ? `Enviado · ${doc.protocol}` : "Marcar como enviado"}</Button>
        <span className="text-xs text-muted-foreground">O envio ao S2iD é feito pelo coordenador no sistema oficial.</span><Fase2 label="Envio direto ao S2iD · fase 2" />
      </div>
      <div className="flex justify-center">
        <article className="a4-page">
          <div className="text-xs uppercase tracking-widest text-slate-ink">Município de Vale Sereno · Defesa Civil</div>
          <h2 className="mt-1 text-2xl font-bold">{doc.title}</h2>
          <p className="text-xs text-slate-ink">Evento: Inundação · COBRADE 1.2.1.0.0 · documento gerado pelo Reativa — revisar antes do envio</p>
          {docId === "fotografico" ? (
            <div className="mt-6 grid grid-cols-2 gap-4">
              {s.photos.map((p) => (
                <figure key={p.id} className="break-inside-avoid">
                  {p.imageId ? <ThermalFrame /> : <div className="flex aspect-[4/3] items-center justify-center rounded bg-muted text-sm text-slate-ink">Registro sintético de campo</div>}
                  <figcaption className="mt-1 text-sm"><b>{p.caption}</b><br /><span className="text-xs text-slate-ink">{fmtDateTime(p.at)} · {p.pos[0].toFixed(5)}, {p.pos[1].toFixed(5)}</span></figcaption>
                </figure>
              ))}
              {!s.photos.length && <p className="text-sm text-slate-ink">Nenhuma foto de campo ainda.</p>}
            </div>
          ) : docId === "solicitacao" ? (
            <><H>Itens solicitados</H>{s.requestItems.length ? s.requestItems.map((r) => <Row key={r.item} k={`${r.item} — ${r.reason}`} v={<Prov value={r.qty} title={r.item} sources={[{ label: r.reason, meta: "Tabela de estoques · Abrigos" }]} />} />) : <p className="text-sm text-slate-ink">Nenhum item incluído.</p>}</>
          ) : (
            <>
              <H>1. Identificação</H>
              <Row k="Município / UF" v="Vale Sereno (fictício) / SC" />
              <Row k="Tipo de desastre" v="1.2.1.0.0 Inundação" />
              <Row k="Data de ocorrência" v={s.incidents[0] ? fmtDateTime(s.incidents[0].createdAt) : "—"} />
              <H>2. Área afetada</H>
              <Row k="Áreas de risco atingidas" v={<Prov value={riskAreas.length} title="Áreas" sources={riskAreas.map((a) => ({ label: a.name, meta: "Mapa de áreas de risco" }))} />} />
              <Row k="Ocorrências registradas" v={<Prov value={s.incidents.length} title="Ocorrências" sources={s.incidents.map((i) => ({ label: `#${i.id} ${i.title}`, meta: i.place }))} />} />
              <H>3. Danos humanos</H>
              <Row k="Desabrigados" v={<Prov value={fide.homeless} title="Desabrigados" sources={desab.map((e) => ({ label: `${e.name} · ${e.people} pessoas`, meta: `${e.shelter} · ${fmtDateTime(e.at)}` }))} />} />
              <Row k="Desalojados" v={<Prov value={fide.displaced} title="Desalojados" sources={desal.map((e) => ({ label: `${e.name} · ${e.people} pessoas`, meta: `${e.origin} · ${fmtDateTime(e.at)}` }))} />} />
              <Row k="Pessoas resgatadas" v={<Prov value={fide.rescued} title="Resgates" sources={fide.rescues.map((a) => ({ label: a.action, meta: `${a.actor} · ${fmtDateTime(a.at)}` }))} />} />
              <Row k="Afetados" v={<Prov value={fide.affected} title="Afetados" sources={[...desab.map((e) => ({ label: `${e.name} · ${e.people} pessoas`, meta: e.shelter })), ...desal.map((e) => ({ label: `${e.name} · ${e.people} pessoas`, meta: e.origin })), ...fide.health("afetado").map((e) => ({ label: `${e.people} pessoas`, meta: e.source }))]} />} />
              <Row k="Enfermos" v={<Prov value={fide.sick} title="Enfermos" sources={fide.health("enfermo").map((e) => ({ label: `${e.people} pessoas`, meta: e.source }))} />} />
              <Row k="Desaparecidos" v={<Prov value={fide.missing} title="Desaparecidos" sources={fide.health("desaparecido").map((e) => ({ label: `${e.people} pessoas`, meta: e.source }))} />} />
              <Row k="Óbitos / feridos" v={`${fide.dead} / ${fide.injured}`} />
              <Row k="Evidências de imagem vinculadas" v={<Prov value={s.photos.filter((p) => p.imageId).length} title="Imagens" sources={s.photos.filter((p) => p.imageId).map((p) => ({ label: p.caption, meta: `${p.imageId} · ${fmtDateTime(p.at)}`, to: "/gabinete/imagens" as const }))} />} />
              <H>4. Danos materiais</H>
              {dmg.map((d) => <Row key={d.id} k={d.category} v={<Prov value={`${d.qty} ${d.unit}`} title={d.category} sources={[{ label: d.desc, meta: `${d.agency} · ${fmtDateTime(d.at)}` }]} />} />)}
              <H>5. Danos ambientais</H>
              <Row k="Registros ambientais" v={<Prov value={dmg.filter((d) => d.category === "Danos ambientais").reduce((n, d) => n + d.qty, 0)} title="Danos ambientais" sources={dmg.filter((d) => d.category === "Danos ambientais").map((d) => ({ label: d.desc, meta: d.agency }))} />} />
              <H>6. Prejuízos</H>
              <Row k="Prejuízos públicos" v={<Prov value={brl(fide.publicValue)} title="Prejuízos públicos" sources={fide.publicLoss.map((d) => ({ label: `${d.desc}: ${brl(d.value)}`, meta: d.agency }))} />} />
              <Row k="Prejuízos privados" v={<Prov value={brl(fide.privateValue)} title="Prejuízos privados" sources={fide.privateLoss.map((d) => ({ label: `${d.desc}: ${brl(d.value)}`, meta: d.agency }))} />} />
              <Row k="Valor estimado total" v={<Prov value={brl(fide.publicValue + fide.privateValue)} title="Prejuízos" sources={dmg.map((d) => ({ label: `${d.desc}: ${brl(d.value)}`, meta: d.agency }))} />} />
            </>
          )}
        </article>
      </div>
      <Dialog open={ask} onOpenChange={setAsk}>
        <DialogContent>
          <DialogHeader><DialogTitle>Protocolo do S2iD</DialogTitle></DialogHeader>
          <Input placeholder="Ex.: SC-F-4219000-12101-20261114" value={proto} onChange={(e) => setProto(e.target.value)} />
          <DialogFooter><Button disabled={!proto} onClick={() => { s.markSent(doc.id, proto); setAsk(false); toast.success("Documento marcado como enviado"); }}>Confirmar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
