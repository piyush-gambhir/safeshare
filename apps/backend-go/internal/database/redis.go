package database

import (
	"context"
	"fmt"

	"github.com/piyush-gambhir/safeshare-service/internal/config"
	"github.com/redis/go-redis/v9"
)

// NewRedisClient creates and tests a connection to Redis
func NewRedisClient(ctx context.Context, cfg *config.Config) (*redis.Client, error) {
	opts, err := redis.ParseURL(cfg.RedisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse redis URL: %w", err)
	}

	client := redis.NewClient(opts)

	// Test the connection
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, fmt.Errorf("failed to ping redis: %w", err)
	}

	return client, nil
}
