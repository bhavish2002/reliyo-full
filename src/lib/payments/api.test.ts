import { describe, expect, it, vi, beforeEach } from "vitest";
import { pollFundHoldUntilSettled } from "@/lib/payments/api";

vi.mock("@/lib/api/client", () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
}));

import { apiClient } from "@/lib/api/client";

describe("pollFundHoldUntilSettled", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns immediately when hold is confirmed", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      id: "hold_1",
      status: "confirmed",
      purpose: "task_reward",
      amount: 1000,
      currency: "INR",
      createdAt: new Date().toISOString(),
    });

    const hold = await pollFundHoldUntilSettled("hold_1", {
      maxAttempts: 3,
      intervalMs: 1,
    });
    expect(hold.status).toBe("confirmed");
    expect(apiClient.get).toHaveBeenCalledTimes(1);
  });

  it("polls until confirmed", async () => {
    vi.mocked(apiClient.get)
      .mockResolvedValueOnce({
        id: "hold_1",
        status: "pending",
        purpose: "task_reward",
        amount: 1000,
        currency: "INR",
        createdAt: new Date().toISOString(),
      })
      .mockResolvedValueOnce({
        id: "hold_1",
        status: "confirmed",
        purpose: "task_reward",
        amount: 1000,
        currency: "INR",
        createdAt: new Date().toISOString(),
      });

    const hold = await pollFundHoldUntilSettled("hold_1", {
      maxAttempts: 5,
      intervalMs: 1,
    });
    expect(hold.status).toBe("confirmed");
    expect(apiClient.get).toHaveBeenCalledTimes(2);
  });
});
