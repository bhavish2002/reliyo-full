import { describe, expect, it } from "vitest";
import type { UserTransaction } from "@/lib/payments/api";
import { buildTaskFundTimeline } from "@/lib/payments/transactionTimeline";

function tx(partial: Partial<UserTransaction>): UserTransaction {
  return {
    id: "h1",
    kind: "fund_hold",
    purpose: "task_reward",
    role: "requestor",
    amount: 1000,
    currency: "INR",
    status: "confirmed",
    provider: "razorpay",
    taskId: "t1",
    taskStatus: "open",
    createdAt: "2026-09-24T10:00:00.000Z",
    confirmedAt: "2026-09-24T10:01:00.000Z",
    ...partial,
  };
}

function titles(status: ReturnType<typeof buildTaskFundTimeline>) {
  return status?.stages.map((s) => ({ title: s.title, state: s.state })) ?? [];
}

describe("buildTaskFundTimeline", () => {
  it("keeps a requestor deposit in progress until payment succeeds", () => {
    const timeline = buildTaskFundTimeline("t1", [
      tx({ status: "pending", confirmedAt: undefined, taskStatus: undefined }),
    ]);
    expect(timeline?.headline).toBe("Reward Deposit Initiated");
    expect(timeline?.noFurtherSettlements).toBe(false);
    expect(titles(timeline)[0]).toMatchObject({ title: "Reward Deposit Initiated", state: "current" });
    expect(titles(timeline)[1]).toMatchObject({ title: "Reward Deposit Successful", state: "upcoming" });
  });

  it("marks the reward deposit successful once the task is open", () => {
    const timeline = buildTaskFundTimeline("t1", [tx({ taskStatus: "open" })]);
    expect(timeline?.headline).toBe("Reward Deposit Successful");
    expect(timeline?.noFurtherSettlements).toBe(false);
    expect(titles(timeline).every((s) => s.state === "completed")).toBe(true);
    expect(timeline?.stages[1].description).toContain("Open");
  });

  it("does not show No Further Settlements when a deleted task refund is still processing", () => {
    const timeline = buildTaskFundTimeline("t1", [tx({ taskStatus: "deleted", taskCancelled: true })]);
    expect(titles(timeline).map((s) => s.title)).toEqual([
      "Reward Deposit Initiated",
      "Reward Deposit Successful",
      "Refund Initiated",
      "Refund Successful",
    ]);
    expect(titles(timeline)[2].state).toBe("current");
    expect(titles(timeline)[3].state).toBe("upcoming");
    expect(timeline?.noFurtherSettlements).toBe(false);
  });

  it("shows No Further Settlements after a deleted reward refund is recorded", () => {
    const timeline = buildTaskFundTimeline("t1", [
      tx({
        taskStatus: "deleted",
        taskCancelled: true,
        settlementScenario: "cancel_open",
        settlementAt: "2026-09-24T12:00:00.000Z",
      }),
    ]);
    expect(timeline?.noFurtherSettlements).toBe(true);
    expect(timeline?.headline).toBe("No Further Settlements");
    expect(titles(timeline).every((s) => s.state === "completed")).toBe(true);
    expect(timeline?.stages[2].description).toContain("full refund");
  });

  it("describes a force-close refund as the full reward plus 70% of the trust penalty", () => {
    const timeline = buildTaskFundTimeline("t1", [
      tx({
        taskStatus: "force_closed",
        settlementScenario: "force_closed",
        settlementAt: "2026-09-24T12:00:00.000Z",
      }),
    ]);
    expect(timeline?.noFurtherSettlements).toBe(true);
    expect(timeline?.stages[2].description).toContain("70% of the acceptor's trust-deposit penalty");
    expect(titles(timeline)[3]).toMatchObject({ title: "Refund Successful", state: "completed" });
  });

  it("holds the force-close banner until the settlement journal exists", () => {
    const timeline = buildTaskFundTimeline("t1", [tx({ taskStatus: "force_closed" })]);
    expect(timeline?.headline).toBe("Refund Initiated");
    expect(timeline?.noFurtherSettlements).toBe(false);
  });

  it("shows a closed requestor release only after settlement, then no further settlements", () => {
    const pending = buildTaskFundTimeline("t1", [tx({ taskStatus: "closed" })]);
    expect(pending?.noFurtherSettlements).toBe(false);
    expect(pending?.headline).toBe("Reward Release Initiated");

    const done = buildTaskFundTimeline("t1", [
      tx({ taskStatus: "closed", settlementScenario: "closed", settlementAt: "2026-09-24T12:00:00.000Z" }),
    ]);
    expect(done?.noFurtherSettlements).toBe(true);
    expect(titles(done).map((s) => s.title)).toContain("Reward Release Successful");
  });

  it("moves the acceptor to committed only after the trust deposit succeeds", () => {
    const timeline = buildTaskFundTimeline("t1", [
      tx({
        purpose: "trust_deposit",
        role: "acceptor",
        amount: 100,
        taskStatus: "committed",
      }),
    ]);
    expect(timeline?.headline).toBe("Trust Deposit Successful");
    expect(timeline?.noFurtherSettlements).toBe(false);
    expect(timeline?.stages[1].description).toContain("Committed");
  });

  it("refunds the full trust deposit on an early quit and does not end the task", () => {
    const timeline = buildTaskFundTimeline("t1", [
      tx({
        purpose: "trust_deposit",
        role: "acceptor",
        amount: 100,
        taskStatus: "open",
        settlementScenario: "quit_trust_refund",
        settlementAt: "2026-09-24T11:00:00.000Z",
      }),
    ]);
    expect(titles(timeline).map((s) => s.title)).toEqual([
      "Trust Deposit Initiated",
      "Trust Deposit Successful",
      "Refund Initiated",
      "Refund Successful",
    ]);
    expect(titles(timeline).every((s) => s.state === "completed")).toBe(true);
    expect(timeline?.noFurtherSettlements).toBe(false);
    expect(timeline?.stages[2].description).toContain("full refund");
  });

  it("starts acceptor reward payout when the task closes and finishes only after settlement", () => {
    const pending = buildTaskFundTimeline("t1", [
      tx({ purpose: "trust_deposit", role: "acceptor", amount: 100, taskStatus: "closed" }),
    ]);
    expect(pending?.headline).toBe("Reward Payout Initiated");
    expect(pending?.noFurtherSettlements).toBe(false);

    const done = buildTaskFundTimeline("t1", [
      tx({
        purpose: "trust_deposit",
        role: "acceptor",
        amount: 100,
        taskStatus: "closed",
        settlementScenario: "closed",
        settlementAt: "2026-09-24T12:00:00.000Z",
      }),
    ]);
    expect(done?.headline).toBe("No Further Settlements");
    expect(done?.noFurtherSettlements).toBe(true);
    expect(titles(done)[2]).toMatchObject({ title: "Reward Payout Initiated", state: "completed" });
    expect(titles(done)[3]).toMatchObject({ title: "Reward Payout Successful", state: "completed" });
  });
});
