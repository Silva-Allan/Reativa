/**
 * Scenario engine. Everything that happens in the mock goes through here:
 *  - a scenario clock (minutes after T0 = 13:40 on 14/11/2026);
 *  - a queue of automatic events (external feeds, field teams, other agencies) that fire as the clock passes;
 *  - human decisions as plain functions on the state.
 * The scripted demo steps are a *replay* of the same human decisions at the script's times, so using the
 * app freely and pressing Próximo always produce the same kind of state.
 * All functions here mutate the Data object they receive; the store hands them a fresh copy.
 */
import {
  at, BRIDGE_POS, capAlert, CLOSE_MIN, DRONE_START, floodPolygon, INCIDENT_POS, off, rainAt, RAIN_THRESHOLD, routes, seedResources, seedShelters, STEP_CLOCK,
  type Assignment, type AuditEvent, type Blockage, type CapAlert, type CitizenReport, type DamageRecord, type Incident, type LatLng,
  type Photo, type ReportDoc, type Resource, type Shelter, type ShelterEntry, type Stage, type Suggestion, type Task,
} from "@/mock/data";
import { ALERT_SCENARIO_LEVEL, observedFlood, scenario, southScenario } from "@/mock/risk";

export const FIELD_STEPS = ["A caminho", "No local", "Vítimas resgatadas", "Encaminhadas", "Concluído"] as const;
export const COORD = "Coord. Marta Ribeiro";

export interface Detection { id: string; label: string; confidence: number; status: "pendente" | "enviada" | "descartada"; reason?: string | undefined; imageId: string }
export interface Notice { id: string; at: string; text: string; to: string; level: "info" | "warn" | "crit"; read: boolean; fresh: boolean }
export type EventKind =
  | "cap" | "rain" | "proposal" | "shelterRibeirinho" | "displacedSouza" | "shelterJardim" | "displacedSantos"
  | "r1" | "r2" | "r3" | "r4" | "droneLaunch" | "droneProcessing" | "droneReady"
  | "tasksAccepted" | "photoHouse" | "field1" | "field2" | "field3" | "field4" | "blockage" | "photoRescue" | "shelterLopes" | "stockLow" | "photoJardim";
export interface Scheduled { at: number; kind: EventKind }
export type OfflineAction = { kind: "field" } | { kind: "blockage" } | { kind: "photo"; caption: string };

export interface Data {
  /** Scenario clock, minutes after T0. */
  clock: number;
  /** Automatic events still to happen. */
  queue: Scheduled[];
  notifications: Notice[];
  /** Set when the coordinator accepts an observed flood extent (Drone RGB); null = model extent only. */
  floodAcceptedAt: string | null;
  /** Step 8 of the scripted demo: the plan page highlights "Encerrar e desmobilizar" and then applies it. */
  pendingClose: boolean;
  offline: boolean; offlineQueue: OfflineAction[];
  riverLevel: number; floodExtent: LatLng[]; displaced: ShelterEntry[]; humanRecords: { id: string; kind: string; people: number; at: string; source: string }[];
  missionStatus: "programada" | "em voo" | "processando" | "pronto"; detections: Detection[]; calibration: number | null;
  step: number; stage: Stage; resources: Resource[]; shelters: Shelter[]; alerts: CapAlert[]; suggestions: Suggestion[];
  reports: CitizenReport[]; incidents: Incident[]; assignments: Assignment[]; blockages: Blockage[]; damages: DamageRecord[];
  photos: Photo[]; docs: ReportDoc[]; audit: AuditEvent[]; tasks: Task[]; fieldStatus: number; closed: boolean;
  checkInPct: number; requestItems: { item: string; qty: number; reason: string }[]; clusterMerged: boolean;
}

// ---------- helpers ----------
const now = (d: Data) => at(d.clock);
export function log(d: Data, actor: string, action: string) { d.audit.push({ at: now(d), actor, action }); }
function notify(d: Data, level: Notice["level"], text: string, to: string) {
  d.notifications.unshift({ id: `n${d.notifications.length + 1}`, at: now(d), text, to, level, read: false, fresh: true });
}
function schedule(d: Data, delay: number, kind: EventKind) { d.queue.push({ at: d.clock + delay, kind }); }
const team = (d: Data) => d.assignments.find((a) => a.id === "a1")?.resourceId ?? "CBM-B07";
const ginasio = (d: Data) => d.shelters.find((s) => s.id === "ginasio");

