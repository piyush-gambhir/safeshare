package types

import (
	"time"
)

// WebRTCRoom represents a WebRTC room for signaling
type WebRTCRoom struct {
	RoomID     string    `json:"room_id"`
	TransferID string    `json:"transfer_id"`
	Status     string    `json:"status"`
	CreatedAt  time.Time `json:"created_at"`
	ExpiresAt  time.Time `json:"expires_at"`
}

// CreateWebRTCRoomRequest represents a request to create a WebRTC room
type CreateWebRTCRoomRequest struct {
	TransferID string `json:"transfer_id"`
}

// CreateWebRTCRoomResponse represents a response to a WebRTC room creation
type CreateWebRTCRoomResponse struct {
	RoomID string `json:"room_id"`
}

// JoinWebRTCRoomRequest represents a request to join a WebRTC room
type JoinWebRTCRoomRequest struct {
	RoomID string `json:"room_id"`
}

// WebRTCSignalRequest represents a WebRTC signaling request
type WebRTCSignalRequest struct {
	RoomID string `json:"room_id"`
	Type   string `json:"type"` // "offer", "answer", "ice-candidate"
	Data   string `json:"data"` // SDP or ICE candidate
}

// WebRTCSignalResponse represents a WebRTC signaling response
type WebRTCSignalResponse struct {
	Success bool `json:"success"`
}
