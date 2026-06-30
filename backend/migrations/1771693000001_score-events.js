/**
 * Audit log for credit score repayment updates.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.createTable("score_events", {
        id: "id",
        user_id: { type: "varchar(255)", notNull: true },
        old_score: { type: "integer", notNull: true },
        delta: { type: "integer", notNull: true },
        new_score: { type: "integer", notNull: true },
        repayment_amount: { type: "numeric", notNull: true },
        on_time: { type: "boolean", notNull: true },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
    });

    pgm.createIndex("score_events", "user_id");
    pgm.createIndex("score_events", "created_at");
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable("score_events");
};
