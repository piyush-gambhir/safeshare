-- name: CreateSession :one
INSERT INTO sessions (
    transfer_id,
    chunk_count,
    status,
    expires_at
) VALUES (
    $1, $2, $3, $4
) RETURNING *;

-- name: GetSessionByID :one
SELECT * FROM sessions
WHERE id = $1
LIMIT 1;

-- name: GetSessionByTransferID :one
SELECT * FROM sessions
WHERE transfer_id = $1
LIMIT 1;

-- name: UpdateSessionChunksCompleted :one
UPDATE sessions
SET chunks_completed = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: UpdateSessionStatus :one
UPDATE sessions
SET status = $2,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteExpiredSessions :exec
DELETE FROM sessions
WHERE expires_at < NOW();
