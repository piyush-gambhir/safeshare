package storage

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	// ChunkSize is the size of each chunk in bytes (1MB)
	ChunkSize = 1 * 1024 * 1024
	// ChunkExpirationTime is the expiration time for chunks in Redis
	ChunkExpirationTime = 24 * time.Hour
)

// ChunkManager handles chunking and storing file data
type ChunkManager struct {
	redis *redis.Client
}

// NewChunkManager creates a new ChunkManager
func NewChunkManager(redis *redis.Client) *ChunkManager {
	return &ChunkManager{
		redis: redis,
	}
}

// StoreChunk stores a chunk in Redis
func (cm *ChunkManager) StoreChunk(ctx context.Context, transferID string, chunkIndex int, data []byte) error {
	// Create the chunk key
	key := fmt.Sprintf("chunk:%s:%d", transferID, chunkIndex)

	// Store the chunk with expiration
	err := cm.redis.Set(ctx, key, data, ChunkExpirationTime).Err()
	if err != nil {
		return fmt.Errorf("failed to store chunk: %w", err)
	}

	return nil
}

// StoreBase64Chunk stores a base64-encoded chunk in Redis
func (cm *ChunkManager) StoreBase64Chunk(ctx context.Context, transferID string, chunkIndex int, base64Data string) error {
	// Decode the base64 data
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return fmt.Errorf("failed to decode base64 data: %w", err)
	}

	// Store the decoded chunk
	return cm.StoreChunk(ctx, transferID, chunkIndex, data)
}

// GetChunk retrieves a chunk from Redis
func (cm *ChunkManager) GetChunk(ctx context.Context, transferID string, chunkIndex int) ([]byte, error) {
	// Create the chunk key
	key := fmt.Sprintf("chunk:%s:%d", transferID, chunkIndex)

	// Get the chunk
	data, err := cm.redis.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("chunk not found")
		}
		return nil, fmt.Errorf("failed to get chunk: %w", err)
	}

	return data, nil
}

// GetChunkAsBase64 retrieves a chunk from Redis as base64
func (cm *ChunkManager) GetChunkAsBase64(ctx context.Context, transferID string, chunkIndex int) (string, error) {
	// Get the chunk
	data, err := cm.GetChunk(ctx, transferID, chunkIndex)
	if err != nil {
		return "", err
	}

	// Encode the data as base64
	return base64.StdEncoding.EncodeToString(data), nil
}

// DeleteChunks deletes all chunks for a transfer
func (cm *ChunkManager) DeleteChunks(ctx context.Context, transferID string) error {
	// Get all chunk keys for this transfer
	pattern := fmt.Sprintf("chunk:%s:*", transferID)
	keys, err := cm.redis.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get chunk keys: %w", err)
	}

	// Delete all chunks
	if len(keys) > 0 {
		err = cm.redis.Del(ctx, keys...).Err()
		if err != nil {
			return fmt.Errorf("failed to delete chunks: %w", err)
		}
	}

	return nil
}

// CalculateChunkCount calculates the number of chunks needed for a file
func CalculateChunkCount(fileSize int64) int {
	chunks := fileSize / ChunkSize
	if fileSize%ChunkSize > 0 {
		chunks++
	}
	return int(chunks)
}