const baseDocs = (): ReportDoc[] => [
  { id: "fide", title: "FIDE — Formulário de Informações do Desastre", status: "rascunho", pct: 10, pending: [{ agency: "Defesa Civil", item: "Área afetada" }, { agency: "Assistência Social", item: "Danos humanos" }, { agency: "Obras", item: "Danos materiais" }] },
  { id: "dmate", title: "DMATE — Declaração Municipal de Atuação Emergencial", status: "rascunho", pct: 0, pending: [{ agency: "Defesa Civil", item: "Ações executadas" }] },
  { id: "decreto", title: "Minuta de decreto de situação de emergência", status: "rascunho", pct: 0, pending: [{ agency: "Gabinete", item: "Fundamentação" }] },
  { id: "fotografico", title: "Relatório fotográfico", status: "rascunho", pct: 0, pending: [{ agency: "Equipes de campo", item: "Fotos georreferenciadas" }] },
  { id: "parecer", title: "Parecer técnico da Defesa Civil", status: "rascunho", pct: 0, pending: [{ agency: "Defesa Civil", item: "Análise técnica" }] },
  { id: "solicitacao", title: "Solicitação de recursos (S2iD)", status: "rascunho", pct: 0, pending: [{ agency: "Assistência Social", item: "Itens e quantitativos" }] },
];

/** External events of the scenario: they happen whatever the coordinator does. */
const BASE_QUEUE: Scheduled[] = [
  { at: 70, kind: "cap" }, { at: 72, kind: "rain" }, { at: 73, kind: "proposal" },
  { at: 85, kind: "shelterRibeirinho" }, { at: 88, kind: "displacedSouza" }, { at: 92, kind: "shelterJardim" },
  { at: 95, kind: "r1" }, { at: DRONE_START, kind: "displacedSantos" }, { at: DRONE_START, kind: "droneLaunch" }, { at: 97, kind: "r2" },
  { at: 99, kind: "r3" }, { at: 99, kind: "droneProcessing" }, { at: 100, kind: "r4" }, { at: 101, kind: "droneReady" },
];

export function initial(): Data {
  return {
    clock: 0, queue: BASE_QUEUE.map((e) => ({ ...e })), notifications: [],
    floodAcceptedAt: null, pendingClose: false, offline: false, offlineQueue: [],
    riverLevel: 0, floodExtent: floodPolygon, displaced: [], humanRecords: [], missionStatus: "programada", calibration: null,
    detections: [
      { id: "hot1", label: "Possível pessoa · telhado, Rua Sete", confidence: 0.86, status: "pendente", imageId: "thermal-1" },
      { id: "hot2", label: "Caixa d'água aquecida · telhado vizinho", confidence: 0.41, status: "pendente", imageId: "thermal-1" },
    ],
    step: 0, stage: "Normalidade", resources: seedResources(), shelters: seedShelters(), alerts: [], suggestions: [],
    reports: [], incidents: [], assignments: [], blockages: [], photos: [], docs: baseDocs(), tasks: [],
    damages: [
      { id: "d1", category: "Habitações danificadas", desc: "Residências com dano parcial — Ponte Velha", qty: 12, unit: "un", value: 180000, agency: "Obras", at: at(0) },
      { id: "d2", category: "Obras de infraestrutura", desc: "Ponte Velha — cabeceira comprometida", qty: 1, unit: "un", value: 420000, sector: "publico", agency: "Obras", at: at(0) },
    ],
    audit: [{ at: at(0), actor: "Sistema", action: "Check-in de turno consolidado: 92% válido" }, { at: at(1), actor: COORD, action: "Estágio confirmado: Normalidade" }],
    fieldStatus: -1, closed: false, checkInPct: 92, requestItems: [], clusterMerged: false,
  };
}

// ---------- automatic events ----------
const report = (i: number, source: CitizenReport["source"], kind: CitizenReport["kind"], text: string, people: number, vulnerable: string[], water: string, dx: number, dy: number) => (d: Data) => {
  const protocol = `VS-2026-00011${i}`;
  d.reports.push({ id: `r${i}`, protocol, at: now(d), source, kind, text, people, vulnerable, water, pos: off(dx, dy), place: "Ponte Velha", status: "em triagem" });
  if (source === "ssp193") log(d, "SSP 193", "Ocorrência espelhada recebida");
  else log(d, "Cidadão", `Relato ${protocol} recebido`);
  notify(d, kind === "socorro" ? "crit" : "info", `${kind === "socorro" ? "Pedido de socorro" : "Novo relato"} · Ponte Velha (${source === "ssp193" ? "SSP 193" : "cidadão"})`, "/gabinete/triagem");
};

