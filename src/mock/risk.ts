import { cellToBoundary, cellToLatLng, gridDisk, polygonToCells, latLngToCell } from "h3-js";
import { CITY_CENTER, off, riskAreas, riverLine, type LatLng, type Resource, type Shelter } from "./data";

export function contains(pos: LatLng, polygon: LatLng[]) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const a = polygon[i], b = polygon[j];
    if (!a || !b) continue;
    if ((a[0] > pos[0]) !== (b[0] > pos[0]) && pos[1] < (b[1] - a[1]) * (pos[0] - a[0]) / (b[0] - a[0]) + a[1]) inside = !inside;
  }
  return inside;
}
const meters = (p: LatLng, q: LatLng): [number, number] => [(p[1] - q[1]) * 99000, (p[0] - q[0]) * 111320];
function riverDistance(p: LatLng) {
  return Math.min(...riverLine.slice(1).map((b, i) => {
    const a = riverLine[i];
    if (!a) return Infinity;
    const [x, y] = meters(p, a), [dx, dy] = meters(b, a);
    const t = Math.max(0, Math.min(1, (x * dx + y * dy) / (dx * dx + dy * dy)));
    return Math.hypot(x - t * dx, y - t * dy);
  }));
}
/** Deterministic 0..1 noise so the seed is identical on server, client and in tests. */
const noise = (i: number, k: number) => (((i + 1) * 9301 + k * 49297) % 233280) / 233280;
const between = (lo: number, hi: number, t: number) => Math.round(lo + (hi - lo) * t);

/** Grid covers the whole urban area (≈8 × 6.4 km) including the full river course. */
export const GRID_BOUNDS = [off(-4000, -3300), off(4000, -3300), off(4000, 3100), off(-4000, 3100)];
const gridIds = polygonToCells(GRID_BOUNDS, 9).sort();
const centres = new Map(gridIds.map((id) => [id, cellToLatLng(id) as LatLng]));
/** Cells inside a mapped risk neighbourhood (Ribeirinho, Ponte Velha, Jardim das Águas). */
const neighbourhoodCells = new Set(gridIds.filter((id) => riskAreas.some((r) => contains(centres.get(id)!, r.polygon))));
/** Two-ring band around the neighbourhoods. */
const bandCells = new Set([...neighbourhoodCells].flatMap((id) => gridDisk(id, 2)).filter((id) => !neighbourhoodCells.has(id)));

export type RiskZone = "núcleo" | "entorno" | "demais";
export interface RiskCell { id: string; pos: LatLng; polygon: LatLng[]; zone: RiskZone; handM: number; slopePct: number; population: number; buildings: number; vulnerableCount: number; historyEvents: number }
export const riskCells: RiskCell[] = gridIds.map((id, i) => {
  const pos = centres.get(id)!;
  const distance = riverDistance(pos);
  const zone: RiskZone = neighbourhoodCells.has(id) && distance < 450 ? "núcleo" : neighbourhoodCells.has(id) || bandCells.has(id) ? "entorno" : "demais";
  const [p, b, v, h] = [noise(i, 1), noise(i, 2), noise(i, 3), noise(i, 4)];
  const seed = zone === "núcleo"
    ? { population: between(40, 58, p), buildings: between(14, 20, b), vulnerableCount: between(4, 7, v), historyEvents: between(5, 7, h) }
    : zone === "entorno"
      ? { population: between(20, 30, p), buildings: between(7, 11, b), vulnerableCount: between(1, 3, v), historyEvents: 2 }
      : { population: between(4, 18, p), buildings: between(2, 8, b), vulnerableCount: between(0, 2, v), historyEvents: between(0, 1, h) };
  return {
    id, pos, zone, polygon: cellToBoundary(id) as LatLng[],
    handM: Math.round((0.15 + distance / 310) * 10) / 10,
    slopePct: Math.round(Math.min(20, 1 + distance / 160 + noise(i, 5) * 3) * 10) / 10,
    ...seed,
  };
});

