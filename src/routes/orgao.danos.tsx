import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp } from "@/store/app";
import { PageHead, Panel } from "@/components/reativa/bits";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/orgao/danos")({
  head: () => seo("Registro de danos", "Registro de danos materiais e prejuízos por órgão."),
  component: Danos,
});
function Danos() {
  const { damages, addDamage } = useApp();
  const [f, setF] = useState({ category: "Habitações danificadas", desc: "", qty: 1, unit: "un", value: 0, agency: "Obras" });
  return (
    <div>
      <PageHead phase="3 Assistência" title="Registro de danos" />
      <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
        <Panel title="Novo registro">
          <div className="space-y-2">
            <Input value={f.category} onChange={(e) => setF({ ...f, category: e.target.value })} placeholder="Categoria" />
            <Input value={f.desc} onChange={(e) => setF({ ...f, desc: e.target.value })} placeholder="Descrição" />
            <div className="flex gap-2"><Input type="number" value={f.qty} onChange={(e) => setF({ ...f, qty: +e.target.value })} /><Input value={f.unit} onChange={(e) => setF({ ...f, unit: e.target.value })} /></div>
            <Input type="number" value={f.value} onChange={(e) => setF({ ...f, value: +e.target.value })} placeholder="Valor estimado (R$)" />
            <Button className="w-full" disabled={!f.desc} onClick={() => { addDamage(f); setF({ ...f, desc: "" }); }}>Registrar</Button>
          </div>
        </Panel>
        <Panel title="Registros">
          <ul className="divide-y text-sm">{damages.map((d) => <li key={d.id} className="flex justify-between py-2"><span><b>{d.category}</b> — {d.desc} <span className="text-muted-foreground">({d.agency})</span></span><span className="tabular-nums">{d.qty} {d.unit} · {d.value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}</span></li>)}</ul>
        </Panel>
      </div>
    </div>
  );
}
