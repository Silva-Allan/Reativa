export type LatLng = [number, number];
export const CITY_CENTER: LatLng = [-27.1, -52.62];
export function off(dx: number, dy: number): LatLng {
  const lat = CITY_CENTER[0] + dy / 111320;
  const lng = CITY_CENTER[1] + dx / (111320 * Math.cos((CITY_CENTER[0] * Math.PI) / 180));
  return [lat, lng];
}
const P = (pts: [number, number][]) => pts.map(([x, y]) => off(x, y));

export type Zone = "Norte" | "Centro" | "Sul";
export type Stage = "Normalidade" | "Atenção" | "Alerta" | "Crise";
export type Severity = "Extremo" | "Severo" | "Moderado" | "Menor";
export type Role = "Coordenador" | "Operador de órgão" | "Equipe de campo" | "Cidadão";

export interface Agency { id: string; name: string; short: string }
export interface Resource {
  id: string; callsign: string; type: string; agency: string; capacity: number; zone: Zone;
  status: "disponível" | "empenhado" | "reservado" | "indisponível"; lastCheckIn: string; pos: LatLng;
}
export interface Stock { item: string; qty: number; min: number; unit: string }
export interface ShelterEntry { id: string; at: string; name: string; people: number; kind: "desabrigado" | "desalojado"; origin: string }
export interface Shelter { active?: boolean; id: string; name: string; capacity: number; pos: LatLng; stocks: Stock[]; entries: ShelterEntry[]; baseDesabrigados: number; baseDesalojados: number }
export interface RiskArea { id: string; name: string; polygon: LatLng[] }
export interface CapAlert {
  id: string; sender: string; event: string; severity: "Severe" | "Extreme" | "Moderate";
  urgency: "Expected" | "Immediate"; certainty: "Likely" | "Observed"; headline: string; instruction: string;
  polygon: LatLng[]; effective: string; expires: string;
}
export type ReportSource = "cidadao" | "ssp193" | "campo" | "drone";
export interface CitizenReport {
  id: string; protocol: string; at: string; source: ReportSource; kind: "socorro" | "relato"; text: string;
  people: number; vulnerable: string[]; water: string; pos: LatLng; place: string; status: "recebido" | "em triagem" | "agrupado" | "atendido"; incidentId?: string; imageId?: string;
}
export interface Incident {
  id: string; cobrade: string; title: string; place: string; severity: Severity; victims: number; vulnerable: string[];
  pos: LatLng; status: "aberta" | "em atendimento" | "encerrada"; reportIds: string[]; createdAt: string;
}
export interface Requirement { label: string; qty: number }
export interface Alternative { resourceId: string; etaMin: number; note: string }
export interface Assignment {
  id: string; incidentId: string; resourceId: string; capability: string; etaMin: number; polyline: LatLng[];
  rationale: string; alternatives: Alternative[]; status: "proposta" | "aprovada" | "trocada"; approvedBy?: string; approvedAt?: string;
}
export interface Blockage { id: string; at: string; pos: LatLng; desc: string; by: string }
export interface DamageRecord { id: string; category: string; desc: string; qty: number; unit: string; value: number; agency: string; at: string; sector?: "publico" | "privado" }
export interface Photo { id: string; at: string; pos: LatLng; caption: string; hue: number; imageId?: string }
export interface ReportDoc { id: string; title: string; status: "rascunho" | "pendente" | "pronto" | "enviado"; pct: number; pending: { agency: string; item: string }[]; protocol?: string }
export interface AuditEvent { at: string; actor: string; action: string }
export interface Suggestion { id: string; text: string; detail: string; status: "pendente" | "aceita" | "ignorada" }
export interface Task { id: string; title: string; agency: string; resourceId: string; status: "nova" | "aceita" | "recusada"; mirroredCad?: boolean }

export const agencies: Agency[] = [
  { id: "dc", name: "Defesa Civil", short: "DC" },
  { id: "cbm", name: "Corpo de Bombeiros Militar", short: "CBM" },
  { id: "pm", name: "Polícia Militar", short: "PM" },
  { id: "gm", name: "Guarda Municipal", short: "GM" },
  { id: "samu", name: "SAMU", short: "SAMU" },
  { id: "obras", name: "Secretaria de Obras", short: "Obras" },
  { id: "as", name: "Assistência Social", short: "AS" },
  { id: "vol", name: "Voluntários", short: "Vol" },
];

export const T0 = new Date("2026-11-14T13:40:00-03:00").getTime();
export const at = (min: number) => new Date(T0 + min * 60000).toISOString();
export const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });
export const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" }).replace(",", "");

