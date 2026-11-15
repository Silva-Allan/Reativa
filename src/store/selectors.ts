import type { Data } from "./app";
import { riskAreas, type LatLng, type RiskArea, type Shelter } from "@/mock/data";
import { contains } from "@/mock/risk";

const centroid = (poly: LatLng[]): LatLng => [poly.reduce((n, p) => n + p[0], 0) / poly.length, poly.reduce((n, p) => n + p[1], 0) / poly.length];
/** Risk areas actually hit: those holding an incident, plus those inside a flood extent the coordinator accepted. */
export function selectAffectedAreas(s: Data): { area: RiskArea; reasons: string[] }[] {
  return riskAreas.flatMap((area) => {
    const reasons = s.incidents.filter((i) => contains(i.pos, area.polygon)).map((i) => `Ocorrência #${i.id} · ${i.place}`);
    if (s.floodAcceptedAt && contains(centroid(area.polygon), s.floodExtent)) reasons.push("Mancha de alagamento aceita (Drone RGB)");
    return reasons.length ? [{ area, reasons }] : [];
  });
}

export const shelterOccupancy = (s: Shelter) => s.entries.filter((e) => e.kind === "desabrigado").reduce((n, e) => n + e.people, 0);
export const selectAssistance = (s: Data) => {
  const desabrigados = s.shelters.flatMap((sh) => sh.entries.filter((e) => e.kind === "desabrigado").map((e) => ({ ...e, shelter: sh.name })));
  const desalojados = s.displaced;
  return { desabrigados, desalojados, homeless: desabrigados.reduce((n, e) => n + e.people, 0), displaced: desalojados.reduce((n, e) => n + e.people, 0), vacancies: s.shelters.reduce((n, sh) => n + sh.capacity - shelterOccupancy(sh), 0) };
};
export function selectMetrics(s: Data) {
  const first = s.audit.find((e) => e.action.includes("Relato") && e.action.includes("recebido"));
  const approval = s.audit.find((e) => e.action.startsWith("Aprovou plano"));
  const arrival = s.audit.find((e) => e.actor === "CBM-B07" && e.action === "Status: No local");
  const elapsed = (a?: string, b?: string) => a && b ? Math.round((Date.parse(b) - Date.parse(a)) / 60000) : null;
  return { reportToPlan: elapsed(first?.at, approval?.at), planToArrival: elapsed(approval?.at, arrival?.at), unchanged: s.assignments.length ? Math.round(s.assignments.filter((a) => a.status === "aprovada").length / s.assignments.length * 100) : null, first, approval, arrival };
}
export function selectFide(s: Data) {
  const assistance = selectAssistance(s);
  const health = (kind: string) => s.humanRecords.filter((r) => r.kind === kind);
  const count = (kind: string) => health(kind).reduce((n, r) => n + r.people, 0);
  const publicLoss = s.damages.filter((d) => d.sector === "publico");
  const privateLoss = s.damages.filter((d) => d.sector !== "publico");
  const rescues = s.audit.filter((e) => e.action.startsWith("Status: Vítimas resgatadas"));
  return { ...assistance, affected: assistance.homeless + assistance.displaced + count("afetado"), sick: count("enfermo"), missing: count("desaparecido"), dead: count("obito"), injured: count("ferido"), health, publicLoss, privateLoss, publicValue: publicLoss.reduce((n, d) => n + d.value, 0), privateValue: privateLoss.reduce((n, d) => n + d.value, 0), rescued: rescues.reduce((n, e) => n + Number(e.action.match(/\((\d+)\)/)?.[1] ?? 0), 0), rescues };
}