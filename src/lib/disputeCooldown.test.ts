import { describe, expect, it } from "vitest";
import {
  disputeCooldownHoursForCount,
  disputeCooldownRemainingMs,
} from "./disputeCooldown";

const HOUR = 60 * 60 * 1000;
const RAISED = "2026-04-01T10:00:00.000Z";
const RAISED_MS = new Date(RAISED).getTime();

describe("disputeCooldownHoursForCount", () => {
  it("has no wait before DSP1, then 48/24/12", () => {
    expect(disputeCooldownHoursForCount(0)).toBe(0);
    expect(disputeCooldownHoursForCount(1)).toBe(48);
    expect(disputeCooldownHoursForCount(2)).toBe(24);
    expect(disputeCooldownHoursForCount(3)).toBe(12);
  });
});

describe("disputeCooldownRemainingMs", () => {
  it("is zero before the first dispute", () => {
    expect(
      disputeCooldownRemainingMs({
        status: "done",
        disputeCount: 0,
        statusEnteredAt: RAISED,
        lastDisputeAt: undefined,
        nowMs: RAISED_MS,
      }),
    ).toBe(0);
  });

  it("counts down from the last raise while still disputed", () => {
    expect(
      disputeCooldownRemainingMs({
        status: "disputed",
        disputeCount: 1,
        statusEnteredAt: RAISED,
        lastDisputeAt: RAISED,
        nowMs: RAISED_MS + HOUR,
      }),
    ).toBe(47 * HOUR);
  });

  it("resets when work returns to done after the raise", () => {
    expect(
      disputeCooldownRemainingMs({
        status: "done",
        disputeCount: 1,
        statusEnteredAt: new Date(RAISED_MS + HOUR).toISOString(),
        lastDisputeAt: RAISED,
        nowMs: RAISED_MS + 2 * HOUR,
      }),
    ).toBe(0);
  });
});
