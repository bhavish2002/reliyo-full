import { describe, expect, it } from "vitest";
import {
  filterEscalatedDisputes,
  isEscalatedEntryFlagged,
  type AdminDispute,
} from "./adminData";
import type { Task } from "./taskTypes";

const task = (status: Task["status"]): Task =>
  ({
    id: "t1",
    taskId: "RLY-TSK-1",
    title: "Task",
    description: "",
    status,
    workType: "Virtual",
    manpower: 1,
    location: "Remote",
    deadline: "2026-12-31",
    updateFrequency: "Daily",
    skills: [],
    domain: "QA",
    reward: 100,
    createdAt: "2026-01-01T00:00:00Z",
    createdBy: "Req",
  }) as Task;

const row = (
  overrides: Partial<AdminDispute> & { status: Task["status"] },
): AdminDispute => ({
  disputeId: overrides.disputeId ?? "d1",
  disputeNumber: 4,
  taskId: "t1",
  taskDisplayId: "RLY-TSK-1",
  taskTitle: "Task",
  requestor: "Req",
  acceptor: "Acc",
  escalated: overrides.escalated ?? true,
  createdAt: "2026-01-01T00:00:00Z",
  dsp4Status: overrides.dsp4Status ?? "resolved_valid",
  task: task(overrides.status),
});

describe("isEscalatedEntryFlagged", () => {
  it("flags a Closed DSP4 row still listed on Escalated", () => {
    expect(isEscalatedEntryFlagged("closed", true)).toBe(true);
  });

  it("does not flag disputed, force_closed, or non-escalated rows", () => {
    expect(isEscalatedEntryFlagged("disputed", true)).toBe(false);
    expect(isEscalatedEntryFlagged("force_closed", true)).toBe(false);
    expect(isEscalatedEntryFlagged("closed", false)).toBe(false);
  });
});

describe("filterEscalatedDisputes", () => {
  const rows = [
    row({ disputeId: "open", status: "disputed", dsp4Status: "open" }),
    row({ disputeId: "valid-closed", status: "closed", dsp4Status: "resolved_valid" }),
    row({ disputeId: "valid-open", status: "disputed", dsp4Status: "resolved_valid" }),
    row({ disputeId: "invalid", status: "closed", dsp4Status: "resolved_invalid" }),
    row({ disputeId: "admin", status: "force_closed", dsp4Status: "admin_closed" }),
  ];

  it("returns all escalated rows when both filters are All", () => {
    expect(filterEscalatedDisputes(rows, "all", "all").map((r) => r.disputeId)).toEqual([
      "open",
      "valid-closed",
      "valid-open",
      "invalid",
      "admin",
    ]);
  });

  it("Flagged shows only Closed tasks still on Escalated", () => {
    expect(filterEscalatedDisputes(rows, "flagged", "all").map((r) => r.disputeId)).toEqual([
      "valid-closed",
      "invalid",
    ]);
  });

  it("DSP4 status filter is independent of the flag filter", () => {
    expect(
      filterEscalatedDisputes(rows, "all", "resolved_valid").map((r) => r.disputeId),
    ).toEqual(["valid-closed", "valid-open"]);
    expect(
      filterEscalatedDisputes(rows, "flagged", "resolved_valid").map((r) => r.disputeId),
    ).toEqual(["valid-closed"]);
    expect(
      filterEscalatedDisputes(rows, "unflagged", "resolved_valid").map((r) => r.disputeId),
    ).toEqual(["valid-open"]);
  });
});
