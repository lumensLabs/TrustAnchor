/**
 * Schema consolidation migration: canonical identity table, referential integrity,
 * and safe migration reversibility.
 *
 * Design decision: `user_profiles` is the canonical identity table because:
 *  - It holds wallet_address for on-chain linking
 *  - It has KYC fields required by the platform
 *  - `schema.types.ts` already mirrors it as `UserProfileRow`
 *  - `loan_histories` already references it (though with an unsafe SET NULL)
 *
 * The redundant `users` table (email/password_hash only, no KYC/wallet) is dropped.
 * Financial rows can no longer be orphaned: ON DELETE RESTRICT replaces SET NULL.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    // ── 1. scores.user_id → uuid FK to user_profiles(id) ────────────────
    // Drop any unique constraint on user_id (PostgreSQL may name it
    // scores_user_id_unique or scores_user_id_key depending on version).
    pgm.sql(
        `DO $$ DECLARE c text; BEGIN
            SELECT con.conname INTO c FROM pg_constraint con
            JOIN pg_class rel ON rel.oid = con.conrelid
            WHERE rel.relname = 'scores' AND con.contype IN ('u','p')
            AND con.conkey @> (SELECT array_agg(attnum) FROM pg_attribute
                WHERE attrelid = rel.oid AND attname = 'user_id');
            IF FOUND THEN EXECUTE 'ALTER TABLE scores DROP CONSTRAINT ' || c; END IF;
        END $$`,
    );

    // Convert varchar to uuid. Existing rows get NULL — a separate data
    // migration script is needed if there is existing production data.
    pgm.sql(
        `ALTER TABLE scores ALTER COLUMN user_id TYPE uuid USING NULL`,
    );

    pgm.addConstraint("scores", "scores_user_id_fkey", {
        foreignKeys: {
            columns: "user_id",
            references: "user_profiles(id)",
            onDelete: "RESTRICT",
        },
    });

    // ── 2. remittance_history.user_id → uuid FK to user_profiles(id) ───
    pgm.sql(
        `ALTER TABLE remittance_history ALTER COLUMN user_id TYPE uuid USING NULL`,
    );

    pgm.addConstraint("remittance_history", "remittance_history_user_id_fkey", {
        foreignKeys: {
            columns: "user_id",
            references: "user_profiles(id)",
            onDelete: "RESTRICT",
        },
    });

    // ── 3. loan_histories: replace SET NULL with RESTRICT ────────────────
    // A loan must always have an owner; SET NULL silently orphans them.
    pgm.dropConstraint("loan_histories", "loan_histories_user_id_fkey");

    pgm.addConstraint("loan_histories", "loan_histories_user_id_fkey", {
        foreignKeys: {
            columns: "user_id",
            references: "user_profiles(id)",
            onDelete: "RESTRICT",
        },
    });

    // ── 4. Drop redundant users table ──────────────────────────────────
    pgm.dropTable("users", { ifExists: true });
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    // ── 1. Recreate users table ────────────────────────────────────────
    pgm.createTable("users", {
        id: "id",
        email: { type: "varchar(255)", notNull: true, unique: true },
        password_hash: { type: "varchar(255)", notNull: true },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
    });
    pgm.createIndex("users", "email");

    // ── 2. loan_histories: revert to SET NULL ──────────────────────────
    pgm.dropConstraint("loan_histories", "loan_histories_user_id_fkey");

    pgm.addConstraint("loan_histories", "loan_histories_user_id_fkey", {
        foreignKeys: {
            columns: "user_id",
            references: "user_profiles(id)",
            onDelete: "SET NULL",
        },
    });

    // ── 3. remittance_history: revert to varchar ───────────────────────
    pgm.dropConstraint("remittance_history", "remittance_history_user_id_fkey");
    pgm.sql(
        `ALTER TABLE remittance_history ALTER COLUMN user_id TYPE varchar(255) USING NULL`,
    );

    // ── 4. scores: revert to varchar ──────────────────────────────────
    pgm.dropConstraint("scores", "scores_user_id_fkey");
    pgm.sql(
        `ALTER TABLE scores ALTER COLUMN user_id TYPE varchar(255) USING NULL`,
    );
    pgm.addConstraint("scores", "scores_user_id_unique", {
        unique: "user_id",
    });
};
