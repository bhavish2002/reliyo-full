import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

import TaskTimeline from "@/components/TaskTimeline";
import type { Task, TimelineEntry } from "@/lib/taskTypes";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/adminData", () => ({
  saveForceCloseRequest: vi.fn(),
}));

const baseTask: Task = {
  id: "task-1",
  taskId: "RLY-TSK-TEST-1",
  title: "Test task",
  description: "Test description",
  status: "done",
  workType: "Virtual",
  manpower: 1,
  location: "Remote",
  deadline: "2026-04-10",
  updateFrequency: "Daily",
  skills: ["testing"],
  domain: "QA",
  reward: 500,
  createdAt: "2026-03-30T09:00:00Z",
  createdBy: "Requestor User",
  acceptedBy: "Acceptor User",
  disputeCount: 0,
  statusEnteredAt: "2026-04-01T10:00:00Z",
};

const disputeEntry = (timestamp: string): TimelineEntry => ({
  id: "entry-dispute",
  taskId: "task-1",
  author: "System",
  authorRole: "system",
  message: "Dispute raised by Requestor.",
  timestamp,
  systemGenerated: true,
  entryType: "status_change",
  metadata: { fromStatus: "done", toStatus: "disputed", disputeCount: 1 },
});

const renderTimeline = (task: Task, entries: TimelineEntry[] = []) =>
  render(
    <TaskTimeline
      task={task}
      currentUserRole="requestor"
      currentUserName="Requestor User"
      entries={entries}
      onAddEntry={vi.fn()}
      onStatusChange={vi.fn()}
    />,
  );

const disputeButton = () =>
  screen.getByRole("button", { name: /raise dispute/i });

describe("TaskTimeline dispute cooldown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("lets the requestor raise DSP1 immediately with no cooldown", () => {
    vi.setSystemTime(new Date("2026-04-01T10:00:01Z"));

    renderTimeline(baseTask);

    expect(disputeButton()).not.toHaveAttribute("aria-disabled", "true");
    expect(disputeButton()).toHaveAttribute(
      "title",
      "Dispute #1 of 4 available now — no cooldown applies to the first dispute.",
    );
  });

  it("stays visible and greyed out after DSP1, showing remaining 48h on hover", () => {
    vi.setSystemTime(new Date("2026-04-02T10:00:00Z")); // 24h after raise

    renderTimeline(
      {
        ...baseTask,
        status: "disputed",
        disputeCount: 1,
        statusEnteredAt: "2026-04-01T10:00:00Z",
      },
      [disputeEntry("2026-04-01T10:00:00Z")],
    );

    expect(disputeButton()).toBeInTheDocument();
    expect(disputeButton()).toHaveAttribute("aria-disabled", "true");
    expect(disputeButton()).toHaveAttribute(
      "title",
      "Next dispute available in 24h 0m (48h cooldown before dispute #2).",
    );
    expect(screen.getByRole("tooltip")).toHaveTextContent(
      "Next dispute available in 24h 0m (48h cooldown before dispute #2).",
    );
  });

  it("re-enables DSP2 after 48 hours while still disputed", () => {
    vi.setSystemTime(new Date("2026-04-03T10:01:00Z"));

    renderTimeline(
      {
        ...baseTask,
        status: "disputed",
        disputeCount: 1,
        statusEnteredAt: "2026-04-01T10:00:00Z",
      },
      [disputeEntry("2026-04-01T10:00:00Z")],
    );

    expect(disputeButton()).not.toHaveAttribute("aria-disabled", "true");
  });

  it("resets the cooldown when the acceptor marks the task done again", () => {
    vi.setSystemTime(new Date("2026-04-01T11:00:00Z")); // 1h after dispute

    renderTimeline(
      {
        ...baseTask,
        status: "done",
        disputeCount: 1,
        statusEnteredAt: "2026-04-01T10:30:00Z",
      },
      [
        disputeEntry("2026-04-01T10:00:00Z"),
        {
          id: "entry-done",
          taskId: "task-1",
          author: "System",
          authorRole: "system",
          message: "Acceptor User has submitted a fix and moved the task back to Done.",
          timestamp: "2026-04-01T10:30:00Z",
          systemGenerated: true,
          entryType: "status_change",
          metadata: { fromStatus: "disputed", toStatus: "done" },
        },
      ],
    );

    expect(disputeButton()).not.toHaveAttribute("aria-disabled", "true");
    expect(disputeButton()).toHaveAttribute(
      "title",
      "Dispute #2 of 4 available now — cooldown reset when work returned to Done.",
    );
  });

  it("uses 24h then 12h for DSP3 and DSP4 while still disputed", () => {
    vi.setSystemTime(new Date("2026-04-05T11:00:00Z"));

    const { unmount } = renderTimeline(
      {
        ...baseTask,
        status: "disputed",
        disputeCount: 2,
        statusEnteredAt: "2026-04-05T10:00:00Z",
      },
      [disputeEntry("2026-04-05T10:00:00Z")],
    );
    expect(disputeButton()).toHaveAttribute(
      "title",
      "Next dispute available in 23h 0m (24h cooldown before dispute #3).",
    );
    unmount();

    renderTimeline(
      {
        ...baseTask,
        status: "disputed",
        disputeCount: 3,
        statusEnteredAt: "2026-04-05T10:00:00Z",
      },
      [disputeEntry("2026-04-05T10:00:00Z")],
    );
    expect(disputeButton()).toHaveAttribute(
      "title",
      "Next dispute available in 11h 0m (12h cooldown before dispute #4).",
    );
  });

  it("hides the action once DSP4 is reached", () => {
    vi.setSystemTime(new Date("2026-04-10T10:00:00Z"));

    renderTimeline({
      ...baseTask,
      status: "disputed",
      disputeCount: 4,
    });

    expect(
      screen.queryByRole("button", { name: /raise dispute/i }),
    ).not.toBeInTheDocument();
  });
});
