package types

import (
	"time"
)

type WebRTCRoom struct {
	RoomID     string    `json:"room_id"`
	TransferID string    `json:"transfer_id"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type CreateWebRTCRoomRequest struct {
	TransferID string `json:"transfer_id"`
}

type CreateWebRTCRoomResponse struct {
	RoomID string `json:"room_id"`
}

type JoinWebRTCRoomRequest struct {
	RoomID string `json:"room_id"`
}

type WebRTCSignalRequest struct {
	RoomID string `json:"room_id"`
	Type   string `json:"type"`
	Data   string `json:"data"`
}

type WebRTCSignalResponse struct {
	Success bool `json:"success"`
}
