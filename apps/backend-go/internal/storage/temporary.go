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

type TemporaryStorageManager struct {
	redis        *redis.Client
	chunkManager *ChunkManager
	repo         *repository.Queries
}

func NewTemporaryStorageManager(redis *redis.Client, repo *repository.Queries) *TemporaryStorageManager {
	return &TemporaryStorageManager{
		redis:        redis,
		chunkManager: NewChunkManager(redis),
		repo:         repo,
	}
}

func (tsm *TemporaryStorageManager) ChunkManager() *ChunkManager {
	return tsm.chunkManager
}

func (tsm *TemporaryStorageManager) PrepareUpload(ctx context.Context, userID string, fileName string, fileSize int64, contentType string) (repository.Transfer, repository.Session, string, error) {
	accessToken, err := util.GenerateAccessToken()
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("failed to generate access token: %w", err)
	}

	expiresAt := time.Now().Add(24 * time.Hour)

	userUUID, err := uuid.Parse(userID)
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("invalid user ID format: %w", err)
	}

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

	chunkCount := CalculateChunkCount(fileSize)

	session, err := tsm.repo.CreateSession(ctx, repository.CreateSessionParams{
		TransferID: transfer.ID,
		ChunkCount: int32(chunkCount),
		Status:     "pending",
		ExpiresAt:  expiresAt,
	})
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("failed to create session: %w", err)
	}

	encryptionKey, err := util.GenerateEncryptionKey()
	if err != nil {
		return repository.Transfer{}, repository.Session{}, "", fmt.Errorf("failed to generate encryption key: %w", err)
	}

	return transfer, session, encryptionKey, nil
}

func (tsm *TemporaryStorageManager) CompleteUpload(ctx context.Context, sessionID string) error {

	sessionUUID, err := uuid.Parse(sessionID)
	if err != nil {
		return fmt.Errorf("invalid session ID format: %w", err)
	}

	_, err = tsm.repo.UpdateSessionStatus(ctx, repository.UpdateSessionStatusParams{
		ID:     sessionUUID,
		Status: "completed",
	})
	if err != nil {
		return fmt.Errorf("failed to update session status: %w", err)
	}

	return nil
}

func (tsm *TemporaryStorageManager) GetTransferReader(ctx context.Context, transferID string) (io.Reader, error) {
	transferUUID, err := uuid.Parse(transferID)
	if err != nil {
		return nil, fmt.Errorf("invalid transfer ID format: %w", err)
	}

	session, err := tsm.repo.GetSessionByTransferID(ctx, transferUUID)
	if err != nil {
		return nil, fmt.Errorf("failed to get session: %w", err)
	}

	if session.Status != "completed" {
		return nil, fmt.Errorf("transfer is not completed")
	}

	return &ChunkReader{
		ctx:          ctx,
		chunkManager: tsm.chunkManager,
		transferID:   transferID,
		chunkCount:   int(session.ChunkCount),
		currentChunk: 0,
	}, nil
}

type ChunkReader struct {
	ctx          context.Context
	chunkManager *ChunkManager
	transferID   string
	chunkCount   int
	currentChunk int
	buffer       []byte
	bufferPos    int
}

func (cr *ChunkReader) Read(p []byte) (n int, err error) {
	if cr.currentChunk >= cr.chunkCount && cr.bufferPos >= len(cr.buffer) {
		return 0, io.EOF
	}

	if cr.buffer == nil || cr.bufferPos >= len(cr.buffer) {
		chunk, err := cr.chunkManager.GetChunk(cr.ctx, cr.transferID, cr.currentChunk)
		if err != nil {
			return 0, fmt.Errorf("failed to get chunk %d: %w", cr.currentChunk, err)
		}

		cr.buffer = chunk
		cr.bufferPos = 0
		cr.currentChunk++
	}

	n = copy(p, cr.buffer[cr.bufferPos:])
	cr.bufferPos += n

	return n, nil
}
