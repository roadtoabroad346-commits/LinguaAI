import { describe, expect, it } from "vitest";
import {
  PLAYBACK_SPEEDS,
  clampSpeed,
  DEFAULT_PLAYBACK_SPEED,
  SLOW_PLAYBACK_SPEED,
} from "./speed";

describe("playback speeds", () => {
  it("offers the required 0.5x–2.0x ladder", () => {
    expect([...PLAYBACK_SPEEDS]).toEqual([0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]);
  });
  it("clamps arbitrary input to the nearest detent", () => {
    expect(clampSpeed(1)).toBe(1);
    expect(clampSpeed(1.3)).toBe(1.25);
    expect(clampSpeed(0.1)).toBe(0.5);
    expect(clampSpeed(99)).toBe(2);
    expect(clampSpeed("1.5")).toBe(1.5);
    expect(clampSpeed(NaN)).toBe(DEFAULT_PLAYBACK_SPEED);
    expect(clampSpeed(null)).toBe(DEFAULT_PLAYBACK_SPEED);
    expect(clampSpeed(undefined)).toBe(DEFAULT_PLAYBACK_SPEED);
  });
  it("slow reference audio is slower than normal", () => {
    expect(SLOW_PLAYBACK_SPEED).toBeLessThan(1);
    expect(PLAYBACK_SPEEDS).toContain(DEFAULT_PLAYBACK_SPEED);
  });
});
