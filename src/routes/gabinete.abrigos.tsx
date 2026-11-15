import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/store/app";
import { Chip, Fase2, PageHead, Panel } from "@/components/reativa/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { selectAssistance, shelterOccupancy } from "@/store/selectors";
import { fmtDateTime } from "@/mock/data";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gabinete/abrigos")({
  head: () => seo("Abrigos", "Ocupação dos abrigos, entradas de famílias e estoques."),
  component: Abrigos,
});

function Abrigos() {
  const state = useApp();
  const { shelters, addShelterEntry, addToRequest, requestItems } = state;
  const totals = selectAssistance(state);
  const [form, setForm] = useState({ shelter: "ginasio", name: "", people: 1, kind: "desabrigado" as "desabrigado" | "desalojado" });
  return (
    <div>
      <PageHead phase="3 Assistência" title="Abrigos e estoques" />
      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {shelters.map((s) => {
          const des = shelterOccupancy(s);
          const occ = des;
          return (
            <div key={s.id} className="rounded-lg border bg-card p-4">
              <div className="font-medium">{s.name}</div>
              <div className="mt-1 text-2xl font-semibold tabular-nums">{occ}<span className="text-sm font-normal text-muted-foreground">/{s.capacity}</span></div>
              <Progress value={(occ / s.capacity) * 100} className="mt-2 h-2" />
              <div className="mt-2 flex justify-between text-xs text-muted-foreground"><span>Desabrigados {des}</span><span>Vagas {s.capacity - occ}</span></div>
            </div>
          );
        })}
      </div>
      <section className="mb-4 border-y py-4">
        <h2 className="text-sm font-semibold">Assistência Social · {totals.homeless} desabrigados · {totals.displaced} desalojados</h2>
        <p className="mt-1 text-xs text-muted-foreground">Desalojados com parentes, fora dos abrigos públicos</p>
        <ul className="mt-2 divide-y text-sm">{totals.desalojados.map((e) => <li key={e.id} className="py-2"><b>{e.name} · {e.people} pessoas</b><span className="block text-xs text-muted-foreground">{e.origin} · {fmtDateTime(e.at)}</span></li>)}</ul>
      </section>
      <div className="grid gap-4 xl:grid-cols-[1fr_360px]">
        <Panel title="Estoques" action={<span className="flex items-center gap-2 text-xs text-muted-foreground">Envio ao S2iD <Fase2 /></span>}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1.5">Abrigo</th><th>Item</th><th className="text-right">Qtd</th><th className="text-right">Mínimo</th><th></th></tr></thead>
              <tbody className="divide-y">
                {shelters.flatMap((s) => s.stocks.map((st) => {
                  const low = st.qty < st.min;
                  const inReq = requestItems.some((r) => r.item === st.item);
                  return (
                    <tr key={s.id + st.item} className={low ? "bg-signal/10" : ""}>
                      <td className="py-1.5">{s.name}</td><td>{st.item}</td>
                      <td className={`text-right tabular-nums ${low ? "font-semibold text-signal" : ""}`}>{st.qty} {st.unit}</td>
                      <td className="text-right tabular-nums text-muted-foreground">{st.min}</td>
                      <td className="pl-3 text-right">{low && (inReq ? <Chip tone="blue">na solicitação</Chip> : <Button size="sm" variant="outline" onClick={() => { addToRequest(st.item, (st.min - st.qty) * 3, `${s.name} abaixo do mínimo`); toast.success("Item incluído na solicitação de recursos"); }}>Incluir na solicitação de recursos (S2iD)</Button>)}</td>
                    </tr>
                  );
                }))}
              </tbody>
            </table>
          </div>
        </Panel>
        <Panel title={form.kind === "desabrigado" ? "Registrar entrada no abrigo" : "Assistência Social · registrar desalojados"}>
          <div className="space-y-3">
            {form.kind === "desabrigado" && <Select value={form.shelter} onValueChange={(v) => setForm({ ...form, shelter: v })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>{shelters.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>}
            <Input placeholder="Responsável / família" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            <Input type="number" min={1} value={form.people} onChange={(e) => setForm({ ...form, people: +e.target.value })} />
            <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as typeof form.kind })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="desabrigado">Desabrigado</SelectItem><SelectItem value="desalojado">Desalojado</SelectItem></SelectContent></Select>
            <Button className="w-full" disabled={!form.name.trim() || !Number.isInteger(form.people) || form.people < 1} onClick={() => { addShelterEntry(form.shelter, { name: form.name || "Sem identificação", people: form.people, kind: form.kind, origin: "Registro manual" }); setForm({ ...form, name: "", people: 1 }); toast.success("Entrada registrada"); }}>Registrar</Button>
          </div>
        </Panel>
      </div>
    </div>
  );
}