export const riskClasses = ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"];
/** Lower bounds of Baixo, Médio, Alto and Muito alto on the risk index. */
export const RISK_THRESHOLDS = [0.08, 0.2, 0.45, 0.7] as const;
export const RAIN_REFERENCE = 120;
export function riskFactors(c: RiskCell, rain: number) {
  const hand = Math.max(0, 1 - c.handM / 8);
  const slope = Math.max(0, 1 - c.slopePct / 20);
  const history = c.historyEvents / 7;
  const susceptibility = hand * 0.6 + slope * 0.15 + history * 0.25;
  const exposure = c.population / 58 * 0.5 + c.buildings / 20 * 0.3 + c.vulnerableCount / 7 * 0.2;
  const trigger = Math.max(1, rain / RAIN_REFERENCE);
  const riskIndex = susceptibility * exposure * trigger;
  return { hand, slope, history, susceptibility, exposure, trigger, riskIndex, classIndex: RISK_THRESHOLDS.filter((t) => riskIndex >= t).length };
}

/** HAND terrain bins in metres (upper bounds); the last bin is open-ended. */
export const HAND_BINS = [1, 2, 3, 4] as const;
export const handLabels = ["< 1 m", "1–2 m", "2–3 m", "3–4 m", "≥ 4 m"];
export const handClass = (handM: number) => HAND_BINS.filter((b) => handM >= b).length;

export function classCounts(rain: number) {
  const counts = [0, 0, 0, 0, 0];
  for (const c of riskCells) counts[riskFactors(c, rain).classIndex]!++;
  return counts;
}
const cellOf = (p: LatLng) => latLngToCell(p[0], p[1], 9);
/** City-wide risk summary used by the Prontidão card. */
export function cityRisk(rain: number, shelters: Shelter[]) {
  const high = riskCells.filter((c) => riskFactors(c, rain).classIndex >= 3);
  const ids = new Set(high.map((c) => c.id));
  return { highCells: high.length, people: high.reduce((n, c) => n + c.population, 0), shelters: shelters.filter((s) => ids.has(cellOf(s.pos))), trigger: Math.max(1, rain / RAIN_REFERENCE) };
}
export function scenario(level: number, shelters: Shelter[], resources: Resource[]) {
  const flooded = riskCells.filter((c) => c.handM <= level);
  const ids = new Set(flooded.map((c) => c.id));
  const inWater = (p: LatLng) => ids.has(cellOf(p));
  return { flooded, people: flooded.reduce((n, c) => n + c.population, 0), buildings: flooded.reduce((n, c) => n + c.buildings, 0), vulnerable: flooded.reduce((n, c) => n + c.vulnerableCount, 0), shelters: shelters.filter((s) => inWater(s.pos)), resources: resources.filter((r) => inWater(r.pos)) };
}
/** Level used by the CAP-triggered scenario that motivates pre-positioning a boat in the south zone. */
export const ALERT_SCENARIO_LEVEL = 2;
/** South-zone slice of a flood scenario: south of the city centre, where Ponte Velha and Jardim das Águas sit. */
export function southScenario(level: number, resources: Resource[]) {
  const sim = scenario(level, [], resources);
  const south = sim.flooded.filter((c) => c.pos[0] < CITY_CENTER[0]);
  const boats = resources.filter((r) => r.agency === "cbm" && r.type === "Barco" && r.zone === "Sul" && r.status === "disponível");
  return { cells: south, people: south.reduce((n, c) => n + c.population, 0), boats };
}
export const observedFlood = [off(-2500, 220), off(-900, 180), off(600, 130), off(2500, -80), off(2500, -1000), off(900, -940), off(-900, -700), off(-2500, -650)];
export const missionArea = [off(100, -70), off(850, -70), off(850, -720), off(100, -720)];
export function agreement(level: number) {
  const observed = new Set(riskCells.filter((c) => contains(c.pos, observedFlood)).map((c) => c.id));
  const predicted = new Set(riskCells.filter((c) => c.handM <= level).map((c) => c.id));
  const union = new Set([...observed, ...predicted]);
  const intersection = [...observed].filter((id) => predicted.has(id)).length;
  return union.size ? Math.round(intersection / union.size * 100) : 100;
}
