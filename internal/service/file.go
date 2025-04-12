// internal/service/file.go
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

// FileTransferService handles file transfers
type FileTransferService struct {
	queries        *repository.Queries
	storageManager *storage.TemporaryStorageManager
	producer       *queue.Producer
}

// NewFileTransferService creates a new FileTransferService
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

// InitiateUpload initiates a file upload
func (s *FileTransferService) InitiateUpload(
	ctx context.Context,
	userID string,
	fileName string,
	fileSize int64,
	contentType string,
) (repository.Transfer, repository.Session, string, error) {
	// Validate user ID
	_, err := uuid.Parse(userID)
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("invalid user ID: %w", err)
	}

	// Prepare upload
	transfer, session, encryptionKey, err := s.storageManager.PrepareUpload(ctx, userID, fileName, fileSize, contentType)
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("failed to prepare upload: %w", err)
	}

	// Publish transfer created event
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

// UploadChunk uploads a chunk of a file
func (s *FileTransferService) UploadChunk(
	ctx context.Context,
	sessionID string,
	chunkIndex int,
	chunkData string,
) error {
	// Validate session ID
	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		return fmt.Errorf("invalid session ID: %w", err)
	}

	// Get the session
	session, err := s.queries.GetSessionByID(ctx, sessionUUID)
	if err != nil {
		return fmt.Errorf("failed to get session: %w", err)
	}

	// Check if the session is valid
	if session.Status != "pending" {
		return fmt.Errorf("session is not pending")
	}

	// Check if the chunk index is valid
	if chunkIndex < 0 || chunkIndex >= int(session.ChunkCount) {
		return fmt.Errorf("invalid chunk index")
	}

	// Get the transfer
	transfer, err := s.queries.GetTransferByID(ctx, session.TransferID)
	if err != nil {
		return fmt.Errorf("failed to get transfer: %w", err)
	}

	// Store the chunk - here is the fix, using ChunkManager() method
	err = s.storageManager.ChunkManager().StoreBase64Chunk(ctx, transfer.ID.String(), chunkIndex, chunkData)
	if err != nil {
		return fmt.Errorf("failed to store chunk: %w", err)
	}

	// Update the session
	_, err = s.queries.UpdateSessionChunksCompleted(ctx, repository.UpdateSessionChunksCompletedParams{
		ID:              sessionUUID,
		ChunksCompleted: session.ChunksCompleted + 1,
	})
	if err != nil {
		return fmt.Errorf("failed to update session: %w", err)
	}

	// Check if all chunks are uploaded
	session, err = s.queries.GetSessionByID(ctx, sessionUUID)
	if err != nil {
		return fmt.Errorf("failed to get updated session: %w", err)
	}

	if session.ChunksCompleted == session.ChunkCount {
		// All chunks uploaded, mark the session as completed
		err = s.storageManager.CompleteUpload(ctx, sessionUUID.String())
		if err != nil {
			return fmt.Errorf("failed to complete upload: %w", err)
		}

		// Publish transfer completed event
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

// GetTransferByAccessToken gets a transfer by access token
func (s *FileTransferService) GetTransferByAccessToken(ctx context.Context, accessToken string) (repository.Transfer, error) {
	// Get the transfer
	transfer, err := s.queries.GetTransferByAccessToken(ctx, accessToken)
	if err != nil {
		return repository.Transfer{}, fmt.Errorf("failed to get transfer: %w", err)
	}

	// Check if the transfer is expired
	if time.Now().After(transfer.ExpiresAt) {
		return repository.Transfer{}, fmt.Errorf("transfer is expired")
	}

	return transfer, nil
}

// DownloadTransfer downloads a transfer
func (s *FileTransferService) DownloadTransfer(ctx context.Context, transferID string) (io.Reader, repository.Transfer, error) {
	// Validate transfer ID
	transferUUID, err := uuid.Parse(transferID)
	if err != nil {
		return nil, repository.Transfer{}, fmt.Errorf("invalid transfer ID: %w", err)
	}

	// Get the transfer
	transfer, err := s.queries.GetTransferByID(ctx, transferUUID)
	if err != nil {
		return nil, repository.Transfer{}, fmt.Errorf("failed to get transfer: %w", err)
	}

	// Check if the transfer is expired
	if time.Now().After(transfer.ExpiresAt) {
		return nil, repository.Transfer{}, fmt.Errorf("transfer is expired")
	}

	// Get the reader for the transfer
	reader, err := s.storageManager.GetTransferReader(ctx, transferID)
	if err != nil {
		return nil, repository.Transfer{}, fmt.Errorf("failed to get transfer reader: %w", err)
	}

	// Update download status
	_, err = s.queries.UpdateTransferDownloadStatus(ctx, transferUUID)
	if err != nil {
		return nil, repository.Transfer{}, fmt.Errorf("failed to update download status: %w", err)
	}

	return reader, transfer, nil
}

// GetUserTransfers gets transfers for a user
func (s *FileTransferService) GetUserTransfers(ctx context.Context, userID string) ([]repository.Transfer, error) {
	// Validate user ID
	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return nil, fmt.Errorf("invalid user ID: %w", err)
	}

	// Get the transfers
	transfers, err := s.queries.GetUserTransfers(ctx, userUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to get user transfers: %w", err)
	}

	return transfers, nil
}
