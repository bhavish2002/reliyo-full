import { describe, expect, it } from "vitest";
import {
  filterAcceptedByUser,
  filterBrowseTasksForUser,
  filterCreatedByUser,
} from "@/lib/tasks/listFilters";
import type { Task } from "@/lib/taskTypes";

const base = (overrides: Partial<Task>): Task => ({
  id: "t1",
  taskId: "RLY-1",
  title: "Test",
  description: "",
  status: "open",
  workType: "Virtual",
  manpower: 1,
  location: "Mumbai",
  deadline: "2026-12-31",
  updateFrequency: "Daily",
  skills: [],
  domain: "Technology",
  reward: 100,
  createdAt: "2026-01-01",
  createdBy: "A",
  ...overrides,
});

describe("listFilters", () => {
  it("filterCreatedByUser uses createdById only", () => {
    const tasks = [
      base({ id: "a", createdById: "u1", createdBy: "Wrong Name" }),
      base({ id: "b", createdById: "u2" }),
    ];
    expect(filterCreatedByUser(tasks, "u1").map((t) => t.id)).toEqual(["a"]);
  });

  it("filterAcceptedByUser uses acceptedById only", () => {
    const tasks = [
      base({ id: "a", acceptedById: "u2", acceptedBy: "Someone" }),
      base({ id: "b", acceptedById: "u1" }),
    ];
    expect(filterAcceptedByUser(tasks, "u2").map((t) => t.id)).toEqual(["a"]);
  });

  it("filterBrowseTasksForUser excludes own open tasks", () => {
    const tasks = [
      base({ id: "a", createdById: "u1", status: "open" }),
      base({ id: "b", createdById: "u2", status: "open" }),
      base({ id: "c", createdById: "u2", status: "committed" }),
    ];
    expect(filterBrowseTasksForUser(tasks, "u1").map((t) => t.id)).toEqual(["b"]);
  });
});
