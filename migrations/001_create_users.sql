-- +goose Up

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id TEXT NOT NULL UNIQUE,
    fingerprint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_device_id ON users(device_id);
CREATE INDEX idx_users_fingerprint ON users(fingerprint);

-- +goose Down
DROP INDEX IF EXISTS idx_users_fingerprint;
DROP INDEX IF EXISTS idx_users_device_id;
DROP TABLE IF EXISTS users;
