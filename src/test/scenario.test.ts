import { describe, expect, it } from "vitest";
import { buildState, useApp } from "@/store/app";
import { selectFide, selectAssistance, selectMetrics, shelterOccupancy } from "@/store/selectors";
import { contains, riskCells, riskFactors, scenario } from "@/mock/risk";
import { INCIDENT_POS, floodPolygon, riskAreas, routes, stepNames, fmtDateTime, at } from "@/mock/data";

describe("Reativa scenario rules", () => {
  it("counts 27 desabrigados from shelter records after rescue", () => {
    const s = buildState(7);
    expect(selectFide(s).homeless).toBe(27);
    expect(selectAssistance(s).homeless).toBe(27);
    expect(s.shelters.reduce((n, sh) => n + shelterOccupancy(sh), 0)).toBe(27);
  });
  it("counts 11 desalojados outside public shelters", () => {
    const s = buildState(7);
    expect(selectFide(s).displaced).toBe(11);
    expect(s.shelters.flatMap((sh) => sh.entries).filter((e) => e.kind === "desalojado")).toHaveLength(0);
  });
  it("registers new desalojados separately", () => {
    useApp.getState().applyStep(7);
    useApp.getState().addShelterEntry("ginasio", { name: "Família teste", people: 2, kind: "desalojado", origin: "Com parentes" });
    expect(selectFide(useApp.getState()).displaced).toBe(13);
    expect(selectFide(useApp.getState()).homeless).toBe(27);
  });
  it("requires human approval for Crise independently of plan approval", () => {
    useApp.getState().applyStep(4);
    useApp.getState().approvePlan();
    expect(useApp.getState().stage).toBe("Alerta");
    useApp.getState().acceptSuggestion("crisis", true);
    expect(useApp.getState().stage).toBe("Crise");
  });
  it("demobilizes to Normalidade and logs the human decision", () => {
    useApp.getState().applyStep(6);
    useApp.getState().closeEvent();
    expect(useApp.getState().stage).toBe("Normalidade");
    expect(useApp.getState().audit.at(-1)?.actor).toBe("Coordenador");
  });
  it("computes 14 min from approval 15:28 to CBM-B07 arrival 15:42", () => {
    expect(selectMetrics(buildState(6)).planToArrival).toBe(14);
    expect(selectMetrics(buildState(6)).reportToPlan).toBe(13);
  });
  it("attributes the bridge blockage to CBM-B07", () => {
    expect(buildState(6).blockages[0]?.by).toBe("CBM-B07");
  });
  it("places incident and aquatic route within correct polygons", () => {
    const ponte = riskAreas.find((r) => r.id === "ponte");
    expect(ponte && contains(INCIDENT_POS, ponte.polygon)).toBe(true);
    expect(routes.boat.every((p) => contains(p, floodPolygon))).toBe(true);
  });
  it("keeps four linked reports when the original cluster is merged", () => {
    useApp.getState().applyStep(2);
    useApp.getState().mergeCluster();
    expect(useApp.getState().reports.filter((r) => r.status === "agrupado")).toHaveLength(4);
  });
  it("adds a drone step and preserves accepted image evidence", () => {
    expect(stepNames).toHaveLength(10);
    expect(stepNames[3]).toBe("Drone térmico confirma pessoas");
    useApp.getState().applyStep(3);
    useApp.getState().decideDetection("hot1", true);
    useApp.getState().decideDetection("hot2", false, "Telhado aquecido");
    expect(useApp.getState().reports.find((r) => r.source === "drone")?.imageId).toBe("thermal-1");
    expect(useApp.getState().detections[1]?.status).toBe("descartada");
  });
  it("caps river simulation at 4 m in half-metre increments", () => {
    useApp.getState().setRiverLevel(5);
    expect(useApp.getState().riverLevel).toBe(4);
    useApp.getState().setRiverLevel(1.7);
    expect(useApp.getState().riverLevel).toBe(1.5);
  });
  it("uses the specified susceptibility, exposure and trigger weights", () => {
    const c = riskCells[0];
    if (!c) throw new Error("Missing H3 cells");
    const f = riskFactors(c, 134);
    expect(f.riskIndex).toBeCloseTo((f.hand * .6 + f.slope * .15 + f.history * .25) * (c.population / 58 * .5 + c.buildings / 20 * .3 + c.vulnerableCount / 7 * .2) * (134 / 120));
    expect(riskFactors(c, 86).trigger).toBe(1);
  });
  it("floods only cells with HAND at or below the simulated level", () => {
    const s = buildState(0);
    expect(scenario(2, s.shelters, s.resources).flooded.every((c) => c.handM <= 2)).toBe(true);
    expect(scenario(2, s.shelters, s.resources).flooded.length).toBe(riskCells.filter((c) => c.handM <= 2).length);
  });
  it("formats dates with a full year and time", () => {
    expect(fmtDateTime(at(108))).toBe("14/11/2026 15:28");
  });
});