const r = (callsign: string, type: string, agency: string, capacity: number, zone: Zone, ageMin: number, x: number, y: number, status: Resource["status"] = "disponível"): Resource => ({
  id: callsign, callsign, type, agency, capacity, zone, status, lastCheckIn: at(-ageMin), pos: off(x, y),
});
export const seedResources = (): Resource[] => [
  r("DC-V01", "Viatura", "dc", 4, "Centro", 30, -150, 350),
  r("DC-V02", "Viatura", "dc", 4, "Sul", 40, 800, -1150),
  r("DC-D02", "Drone", "dc", 1, "Centro", 20, -50, 450),
  r("AS-VAN01", "Van", "as", 12, "Centro", 45, -350, 650),
  r("CBM-B03", "Barco", "cbm", 6, "Norte", 40, 200, 1500, "reservado"),
  r("CBM-B05", "Barco", "cbm", 4, "Centro", 55, -900, 200),
  r("CBM-B07", "Barco", "cbm", 6, "Centro", 30, -200, 600),
  r("CBM-AR01", "Viatura de resgate", "cbm", 5, "Centro", 60, 100, 900),
  r("CBM-AR02", "Viatura de resgate", "cbm", 5, "Norte", 70, 1100, 1700),
  r("PM-201", "Viatura", "pm", 4, "Centro", 90, 600, 500),
  r("PM-204", "Viatura", "pm", 4, "Sul", 120, -500, -1500),
  r("PM-207", "Viatura", "pm", 4, "Norte", 14 * 60, -1300, 1600),
  r("PM-209", "Viatura", "pm", 4, "Sul", 13 * 60, 1400, -1200),
  r("GM-01", "Viatura", "gm", 4, "Centro", 50, -400, 100),
  r("GM-02", "Viatura", "gm", 4, "Norte", 45, 800, 1300),
  r("GM-03", "Viatura", "gm", 4, "Sul", 35, 1200, 200),
  r("SAMU-USB01", "USB", "samu", 2, "Norte", 25, -200, 1200),
  r("SAMU-USB02", "USB", "samu", 2, "Centro", 20, -600, 400),
  r("SAMU-USB03", "USB", "samu", 2, "Sul", 30, 700, -1400),
  r("SAMU-USA01", "USA", "samu", 2, "Centro", 25, 300, 700),
  r("OBR-RE01", "Retroescavadeira", "obras", 1, "Centro", 180, -1000, 800),
  r("OBR-RE02", "Retroescavadeira", "obras", 1, "Sul", 200, 1600, -900),
  ...[1, 2, 3, 4, 5, 6].map((n) => r(`VOL-B0${n}`, "Barco credenciado", "vol", 4, (["Norte", "Centro", "Sul"] as Zone[])[n % 3]!, 100 + n * 10, -1600 + n * 450, n % 2 ? 1000 : -1100)),
];

const stocks = (c: number, h: number, m: number, a: number): Stock[] => [
  { item: "Cesta básica", qty: c, min: 40, unit: "un" },
  { item: "Kit higiene", qty: h, min: 40, unit: "un" },
  { item: "Colchão", qty: m, min: 30, unit: "un" },
  { item: "Água potável", qty: a, min: 300, unit: "L" },
];
export const seedShelters = (): Shelter[] => [
  { id: "ginasio", name: "Ginásio Municipal", capacity: 150, pos: off(-300, 700), stocks: stocks(120, 90, 34, 1200), entries: [], baseDesabrigados: 0, baseDesalojados: 0 },
  { id: "emef", name: "EMEF Rio Claro", capacity: 80, pos: off(1800, 900), stocks: stocks(60, 50, 40, 600), entries: [], baseDesabrigados: 0, baseDesalojados: 0 },
  { id: "salao", name: "Salão Paroquial", capacity: 60, pos: off(-1500, 1100), stocks: stocks(45, 42, 31, 400), entries: [], baseDesabrigados: 0, baseDesalojados: 0 },
  { id: "ctg", name: "CTG Tradição", capacity: 120, pos: off(900, -1800), stocks: stocks(80, 70, 52, 900), entries: [], baseDesabrigados: 0, baseDesalojados: 0 },
];

export const riverLine: LatLng[] = P([[-2600, -100], [-1800, -250], [-1000, -150], [-300, -300], [400, -250], [1000, -450], [1700, -500], [2600, -350]]);
export const floodPolygon: LatLng[] = P([[-2600, 150], [-1800, 0], [-1000, 100], [-300, -50], [400, 0], [1000, -200], [1700, -250], [2600, -100], [2600, -650], [1700, -800], [1000, -750], [400, -550], [-300, -600], [-1000, -450], [-1800, -550], [-2600, -400]]);
export const riskAreas: RiskArea[] = [
  { id: "ribeirinho", name: "Ribeirinho", polygon: P([[-1600, 50], [-900, 80], [-850, -500], [-1550, -560]]) },
  { id: "ponte", name: "Ponte Velha", polygon: P([[150, -100], [750, -120], [780, -650], [180, -620]]) },
  { id: "jardim", name: "Jardim das Águas", polygon: P([[1200, -300], [1900, -320], [1950, -900], [1250, -850]]) },
];

export const INCIDENT_POS = off(450, -420);
export const BRIDGE_POS = off(410, -200);
export const routes = {
  boat: P([[300, -280], [340, -350], [390, -390], [450, -420]]),
  ambA: P([[-600, 400], [0, 300], [400, 0], [410, -200], [450, -420]]),
  ambB: P([[-600, 400], [-1000, 100], [-950, -700], [0, -750], [450, -420]]),
  gm: P([[1200, 200], [800, -150], [450, -420]]),
  // From CBM-B07's base to where it is staged once the suggestion is accepted (see buildState).
  b07Prepos: P([[-200, 600], [50, 150], [300, -280]]),
};

