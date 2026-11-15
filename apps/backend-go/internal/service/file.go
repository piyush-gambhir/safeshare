package service

import (
	"context"
	"fmt"
	"io"
	"time"

	"github.com/google/uuid"
	"github.com/piyush-gambhir/safeshare-service/internal/queue"
	"github.com/piyush-gambhir/safeshare-service/internal/repository"
	"github.com/piyush-gambhir/safeshare-service/internal/storage"
)

type FileTransferService struct {
	queries        *repository.Queries
	storageManager *storage.TemporaryStorageManager
	producer       *queue.Producer
}

func NewFileTransferService(
	queries *repository.Queries,
	storageManager *storage.TemporaryStorageManager,
	producer *queue.Producer,
) *FileTransferService {
	return &FileTransferService{
		queries:        queries,
		storageManager: storageManager,
		producer:       producer,
	}
}

func (s *FileTransferService) InitiateUpload(
	ctx context.Context,
	userID string,
	fileName string,
	fileSize int64,
	contentType string,
) (repository.Transfer, repository.Session, string, error) {
	_, err := uuid.Parse(userID)
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("invalid user ID: %w", err)
	}

	transfer, session, encryptionKey, err := s.storageManager.PrepareUpload(ctx, userID, fileName, fileSize, contentType)
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("failed to prepare upload: %w", err)
	}

	err = s.producer.PublishTransferCreated(ctx, queue.TransferCreatedEvent{
		TransferID: transfer.ID.String(),
		UserID:     userID,
		Size:       fileSize,
		ExpiresAt:  transfer.ExpiresAt,
	})
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("failed to publish transfer created event: %w", err)
	}

	return transfer, session, encryptionKey, nil
}

func (s *FileTransferService) UploadChunk(
	ctx context.Context,
	sessionID string,
	chunkIndex int,
	chunkData string,
) error {
	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		return fmt.Errorf("invalid session ID: %w", err)
	}

	session, err := s.queries.GetSessionByID(ctx, sessionUUID)
	if err != nil {
		return fmt.Errorf("failed to get session: %w", err)
	}

	if session.Status != "pending" {
		return fmt.Errorf("session is not pending")
	}

	if chunkIndex < 0 || chunkIndex >= int(session.ChunkCount) {
		return fmt.Errorf("invalid chunk index")
	}

	transfer, err := s.queries.GetTransferByID(ctx, session.TransferID)
	if err != nil {
		return fmt.Errorf("failed to get transfer: %w", err)
	}

	err = s.storageManager.ChunkManager().StoreBase64Chunk(ctx, transfer.ID.String(), chunkIndex, chunkData)
	if err != nil {
		return fmt.Errorf("failed to store chunk: %w", err)
	}

	_, err = s.queries.UpdateSessionChunksCompleted(ctx, repository.UpdateSessionChunksCompletedParams{
		ID:              sessionUUID,
		ChunksCompleted: session.ChunksCompleted + 1,
	})
	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	session, err = s.queries.GetSessionByID(ctx, sessionUUID)
	if err != nil {
		return fmt.Errorf("failed to get updated session: %w", err)
	}

	if session.ChunksCompleted == session.ChunkCount {
		err = s.storageManager.CompleteUpload(ctx, sessionUUID.String())
		if err != nil {
			return fmt.Errorf("failed to complete upload: %w", err)
		}

		err = s.producer.PublishTransferCompleted(ctx, queue.TransferCompletedEvent{
			TransferID: transfer.ID.String(),
			UserID:     transfer.UserID.String(),
		})
		if err != nil {
			return fmt.Errorf("failed to publish transfer completed event: %w", err)
		}
	}

	return nil
}

func (s *FileTransferService) GetTransferByAccessToken(ctx context.Context, accessToken string) (repository.Transfer, error) {
	transfer, err := s.queries.GetTransferByAccessToken(ctx, accessToken)
	if err != nil {
		return repository.Transfer{}, fmt.Errorf("failed to get transfer: %w", err)
	}

	if time.Now().After(transfer.ExpiresAt) {
		return repository.Transfer{}, fmt.Errorf("transfer is expired")
	}

	return transfer, nil
}

func (s *FileTransferService) DownloadTransfer(ctx context.Context, transferID string) (io.Reader, repository.Transfer, error) {
	transferUUID, err := uuid.Parse(transferID)
	if err != nil {
		return nil, repository.Transfer{}, fmt.Errorf("invalid transfer ID: %w", err)
	}

	transfer, err := s.queries.GetTransferByID(ctx, transferUUID)
	if err != nil {
		return nil, repository.Transfer{}, fmt.Errorf("failed to get transfer: %w", err)
	}

	if time.Now().After(transfer.ExpiresAt) {
		return nil, repository.Transfer{}, fmt.Errorf("transfer is expired")
	}

	reader, err := s.storageManager.GetTransferReader(ctx, transferID)
	if err != nil {
		return nil, repository.Transfer{}, fmt.Errorf("failed to get transfer reader: %w", err)
	}

	_, err = s.queries.UpdateTransferDownloadStatus(ctx, transferUUID)
	if err != nil {
		return nil, repository.Transfer{}, fmt.Errorf("failed to update download status: %w", err)
	}

	return reader, transfer, nil
}

func (s *FileTransferService) GetUserTransfers(ctx context.Context, userID string) ([]repository.Transfer, error) {
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	transfers, err := s.queries.GetUserTransfers(ctx, userUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user transfers: %w", err)
	}

	return transfers, nil
}
