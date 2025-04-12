package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/piyush-gambhir/safeshare-service/internal/repository"
	"github.com/piyush-gambhir/safeshare-service/internal/util"
	"github.com/redis/go-redis/v9"
)

// WebRTCService handles WebRTC signaling.
type WebRTCService struct {
	queries     *repository.Queries
	redisClient *redis.Client
}

// NewWebRTCService creates a new WebRTCService.
func NewWebRTCService(queries *repository.Queries, redisClient *redis.Client) *WebRTCService {
	return &WebRTCService{
		queries:     queries,
		redisClient: redisClient,
	}
}

// CreateRoom creates a new WebRTC room for signaling.
func (s *WebRTCService) CreateRoom(ctx context.Context, userID string, transferID string) (string, error) {
	// Validate user ID.
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return "", fmt.Errorf("invalid user ID: %w", err)
	}

	// Validate transfer ID.
	transferUUID, err := uuid.Parse(transferID)
	if err != nil {
		return "", fmt.Errorf("invalid transfer ID: %w", err)
	}

	// Check if the transfer exists and belongs to the user.
	transfer, err := s.queries.GetTransferByID(ctx, transferUUID)
	if err != nil {
		return "", fmt.Errorf("failed to get transfer: %w", err)
	}

	if transfer.UserID.String() != userID {
		return "", fmt.Errorf("transfer does not belong to user")
	}

	// Generate a unique room ID.
	roomID, err := util.GenerateRandomToken(16)
	if err != nil {
		return "", fmt.Errorf("failed to generate room ID: %w", err)
	}

	// Set expiration time (24 hours from now).
	expiresAt := time.Now().Add(24 * time.Hour)

	// Create WebRTC session using google/uuid.UUID values directly.
	_, err = s.queries.CreateWebRTCSession(ctx, repository.CreateWebRTCSessionParams{
		TransferID:  transferUUID,
		InitiatorID: userUUID,
		RoomID:      roomID,
		Status:      "created",
		ExpiresAt:   expiresAt,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create WebRTC session: %w", err)
	}

	return roomID, nil
}

// JoinRoom joins a WebRTC room.
func (s *WebRTCService) JoinRoom(ctx context.Context, userID string, roomID string) error {
	// Validate user ID.
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	// Get the WebRTC session.
	session, err := s.queries.GetWebRTCSessionByRoomID(ctx, roomID)
	if err != nil {
		return fmt.Errorf("failed to get WebRTC session: %w", err)
	}

	// Check if the session is valid.
	if session.Status != "created" {
		return fmt.Errorf("session is not in a joinable state")
	}

	// Update the session with the receiver ID using google/uuid.UUID directly.
	_, err = s.queries.UpdateWebRTCSessionReceiver(ctx, repository.UpdateWebRTCSessionReceiverParams{
		RoomID:     roomID,
		ReceiverID: userUUID,
	})
	if err != nil {
		return fmt.Errorf("failed to update WebRTC session: %w", err)
	}

	return nil
}

// StoreSignalData stores WebRTC signaling data in Redis.
func (s *WebRTCService) StoreSignalData(ctx context.Context, roomID string, signalType string, data string) error {
	// Create a unique key for this signal.
	key := fmt.Sprintf("webrtc:%s:%s:%d", roomID, signalType, time.Now().UnixNano())

	// Store the signal with expiration.
	err := s.redisClient.Set(ctx, key, data, 24*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to store signal data: %w", err)
	}

	return nil
}

// GetSignalData gets WebRTC signaling data from Redis.
func (s *WebRTCService) GetSignalData(ctx context.Context, roomID string, signalType string) ([]string, error) {
	// Create a pattern to match all signals of this type for this room.
	pattern := fmt.Sprintf("webrtc:%s:%s:*", roomID, signalType)

	// Get all matching keys.
	keys, err := s.redisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get signal keys: %w", err)
	}

	if len(keys) == 0 {
		return []string{}, nil
	}

	// Get all values.
	values, err := s.redisClient.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get signal data: %w", err)
	}

	// Convert to strings.
	result := make([]string, 0, len(values))
	for _, value := range values {
		if value != nil {
			result = append(result, value.(string))
		}
	}

	// Delete the keys after reading.
	s.redisClient.Del(ctx, keys...)

	return result, nil
}

// UpdateRoomStatus updates the status of a WebRTC room.
func (s *WebRTCService) UpdateRoomStatus(ctx context.Context, roomID string, status string) error {
	// Update the session status.
	_, err := s.queries.UpdateWebRTCSessionStatus(ctx, repository.UpdateWebRTCSessionStatusParams{
		RoomID: roomID,
		Status: status,
	})
	if err != nil {
		return fmt.Errorf("failed to update WebRTC session status: %w", err)
	}

	return nil
}