export const capAlert: CapAlert = {
  id: "cap-1",
  sender: "defesacivil@idap.gov.br",
  event: "Inundação",
  severity: "Severe",
  urgency: "Expected",
  certainty: "Likely",
  headline: "Alerta de inundação para áreas ribeirinhas de Vale Sereno",
  instruction: "Moradores de áreas ribeirinhas devem preparar saída para locais altos ou abrigos. Não atravesse áreas alagadas.",
  polygon: P([[-2200, 300], [2300, 200], [2400, -1000], [-2100, -900]]),
  effective: at(70),
  expires: at(70 + 24 * 60),
};

export function rainSeries(step: number) {
  const final = step >= 1 ? 134 : 86;
  const out: { h: string; mm: number }[] = [];
  for (let i = 0; i <= 72; i++) {
    const t = i / 72;
    const base = 86 * (t * 0.7 + Math.pow(t, 3) * 0.3);
    const surge = step >= 1 ? (final - 86) * Math.pow(Math.max(0, (t - 0.8) / 0.2), 2) : 0;
    out.push({ h: i % 12 === 0 ? `-${72 - i}h` : "", mm: Math.round((base + surge) * 10) / 10 });
  }
  out[72]!.h = "agora";
  return out;
}
export const RAIN_THRESHOLD = 120;

export const playbook: Record<string, Record<Severity, string[]>> = {
  "1.2.1.0.0 Inundação": {
    Extremo: ["2 barcos", "2 USB + 1 USA", "Isolamento PM/GM", "Abrigo 150 vagas"],
    Severo: ["1 barco (cap. ≥ 4)", "1 USB", "Isolamento de área", "Abrigo 4 vagas · Ginásio Municipal"],
    Moderado: ["1 viatura de resgate", "Monitoramento", "Abrigo em prontidão"],
    Menor: ["Monitoramento", "Comunicação à população"],
  },
  "1.2.2.0.0 Enxurrada": {
    Extremo: ["3 barcos", "2 USB", "Bloqueio viário", "Retroescavadeira"],
    Severo: ["2 barcos", "1 USB", "Bloqueio viário"],
    Moderado: ["1 viatura de resgate", "Sinalização"],
    Menor: ["Monitoramento"],
  },
  "1.1.3.2.1 Deslizamento": {
    Extremo: ["CBM busca e salvamento", "2 USB", "Retroescavadeira x2", "Evacuação"],
    Severo: ["CBM resgate", "1 USB", "Retroescavadeira"],
    Moderado: ["Vistoria técnica", "Interdição"],
    Menor: ["Vistoria técnica"],
  },
  "1.3.2.1.4 Vendaval": {
    Extremo: ["CBM x2", "Obras: remoção", "Distribuição de lonas"],
    Severo: ["CBM", "Obras: remoção"],
    Moderado: ["Obras: vistoria"],
    Menor: ["Monitoramento"],
  },
};

export const stepNames = [
  "Normalidade",
  "Alerta CAP e chuva acima do limiar",
  "Relatos chegando",
  "Drone térmico confirma pessoas",
  "Ocorrência e plano proposto",
  "Plano aprovado",
  "Bloqueio na ponte, rota refeita",
  "Resgatados no abrigo",
  "Evento encerrado, relatórios",
  "Linha do tempo e métricas",
];
export const stepRoutes = [
  "/gabinete/prontidao",
  "/gabinete/alertas",
  "/gabinete/triagem",
  "/gabinete/imagens",
  "/gabinete/ocorrencias/1/plano",
  "/gabinete/ocorrencias/1/plano",
  "/campo",
  "/gabinete/abrigos",
  // Step 8 opens the plan so the audience sees the coordinator click "Encerrar e desmobilizar";
  // the plan page then moves on to the FIDE.
  "/gabinete/ocorrencias/1/plano",
  "/gabinete/linha-do-tempo",
] as const;

/** First demo step whose scenario data a route needs; used to hydrate deep links and QR codes. */
export function requiredStep(path: string): number {
  if (path.startsWith("/gabinete/linha-do-tempo")) return 9;
  if (path.startsWith("/relatorios")) return 8;
  if (path.startsWith("/gabinete/abrigos")) return 7;
  if (path.startsWith("/campo")) return 5;
  if (path.startsWith("/gabinete/ocorrencias") || path.startsWith("/gabinete/mapa") || path.startsWith("/orgao/tarefas")) return 4;
  if (path.startsWith("/gabinete/imagens")) return 3;
  if (path.startsWith("/gabinete/triagem")) return 2;
  if (path.startsWith("/gabinete/alertas")) return 1;
  return 0;
}
/** Minutes after T0 at which the coordinator closes the event in the scripted demo (16:25). */
export const CLOSE_MIN = 165;
