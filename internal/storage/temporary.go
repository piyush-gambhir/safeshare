// internal/storage/temporary.go
package storage

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/piyush-gambhir/safeshare-service/internal/repository"
	"github.com/piyush-gambhir/safeshare-service/internal/util"
	"github.com/redis/go-redis/v9"
	"io"
	"time"
)

// TemporaryStorageManager manages temporary storage for file transfers
type TemporaryStorageManager struct {
	redis        *redis.Client
	chunkManager *ChunkManager
	repo         *repository.Queries
}

// NewTemporaryStorageManager creates a new TemporaryStorageManager
func NewTemporaryStorageManager(redis *redis.Client, repo *repository.Queries) *TemporaryStorageManager {
	return &TemporaryStorageManager{
		redis:        redis,
		chunkManager: NewChunkManager(redis),
		repo:         repo,
	}
}

// ChunkManager returns the chunk manager instance
func (tsm *TemporaryStorageManager) ChunkManager() *ChunkManager {
	return tsm.chunkManager
}

// PrepareUpload prepares a new file upload
func (tsm *TemporaryStorageManager) PrepareUpload(ctx context.Context, userID string, fileName string, fileSize int64, contentType string) (repository.Transfer, repository.Session, string, error) {
	// Generate access token
	accessToken, err := util.GenerateAccessToken()
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("failed to generate access token: %w", err)
	}

	// Calculate expiration time (24 hours from now)
	expiresAt := time.Now().Add(24 * time.Hour)

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("invalid user ID format: %w", err)
	}

	// Create transfer record
	transfer, err := tsm.repo.CreateTransfer(ctx, repository.CreateTransferParams{
		UserID:      userUUID,
		Name:        fileName,
		Size:        fileSize,
		ContentType: contentType,
		AccessToken: accessToken,
		ExpiresAt:   expiresAt,
	})
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("failed to create transfer: %w", err)
	}

	// Calculate number of chunks
	chunkCount := CalculateChunkCount(fileSize)

	// Create session record
	session, err := tsm.repo.CreateSession(ctx, repository.CreateSessionParams{
		TransferID: transfer.ID,
		ChunkCount: int32(chunkCount),
		Status:     "pending",
		ExpiresAt:  expiresAt,
	})
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("failed to create session: %w", err)
	}

	// Generate encryption key for client-side encryption
	encryptionKey, err := util.GenerateEncryptionKey()
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("failed to generate encryption key: %w", err)
	}

	return transfer, session, encryptionKey, nil
}

// CompleteUpload marks an upload as complete
func (tsm *TemporaryStorageManager) CompleteUpload(ctx context.Context, sessionID string) error {

	// Update session status
	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		return fmt.Errorf("invalid session ID format: %w", err)
	}

	// Then use sessionUUID in your UpdateSessionStatusParams
	_, err = tsm.repo.UpdateSessionStatus(ctx, repository.UpdateSessionStatusParams{
		ID:     sessionUUID, // Now using UUID instead of string
		Status: "completed",
	})
	if err != nil {
		return fmt.Errorf("failed to update session status: %w", err)
	}

	return nil
}

// GetTransferReader gets a reader for a transfer
func (tsm *TemporaryStorageManager) GetTransferReader(ctx context.Context, transferID string) (io.Reader, error) {
	// Get the session for this transfer
	transferUUID, err := uuid.Parse(transferID)
	if err != nil {
		return nil, fmt.Errorf("invalid transfer ID format: %w", err)
	}

	// Then use transferUUID in your GetSessionByTransferID call
	session, err := tsm.repo.GetSessionByTransferID(ctx, transferUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	// Check if the session is completed
	if session.Status != "completed" {
		return nil, fmt.Errorf("transfer is not completed")
	}

	// Create a reader that will read chunks from Redis
	return &ChunkReader{
		ctx:          ctx,
		chunkManager: tsm.chunkManager,
		transferID:   transferID,
		chunkCount:   int(session.ChunkCount),
		currentChunk: 0,
	}, nil
}

// ChunkReader implements io.Reader for reading chunks from Redis
type ChunkReader struct {
	ctx          context.Context
	chunkManager *ChunkManager
	transferID   string
	chunkCount   int
	currentChunk int
	buffer       []byte
	bufferPos    int
}

// Read implements io.Reader
func (cr *ChunkReader) Read(p []byte) (n int, err error) {
	// If we've read all chunks, return EOF
	if cr.currentChunk >= cr.chunkCount && cr.bufferPos >= len(cr.buffer) {
		return 0, io.EOF
	}

	// If the buffer is empty or fully read, get the next chunk
	if cr.buffer == nil || cr.bufferPos >= len(cr.buffer) {
		// Get the next chunk
		chunk, err := cr.chunkManager.GetChunk(cr.ctx, cr.transferID, cr.currentChunk)
		if err != nil {
			return 0, fmt.Errorf("failed to get chunk %d: %w", cr.currentChunk, err)
		}

		// Update buffer and position
		cr.buffer = chunk
		cr.bufferPos = 0
		cr.currentChunk++
	}

	// Copy data from buffer to p
	n = copy(p, cr.buffer[cr.bufferPos:])
	cr.bufferPos += n

	return n, nil
}
