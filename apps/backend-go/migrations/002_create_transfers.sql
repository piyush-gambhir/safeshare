-- +goose Up
CREATE TABLE transfers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    size BIGINT NOT NULL,
    content_type TEXT NOT NULL,
    encrypted_metadata BYTEA,
    access_token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    downloaded BOOLEAN NOT NULL DEFAULT FALSE,
    download_count INT NOT NULL DEFAULT 0
);

CREATE INDEX idx_transfers_user_id ON transfers(user_id);
CREATE INDEX idx_transfers_access_token ON transfers(access_token);
CREATE INDEX idx_transfers_expires_at ON transfers(expires_at);

-- +goose Down
DROP INDEX IF EXISTS idx_transfers_expires_at;
DROP INDEX IF EXISTS idx_transfers_access_token;
DROP INDEX IF EXISTS idx_transfers_user_id;
DROP TABLE IF EXISTS transfers;