const EFFECTS: Record<EventKind, (d: Data) => void> = {
  cap: (d) => {
    d.stage = "Atenção"; d.alerts = [capAlert];
    log(d, "IDAP", "Alerta CAP recebido: Inundação · Severo");
    notify(d, "crit", "Alerta CAP recebido: Inundação · Severo", "/gabinete/alertas");
  },
  rain: (d) => {
    log(d, "Cemaden VS-03", `Chuva 72h ultrapassou ${RAIN_THRESHOLD} mm (${rainAt(d.clock).toLocaleString("pt-BR")} mm)`);
    notify(d, "warn", `Chuva 72h acima do limiar de ${RAIN_THRESHOLD} mm`, "/gabinete/alertas");
  },
  proposal: (d) => {
    d.suggestions.push(
      { id: "s1", text: "Elevar para Alerta", detail: `Chuva 72h em ${rainAt(d.clock).toLocaleString("pt-BR")} mm ultrapassou o limiar de ${RAIN_THRESHOLD} mm do PLANCON; alerta CAP Severo ativo.`, status: "pendente" },
      { id: "s2", text: "Pré-posicionar CBM-B07 na Zona Sul", detail: `Gêmeo digital, cenário +2,0 m: ${southScenario(ALERT_SCENARIO_LEVEL, d.resources).people} pessoas expostas na Zona Sul, que concentra 2 das 3 áreas de risco e não tem barco do CBM disponível.`, status: "pendente" },
    );
    log(d, "Sistema", "Proposta: elevar para Alerta; pré-posicionar CBM-B07");
    notify(d, "warn", "2 sugestões aguardando sua decisão", "/gabinete/alertas");
  },
  shelterRibeirinho: (d) => {
    ginasio(d)?.entries.push({ id: "e0a", at: now(d), name: "Famílias de Ribeirinho", people: 15, kind: "desabrigado", origin: "Ribeirinho" });
    log(d, "Assistência Social", "Entrada no Ginásio Municipal: 15 desabrigados (Ribeirinho)");
  },
  displacedSouza: (d) => {
    d.displaced.push({ id: "as1", at: now(d), name: "Família Souza", people: 6, kind: "desalojado", origin: "Ribeirinho · hospedada com parentes" });
    log(d, "Assistência Social", "Registrou 6 desalojados com parentes (Família Souza)");
  },
  shelterJardim: (d) => {
    ginasio(d)?.entries.push({ id: "e0b", at: now(d), name: "Famílias do Jardim das Águas", people: 8, kind: "desabrigado", origin: "Jardim das Águas" });
    log(d, "Assistência Social", "Entrada no Ginásio Municipal: 8 desabrigados (Jardim das Águas)");
  },
  displacedSantos: (d) => {
    d.displaced.push({ id: "as2", at: now(d), name: "Família Santos", people: 5, kind: "desalojado", origin: "Jardim das Águas · hospedada com parentes" });
    log(d, "Assistência Social", "Registrou 5 desalojados com parentes (Família Santos)");
  },
  r1: report(1, "cidadao", "socorro", "Família com idoso acamado no telhado, 4 pessoas", 4, ["Idoso", "Acamado"], "Acima da janela", 455, -430),
  r2: report(2, "cidadao", "relato", "Casa vizinha com gente no telhado, água subindo rápido", 4, ["Idoso"], "Acima da janela", 470, -410),
  r3: report(3, "cidadao", "socorro", "Rua Sete alagada, vizinhos pedindo ajuda no telhado", 3, [], "Na cintura", 430, -445),
  r4: report(4, "ssp193", "socorro", "SSP 193: ligação — pessoas ilhadas, Rua Sete com Rua do Porto", 4, ["Acamado"], "Desconhecido", 448, -425),
  droneLaunch: (d) => { d.missionStatus = "em voo"; log(d, "CBM-D01", "Missão térmica iniciada sobre Ponte Velha"); },
  droneProcessing: (d) => { d.missionStatus = "processando"; },
  droneReady: (d) => {
    d.missionStatus = "pronto";
    log(d, "CBM-D01", "Missão térmica pronta: 2 pontos de calor");
    notify(d, "warn", "Drone CBM-D01: 2 pontos de calor para revisar", "/gabinete/imagens");
  },
  tasksAccepted: (d) => {
    d.tasks.forEach((t) => { if (t.status === "nova") t.status = "aceita"; });
    log(d, "Sistema", "Tarefas aceitas pelas equipes; CBM espelhado no Sinesp CAD (fase 2)");
  },
  photoHouse: (d) => { d.photos.push({ id: "p1", at: now(d), pos: off(450, -420), caption: "Residência na Rua Sete com água acima das janelas", hue: 210 }); },
  field1: (d) => setField(d, 1),
  field2: (d) => setField(d, 2),
  field3: (d) => setField(d, 3),
  field4: (d) => setField(d, 4),
  blockage: (d) => reportBlockage(d),
  photoRescue: (d) => { d.photos.push({ id: "p3", at: now(d), pos: off(455, -430), caption: "Resgate de 4 pessoas, incluindo idoso acamado", hue: 25 }); },
  shelterLopes: (d) => {
    ginasio(d)?.entries.push({ id: "e1", at: now(d), name: "Família Lopes", people: 4, kind: "desabrigado", origin: "Ponte Velha — Rua Sete" });
    log(d, "Assistência Social", "Entrada no Ginásio Municipal: 4 desabrigados");
    notify(d, "info", "Resgatados chegaram ao Ginásio Municipal (4)", "/gabinete/abrigos");
  },
  stockLow: (d) => {
    const stock = ginasio(d)?.stocks.find((s) => s.item === "Colchão");
    if (stock) stock.qty = 18;
    log(d, "Sistema", "Estoque de colchão abaixo do mínimo (18/30)");
    notify(d, "warn", "Ginásio Municipal: colchões abaixo do mínimo (18/30)", "/gabinete/abrigos");
  },
  photoJardim: (d) => { d.photos.push({ id: "p4", at: now(d), pos: off(1500, -600), caption: "Jardim das Águas — vias alagadas", hue: 160 }); },
};

