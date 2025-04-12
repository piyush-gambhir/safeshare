-- name: CreateWebRTCSession :one
INSERT INTO webrtc_sessions (
    transfer_id,
    initiator_id,
    room_id,
    status,
    expires_at
) VALUES (
    $1, $2, $3, $4, $5
) RETURNING *;

-- name: GetWebRTCSessionByRoomID :one
SELECT * FROM webrtc_sessions
WHERE room_id = $1
LIMIT 1;

-- name: GetWebRTCSessionByTransferID :one
SELECT * FROM webrtc_sessions
WHERE transfer_id = $1
LIMIT 1;

-- name: UpdateWebRTCSessionStatus :one
UPDATE webrtc_sessions
SET status = $2,
    updated_at = NOW()
WHERE room_id = $1
RETURNING *;

-- name: UpdateWebRTCSessionReceiver :one
UPDATE webrtc_sessions
SET receiver_id = $2,
    status = 'joined',
    updated_at = NOW()
WHERE room_id = $1
RETURNING *;

-- name: UpdateWebRTCSessionOffer :one
UPDATE webrtc_sessions
SET sdp_offer = $2,
    updated_at = NOW()
WHERE room_id = $1
RETURNING *;

-- name: DeleteExpiredWebRTCSessions :exec
DELETE FROM webrtc_sessions
WHERE expires_at < NOW();
