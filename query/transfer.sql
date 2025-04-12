-- name: CreateTransfer :one
INSERT INTO transfers (
    user_id,
    name,
    size,
    content_type,
    encrypted_metadata,
    access_token,
    expires_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7
) RETURNING *;

-- name: GetTransferByID :one
SELECT * FROM transfers
WHERE id = $1
LIMIT 1;

-- name: GetTransferByAccessToken :one
SELECT * FROM transfers
WHERE access_token = $1
LIMIT 1;

-- name: GetUserTransfers :many
SELECT * FROM transfers
WHERE user_id = $1
ORDER BY created_at DESC;

-- name: UpdateTransferDownloadStatus :one
UPDATE transfers
SET downloaded = true,
    download_count = download_count + 1,
    updated_at = NOW()
WHERE id = $1
RETURNING *;

-- name: DeleteExpiredTransfers :exec
DELETE FROM transfers
WHERE expires_at < NOW();
