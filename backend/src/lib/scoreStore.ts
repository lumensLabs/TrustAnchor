import type { PoolClient } from "pg";
import { pool } from "../config/db.js";

export type ScoreAuditFields = {
  oldScore: number;
  delta: number;
  newScore: number;
  repaymentAmount: number;
  onTime: boolean;
  timestamp: string;
};

export type StoredScore = {
  userId: string;
  score: number;
  updatedAt?: string;
};

export type RecordRepaymentInput = {
  userId: string;
  repaymentAmount: number;
  onTime: boolean;
  delta: number;
  initialScore: number;
};

export interface ScoreStore {
  getScore(userId: string): Promise<StoredScore | null>;
  /**
   * Applies repayment deltas against the latest stored score for the user.
   * Concurrent calls for the same user are serialized so every delta is applied;
   * if audit timestamps tie, consumers should treat the final score as
   * last-write-wins metadata over an accumulated score.
   */
  recordRepayment(input: RecordRepaymentInput): Promise<ScoreAuditFields>;
}

function clampScore(score: number): number {
  return Math.min(850, Math.max(300, score));
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return new Date(value).toISOString();
  return new Date().toISOString();
}

export class PostgresScoreStore implements ScoreStore {
  async getScore(userId: string): Promise<StoredScore | null> {
    const { rows } = await pool.query(
      "SELECT current_score, updated_at FROM scores WHERE user_id = $1",
      [userId],
    );

    if (rows.length === 0) return null;

    const storedScore: StoredScore = {
      userId,
      score: Number(rows[0].current_score),
    };
    if (rows[0].updated_at) {
      storedScore.updatedAt = toIsoString(rows[0].updated_at);
    }

    return storedScore;
  }

  async recordRepayment(
    input: RecordRepaymentInput,
  ): Promise<ScoreAuditFields> {
    const client = await pool.connect();

    try {
      await client.query("BEGIN");

      // Seed first so concurrent first-time updates serialize on one row.
      await client.query(
        `INSERT INTO scores (user_id, current_score, updated_at)
         VALUES ($1, $2, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [input.userId, input.initialScore],
      );

      const { rows } = await client.query(
        "SELECT current_score FROM scores WHERE user_id = $1 FOR UPDATE",
        [input.userId],
      );
      const oldScore = Number(rows[0].current_score);
      const newScore = clampScore(oldScore + input.delta);

      const updatedAt = await this.updateScoreRow(client, input.userId, newScore);
      await client.query(
        `INSERT INTO score_events
           (user_id, old_score, delta, new_score, repayment_amount, on_time, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          input.userId,
          oldScore,
          input.delta,
          newScore,
          input.repaymentAmount,
          input.onTime,
          updatedAt,
        ],
      );

      await client.query("COMMIT");

      return {
        oldScore,
        delta: input.delta,
        newScore,
        repaymentAmount: input.repaymentAmount,
        onTime: input.onTime,
        timestamp: toIsoString(updatedAt),
      };
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }

  private async updateScoreRow(
    client: PoolClient,
    userId: string,
    newScore: number,
  ): Promise<unknown> {
    const { rows } = await client.query(
      `UPDATE scores
       SET current_score = $2, updated_at = NOW()
       WHERE user_id = $1
       RETURNING updated_at`,
      [userId, newScore],
    );

    return rows[0].updated_at;
  }
}

export class InMemoryScoreStore implements ScoreStore {
  private scores = new Map<string, StoredScore>();
  private audits: Array<ScoreAuditFields & { userId: string }> = [];
  private locks = new Map<string, Promise<void>>();

  async getScore(userId: string): Promise<StoredScore | null> {
    return this.scores.get(userId) ?? null;
  }

  async recordRepayment(
    input: RecordRepaymentInput,
  ): Promise<ScoreAuditFields> {
    return this.withUserLock(input.userId, async () => {
      const current = this.scores.get(input.userId);
      const oldScore = current?.score ?? input.initialScore;
      const newScore = clampScore(oldScore + input.delta);
      const timestamp = new Date().toISOString();
      const audit = {
        oldScore,
        delta: input.delta,
        newScore,
        repaymentAmount: input.repaymentAmount,
        onTime: input.onTime,
        timestamp,
      };

      this.scores.set(input.userId, {
        userId: input.userId,
        score: newScore,
        updatedAt: timestamp,
      });
      this.audits.push({ userId: input.userId, ...audit });

      return audit;
    });
  }

  clear(): void {
    this.scores.clear();
    this.audits = [];
    this.locks.clear();
  }

  private async withUserLock<T>(
    userId: string,
    operation: () => Promise<T>,
  ): Promise<T> {
    const previous = this.locks.get(userId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => {
      release = resolve;
    });

    const next = previous.then(() => current);
    this.locks.set(userId, next);
    await previous;

    try {
      return await operation();
    } finally {
      release();
      if (this.locks.get(userId) === next) {
        this.locks.delete(userId);
      }
    }
  }
}

export const scoreStore: ScoreStore =
  process.env.NODE_ENV === "test"
    ? new InMemoryScoreStore()
    : new PostgresScoreStore();
