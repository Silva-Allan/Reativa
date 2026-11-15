import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useApp, isCheckInLate } from "@/store/app";
import { agencies, fmtDateTime } from "@/mock/data";
import { Chip, PageHead, Panel } from "@/components/reativa/bits";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { seo } from "@/lib/seo";

export const Route = createFileRoute("/orgao/recursos")({
  head: () => seo("Recursos do órgão", "Recursos e check-in de turno por órgão."),
  component: Recursos,
});
function Recursos() {
  const { resources, step, checkIn } = useApp();
  const [ag, setAg] = useState("pm");
  return (
    <div>
      <PageHead phase="0 Prontidão" title="Recursos do órgão" right={
        <div className="flex gap-2">
          <Select value={ag} onValueChange={setAg}><SelectTrigger className="w-48"><SelectValue /></SelectTrigger><SelectContent>{agencies.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent></Select>
          <Button onClick={() => checkIn(ag)}>Fazer check-in do turno</Button>
        </div>
      } />
      <Panel>
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-muted-foreground"><tr><th className="py-1.5">Prefixo</th><th>Tipo</th><th>Cap.</th><th>Zona</th><th>Status</th><th>Último check-in</th></tr></thead>
          <tbody className="divide-y">{resources.filter((r) => r.agency === ag).map((r) => (
            <tr key={r.id}><td className="py-1.5 font-medium">{r.callsign}</td><td>{r.type}</td><td>{r.capacity}</td><td>{r.zone}</td><td>{r.status}</td>
              <td>{isCheckInLate(r, step) ? <Chip tone="red">atrasado · {fmtDateTime(r.lastCheckIn)}</Chip> : fmtDateTime(r.lastCheckIn)}</td></tr>
          ))}</tbody>
        </table>
      </Panel>
    </div>
  );
}
