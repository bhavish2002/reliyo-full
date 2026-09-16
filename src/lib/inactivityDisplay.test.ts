import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import { getInactivityUiState } from "./inactivityDisplay";
import type { TimelineEntry } from "./taskTypes";

describe("getInactivityUiState", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-01T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows friendly review-period message before deadline", () => {
    const state = getInactivityUiState(
      "done",
      "2026-05-01T12:00:00.000Z",
      "2026-06-15T12:00:00.000Z",
      [],
    );
    expect(state?.beforeDeadline).toBe(true);
    expect(state?.headline).toContain("reminders begin after the deadline");
    expect(state?.detail).toBeNull();
  });

  it("shows countdown before first reminder", () => {
    const state = getInactivityUiState(
      "done",
      "2026-05-30T12:00:00.000Z",
      "2026-05-30T12:00:00.000Z",
      [],
    );
    expect(state?.strikeCount).toBe(0);
    expect(state?.headline).toContain("waiting for a decision");
    expect(state?.detail).toMatch(/Reminder 1 of 3 in/);
  });

  it("shows pending reminder copy when overdue but not recorded", () => {
    const state = getInactivityUiState(
      "done",
      "2026-05-20T12:00:00.000Z",
      "2026-05-20T12:00:00.000Z",
      [],
    );
    expect(state?.detail).toMatch(/Reminder 1 of 3 will be recorded shortly/);
    expect(state?.headline).not.toMatch(/Requestor/i);
  });

  it("shows generic reminder headline after server records reminder", () => {
    const entries: TimelineEntry[] = [
      {
        id: "1",
        taskId: "t1",
        author: "System",
        authorRole: "system",
        message: "Reminder 1 of 3 — this completed task still needs a decision.",
        timestamp: "2026-05-25T12:00:00.000Z",
        systemGenerated: true,
        entryType: "alert",
        metadata: { alertType: "sla_warning", strike: 1 },
      },
    ];
    const state = getInactivityUiState(
      "done",
      "2026-05-20T12:00:00.000Z",
      "2026-05-20T12:00:00.000Z",
      entries,
    );
    expect(state?.strikeCount).toBe(1);
    expect(state?.headline).toMatch(/Reminder 1 of 3/);
    expect(state?.headline).not.toMatch(/Requestor/i);
  });
});
