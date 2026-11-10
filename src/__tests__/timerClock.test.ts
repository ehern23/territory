import { describe, expect, it, vi } from "vitest";
import { createTimerClock } from "@/three/timerClock";

describe("Timer-backed frame clock", () => {
  it("behaves like THREE.Clock for R3F's loop", () => {
    let now = 1000;
    const spy = vi.spyOn(performance, "now").mockImplementation(() => now);
    const clock = createTimerClock();
    // First call auto-starts and reports no time.
    expect(clock.getDelta()).toBe(0);
    expect(clock.running).toBe(true);
    now += 16;
    expect(clock.getDelta()).toBeCloseTo(0.016, 6);
    now += 34;
    expect(clock.getDelta()).toBeCloseTo(0.034, 6);
    expect(clock.elapsedTime).toBeCloseTo(0.05, 6);
    // R3F's setFrameloop: stop, zero, start.
    clock.stop();
    expect(clock.running).toBe(false);
    clock.elapsedTime = 0;
    clock.start();
    now += 20;
    expect(clock.getDelta()).toBeCloseTo(0.02, 6);
    expect(clock.getElapsedTime()).toBeCloseTo(0.02, 6);
    clock.dispose();
    spy.mockRestore();
  });
});
