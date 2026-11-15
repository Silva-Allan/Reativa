import { describe, expect, it } from "vitest";
import { buildState, COORD, nextHumanTask, useApp } from "@/store/app";
import { STEP_CLOCK } from "@/mock/data";
import { selectAffectedAreas, selectFide, selectAssistance, selectMetrics, shelterOccupancy } from "@/store/selectors";
import { contains, GRID_BOUNDS, riskCells, riskFactors, scenario } from "@/mock/risk";
import { INCIDENT_POS, floodPolygon, riskAreas, riverLine, routes, stepNames, fmtDateTime, at, requiredStep } from "@/mock/data";

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
    expect(useApp.getState().audit.find((e) => e.action.startsWith("Encerrar e desmobilizar"))?.actor).toBe(COORD);
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

describe("Scenario clock and live use", () => {
  const live = () => { useApp.getState().applyStep(0); useApp.setState({ speed: 3 }); };
  const runTo = (min: number) => { while (useApp.getState().clock < min) useApp.getState().tick(Math.min(30, min - useApp.getState().clock)); };

  it("the clock alone brings external events but stops at human decisions", () => {
    live(); runTo(200);
    const s = useApp.getState();
    expect(s.alerts).toHaveLength(1);
    expect(s.reports).toHaveLength(4);
    expect(s.missionStatus).toBe("pronto");
    expect(s.stage).toBe("Atenção"); // Alerta needs the coordinator
    expect(s.incidents).toHaveLength(0); // no incident without confirmation
    expect(s.queue).toHaveLength(0);
    expect(nextHumanTask(s)?.text).toBe("Decidir sugestões do alerta");
  });

  it("playing freely with the script's clicks ends exactly like the scripted demo", () => {
    live();
    const a = useApp.getState();
    runTo(76); a.acceptSuggestion("s1", true); runTo(77); a.acceptSuggestion("s2", true);
    runTo(102); a.decideDetection("hot1", true); a.decideDetection("hot2", false, "Caixa d'água aquecida");
    runTo(103); a.mergeCluster(); runTo(104); a.confirmIncident();
    runTo(108); a.approvePlan(); runTo(110); a.acceptSuggestion("crisis", true);
    runTo(165); a.closeEvent(); runTo(170);
    const s = useApp.getState(), ref = buildState(9);
    expect(selectFide(s).homeless).toBe(27);
    expect(selectFide(s).displaced).toBe(11);
    expect(selectMetrics(s).planToArrival).toBe(14);
    expect(selectMetrics(s).reportToPlan).toBe(13);
    expect(s.stage).toBe("Normalidade");
    expect(s.step).toBe(8);
    expect(s.audit.map((e) => [fmtDateTime(e.at), e.actor])).toEqual(ref.audit.map((e) => [fmtDateTime(e.at), e.actor]));
  });

  it("human actions are stamped with the scenario clock, not the computer clock", () => {
    useApp.getState().applyStep(4);
    useApp.getState().approvePlan();
    expect(fmtDateTime(useApp.getState().audit.at(-1)!.at)).toBe(fmtDateTime(at(STEP_CLOCK[4])));
  });

  it("the arrival follows the boat the coordinator actually chose", () => {
    useApp.getState().applyStep(4);
    useApp.getState().swapRow("a1", 0); // CBM-B03, ETA 9
    useApp.getState().approvePlan();
    useApp.setState({ speed: 3 });
    runTo(STEP_CLOCK[4] + 9);
    const arrival = selectMetrics(useApp.getState()).arrival;
    expect(arrival?.actor).toBe("CBM-B03");
    expect(selectMetrics(useApp.getState()).planToArrival).toBe(9);
  });

  it("offline field actions queue on the device and sync on reconnection", () => {
    useApp.getState().applyStep(5);
    useApp.getState().setOffline(true);
    useApp.getState().advanceField();
    useApp.getState().reportBlockage();
    expect(useApp.getState().fieldStatus).toBe(0);
    expect(useApp.getState().blockages).toHaveLength(0);
    useApp.getState().setOffline(false);
    expect(useApp.getState().fieldStatus).toBe(1);
    expect(useApp.getState().blockages).toHaveLength(1);
    expect(useApp.getState().offlineQueue).toHaveLength(0);
  });

  it("snapshots never replay toasts", () => {
    expect(buildState(7).notifications.some((n) => n.fresh)).toBe(false);
    useApp.getState().applyStep(4);
    useApp.getState().approvePlan();
    expect(useApp.getState().notifications.some((n) => n.fresh)).toBe(true);
  });
});

describe("Polish round", () => {
  it("counts only Ponte Velha as an affected risk area in the scripted event", () => {
    const areas = selectAffectedAreas(buildState(8));
    expect(areas.map((a) => a.area.name)).toEqual(["Ponte Velha"]);
  });
  it("adds areas inside the flood extent only after the coordinator accepts it", () => {
    useApp.getState().applyStep(8);
    useApp.getState().updateFlood();
    expect(selectAffectedAreas(useApp.getState()).length).toBe(3);
  });
  it("step 8 waits for the coordinator's click, then demobilizes at 16:25", () => {
    useApp.getState().applyStep(8, { animateClose: true });
    expect(useApp.getState().pendingClose).toBe(true);
    expect(useApp.getState().stage).toBe("Crise");
    useApp.getState().closeEvent();
    const s = useApp.getState();
    expect(s.stage).toBe("Normalidade");
    const close = s.audit.find((e) => e.action.startsWith("Encerrar e desmobilizar"));
    expect(close && fmtDateTime(close.at)).toBe("14/11/2026 16:25");
    expect(s.audit.map((e) => e.at)).toEqual([...s.audit.map((e) => e.at)].sort());
  });
  it("deep links hydrate to the first step with data", () => {
    expect(requiredStep("/gabinete/ocorrencias/1/plano")).toBe(4);
    expect(requiredStep("/gabinete/abrigos")).toBe(7);
    expect(requiredStep("/relatorios/fide")).toBe(8);
    expect(buildState(8).closed).toBe(true);
  });
  it("seeds Defesa Civil and Assistência Social resources", () => {
    const rs = buildState(0).resources;
    expect(rs.filter((r) => r.agency === "dc").map((r) => r.id)).toEqual(["DC-V01", "DC-V02", "DC-D02"]);
    expect(rs.filter((r) => r.agency === "as")).toHaveLength(1);
  });
  it("calibrates risk: river core Alto+, band Médio or lower, rest Baixo or lower", () => {
    for (const rain of [86, 134]) {
      for (const c of riskCells) {
        const k = riskFactors(c, rain).classIndex;
        if (c.zone === "núcleo") expect(k).toBeGreaterThanOrEqual(3);
        else if (c.zone === "entorno") expect(k).toBeLessThanOrEqual(2);
        else expect(k).toBeLessThanOrEqual(1);
      }
    }
  });
  it("grid covers the whole river course", () => {
    expect(riverLine.every((p) => contains(p, GRID_BOUNDS))).toBe(true);
  });
});