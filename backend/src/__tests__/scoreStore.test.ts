import { InMemoryScoreStore } from "../lib/scoreStore.js";

describe("InMemoryScoreStore", () => {
  it("falls back to null when a user has no recorded score", async () => {
    const store = new InMemoryScoreStore();

    await expect(store.getScore("new-user")).resolves.toBeNull();
  });

  it("records repayment audit fields and stores the new score", async () => {
    const store = new InMemoryScoreStore();

    const audit = await store.recordRepayment({
      userId: "alice",
      repaymentAmount: 500,
      onTime: true,
      delta: 15,
      initialScore: 700,
    });

    expect(audit).toMatchObject({
      oldScore: 700,
      delta: 15,
      newScore: 715,
      repaymentAmount: 500,
      onTime: true,
    });
    expect(typeof audit.timestamp).toBe("string");
    await expect(store.getScore("alice")).resolves.toMatchObject({
      userId: "alice",
      score: 715,
    });
  });

  it("serializes concurrent updates so both deltas are applied", async () => {
    const store = new InMemoryScoreStore();

    await Promise.all([
      store.recordRepayment({
        userId: "same-user",
        repaymentAmount: 100,
        onTime: true,
        delta: 15,
        initialScore: 600,
      }),
      store.recordRepayment({
        userId: "same-user",
        repaymentAmount: 200,
        onTime: true,
        delta: 15,
        initialScore: 600,
      }),
    ]);

    await expect(store.getScore("same-user")).resolves.toMatchObject({
      score: 630,
    });
  });
});
