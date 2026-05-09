-- name: CreateUser :one
INSERT INTO users (
    device_id,
    fingerprint
) VALUES (
    $1, $2
) RETURNING *;

-- name: GetUserByDeviceID :one
SELECT * FROM users
WHERE device_id = $1
LIMIT 1;

-- name: GetUserByFingerprint :one
SELECT * FROM users
WHERE fingerprint = $1
LIMIT 1;

-- name: UpdateUserLastSeen :one
UPDATE users
SET last_seen_at = NOW(),
    updated_at = NOW()
WHERE id = $1
RETURNING *;
