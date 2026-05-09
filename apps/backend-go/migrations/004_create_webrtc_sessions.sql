-- +goose Up
CREATE TABLE webrtc_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
    initiator_id UUID NOT NULL REFERENCES users(id),
    receiver_id UUID REFERENCES users(id),
    room_id TEXT NOT NULL UNIQUE,
    sdp_offer TEXT,
    status TEXT NOT NULL, -- 'created', 'joined', 'connected', 'completed', 'error'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX idx_webrtc_sessions_transfer_id ON webrtc_sessions(transfer_id);
CREATE INDEX idx_webrtc_sessions_room_id ON webrtc_sessions(room_id);

-- +goose Down
DROP INDEX IF EXISTS idx_webrtc_sessions_room_id;
DROP INDEX IF EXISTS idx_webrtc_sessions_transfer_id;
DROP TABLE IF EXISTS webrtc_sessions;
