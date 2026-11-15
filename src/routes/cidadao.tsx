import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Check, LifeBuoy, MapPin, Megaphone, Phone } from "lucide-react";
import { useApp } from "@/store/app";
import { off } from "@/mock/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/cidadao")({
  head: () => seo("Cidadão", "Peça socorro ou relate uma situação de risco em Vale Sereno."),
  component: Cidadao,
});
const VULN = ["Criança", "Idoso", "Acamado", "Pessoa com deficiência", "Gestante", "Animais"];
const WATER = ["No tornozelo", "No joelho", "Na cintura", "Acima da janela"];
const TRACK = ["Recebido", "Em triagem", "Equipe designada", "Atendido"];

function Cidadao() {
  const addReport = useApp((s) => s.addReport);
  const [mode, setMode] = useState<null | "socorro" | "relato">(null);
  const [people, setPeople] = useState(1);
  const [vuln, setVuln] = useState<string[]>([]);
  const [water, setWater] = useState("");
  const [text, setText] = useState("");
  const [photo, setPhoto] = useState(false);
  const [protocol, setProtocol] = useState<string | null>(null);

  if (protocol) return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-5 text-center">
        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-success/15 text-success"><Check /></div>
        <p className="text-sm text-muted-foreground">Seu protocolo</p>
        <p className="text-2xl font-semibold tabular-nums">{protocol}</p>
      </div>
      <ol className="space-y-2 rounded-lg border bg-card p-4">
        {TRACK.map((t, i) => (
          <li key={t} className="flex items-center gap-3 text-sm">
            <span className={cn("flex h-6 w-6 items-center justify-center rounded-full border text-xs", i === 0 ? "border-ops bg-ops text-paper" : "text-muted-foreground")}>{i + 1}</span>
            <span className={i === 0 ? "font-medium" : "text-muted-foreground"}>{t}</span>
          </li>
        ))}
      </ol>
      <Button variant="outline" className="w-full" onClick={() => { setProtocol(null); setMode(null); setText(""); setVuln([]); }}>Novo relato</Button>
    </div>
  );

  if (!mode) return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Como podemos ajudar?</h1>
      <button onClick={() => setMode("socorro")} className="flex w-full items-center gap-4 rounded-lg bg-signal p-6 text-left text-paper">
        <LifeBuoy className="h-10 w-10" /><span><span className="block text-xl font-semibold">Preciso de socorro</span><span className="text-sm opacity-90">Pessoas em risco agora</span></span>
      </button>
      <button onClick={() => setMode("relato")} className="flex w-full items-center gap-4 rounded-lg bg-ops p-6 text-left text-paper">
        <Megaphone className="h-10 w-10" /><span><span className="block text-xl font-semibold">Quero relatar</span><span className="text-sm opacity-90">Alagamento, bloqueio, dano</span></span>
      </button>
      <a href="tel:193" className="flex items-center justify-center gap-2 rounded-lg border p-3 text-sm font-medium"><Phone className="h-4 w-4" />Em risco imediato, ligue 193</a>
    </div>
  );

  const submit = () => {
    setProtocol(addReport({ source: "cidadao", kind: mode, text: text || (mode === "socorro" ? "Pedido de socorro" : "Relato"), people, vulnerable: vuln, water, pos: off(460, -415), place: "Ponte Velha" }));
  };
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{mode === "socorro" ? "Pedido de socorro" : "Novo relato"}</h1>
      <div className="flex items-center gap-2 rounded-lg border bg-card p-3 text-sm"><MapPin className="h-4 w-4 text-ops" />Rua Sete, Ponte Velha · localização aproximada</div>
      <div><Label>Número de pessoas</Label><Input type="number" min={1} value={people} onChange={(e) => setPeople(+e.target.value)} className="mt-1" /></div>
      <div><Label>Pessoas vulneráveis</Label>
        <div className="mt-1 flex flex-wrap gap-2">{VULN.map((v) => (
          <button key={v} onClick={() => setVuln((x) => (x.includes(v) ? x.filter((y) => y !== v) : [...x, v]))} className={cn("rounded-full border px-3 py-1 text-sm", vuln.includes(v) && "border-ops bg-ops/10 text-ops")}>{v}</button>
        ))}</div>
      </div>
      <div><Label>Nível da água</Label>
        <div className="mt-1 grid grid-cols-2 gap-2">{WATER.map((w) => (
          <button key={w} onClick={() => setWater(w)} className={cn("rounded-md border px-3 py-2 text-sm", water === w && "border-ops bg-ops/10 text-ops")}>{w}</button>
        ))}</div>
      </div>
      <Button variant="outline" className="w-full" onClick={() => setPhoto(true)}><Camera />{photo ? "Foto anexada" : "Anexar foto"}</Button>
      <div><Label>Descreva</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} className="mt-1" placeholder="Ex.: família no telhado" /></div>
      <Button className="w-full" variant={mode === "socorro" ? "destructive" : "default"} size="lg" onClick={submit}>Enviar</Button>
      <button className="w-full text-sm text-muted-foreground" onClick={() => setMode(null)}>Voltar</button>
    </div>
  );
}
