package storage

import (
	"context"
	"encoding/base64"
	"fmt"
	"time"

	"github.com/redis/go-redis/v9"
)

const (
	ChunkSize           = 1 * 1024 * 1024
	ChunkExpirationTime = 24 * time.Hour
)

type ChunkManager struct {
	redis *redis.Client
}

func NewChunkManager(redis *redis.Client) *ChunkManager {
	return &ChunkManager{
		redis: redis,
	}
}

func (cm *ChunkManager) StoreChunk(ctx context.Context, transferID string, chunkIndex int, data []byte) error {
	key := fmt.Sprintf("chunk:%s:%d", transferID, chunkIndex)

	err := cm.redis.Set(ctx, key, data, ChunkExpirationTime).Err()
	if err != nil {
		return fmt.Errorf("failed to store chunk: %w", err)
	}

	return nil
}

func (cm *ChunkManager) StoreBase64Chunk(ctx context.Context, transferID string, chunkIndex int, base64Data string) error {
	data, err := base64.StdEncoding.DecodeString(base64Data)
	if err != nil {
		return fmt.Errorf("failed to decode base64 data: %w", err)
	}

	return cm.StoreChunk(ctx, transferID, chunkIndex, data)
}

func (cm *ChunkManager) GetChunk(ctx context.Context, transferID string, chunkIndex int) ([]byte, error) {
	key := fmt.Sprintf("chunk:%s:%d", transferID, chunkIndex)

	data, err := cm.redis.Get(ctx, key).Bytes()
	if err != nil {
		if err == redis.Nil {
			return nil, fmt.Errorf("chunk not found")
		}
		return nil, fmt.Errorf("failed to get chunk: %w", err)
	}

	return data, nil
}

func (cm *ChunkManager) GetChunkAsBase64(ctx context.Context, transferID string, chunkIndex int) (string, error) {
	data, err := cm.GetChunk(ctx, transferID, chunkIndex)
	if err != nil {
		return "", err
	}

	return base64.StdEncoding.EncodeToString(data), nil
}

func (cm *ChunkManager) DeleteChunks(ctx context.Context, transferID string) error {
	pattern := fmt.Sprintf("chunk:%s:*", transferID)
	keys, err := cm.redis.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get chunk keys: %w", err)
	}

	if len(keys) > 0 {
		err = cm.redis.Del(ctx, keys...).Err()
		if err != nil {
			return fmt.Errorf("failed to delete chunks: %w", err)
		}
	}

	return nil
}

func CalculateChunkCount(fileSize int64) int {
	chunks := fileSize / ChunkSize
	if fileSize%ChunkSize > 0 {
		chunks++
	}
	return int(chunks)
}