/** Runs every queued event due up to `to` (in time order), then sets the clock to `to`. */
export function advance(d: Data, to: number) {
  for (;;) {
    const due = d.queue.filter((e) => e.at <= to).sort((a, b) => a.at - b.at)[0];
    if (!due) break;
    d.queue.splice(d.queue.indexOf(due), 1);
    d.clock = Math.max(d.clock, due.at);
    EFFECTS[due.kind](d);
  }
  d.clock = Math.max(d.clock, to);
}
export const nextEventAt = (d: Data) => (d.queue.length ? Math.min(...d.queue.map((e) => e.at)) : null);

// ---------- field team ----------
/** Moves the rescue team to field status `n` (never backwards) and schedules what follows from it. */
export function setField(d: Data, n: number) {
  if (n <= d.fieldStatus || n >= FIELD_STEPS.length) return;
  d.fieldStatus = n;
  if (n === 0) return;
  const t = team(d);
  log(d, t, `Status: ${FIELD_STEPS[n]}${n === 2 ? " (4)" : ""}`);
  if (n === 1) { notify(d, "info", `${t} no local · Rua Sete`, "/campo"); schedule(d, 1, "blockage"); }
  if (n === 2) {
    d.reports.forEach((r) => { if (r.incidentId === "1") r.status = "atendido"; });
    notify(d, "info", "4 pessoas resgatadas, incluindo idoso acamado", "/gabinete/ocorrencias/1/plano");
    schedule(d, 1, "photoRescue"); schedule(d, 6, "field3"); schedule(d, 7, "shelterLopes"); schedule(d, 8, "stockLow"); schedule(d, 33, "field4");
  }
  if (n === 4) notify(d, "warn", "Equipe concluiu a tarefa · encerre o evento quando for seguro", "/gabinete/ocorrencias/1/plano");
}
export function reportBlockage(d: Data) {
  if (d.blockages.length) return;
  const t = team(d);
  d.blockages.push({ id: "bl1", at: now(d), pos: BRIDGE_POS, desc: "Ponte Velha interditada — água sobre o tabuleiro", by: t });
  d.photos.push({ id: "p2", at: now(d), pos: BRIDGE_POS, caption: "Ponte Velha com água sobre o tabuleiro", hue: 195 });
  log(d, t, "Reportou bloqueio: Ponte Velha");
  const amb = d.assignments.find((a) => a.id === "a2");
  if (amb) { amb.polyline = routes.ambB; amb.etaMin = 17; log(d, "Sistema", `Rota ${amb.resourceId} recalculada (ETA 17 min) evitando bloqueio`); }
  notify(d, "crit", "Ponte Velha bloqueada · rota da ambulância refeita", "/gabinete/mapa");
}

