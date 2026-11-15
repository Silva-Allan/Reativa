import { create } from "zustand";
import {
  at, capAlert, INCIDENT_POS, BRIDGE_POS, off, routes, seedResources, seedShelters,
  type Assignment, type AuditEvent, type Blockage, type CapAlert, type CitizenReport, type DamageRecord, type Incident,
  type ShelterEntry, type LatLng, type Photo, type ReportDoc, type Resource, type Role, type Shelter, type Stage, type Suggestion, type Task,
} from "@/mock/data";
import { floodPolygon, CLOSE_MIN } from "@/mock/data";
import { scenario, observedFlood, southScenario, ALERT_SCENARIO_LEVEL } from "@/mock/risk";

export const FIELD_STEPS = ["A caminho", "No local", "Vítimas resgatadas", "Encaminhadas", "Concluído"] as const;

export interface Detection { id: string; label: string; confidence: number; status: "pendente" | "enviada" | "descartada"; reason?: string | undefined; imageId: string }
export interface Data {
  /** Set when the coordinator accepts an observed flood extent (Drone RGB); null = model extent only. */
  floodAcceptedAt: string | null;
  /** Step 8 of the scripted demo: the plan page highlights "Encerrar e desmobilizar" and then applies it. */
  pendingClose: boolean;
  riverLevel: number; floodExtent: LatLng[]; displaced: ShelterEntry[]; humanRecords: { id: string; kind: string; people: number; at: string; source: string }[]; missionStatus: "em voo" | "processando" | "pronto"; detections: Detection[]; calibration: number | null;
  step: number; stage: Stage; resources: Resource[]; shelters: Shelter[]; alerts: CapAlert[]; suggestions: Suggestion[];
  reports: CitizenReport[]; incidents: Incident[]; assignments: Assignment[]; blockages: Blockage[]; damages: DamageRecord[];
  photos: Photo[]; docs: ReportDoc[]; audit: AuditEvent[]; tasks: Task[]; fieldStatus: number; closed: boolean;
  checkInPct: number; requestItems: { item: string; qty: number; reason: string }[]; clusterMerged: boolean;
}

const baseDocs = (): ReportDoc[] => [
  { id: "fide", title: "FIDE — Formulário de Informações do Desastre", status: "rascunho", pct: 10, pending: [{ agency: "Defesa Civil", item: "Área afetada" }, { agency: "Assistência Social", item: "Danos humanos" }, { agency: "Obras", item: "Danos materiais" }] },
  { id: "dmate", title: "DMATE — Declaração Municipal de Atuação Emergencial", status: "rascunho", pct: 0, pending: [{ agency: "Defesa Civil", item: "Ações executadas" }] },
  { id: "decreto", title: "Minuta de decreto de situação de emergência", status: "rascunho", pct: 0, pending: [{ agency: "Gabinete", item: "Fundamentação" }] },
  { id: "fotografico", title: "Relatório fotográfico", status: "rascunho", pct: 0, pending: [{ agency: "Equipes de campo", item: "Fotos georreferenciadas" }] },
  { id: "parecer", title: "Parecer técnico da Defesa Civil", status: "rascunho", pct: 0, pending: [{ agency: "Defesa Civil", item: "Análise técnica" }] },
  { id: "solicitacao", title: "Solicitação de recursos (S2iD)", status: "rascunho", pct: 0, pending: [{ agency: "Assistência Social", item: "Itens e quantitativos" }] },
];

const ev = (min: number, actor: string, action: string): AuditEvent => ({ at: at(min), actor, action });

