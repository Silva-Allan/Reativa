import { cellToBoundary, cellToLatLng, polygonToCells, latLngToCell } from "h3-js";
import { off, riskAreas, riverLine, type LatLng, type Resource, type Shelter } from "./data";

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
export interface RiskCell { id: string; pos: LatLng; polygon: LatLng[]; handM: number; slopePct: number; population: number; buildings: number; vulnerableCount: number; historyEvents: number }
export const riskCells: RiskCell[] = polygonToCells([off(-2700, -2100), off(2700, -2100), off(2700, 2000), off(-2700, 2000)], 9).sort().map((id, i) => {
  const pos = cellToLatLng(id) as LatLng;
  const distance = riverDistance(pos);
  const neighbourhood = riskAreas.some((r) => contains(pos, r.polygon));
  return { id, pos, polygon: cellToBoundary(id) as LatLng[], handM: Math.round((0.15 + distance / 310) * 10) / 10, slopePct: Math.round((1 + distance / 160 + i % 4) * 10) / 10, population: 12 + i % 47, buildings: 4 + i % 17, vulnerableCount: 1 + i % 7, historyEvents: neighbourhood ? 4 + i % 4 : i % 2 };
});
export const riskClasses = ["Muito baixo", "Baixo", "Médio", "Alto", "Muito alto"];
export function riskFactors(c: RiskCell, rain: number) {
  const hand = Math.max(0, 1 - c.handM / 8);
  const slope = Math.max(0, 1 - c.slopePct / 20);
  const history = c.historyEvents / 7;
  const susceptibility = hand * 0.6 + slope * 0.15 + history * 0.25;
  const exposure = c.population / 58 * 0.5 + c.buildings / 20 * 0.3 + c.vulnerableCount / 7 * 0.2;
  const trigger = Math.max(1, rain / 120);
  const riskIndex = susceptibility * exposure * trigger;
  return { hand, slope, history, susceptibility, exposure, trigger, riskIndex, classIndex: Math.min(4, Math.floor(riskIndex * 5)) };
}
export function scenario(level: number, shelters: Shelter[], resources: Resource[]) {
  const flooded = riskCells.filter((c) => c.handM <= level);
  const ids = new Set(flooded.map((c) => c.id));
  const inWater = (p: LatLng) => ids.has(latLngToCell(p[0], p[1], 9));
  return { flooded, people: flooded.reduce((n, c) => n + c.population, 0), buildings: flooded.reduce((n, c) => n + c.buildings, 0), vulnerable: flooded.reduce((n, c) => n + c.vulnerableCount, 0), shelters: shelters.filter((s) => inWater(s.pos)), resources: resources.filter((r) => inWater(r.pos)) };
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