import { createFileRoute } from "@tanstack/react-router";
import { playbook, type Severity } from "@/mock/data";
import { PageHead, Panel, Sev } from "@/components/reativa/bits";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/gabinete/playbooks")({
  head: () => seo("Playbooks", "Matriz COBRADE × severidade com os recursos previstos no PLANCON."),
  component: Playbooks,
});
const sevs: Severity[] = ["Extremo", "Severo", "Moderado", "Menor"];
function Playbooks() {
  return (
    <div>
      <PageHead phase="0 Prontidão" title="Playbooks" sub="Os quantitativos vêm do PLANCON do município" />
      <Panel>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr><th className="py-2 text-left text-xs text-muted-foreground">COBRADE</th>{sevs.map((s) => <th key={s} className="px-2 text-left"><Sev s={s} /></th>)}</tr></thead>
            <tbody className="divide-y">{Object.entries(playbook).map(([k, row]) => (
              <tr key={k} className="align-top"><td className="py-2 pr-3 font-medium">{k}</td>{sevs.map((s) => <td key={s} className="px-2 py-2"><ul className="space-y-0.5 text-xs">{row[s].map((x) => <li key={x}>{x}</li>)}</ul></td>)}</tr>
            ))}</tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