export function buildState(step: number, opts: { animateClose?: boolean } = {}): Data {
  const phase = step >= 4 ? step - 1 : Math.min(step, 2);
  const d: Data = {
    floodAcceptedAt: null, pendingClose: false,
    riverLevel: 0, floodExtent: floodPolygon, displaced: [], humanRecords: [], missionStatus: step === 2 ? "processando" : step >= 3 ? "pronto" : "em voo", detections: [{ id: "hot1", label: "Possível pessoa · telhado, Rua Sete", confidence: 0.86, status: "pendente", imageId: "thermal-1" }, { id: "hot2", label: "Caixa d'água aquecida · telhado vizinho", confidence: 0.41, status: "pendente", imageId: "thermal-1" }], calibration: null,
    step, stage: "Normalidade", resources: seedResources(), shelters: seedShelters(), alerts: [], suggestions: [],
    reports: [], incidents: [], assignments: [], blockages: [], photos: [], docs: baseDocs(), tasks: [],
    damages: [
      { id: "d1", category: "Habitações danificadas", desc: "Residências com dano parcial — Ponte Velha", qty: 12, unit: "un", value: 180000, agency: "Obras", at: at(0) },
      { id: "d2", category: "Obras de infraestrutura", desc: "Ponte Velha — cabeceira comprometida", qty: 1, unit: "un", value: 420000, sector: "publico", agency: "Obras", at: at(0) },
    ],
    audit: [ev(0, "Sistema", "Check-in de turno consolidado: 92% válido"), ev(1, "Coordenador", "Estágio confirmado: Normalidade")],
    fieldStatus: -1, closed: false, checkInPct: 92, requestItems: [], clusterMerged: false,
  };
  if (phase >= 1) {
    d.stage = "Atenção";
    d.alerts = [capAlert];
    d.suggestions = [
      { id: "s1", text: "Elevar para Alerta", detail: "Chuva 72h em 134 mm ultrapassou o limiar de 120 mm do PLANCON; alerta CAP Severo ativo.", status: "pendente" },
      { id: "s2", text: "Pré-posicionar CBM-B07 na Zona Sul", detail: `Gêmeo digital, cenário +2,0 m: ${southScenario(ALERT_SCENARIO_LEVEL, d.resources).people} pessoas expostas na Zona Sul, que concentra 2 das 3 áreas de risco e não tem barco do CBM disponível.`, status: "pendente" },
    ];
    d.audit.push(ev(70, "IDAP", "Alerta CAP recebido: Inundação · Severo"), ev(72, "Cemaden VS-03", "Chuva 72h ultrapassou 120 mm (134 mm)"), ev(73, "Sistema", "Proposta: elevar para Alerta; pré-posicionar CBM-B07"));
  }
  if (phase >= 2) {
    const ginasio = d.shelters.find((sh) => sh.id === "ginasio");
    if (ginasio) ginasio.entries = [
      { id: "e0a", at: at(85), name: "Famílias de Ribeirinho", people: 15, kind: "desabrigado", origin: "Ribeirinho" },
      { id: "e0b", at: at(92), name: "Famílias do Jardim das Águas", people: 8, kind: "desabrigado", origin: "Jardim das Águas" }
    ];
    d.displaced = [
      { id: "as1", at: at(88), name: "Família Souza", people: 6, kind: "desalojado", origin: "Ribeirinho · hospedada com parentes" },
      { id: "as2", at: at(96), name: "Família Santos", people: 5, kind: "desalojado", origin: "Jardim das Águas · hospedada com parentes" }
    ];
    d.stage = "Alerta";
    d.suggestions = d.suggestions.map((s) => ({ ...s, status: "aceita" }));
    const b07 = d.resources.find((x) => x.id === "CBM-B07");
    if (b07) { b07.zone = "Sul"; b07.pos = off(300, -280); }
    d.audit.push(ev(76, "Coordenador", "Aceitou: Elevar para Alerta"), ev(77, "Coordenador", "Aceitou: Pré-posicionar CBM-B07 na Zona Sul"));
    const mk = (i: number, min: number, source: CitizenReport["source"], kind: CitizenReport["kind"], text: string, people: number, vulnerable: string[], water: string, dx: number, dy: number): CitizenReport => ({
      id: `r${i}`, protocol: `VS-2026-00011${i}`, at: at(min), source, kind, text, people, vulnerable, water, pos: off(dx, dy), place: "Ponte Velha", status: "em triagem",
    });
    d.reports = [
      mk(1, 95, "cidadao", "socorro", "Família com idoso acamado no telhado, 4 pessoas", 4, ["Idoso", "Acamado"], "Acima da janela", 455, -430),
      mk(2, 97, "cidadao", "relato", "Casa vizinha com gente no telhado, água subindo rápido", 4, ["Idoso"], "Acima da janela", 470, -410),
      mk(3, 99, "cidadao", "socorro", "Rua Sete alagada, vizinhos pedindo ajuda no telhado", 3, [], "Na cintura", 430, -445),
      mk(4, 100, "ssp193", "socorro", "SSP 193: ligação — pessoas ilhadas, Rua Sete com Rua do Porto", 4, ["Acamado"], "Desconhecido", 448, -425),
    ];
    d.audit.push(ev(95, "Cidadão", "Relato VS-2026-000111 recebido"), ev(100, "SSP 193", "Ocorrência espelhada recebida"));
  }
  if (step >= 4) {
    d.detections = d.detections.map((x) => ({ ...x, status: x.id === "hot1" ? "enviada" : "descartada", reason: x.id === "hot2" ? "Caixa d'água aquecida pelo sol, sem indício de pessoa" : undefined }));
    d.reports.push({ id: "drone1", protocol: "CBM-D01-01", at: at(102), source: "drone", kind: "socorro", text: "Drone térmico: possível pessoa no telhado, Rua Sete", people: 4, vulnerable: [], water: "Acima da janela", pos: INCIDENT_POS, place: "Ponte Velha", status: "em triagem", imageId: "thermal-1" });
    d.photos.push({ id: "thermal-evidence", at: at(102), pos: INCIDENT_POS, caption: "CBM-D01 · detecção térmica confirmada pelo coordenador", hue: 280, imageId: "thermal-1" });
    d.audit.push(ev(101, "CBM-D01", "Missão térmica pronta: 2 pontos de calor"), ev(102, "Coordenador", "Enviou detecção térmica para triagem"), ev(102, "Coordenador", "Descartou falso positivo: caixa d'água aquecida"));
  }
  if (phase >= 3) {
    d.clusterMerged = true;
    d.reports.forEach((x) => { x.status = "agrupado"; x.incidentId = "1"; });
    d.incidents = [{ id: "1", cobrade: "1.2.1.0.0 Inundação", title: "Pessoas ilhadas em telhado", place: "Ponte Velha — Rua Sete", severity: "Severo", victims: 4, vulnerable: ["1 acamado", "1 idoso"], pos: INCIDENT_POS, status: "aberta", reportIds: d.reports.map((x) => x.id), createdAt: at(103) }];
    d.assignments = [
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
    d.tasks = [
      { id: "t1", title: "Resgate aquático — Ponte Velha, Rua Sete", agency: "cbm", resourceId: "CBM-B07", status: "nova", mirroredCad: true },
      { id: "t2", title: "Transporte de acamado — ponto de desembarque", agency: "samu", resourceId: "SAMU-USB02", status: "nova" },
      { id: "t3", title: "Isolamento de área — Ponte Velha", agency: "gm", resourceId: "GM-03", status: "nova" },
    ];
    d.audit.push(ev(103, "Coordenador", `Mesclou ${d.reports.length} relatos na Ocorrência #1`), ev(104, "Coordenador", "Confirmou ocorrência: Inundação · Severo"), ev(105, "Sistema", "Plano proposto: CBM-B07, SAMU-USB02, GM-03"));
  }
  if (phase >= 4) {
    d.suggestions.push({ id: "crisis", text: "Elevar estágio para Crise?", detail: "Plano aprovado e equipes mobilizadas. A decisão cabe ao coordenador.", status: "pendente" });
    d.assignments.forEach((a) => { a.status = "aprovada"; a.approvedBy = "Coord. Marta Ribeiro"; a.approvedAt = at(108); });
    if (d.incidents[0]) d.incidents[0].status = "em atendimento";
    d.tasks.forEach((t) => (t.status = "aceita"));
    d.resources.forEach((r) => { if (["CBM-B07", "SAMU-USB02", "GM-03"].includes(r.id)) r.status = "empenhado"; });
    d.audit.push(ev(108, "Coord. Marta Ribeiro", "Aprovou plano da Ocorrência #1 (3/3 linhas sem alteração)"), ev(109, "Sistema", "Tarefas enviadas às equipes; CBM espelhado no Sinesp CAD (fase 2)"));
    d.fieldStatus = 0;
  }
  if (phase >= 5) {
    d.fieldStatus = 1;
    d.stage = "Crise";
    d.suggestions = d.suggestions.map((x) => x.id === "crisis" ? { ...x, status: "aceita" } : x);
    d.audit.push(ev(110, "Coord. Marta Ribeiro", "Aceitou: Elevar estágio para Crise"));
    d.blockages = [{ id: "bl1", at: at(123), pos: BRIDGE_POS, desc: "Ponte Velha interditada — água sobre o tabuleiro", by: "CBM-B07" }];
    const amb = d.assignments.find((a) => a.id === "a2");
    if (amb) { amb.polyline = routes.ambB; amb.etaMin = 17; }
    d.photos.push(
      { id: "p1", at: at(118), pos: off(450, -420), caption: "Residência na Rua Sete com água acima das janelas", hue: 210 },
      { id: "p2", at: at(123), pos: BRIDGE_POS, caption: "Ponte Velha com água sobre o tabuleiro", hue: 195 },
    );
    d.audit.push(ev(122, "CBM-B07", "Status: No local"), ev(123, "CBM-B07", "Reportou bloqueio: Ponte Velha"), ev(123, "Sistema", "Rota SAMU-USB02 recalculada (ETA 17 min) evitando bloqueio"));
  }
  if (phase >= 6) {
    d.fieldStatus = 3;
    const g = d.shelters.find((s) => s.id === "ginasio");
    if (g) {
      g.entries = [
        { id: "e0a", at: at(85), name: "Famílias de Ribeirinho", people: 15, kind: "desabrigado", origin: "Ribeirinho" },
        { id: "e0b", at: at(92), name: "Famílias do Jardim das Águas", people: 8, kind: "desabrigado", origin: "Jardim das Águas" },
        { id: "e1", at: at(134), name: "Família Lopes", people: 4, kind: "desabrigado", origin: "Ponte Velha — Rua Sete" }
      ];
      const stock = g.stocks.find((s) => s.item === "Colchão"); if (stock) stock.qty = 18;
    }
    d.displaced = [
      { id: "as1", at: at(88), name: "Família Souza", people: 6, kind: "desalojado", origin: "Ribeirinho · hospedada com parentes" },
      { id: "as2", at: at(96), name: "Família Santos", people: 5, kind: "desalojado", origin: "Jardim das Águas · hospedada com parentes" }
    ];
    d.reports.forEach((x) => (x.status = "atendido"));
    d.photos.push({ id: "p3", at: at(128), pos: off(455, -430), caption: "Resgate de 4 pessoas, incluindo idoso acamado", hue: 25 });
    d.audit.push(ev(127, "CBM-B07", "Status: Vítimas resgatadas (4)"), ev(134, "Assistência Social", "Entrada no Ginásio Municipal: 4 desabrigados"), ev(135, "Sistema", "Estoque de colchão abaixo do mínimo (18/30)"));
  }
  if (phase >= 7) {
    d.fieldStatus = 4;
    if (opts.animateClose && step === 8) d.pendingClose = true;
    else {
      d.closed = true; d.stage = "Normalidade";
      d.resources.forEach((r) => { if (r.status === "empenhado") r.status = "disponível"; });
      if (d.incidents[0]) d.incidents[0].status = "encerrada";
      d.audit.push(ev(CLOSE_MIN, "Coordenador", "Encerrar e desmobilizar: Ocorrência #1; estágio Normalidade"));
    }
    d.requestItems = [{ item: "Colchão", qty: 40, reason: "Ginásio Municipal abaixo do mínimo" }];
    d.photos.push({ id: "p4", at: at(150), pos: off(1500, -600), caption: "Jardim das Águas — vias alagadas", hue: 160 });
    d.docs = d.docs.map((doc) => {
      if (doc.id === "fide") return { ...doc, status: "pendente", pct: 85, pending: [{ agency: "Obras", item: "Valor estimado — pavimentação" }] };
      if (doc.id === "fotografico") return { ...doc, status: "pronto", pct: 100, pending: [] };
      if (doc.id === "solicitacao") return { ...doc, status: "pendente", pct: 70, pending: [{ agency: "Assistência Social", item: "Confirmar quantitativo de colchões" }] };
      if (doc.id === "dmate") return { ...doc, status: "pendente", pct: 60 };
      if (doc.id === "decreto") return { ...doc, pct: 40 };
      if (doc.id === "parecer") return { ...doc, pct: 30 };
      return doc;
    });
    d.audit.push(ev(160, "CBM-B07", "Status: Concluído"), ev(166, "Sistema", `FIDE pré-preenchido; relatório fotográfico montado (${d.photos.length} imagens)`), ev(167, "Sistema", "Solicitação de recursos criada: 40 colchões"));
  }
  d.audit.sort((a, b) => a.at.localeCompare(b.at));
  return d;
}

interface Store extends Data {
  setRiverLevel: (level: number) => void; generatePreposition: () => void; decideDetection: (id: string, send: boolean, reason?: string) => void; updateFlood: () => void; calibrate: (value: number) => void; closeEvent: () => void;
  demoMode: boolean; role: Role; offline: boolean; queued: number;
  applyStep: (n: number, opts?: { animateClose?: boolean }) => void;
  setRole: (r: Role) => void;
  log: (actor: string, action: string) => void;
  acceptSuggestion: (id: string, accept: boolean) => void;
  addReport: (r: Omit<CitizenReport, "id" | "protocol" | "at" | "status">) => string;
  mergeCluster: () => void;
  confirmIncident: () => void;
  approveRow: (id: string) => void;
  approvePlan: () => void;
  swapRow: (id: string, altIdx: number) => void;
  advanceField: () => void;
  addPhoto: (caption: string) => void;
  reportBlockage: () => void;
  setOffline: (v: boolean) => void;
  addShelterEntry: (shelterId: string, e: Omit<ShelterEntryInput, never>) => void;
  addToRequest: (item: string, qty: number, reason: string) => void;
  markSent: (docId: string, protocol: string) => void;
  checkIn: (agency: string) => void;
  setTask: (id: string, status: Task["status"]) => void;
  addDamage: (d: Omit<DamageRecord, "id" | "at">) => void;
}
type ShelterEntryInput = { name: string; people: number; kind: "desabrigado" | "desalojado"; origin: string };

const nowIso = () => new Date().toISOString();
let protoSeq = 123;

export const useApp = create<Store>((set, get) => ({
  ...buildState(0),
  setRiverLevel: (level) => { if (!Number.isFinite(level)) return; set({ riverLevel: Math.max(0, Math.min(4, Math.round(level * 2) / 2)) }); },
  generatePreposition: () => {
    const s = get(), exposed = scenario(s.riverLevel, s.shelters, s.resources);
    const safeShelters = s.shelters.filter((sh) => !exposed.shelters.some((e) => e.id === sh.id));
    set({ suggestions: [...s.suggestions.filter((x) => !x.id.startsWith("move:") && !x.id.startsWith("activate:")), ...exposed.resources.map((r) => ({ id: `move:${r.id}`, text: `Mover ${r.callsign} para Salão Paroquial`, detail: "Retirar recurso da área simulada de alagamento.", status: "pendente" as const })), ...safeShelters.map((sh) => ({ id: `activate:${sh.id}`, text: `Ativar ${sh.name}`, detail: `${sh.capacity} vagas fora da área simulada.`,  status: "pendente" as const }))] });
    get().log("Sistema", "Gerou sugestões de pré-posicionamento");
  },
  decideDetection: (id, send, reason) => {
    const d = get().detections.find((x) => x.id === id);
    if (!d || d.status !== "pendente" || get().missionStatus !== "pronto" || (!send && !reason?.trim())) return;
    set((s) => ({ detections: s.detections.map((x) => x.id === id ? { ...x, status: send ? "enviada" : "descartada", reason } : x) }));
    if (send) {
      get().addReport({ source: "drone", kind: "socorro", text: `Drone térmico: ${d.label}`, people: 4, vulnerable: [], water: "Acima da janela", pos: INCIDENT_POS, place: "Ponte Velha", imageId: d.imageId });
      set((s) => ({ photos: [...s.photos, { id: `evidence-${id}`, at: nowIso(), pos: INCIDENT_POS, caption: d.label, hue: 280, imageId: d.imageId }] }));
    }
    get().log("Coordenador", send ? `Enviou ${d.label} para triagem` : `Descartou ${d.label}: ${reason}`);
  },
  updateFlood: () => { set({ floodExtent: observedFlood, floodAcceptedAt: nowIso() }); get().log("Coordenador", "Atualizou mancha de alagamento com ortomosaico RGB"); },
  calibrate: (value) => { set({ calibration: value }); get().log("Coordenador", `Calibrou gêmeo digital: concordância ${value}%`); },
  closeEvent: () => {
    const s = get();
    if (s.closed) return;
    // In the scripted demo the click happens at the scenario time (16:25), keeping the timeline in order.
    const when = s.pendingClose ? at(CLOSE_MIN) : nowIso();
    set({
      closed: true, pendingClose: false, stage: "Normalidade",
      incidents: s.incidents.map((i) => ({ ...i, status: "encerrada" })),
      resources: s.resources.map((r) => r.status === "empenhado" ? { ...r, status: "disponível" } : r),
      audit: [...s.audit, { at: when, actor: "Coordenador", action: "Encerrar e desmobilizar: Ocorrência #1; estágio Normalidade" }].sort((a, b) => a.at.localeCompare(b.at)),
    });
  },
  demoMode: true, role: "Coordenador", offline: false, queued: 0,
  applyStep: (n, opts) => set({ ...buildState(Math.max(0, Math.min(9, n)), opts) }),
  setRole: (role) => set({ role }),
  log: (actor, action) => set((s) => ({ audit: [...s.audit, { at: nowIso(), actor, action }] })),
  acceptSuggestion: (id, accept) => {
    const s = get().suggestions.find((x) => x.id === id);
    if (!s || s.status !== "pendente") return;
    set((st) => ({
      suggestions: st.suggestions.map((x) => (x.id === id ? { ...x, status: accept ? "aceita" : "ignorada" } : x)),
      stage: accept && id === "s1" ? "Alerta" : accept && id === "crisis" ? "Crise" : st.stage,
      shelters: accept && id.startsWith("activate:") ? st.shelters.map((sh) => sh.id === id.slice(9) ? { ...sh, active: true } : sh) : st.shelters,
      resources: accept && id.startsWith("move:") ? st.resources.map((r) => r.id === id.slice(5) ? { ...r, pos: off(-1500, 1100) } : r) : st.resources,
    }));
    get().log("Coordenador", `${accept ? "Aceitou" : "Ignorou"}: ${s?.text}`);
  },
  addReport: (r) => {
    const protocol = `VS-2026-000${protoSeq++}`;
    set((s) => ({ reports: [{ ...r, id: `r${Date.now()}`, protocol, at: nowIso(), status: "recebido" }, ...s.reports] }));
    get().log(r.source === "drone" ? "Coordenador" : "Cidadão", `Relato ${protocol} recebido`);
    return protocol;
  },
  mergeCluster: () => {
    set((s) => ({ clusterMerged: true, reports: s.reports.map((r) => (r.place === "Ponte Velha" ? { ...r, status: "agrupado" } : r)) }));
    get().log("Coordenador", "Mesclou relatos de Ponte Velha");
  },
  confirmIncident: () => {
    const b = buildState(4);
    set((s) => ({ step: Math.max(s.step, 4), incidents: b.incidents, assignments: b.assignments, tasks: b.tasks, reports: s.reports.map((r) => (r.place === "Ponte Velha" ? { ...r, status: "agrupado", incidentId: "1" } : r)), clusterMerged: true }));
    set((s) => ({ incidents: s.incidents.map((i) => ({ ...i, reportIds: s.reports.filter((r) => r.incidentId === i.id).map((r) => r.id) })) }));
    get().log("Coordenador", "Confirmou Ocorrência #1: Inundação · Severo");
  },
  approveRow: (id) => {
    set((s) => ({ assignments: s.assignments.map((a) => (a.id === id ? { ...a, status: a.status === "trocada" ? "trocada" : "aprovada", approvedBy: "Coord. Marta Ribeiro", approvedAt: nowIso() } : a)) }));
    get().log("Coord. Marta Ribeiro", `Aprovou linha ${get().assignments.find((a) => a.id === id)?.resourceId}`);
  },
  approvePlan: () => {
    set((s) => ({ suggestions: s.suggestions.some((x) => x.id === "crisis") ? s.suggestions : [...s.suggestions, { id: "crisis", text: "Elevar estágio para Crise?", detail: "Plano aprovado. Confirme o novo estágio.", status: "pendente" }], fieldStatus: Math.max(s.fieldStatus, 0), assignments: s.assignments.map((a) => ({ ...a, status: a.status === "trocada" ? "trocada" : "aprovada", approvedBy: "Coord. Marta Ribeiro", approvedAt: a.approvedAt ?? nowIso() })), incidents: s.incidents.map((i) => ({ ...i, status: "em atendimento" })) }));
    get().log("Coord. Marta Ribeiro", "Aprovou plano da Ocorrência #1");
  },
  swapRow: (id, altIdx) => {
    const a = get().assignments.find((x) => x.id === id);
    const alt = a?.alternatives[altIdx];
    if (!a || !alt) return;
    set((s) => ({
      assignments: s.assignments.map((x) => x.id === id ? {
        ...x, resourceId: alt.resourceId, etaMin: alt.etaMin, status: "trocada", approvedBy: "Coord. Marta Ribeiro", approvedAt: nowIso(),
        rationale: `${alt.resourceId}: escolhido manualmente pelo coordenador. ${alt.note}.`,
        alternatives: [{ resourceId: x.resourceId, etaMin: x.etaMin, note: "Proposta original do sistema" }, ...x.alternatives.filter((_, i) => i !== altIdx)],
      } : x),
    }));
    get().log("Coord. Marta Ribeiro", `Trocou ${a.resourceId} por ${alt.resourceId}`);
  },
  advanceField: () => {
    const s = get();
    const next = Math.min(FIELD_STEPS.length - 1, s.fieldStatus + 1);
    if (s.offline) { set({ fieldStatus: next, queued: s.queued + 1 }); return; }
    set({ fieldStatus: next });
    get().log("CBM-B07", `Status: ${FIELD_STEPS[next]}${next === 2 ? " (4)" : ""}`);
  },
  addPhoto: (caption) => {
    const s = get();
    const jitter = (Math.random() - 0.5) * 80;
    set({ photos: [...s.photos, { id: `p${Date.now()}`, at: nowIso(), pos: off(450 + jitter, -420 + jitter), caption, hue: Math.floor(Math.random() * 360) }], queued: s.offline ? s.queued + 1 : s.queued });
    if (!s.offline) get().log("CBM-B07", `Foto registrada: ${caption}`);
  },
  reportBlockage: () => {
    const s = get();
    set({
      blockages: s.blockages.length ? s.blockages : [{ id: "bl1", at: nowIso(), pos: BRIDGE_POS, desc: "Ponte Velha interditada — água sobre o tabuleiro", by: "CBM-B07" }],
      assignments: s.assignments.map((a) => (a.id === "a2" ? { ...a, polyline: routes.ambB, etaMin: 17 } : a)),
      queued: s.offline ? s.queued + 1 : s.queued,
    });
    if (!s.offline) get().log("CBM-B07", "Reportou bloqueio: Ponte Velha; rota SAMU recalculada");
  },
  setOffline: (v) => {
    const q = get().queued;
    set({ offline: v, queued: v ? q : 0 });
    if (!v && q) get().log("Sistema", `${q} ações sincronizadas após reconexão`);
  },
  addShelterEntry: (shelterId, e) => {
    if (!Number.isInteger(e.people) || e.people < 1) return;
    if (e.kind === "desalojado") {
      set((s) => ({ displaced: [...s.displaced, { ...e, id: `as${Date.now()}`, at: nowIso() }] }));
      get().log("Assistência Social", `Registrou ${e.people} desalojados com parentes`);
      return;
    }
    set((s) => ({ shelters: s.shelters.map((sh) => (sh.id === shelterId ? { ...sh, entries: [...sh.entries, { ...e, id: `e${Date.now()}`, at: nowIso() }] } : sh)) }));
    get().log("Assistência Social", `Entrada registrada: ${e.people} ${e.kind}(s)`);
  },
  addToRequest: (item, qty, reason) => {
    set((s) => ({ requestItems: s.requestItems.some((x) => x.item === item) ? s.requestItems : [...s.requestItems, { item, qty, reason }] }));
    get().log("Coordenador", `Incluiu ${qty} ${item} na solicitação de recursos`);
  },
  markSent: (docId, protocol) => {
    set((s) => ({ docs: s.docs.map((d) => (d.id === docId ? { ...d, status: "enviado", pct: 100, pending: [], protocol } : d)) }));
    get().log("Coordenador", `Marcou ${docId.toUpperCase()} como enviado (protocolo ${protocol})`);
  },
  checkIn: (agency) => {
    set((s) => ({ resources: s.resources.map((r) => (r.agency === agency ? { ...r, lastCheckIn: at(s.step * 20 + 5) } : r)), checkInPct: Math.min(100, s.checkInPct + 4) }));
    get().log(`Operador ${agency.toUpperCase()}`, "Fez check-in do turno");
  },
  setTask: (id, status) => {
    set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, status } : t)) }));
    get().log("Operador de órgão", `${status === "aceita" ? "Aceitou" : "Recusou"} tarefa ${id}`);
  },
  addDamage: (d) => {
    set((s) => ({ damages: [...s.damages, { ...d, id: `d${Date.now()}`, at: nowIso() }] }));
    get().log(d.agency, `Registro de dano: ${d.desc}`);
  },
}));

export const isCheckInLate = (r: Resource, step: number) => (T_NOW(step) - new Date(r.lastCheckIn).getTime()) / 3600000 > 12;
export const T_NOW = (step: number) => new Date(at(step * 20)).getTime();