// ---------- human decisions ----------
export function acceptSuggestion(d: Data, id: string, accept: boolean) {
  const s = d.suggestions.find((x) => x.id === id);
  if (!s || s.status !== "pendente") return;
  s.status = accept ? "aceita" : "ignorada";
  if (accept) {
    if (id === "s1") d.stage = "Alerta";
    if (id === "crisis") d.stage = "Crise";
    if (id === "s2") { const b = d.resources.find((r) => r.id === "CBM-B07"); if (b) { b.zone = "Sul"; b.pos = off(300, -280); } }
    if (id.startsWith("activate:")) { const sh = d.shelters.find((x) => x.id === id.slice(9)); if (sh) sh.active = true; }
    if (id.startsWith("move:")) { const r = d.resources.find((x) => x.id === id.slice(5)); if (r) r.pos = off(-1500, 1100); }
  }
  log(d, COORD, `${accept ? "Aceitou" : "Ignorou"}: ${s.text}`);
}
export function decideDetection(d: Data, id: string, send: boolean, reason?: string) {
  const det = d.detections.find((x) => x.id === id);
  if (!det || det.status !== "pendente" || d.missionStatus !== "pronto" || (!send && !reason?.trim())) return;
  det.status = send ? "enviada" : "descartada";
  det.reason = reason;
  if (send) {
    const inc = d.incidents[0];
    const r: CitizenReport = { id: `drone-${id}`, protocol: "CBM-D01-01", at: now(d), source: "drone", kind: "socorro", text: `Drone térmico: ${det.label}`, people: 4, vulnerable: [], water: "Acima da janela", pos: INCIDENT_POS, place: "Ponte Velha", status: inc ? "agrupado" : "em triagem", imageId: det.imageId };
    if (inc) { r.incidentId = inc.id; inc.reportIds.push(r.id); }
    d.reports.push(r);
    d.photos.push({ id: `evidence-${id}`, at: now(d), pos: INCIDENT_POS, caption: "CBM-D01 · detecção térmica confirmada pelo coordenador", hue: 280, imageId: det.imageId });
  }
  log(d, COORD, send ? `Enviou detecção térmica para triagem (${det.label})` : `Descartou falso positivo: ${det.label} — ${reason}`);
}
export function mergeCluster(d: Data) {
  if (d.clusterMerged) return;
  const cluster = d.reports.filter((r) => r.place === "Ponte Velha");
  cluster.forEach((r) => { r.status = "agrupado"; });
  d.clusterMerged = true;
  log(d, COORD, `Mesclou ${cluster.length} relatos de Ponte Velha`);
}
const proposedAssignments = (): Assignment[] => [
  { id: "a1", incidentId: "1", resourceId: "CBM-B07", capability: "Resgate aquático · 6 pessoas", etaMin: 14, polyline: routes.boat, status: "proposta",
    rationale: "CBM-B07: barco mais próximo disponível com capacidade para 6 pessoas, ETA 14 min. CBM-B03 (9 min) está reservado para a Zona Norte.",
    alternatives: [{ resourceId: "CBM-B03", etaMin: 9, note: "Reservado para a Zona Norte — liberar deixa a zona descoberta" }, { resourceId: "VOL-B03", etaMin: 21, note: "Voluntário credenciado, capacidade 4 — insuficiente com acamado" }] },
  { id: "a2", incidentId: "1", resourceId: "SAMU-USB02", capability: "Suporte básico · transporte de acamado", etaMin: 11, polyline: routes.ambA, status: "proposta",
    rationale: "SAMU-USB02: USB disponível mais próxima do ponto de desembarque, ETA 11 min pela Ponte Velha. USA01 mantida para casos graves.",
    alternatives: [{ resourceId: "SAMU-USA01", etaMin: 9, note: "Única USA do município — reservar para suporte avançado" }, { resourceId: "SAMU-USB03", etaMin: 18, note: "Zona Sul, rota mais longa" }] },
  { id: "a3", incidentId: "1", resourceId: "GM-03", capability: "Isolamento de área", etaMin: 8, polyline: routes.gm, status: "proposta",
    rationale: "GM-03: viatura mais próxima com check-in válido, ETA 8 min. PM-209 tem check-in vencido há 13 h.",
    alternatives: [{ resourceId: "PM-201", etaMin: 10, note: "Disponível, check-in válido" }, { resourceId: "GM-01", etaMin: 12, note: "Disponível no Centro" }] },
];
export function confirmIncident(d: Data) {
  if (d.incidents.length) return;
  d.clusterMerged = true;
  const linked = d.reports.filter((r) => r.place === "Ponte Velha");
  linked.forEach((r) => { r.status = "agrupado"; r.incidentId = "1"; });
  d.incidents = [{ id: "1", cobrade: "1.2.1.0.0 Inundação", title: "Pessoas ilhadas em telhado", place: "Ponte Velha — Rua Sete", severity: "Severo", victims: 4, vulnerable: ["1 acamado", "1 idoso"], pos: INCIDENT_POS, status: "aberta", reportIds: linked.map((r) => r.id), createdAt: now(d) }];
  d.assignments = proposedAssignments();
  d.tasks = [
    { id: "t1", title: "Resgate aquático — Ponte Velha, Rua Sete", agency: "cbm", resourceId: "CBM-B07", status: "nova", mirroredCad: true },
    { id: "t2", title: "Transporte de acamado — ponto de desembarque", agency: "samu", resourceId: "SAMU-USB02", status: "nova" },
    { id: "t3", title: "Isolamento de área — Ponte Velha", agency: "gm", resourceId: "GM-03", status: "nova" },
  ];
  log(d, COORD, "Confirmou Ocorrência #1: Inundação · Severo");
  log(d, "Sistema", "Plano proposto: CBM-B07, SAMU-USB02, GM-03");
  notify(d, "info", "Plano proposto para a Ocorrência #1 · revise e aprove", "/gabinete/ocorrencias/1/plano");
}
export function approveRow(d: Data, id: string) {
  const a = d.assignments.find((x) => x.id === id);
  if (!a || a.status !== "proposta") return;
  a.status = "aprovada"; a.approvedBy = COORD; a.approvedAt = now(d);
  log(d, COORD, `Aprovou linha ${a.resourceId}`);
}
export function swapRow(d: Data, id: string, altIdx: number) {
  const a = d.assignments.find((x) => x.id === id);
  const alt = a?.alternatives[altIdx];
  if (!a || !alt || a.status !== "proposta") return;
  const original = { resourceId: a.resourceId, etaMin: a.etaMin, note: "Proposta original do sistema" };
  Object.assign(a, {
    resourceId: alt.resourceId, etaMin: alt.etaMin, status: "trocada", approvedBy: COORD, approvedAt: now(d),
    rationale: `${alt.resourceId}: escolhido manualmente pelo coordenador. ${alt.note}.`,
    alternatives: [original, ...a.alternatives.filter((_, i) => i !== altIdx)],
  });
  const task = d.tasks.find((t) => t.resourceId === original.resourceId);
  if (task) task.resourceId = alt.resourceId;
  log(d, COORD, `Trocou ${original.resourceId} por ${alt.resourceId}`);
}
export function approvePlan(d: Data) {
  if (!d.incidents.length || d.fieldStatus >= 0) return;
  d.assignments.forEach((a) => { if (a.status === "proposta") a.status = "aprovada"; a.approvedBy ??= COORD; a.approvedAt ??= now(d); });
  d.incidents.forEach((i) => { i.status = "em atendimento"; });
  d.resources.forEach((r) => { if (d.assignments.some((a) => a.resourceId === r.id)) r.status = "empenhado"; });
  if (!d.suggestions.some((x) => x.id === "crisis")) d.suggestions.push({ id: "crisis", text: "Elevar estágio para Crise?", detail: "Plano aprovado e equipes mobilizadas. A decisão cabe ao coordenador.", status: "pendente" });
  setField(d, 0);
  const unchanged = d.assignments.filter((a) => a.status === "aprovada").length;
  log(d, COORD, `Aprovou plano da Ocorrência #1 (${unchanged}/${d.assignments.length} linhas sem alteração)`);
  notify(d, "warn", "Plano aprovado · decida se eleva o estágio para Crise", "/gabinete/ocorrencias/1/plano");
  const eta = d.assignments.find((a) => a.id === "a1")?.etaMin ?? 14;
  schedule(d, 1, "tasksAccepted"); schedule(d, 10, "photoHouse"); schedule(d, eta, "field1"); schedule(d, eta + 5, "field2"); schedule(d, 42, "photoJardim");
}
export function closeEvent(d: Data) {
  if (d.closed) return;
  d.closed = true; d.pendingClose = false; d.stage = "Normalidade";
  d.resources.forEach((r) => { if (r.status === "empenhado") r.status = "disponível"; });
  d.incidents.forEach((i) => { i.status = "encerrada"; });
  d.queue = d.queue.filter((e) => !e.kind.startsWith("field"));
  log(d, COORD, "Encerrar e desmobilizar: Ocorrência #1; estágio Normalidade");
  if (!d.requestItems.some((i) => i.item === "Colchão")) d.requestItems.push({ item: "Colchão", qty: 40, reason: "Ginásio Municipal abaixo do mínimo" });
  d.docs = d.docs.map((doc) => {
    if (doc.id === "fide") return { ...doc, status: "pendente", pct: 85, pending: [{ agency: "Obras", item: "Valor estimado — pavimentação" }] };
    if (doc.id === "fotografico") return { ...doc, status: "pronto", pct: 100, pending: [] };
    if (doc.id === "solicitacao") return { ...doc, status: "pendente", pct: 70, pending: [{ agency: "Assistência Social", item: "Confirmar quantitativo de colchões" }] };
    if (doc.id === "dmate") return { ...doc, status: "pendente", pct: 60 };
    if (doc.id === "decreto") return { ...doc, pct: 40 };
    if (doc.id === "parecer") return { ...doc, pct: 30 };
    return doc;
  });
  log(d, "Sistema", `FIDE pré-preenchido; relatório fotográfico montado (${d.photos.length} imagens)`);
  log(d, "Sistema", `Solicitação de recursos criada: ${d.requestItems.map((i) => `${i.item} × ${i.qty}`).join(", ")}`);
  notify(d, "info", "Evento encerrado · documentos pré-preenchidos para revisão", "/relatorios");
}

