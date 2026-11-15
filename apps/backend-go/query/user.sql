
INSERT INTO users (
    device_id,
    fingerprint
) VALUES (
    $1, $2
) RETURNING *;


SELECT * FROM users
WHERE device_id = $1
LIMIT 1;


SELECT * FROM users
WHERE fingerprint = $1
LIMIT 1;


UPDATE users
SET last_seen_at = NOW(),
    updated_at = NOW()
WHERE id = $1
RETURNING *;
