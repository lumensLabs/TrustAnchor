/*
  Migration: create scores and score_events tables.
  Run this file via the migration runner (if any) or manually with psql.
*/

CREATE TABLE IF NOT EXISTS scores (
  user_id TEXT PRIMARY KEY,
  current_score INTEGER NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS score_events (
  id SERIAL PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES scores(user_id) ON DELETE CASCADE,
  old_score INTEGER NOT NULL,
  delta INTEGER NOT NULL,
  new_score INTEGER NOT NULL,
  repayment_amount NUMERIC NOT NULL,
  on_time BOOLEAN NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);
