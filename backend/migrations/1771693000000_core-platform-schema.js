/**
 * Core platform tables for users, loan histories, and cached contract events.
 *
 * @type {import('node-pg-migrate').ColumnDefinitions | undefined}
 */
export const shorthands = undefined;

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const up = (pgm) => {
    pgm.createExtension("pgcrypto", { ifNotExists: true });

    pgm.createTable("user_profiles", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },
        email: { type: "varchar(255)", notNull: true, unique: true },
        wallet_address: { type: "varchar(56)", unique: true },
        first_name: { type: "varchar(100)", notNull: true },
        last_name: { type: "varchar(100)", notNull: true },
        date_of_birth: { type: "date", notNull: true },
        country: { type: "varchar(2)", notNull: true },
        phone_number: { type: "varchar(20)" },
        national_id: { type: "varchar(50)" },
        kyc_verified: { type: "boolean", notNull: true, default: false },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
        updated_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
    });

    pgm.createIndex("user_profiles", "email");
    pgm.createIndex("user_profiles", "wallet_address", {
        where: "wallet_address IS NOT NULL",
    });

    pgm.createTable("loan_histories", {
        id: {
            type: "uuid",
            primaryKey: true,
            default: pgm.func("gen_random_uuid()"),
        },
        user_id: {
            type: "uuid",
            references: "user_profiles(id)",
            onDelete: "SET NULL",
        },
        borrower_wallet: { type: "varchar(56)", notNull: true },
        on_chain_loan_id: { type: "bigint", unique: true },
        amount: { type: "numeric", notNull: true },
        currency: { type: "varchar(3)", notNull: true, default: "USD" },
        interest_rate_bps: { type: "integer", notNull: true },
        term_days: { type: "integer", notNull: true },
        outstanding: { type: "numeric", notNull: true },
        status: { type: "varchar(20)", notNull: true },
        contract_address: { type: "varchar(56)" },
        nft_score_at_request: { type: "integer" },
        due_at: { type: "timestamp" },
        created_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
        updated_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
    });

    pgm.addConstraint("loan_histories", "loan_histories_status_check", {
        check: "status IN ('pending', 'active', 'repaid', 'defaulted')",
    });

    pgm.createIndex("loan_histories", "user_id");
    pgm.createIndex("loan_histories", "borrower_wallet");
    pgm.createIndex("loan_histories", "status");
    pgm.createIndex("loan_histories", "on_chain_loan_id", {
        where: "on_chain_loan_id IS NOT NULL",
    });

    pgm.createTable("contract_events", {
        id: "id",
        contract_name: { type: "varchar(50)", notNull: true },
        contract_address: { type: "varchar(56)", notNull: true },
        event_name: { type: "varchar(100)", notNull: true },
        tx_hash: { type: "varchar(64)" },
        ledger_sequence: { type: "bigint" },
        topics: { type: "jsonb", notNull: true, default: "{}" },
        payload: { type: "jsonb", notNull: true, default: "{}" },
        occurred_at: { type: "timestamp", notNull: true },
        indexed_at: {
            type: "timestamp",
            notNull: true,
            default: pgm.func("current_timestamp"),
        },
    });

    pgm.addConstraint("contract_events", "contract_events_dedupe_key", {
        unique: ["contract_address", "event_name", "tx_hash", "ledger_sequence"],
    });

    pgm.createIndex("contract_events", "contract_name");
    pgm.createIndex("contract_events", "event_name");
    pgm.createIndex("contract_events", "occurred_at");
    pgm.createIndex("contract_events", ["contract_address", "event_name"]);
};

/**
 * @param pgm {import('node-pg-migrate').MigrationBuilder}
 * @returns {Promise<void> | void}
 */
export const down = (pgm) => {
    pgm.dropTable("contract_events");
    pgm.dropTable("loan_histories");
    pgm.dropTable("user_profiles");
    pgm.dropExtension("pgcrypto", { ifExists: true });
};
