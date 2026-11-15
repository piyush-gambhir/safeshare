package service

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgtype"
	"github.com/piyush-gambhir/safeshare-service/internal/repository"
	"github.com/piyush-gambhir/safeshare-service/internal/util"
	"github.com/redis/go-redis/v9"
)

type WebRTCService struct {
	queries     *repository.Queries
	redisClient *redis.Client
}

func NewWebRTCService(queries *repository.Queries, redisClient *redis.Client) *WebRTCService {
	return &WebRTCService{
		queries:     queries,
		redisClient: redisClient,
	}
}

func (s *WebRTCService) CreateRoom(ctx context.Context, userID string, transferID string) (string, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return "", fmt.Errorf("invalid user ID: %w", err)
	}

	transferUUID, err := uuid.Parse(transferID)
	if err != nil {
		return "", fmt.Errorf("invalid transfer ID: %w", err)
	}

	transfer, err := s.queries.GetTransferByID(ctx, transferUUID)
	if err != nil {
		return "", fmt.Errorf("failed to get transfer: %w", err)
	}

	if transfer.UserID.String() != userID {
		return "", fmt.Errorf("transfer does not belong to user")
	}

	roomID, err := util.GenerateRandomToken(16)
	if err != nil {
		return "", fmt.Errorf("failed to generate room ID: %w", err)
	}

	expiresAt := time.Now().Add(24 * time.Hour)

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

func (s *WebRTCService) JoinRoom(ctx context.Context, userID string, roomID string) error {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return fmt.Errorf("invalid user ID: %w", err)
	}

	session, err := s.queries.GetWebRTCSessionByRoomID(ctx, roomID)
	if err != nil {
		return fmt.Errorf("failed to get WebRTC session: %w", err)
	}

	if session.Status != "created" {
		return fmt.Errorf("session is not in a joinable state")
	}

	var pgUserUUID pgtype.UUID
	pgUserUUID.Bytes = userUUID
	pgUserUUID.Valid = true

	_, err = s.queries.UpdateWebRTCSessionReceiver(ctx, repository.UpdateWebRTCSessionReceiverParams{
		RoomID:     roomID,
		ReceiverID: pgUserUUID,
	})
	if err != nil {
		return fmt.Errorf("failed to update WebRTC session: %w", err)
	}

	return nil
}

func (s *WebRTCService) StoreSignalData(ctx context.Context, roomID string, signalType string, data string) error {
	key := fmt.Sprintf("webrtc:%s:%s:%d", roomID, signalType, time.Now().UnixNano())

	err := s.redisClient.Set(ctx, key, data, 24*time.Hour).Err()
	if err != nil {
		return fmt.Errorf("failed to store signal data: %w", err)
	}

	return nil
}

func (s *WebRTCService) GetSignalData(ctx context.Context, roomID string, signalType string) ([]string, error) {
	pattern := fmt.Sprintf("webrtc:%s:%s:*", roomID, signalType)

	keys, err := s.redisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get signal keys: %w", err)
	}

	if len(keys) == 0 {
		return []string{}, nil
	}

	values, err := s.redisClient.MGet(ctx, keys...).Result()
	if err != nil {
		return nil, fmt.Errorf("failed to get signal data: %w", err)
	}

	result := make([]string, 0, len(values))
	for _, value := range values {
		if value != nil {
			result = append(result, value.(string))
		}
	}

	s.redisClient.Del(ctx, keys...)

	return result, nil
}

func (s *WebRTCService) UpdateRoomStatus(ctx context.Context, roomID string, status string) error {
	_, err := s.queries.UpdateWebRTCSessionStatus(ctx, repository.UpdateWebRTCSessionStatusParams{
		RoomID: roomID,
		Status: status,
	})
	if err != nil {
		return fmt.Errorf("failed to update WebRTC session status: %w", err)
	}

	return nil
}
