import { create } from "zustand";
import { at, type CitizenReport, type DamageRecord, type Resource, type Role, type Task } from "@/mock/data";
import * as E from "./engine";
import type { Data } from "./engine";

export { buildState, FIELD_STEPS, nextHumanTask, nextEventAt, COORD } from "./engine";
export type { Data, Detection, Notice } from "./engine";

/** Scenario minutes per real second for each speed option (0 = paused). */
export const SPEEDS = [
  { label: "Pausado", perSecond: 0 },
  { label: "1×", perSecond: 1 / 60 },
  { label: "10×", perSecond: 10 / 60 },
  { label: "60×", perSecond: 1 },
] as const;

interface UiState {
  role: Role;
  /** Presenter mode shows the "Passo X/9" script controls; normal use drives the story through the app itself. */
  presenter: boolean;
  /** Index into SPEEDS. */
  speed: number;
}
interface Store extends Data, UiState {
  applyStep: (n: number, opts?: { animateClose?: boolean }) => void;
  setRole: (r: Role) => void;
  setPresenter: (v: boolean) => void;
  setSpeed: (i: number) => void;
  tick: (realSeconds: number) => void;
  skipToNextEvent: () => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  ackFresh: () => void;
  setRiverLevel: (level: number) => void;
  generatePreposition: () => void;
  decideDetection: (id: string, send: boolean, reason?: string) => void;
  updateFlood: () => void;
  calibrate: (value: number) => void;
  closeEvent: () => void;
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
  addShelterEntry: (shelterId: string, e: { name: string; people: number; kind: "desabrigado" | "desalojado"; origin: string }) => void;
  addToRequest: (item: string, qty: number, reason: string) => void;
  markSent: (docId: string, protocol: string) => void;
  checkIn: (agency: string) => void;
  setTask: (id: string, status: Task["status"]) => void;
  addDamage: (d: Omit<DamageRecord, "id" | "at">) => void;
}

const DATA_KEYS = Object.keys(E.initial()) as (keyof Data)[];
/** Deep copy of the scenario part of the store, so engine functions can mutate freely. */
const snapshot = (s: Store): Data => structuredClone(Object.fromEntries(DATA_KEYS.map((k) => [k, s[k]]))) as unknown as Data;

export const useApp = create<Store>((set, get) => {
  /** Runs an engine function on a copy of the state and commits it; keeps `step` in sync with progress. */
  const act = <A extends unknown[], R>(fn: (d: Data, ...args: A) => R) => (...args: A): R => {
    const d = snapshot(get());
    const result = fn(d, ...args);
    d.step = Math.max(d.step, E.progressStep(d));
    set(d);
    return result;
  };
  return {
    ...E.buildState(0),
    role: "Coordenador", presenter: false, speed: 0,
    applyStep: (n, opts) => set({ ...E.buildState(Math.max(0, Math.min(9, n)), opts) }),
    setRole: (role) => set({ role }),
    setPresenter: (presenter) => set({ presenter }),
    setSpeed: (speed) => set({ speed: Math.max(0, Math.min(SPEEDS.length - 1, speed)) }),
    tick: (realSeconds) => {
      const s = get();
      const perSecond = SPEEDS[s.speed]?.perSecond ?? 0;
      if (!perSecond) return;
      const to = s.clock + perSecond * realSeconds;
      const due = E.nextEventAt(s);
      // Cheap path: nothing to fire, only the clock moves.
      if (due === null || due > to) { set({ clock: to }); return; }
      act((d) => E.advance(d, to))();
    },
    skipToNextEvent: act((d) => { const n = E.nextEventAt(d); if (n !== null) E.advance(d, n); }),
    markRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
    markAllRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
    ackFresh: () => set((s) => ({ notifications: s.notifications.map((n) => (n.fresh ? { ...n, fresh: false } : n)) })),
    setRiverLevel: (level) => { if (Number.isFinite(level)) set({ riverLevel: Math.max(0, Math.min(4, Math.round(level * 2) / 2)) }); },
    generatePreposition: act(E.generatePreposition),
    decideDetection: act(E.decideDetection),
    updateFlood: act(E.updateFlood),
    calibrate: act(E.calibrate),
    closeEvent: act(E.closeEvent),
    acceptSuggestion: act(E.acceptSuggestion),
    addReport: act(E.addReport),
    mergeCluster: act(E.mergeCluster),
    confirmIncident: act(E.confirmIncident),
    approveRow: act(E.approveRow),
    approvePlan: act(E.approvePlan),
    swapRow: act(E.swapRow),
    advanceField: act(E.advanceField),
    addPhoto: act(E.addPhoto),
    reportBlockage: act(E.fieldBlockage),
    setOffline: act(E.setOffline),
    addShelterEntry: act(E.addShelterEntry),
    addToRequest: act(E.addToRequest),
    markSent: act(E.markSent),
    checkIn: act(E.checkIn),
    setTask: act(E.setTask),
    addDamage: act(E.addDamage),
  };
});

/** Scenario "now" as epoch ms. */
export const T_NOW = (clock: number) => Date.parse(at(clock));
export const isCheckInLate = (r: Resource, clock: number) => (T_NOW(clock) - Date.parse(r.lastCheckIn)) / 3600000 > 12;