// field-team actions (respect the offline queue)
export function advanceField(d: Data) {
  if (d.offline) { d.offlineQueue.push({ kind: "field" }); return; }
  setField(d, d.fieldStatus + 1);
}
export function fieldBlockage(d: Data) {
  if (d.offline) { d.offlineQueue.push({ kind: "blockage" }); return; }
  reportBlockage(d);
}
export function addPhoto(d: Data, caption: string) {
  if (d.offline) { d.offlineQueue.push({ kind: "photo", caption }); return; }
  const jitter = (Math.random() - 0.5) * 80;
  d.photos.push({ id: `p${Date.now()}`, at: now(d), pos: off(450 + jitter, -420 + jitter), caption, hue: Math.floor(Math.random() * 360) });
  log(d, team(d), `Foto registrada: ${caption}`);
}
export function setOffline(d: Data, offline: boolean) {
  d.offline = offline;
  if (offline || !d.offlineQueue.length) return;
  const pending = d.offlineQueue; d.offlineQueue = [];
  log(d, "Sistema", `${pending.length} ações sincronizadas após reconexão`);
  for (const a of pending) {
    if (a.kind === "field") setField(d, d.fieldStatus + 1);
    else if (a.kind === "blockage") reportBlockage(d);
    else addPhoto(d, a.caption);
  }
}

