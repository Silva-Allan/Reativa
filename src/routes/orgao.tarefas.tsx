import { createFileRoute } from "@tanstack/react-router";
import { useApp } from "@/store/app";
import { Chip, Fase2, PageHead, Panel } from "@/components/reativa/bits";
import { Button } from "@/components/ui/button";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/orgao/tarefas")({
  head: () => seo("Tarefas do órgão", "Caixa de entrada de tarefas atribuídas aos órgãos."),
  component: Tarefas,
});
function Tarefas() {
  const { tasks, setTask } = useApp();
  return (
    <div>
      <PageHead phase="2 Resposta" title="Tarefas do órgão" />
      <div className="space-y-3">
        {!tasks.length && <Panel><p className="text-sm text-muted-foreground">Nenhuma tarefa recebida.</p></Panel>}
        {tasks.map((t) => (
          <div key={t.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
            <div>
              <div className="font-medium">{t.title}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{t.agency.toUpperCase()} · {t.resourceId}{t.mirroredCad && <><Chip>Espelhado no Sinesp CAD</Chip><Fase2 /></>}</div>
            </div>
            {t.status === "nova" ? <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setTask(t.id, "recusada")}>Recusar</Button><Button size="sm" onClick={() => setTask(t.id, "aceita")}>Aceitar</Button></div> : <Chip tone={t.status === "aceita" ? "green" : "red"}>{t.status}</Chip>}
          </div>
        ))}
      </div>
    </div>
  );
}
