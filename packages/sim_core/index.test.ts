import { describe, expect, it } from "vitest";
import { advanceOneHour, advanceTime, createInitialGameState } from "./index";

describe("sim_core", () => {
  it("applies expected resource deltas after one hour", () => {
    const state = createInitialGameState();
    const next = advanceOneHour(state);

    expect(next.currentHour).toBe(2);
    expect(next.resources.power).toBe(112);
    expect(next.resources.oxygen).toBe(111);
    expect(next.resources.water).toBe(112);
    expect(next.resources.food).toBe(110);
  });

  it("completes mine_rock jobs and grants output", () => {
    const state = createInitialGameState();
    state.resources.oxygen = 500;
    state.resources.water = 500;
    state.resources.food = 500;
    state.storageCap.oxygen = 1000;
    state.storageCap.water = 1000;
    state.storageCap.food = 1000;
    state.storageCap.rock = 1000;
    state.jobs.push({
      id: "job_mine_test",
      type: "mine_rock",
      progressHours: 0,
      requiredHours: 13,
      status: "active",
    });

    const result = advanceTime(state, 13);
    const minedJob = result.state.jobs.find((job) => job.id === "job_mine_test");

    expect(result.stoppedEarly).toBe(true);
    expect(result.stopReason).toBe("Job completed");
    expect(minedJob?.status).toBe("completed");
    expect(result.state.resources.rock).toBe(70);
    expect(result.state.eventLog.some((event) => event.message.includes("Job completed: mine_rock"))).toBe(true);
  });

  it("completes refine_metal jobs and consumes input", () => {
    const state = createInitialGameState();
    state.resources.rock = 50;
    state.resources.oxygen = 500;
    state.resources.water = 500;
    state.resources.food = 500;
    state.storageCap.oxygen = 1000;
    state.storageCap.water = 1000;
    state.storageCap.food = 1000;
    state.storageCap.rock = 1000;
    state.storageCap.metal = 1000;
    state.jobs.push({
      id: "job_refine_test",
      type: "refine_metal",
      progressHours: 0,
      requiredHours: 10,
      status: "active",
    });

    const result = advanceTime(state, 10);
    const refineJob = result.state.jobs.find((job) => job.id === "job_refine_test");

    expect(result.stoppedEarly).toBe(true);
    expect(result.stopReason).toBe("Job completed");
    expect(refineJob?.status).toBe("completed");
    expect(result.state.resources.rock).toBe(30);
    expect(result.state.resources.metal).toBe(20);
  });

  it("auto-pauses when oxygen hits critical", () => {
    const state = createInitialGameState();
    state.resources.oxygen = 1;
    state.resources.water = 500;
    state.resources.food = 500;
    state.storageCap.oxygen = 1000;
    state.storageCap.water = 1000;
    state.storageCap.food = 1000;

    const result = advanceTime(state, 30);

    expect(result.hoursAdvanced).toBe(1);
    expect(result.stoppedEarly).toBe(true);
    expect(result.stopReason).toContain("OXYGEN depleted");
    expect(result.state.resources.oxygen).toBe(0);
  });

  it("clamps resources to storage capacity", () => {
    const state = createInitialGameState();
    state.resources.rock = 150;
    state.storageCap.rock = 100;

    const next = advanceOneHour(state);

    expect(next.resources.rock).toBe(100);
  });
});