// other roles
let protoSeq = 123;
export function addReport(d: Data, r: Omit<CitizenReport, "id" | "protocol" | "at" | "status">) {
  const protocol = `VS-2026-000${protoSeq++}`;
  d.reports.unshift({ ...r, id: `r${Date.now()}`, protocol, at: now(d), status: "recebido" });
  log(d, "Cidadão", `Relato ${protocol} recebido`);
  notify(d, r.kind === "socorro" ? "crit" : "info", `${r.kind === "socorro" ? "Pedido de socorro" : "Novo relato"} · ${r.place} (cidadão)`, "/gabinete/triagem");
  return protocol;
}
export function addShelterEntry(d: Data, shelterId: string, e: { name: string; people: number; kind: "desabrigado" | "desalojado"; origin: string }) {
  if (!Number.isInteger(e.people) || e.people < 1) return;
  if (e.kind === "desalojado") {
    d.displaced.push({ ...e, id: `as${Date.now()}`, at: now(d) });
    log(d, "Assistência Social", `Registrou ${e.people} desalojados com parentes`);
    return;
  }
  d.shelters.find((sh) => sh.id === shelterId)?.entries.push({ ...e, id: `e${Date.now()}`, at: now(d) });
  log(d, "Assistência Social", `Entrada registrada: ${e.people} ${e.kind}(s)`);
}
export function addToRequest(d: Data, item: string, qty: number, reason: string) {
  if (d.requestItems.some((x) => x.item === item)) return;
  d.requestItems.push({ item, qty, reason });
  log(d, COORD, `Incluiu ${qty} ${item} na solicitação de recursos`);
}
export function markSent(d: Data, docId: string, protocol: string) {
  d.docs = d.docs.map((x) => (x.id === docId ? { ...x, status: "enviado", pct: 100, pending: [], protocol } : x));
  log(d, COORD, `Marcou ${docId.toUpperCase()} como enviado (protocolo ${protocol})`);
}
export function checkIn(d: Data, agency: string) {
  d.resources.forEach((r) => { if (r.agency === agency) r.lastCheckIn = now(d); });
  d.checkInPct = Math.min(100, d.checkInPct + 4);
  log(d, `Operador ${agency.toUpperCase()}`, "Fez check-in do turno");
}
export function setTask(d: Data, id: string, status: Task["status"]) {
  const t = d.tasks.find((x) => x.id === id);
  if (!t) return;
  t.status = status;
  log(d, `Operador ${t.agency.toUpperCase()}`, `${status === "aceita" ? "Aceitou" : "Recusou"} tarefa: ${t.title}`);
  if (status === "recusada") notify(d, "crit", `${t.resourceId} recusou a tarefa · reatribua no plano`, "/gabinete/ocorrencias/1/plano");
}
export function addDamage(d: Data, x: Omit<DamageRecord, "id" | "at">) {
  d.damages.push({ ...x, id: `d${Date.now()}`, at: now(d) });
  log(d, x.agency, `Registro de dano: ${x.desc}`);
}
export function generatePreposition(d: Data) {
  const exposed = scenario(d.riverLevel, d.shelters, d.resources);
  const safe = d.shelters.filter((sh) => !exposed.shelters.some((e) => e.id === sh.id));
  d.suggestions = [
    ...d.suggestions.filter((x) => !x.id.startsWith("move:") && !x.id.startsWith("activate:")),
    ...exposed.resources.map((r) => ({ id: `move:${r.id}`, text: `Mover ${r.callsign} para Salão Paroquial`, detail: "Retirar recurso da área simulada de alagamento.", status: "pendente" as const })),
    ...safe.map((sh) => ({ id: `activate:${sh.id}`, text: `Ativar ${sh.name}`, detail: `${sh.capacity} vagas fora da área simulada.`, status: "pendente" as const })),
  ];
  log(d, "Sistema", "Gerou sugestões de pré-posicionamento");
}
export function updateFlood(d: Data) {
  d.floodExtent = observedFlood; d.floodAcceptedAt = now(d);
  log(d, COORD, "Atualizou mancha de alagamento com ortomosaico RGB");
}
export function calibrate(d: Data, value: number) {
  d.calibration = value;
  log(d, COORD, `Calibrou gêmeo digital: concordância ${value}%`);
}

