import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import TaskTimeline from "@/components/TaskTimeline";
import type { Task, TimelineEntry } from "@/lib/taskTypes";

const mockedToast = vi.fn();

vi.mock("@/hooks/use-toast", () => ({
  toast: mockedToast,
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

const createEntries = (lastDisputeAt: string): TimelineEntry[] => [
  {
    id: "entry-1",
    taskId: "task-1",
    author: "System",
    authorRole: "system",
    message: "Dispute raised by Requestor.",
    timestamp: lastDisputeAt,
    systemGenerated: true,
    entryType: "status_change",
    metadata: { fromStatus: "done", toStatus: "disputed", disputeCount: 1 },
  },
];

const renderTimeline = (lastDisputeAt: string) =>
  render(
    <TaskTimeline
      task={baseTask}
      currentUserRole="requestor"
      currentUserName="Requestor User"
      entries={createEntries(lastDisputeAt)}
      onAddEntry={vi.fn()}
      onStatusChange={vi.fn()}
    />,
  );

describe("TaskTimeline dispute cooldown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    mockedToast.mockReset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("keeps Raise Dispute visible during cooldown and shows remaining time on click", () => {
    vi.setSystemTime(new Date("2026-04-02T10:00:00Z"));

    renderTimeline("2026-04-01T10:00:00Z");

    const disputeButton = screen.getByRole("button", { name: /raise dispute/i });

    expect(disputeButton).toBeInTheDocument();
    expect(disputeButton).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Next dispute available in 24h 0m.")).toBeInTheDocument();

    fireEvent.click(disputeButton);

    expect(mockedToast).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Dispute cooldown active",
        description: "You can raise the next dispute in 24h 0m.",
      }),
    );
  });

  it("re-enables dispute escalation after 48 hours while task remains disputed", () => {
    vi.setSystemTime(new Date("2026-04-03T10:01:00Z"));

    renderTimeline("2026-04-01T10:00:00Z");

    const disputeButton = screen.getByRole("button", { name: /raise dispute/i });

    expect(disputeButton).not.toHaveAttribute("aria-disabled", "true");

    fireEvent.click(disputeButton);

    expect(mockedToast).not.toHaveBeenCalled();
    expect(screen.getByText(/this will escalate to dispute #2\/4/i)).toBeInTheDocument();
  });
});