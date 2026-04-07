import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import TaskTimeline from "@/components/TaskTimeline";
import type { Task, TimelineEntry } from "@/lib/taskTypes";

vi.mock("@/hooks/use-toast", () => ({
  toast: vi.fn(),
}));

vi.mock("@/lib/notifications", () => ({
  notifyAlertRaised: vi.fn(),
  notifyForceCloseRequested: vi.fn(),
  notifyTaskMarkedDone: vi.fn(),
  notifyDisputeRaised: vi.fn(),
  notifyFixResubmitted: vi.fn(),
  notifyRatingRequired: vi.fn(),
  notifyTaskClosed: vi.fn(),
}));

vi.mock("@/lib/adminData", () => ({
  saveForceCloseRequest: vi.fn(),
}));

const baseTask: Task = {
  id: "task-1",
  taskId: "RLY-TSK-TEST-1",
  title: "Test task",
  description: "Test description",
  status: "disputed",
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
  disputeCount: 1,
  disputes: [
    {
      id: "RLY-DSP1",
      number: 1,
      escalated: false,
      createdAt: "2026-04-01T10:00:00Z",
    },
  ],
};

const renderTimeline = (task: Task, entries: TimelineEntry[]) =>
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

describe("TaskTimeline dispute cooldown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps Raise Dispute visible during cooldown and shows remaining time", () => {
    vi.setSystemTime(new Date("2026-04-02T10:00:00Z"));

    const entries: TimelineEntry[] = [
      {
        id: "entry-1",
        taskId: "task-1",
        author: "System",
        authorRole: "system",
        message: "Dispute raised by Requestor.",
        timestamp: "2026-04-01T10:00:00Z",
        systemGenerated: true,
        entryType: "status_change",
        metadata: { fromStatus: "done", toStatus: "disputed", disputeCount: 1 },
      },
    ];

    renderTimeline(baseTask, entries);

    const disputeButton = screen.getByRole("button", { name: /raise dispute/i });
    expect(disputeButton).toBeInTheDocument();
    expect(disputeButton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Next dispute available in 24h 0m.")).toBeInTheDocument();
  });

  it("re-enables dispute after 48 hours", () => {
    vi.setSystemTime(new Date("2026-04-03T10:01:00Z"));

    const entries: TimelineEntry[] = [
      {
        id: "entry-1",
        taskId: "task-1",
        author: "System",
        authorRole: "system",
        message: "Dispute raised by Requestor.",
        timestamp: "2026-04-01T10:00:00Z",
        systemGenerated: true,
        entryType: "status_change",
        metadata: { fromStatus: "done", toStatus: "disputed", disputeCount: 1 },
      },
    ];

    renderTimeline(baseTask, entries);

    const disputeButton = screen.getByRole("button", { name: /raise dispute/i });
    expect(disputeButton).not.toHaveAttribute("aria-disabled", "true");
  });

  it("resets cooldown when acceptor moves task back to done", () => {
    vi.setSystemTime(new Date("2026-04-01T11:00:00Z")); // only 1h after dispute

    const doneTask: Task = {
      ...baseTask,
      status: "done",
      statusEnteredAt: "2026-04-01T10:30:00Z",
    };

    const entries: TimelineEntry[] = [
      {
        id: "entry-1",
        taskId: "task-1",
        author: "System",
        authorRole: "system",
        message: "Dispute raised by Requestor.",
        timestamp: "2026-04-01T10:00:00Z",
        systemGenerated: true,
        entryType: "status_change",
        metadata: { fromStatus: "done", toStatus: "disputed", disputeCount: 1 },
      },
      {
        id: "entry-2",
        taskId: "task-1",
        author: "Acceptor User",
        authorRole: "acceptor",
        message: "Fixed the issue",
        timestamp: "2026-04-01T10:30:00Z",
        systemGenerated: false,
        entryType: "comment",
      },
      {
        id: "entry-3",
        taskId: "task-1",
        author: "System",
        authorRole: "system",
        message: "Acceptor User has submitted a fix and moved the task back to Done.",
        timestamp: "2026-04-01T10:30:00Z",
        systemGenerated: true,
        entryType: "status_change",
        metadata: { fromStatus: "disputed", toStatus: "done" },
      },
    ];

    renderTimeline(doneTask, entries);

    const disputeButton = screen.getByRole("button", { name: /raise dispute/i });
    // Should be active immediately since acceptor moved back to done
    expect(disputeButton).not.toHaveAttribute("aria-disabled", "true");
  });
});