// ---------- progress, guidance, script ----------
/** Furthest demo step the current state corresponds to, so Próximo continues from what the user did. */
export function progressStep(d: Data) {
  if (d.closed) return 8;
  if (d.fieldStatus >= 3) return 7;
  if (d.fieldStatus >= 1 || d.blockages.length) return 6;
  if (d.fieldStatus >= 0) return 5;
  if (d.incidents.length) return 4;
  if (d.missionStatus === "pronto") return 3;
  if (d.reports.length) return 2;
  if (d.alerts.length) return 1;
  return 0;
}
/** The decision the coordinator owes right now, if any. */
export function nextHumanTask(d: Data): { text: string; to: string } | null {
  if (d.suggestions.some((s) => (s.id === "s1" || s.id === "s2") && s.status === "pendente")) return { text: "Decidir sugestões do alerta", to: "/gabinete/alertas" };
  if (d.missionStatus === "pronto" && d.detections.some((x) => x.status === "pendente")) return { text: "Revisar detecções do drone", to: "/gabinete/imagens" };
  if (!d.incidents.length && d.reports.filter((r) => r.place === "Ponte Velha").length >= 3) return { text: d.clusterMerged ? "Confirmar ocorrência" : "Triar relatos de Ponte Velha", to: "/gabinete/triagem" };
  if (d.assignments.some((a) => a.status === "proposta")) return { text: "Aprovar plano da Ocorrência #1", to: "/gabinete/ocorrencias/1/plano" };
  if (d.suggestions.some((s) => s.id === "crisis" && s.status === "pendente")) return { text: "Decidir estágio Crise", to: "/gabinete/ocorrencias/1/plano" };
  if (d.fieldStatus >= FIELD_STEPS.length - 1 && !d.closed) return { text: "Encerrar e desmobilizar", to: "/gabinete/ocorrencias/1/plano" };
  return null;
}

const DISCARD_REASON = "Caixa d'água aquecida pelo sol, sem indício de pessoa";
/** Human decisions of the scripted demo, at the script's times. Step k ends at STEP_CLOCK[k]. */
const SCRIPT: Record<number, (d: Data, target: number, opts: { animateClose?: boolean }) => void> = {
  2: (d) => { advance(d, 76); acceptSuggestion(d, "s1", true); advance(d, 77); acceptSuggestion(d, "s2", true); },
  4: (d) => {
    advance(d, 102); decideDetection(d, "hot1", true); decideDetection(d, "hot2", false, DISCARD_REASON);
    advance(d, 103); mergeCluster(d); advance(d, 104); confirmIncident(d);
  },
  5: (d) => { advance(d, 108); approvePlan(d); },
  6: (d) => { advance(d, 110); acceptSuggestion(d, "crisis", true); },
  8: (d, target, opts) => { advance(d, CLOSE_MIN); if (opts.animateClose && target === 8) d.pendingClose = true; else closeEvent(d); },
};

/** Deterministic state at the end of demo step `step`: a replay of the scenario up to that point. */
export function buildState(step: number, opts: { animateClose?: boolean } = {}): Data {
  const d = initial();
  for (let k = 1; k <= step; k++) {
    SCRIPT[k]?.(d, step, opts);
    advance(d, STEP_CLOCK[k] ?? d.clock);
  }
  d.step = step;
  // A snapshot does not replay toasts; only the last few minutes stay unread in the bell.
  d.notifications.forEach((n) => { n.fresh = false; if (Date.parse(n.at) < Date.parse(at(d.clock - 5))) n.read = true; });
  d.audit.sort((a, b) => a.at.localeCompare(b.at));
  return d;
}
