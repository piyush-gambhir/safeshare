package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/piyush-gambhir/safeshare-service/internal/repository"
	amqp "github.com/rabbitmq/amqp091-go"
	"github.com/redis/go-redis/v9"
)

type Consumer struct {
	channel     *amqp.Channel
	queries     *repository.Queries
	redisClient *redis.Client
}

func NewConsumer(channel *amqp.Channel, queries *repository.Queries, redisClient *redis.Client) *Consumer {
	return &Consumer{
		channel:     channel,
		queries:     queries,
		redisClient: redisClient,
	}
}

func (c *Consumer) StartConsumers(ctx context.Context) error {
	if err := c.consumeCleanup(ctx); err != nil {
		return err
	}

	if err := c.consumeTransferExpired(ctx); err != nil {
		return err
	}

	return nil
}

func (c *Consumer) consumeCleanup(ctx context.Context) error {
	msgs, err := c.channel.ConsumeWithContext(
		ctx,
		QueueCleanup,
		"",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to register a consumer for cleanup: %w", err)
	}

	go func() {
		for d := range msgs {
			var event CleanupEvent
			if err := json.Unmarshal(d.Body, &event); err != nil {
				log.Printf("Error unmarshaling cleanup event: %v", err)
				d.Nack(false, true)
				continue
			}

			err := c.cleanupExpiredData(ctx)
			if err != nil {
				log.Printf("Error cleaning up expired data: %v", err)
				d.Nack(false, true)
				continue
			}

			d.Ack(false)

			nextCleanup := time.Now().Add(1 * time.Hour)
			producer := NewProducer(c.channel)
			producer.PublishCleanup(ctx, CleanupEvent{RunAt: nextCleanup})
		}
	}()

	return nil
}

func (c *Consumer) consumeTransferExpired(ctx context.Context) error {
	msgs, err := c.channel.ConsumeWithContext(
		ctx,
		QueueTransferExpired,
		"",
		false,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return fmt.Errorf("failed to register a consumer for transfer expired: %w", err)
	}

	go func() {
		for d := range msgs {
			var event TransferExpiredEvent
			if err := json.Unmarshal(d.Body, &event); err != nil {
				log.Printf("Error unmarshaling transfer expired event: %v", err)
				d.Nack(false, true)
				continue
			}

			err := c.cleanupTransferChunks(ctx, event.TransferID)
			if err != nil {
				log.Printf("Error cleaning up transfer chunks: %v", err)
				d.Nack(false, true)
				continue
			}

			d.Ack(false)
		}
	}()

	return nil
}

func (c *Consumer) cleanupExpiredData(ctx context.Context) error {
	if err := c.queries.DeleteExpiredWebRTCSessions(ctx); err != nil {
		return fmt.Errorf("failed to delete expired WebRTC sessions: %w", err)
	}

	if err := c.queries.DeleteExpiredSessions(ctx); err != nil {
		return fmt.Errorf("failed to delete expired sessions: %w", err)
	}

	if err := c.queries.DeleteExpiredTransfers(ctx); err != nil {
		return fmt.Errorf("failed to delete expired transfers: %w", err)
	}

	pattern := "webrtc:*"
	keys, err := c.redisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get WebRTC signal keys: %w", err)
	}

	for _, key := range keys {
		ttl, err := c.redisClient.TTL(ctx, key).Result()
		if err != nil {
			log.Printf("Error getting TTL for key %s: %v", key, err)
			continue
		}

		if ttl < time.Hour {
			_, err := c.redisClient.Del(ctx, key).Result()
			if err != nil {
				log.Printf("Error deleting expired WebRTC signal %s: %v", key, err)
			}
		}
	}

	return nil
}

func (c *Consumer) cleanupTransferChunks(ctx context.Context, transferID string) error {
	pattern := fmt.Sprintf("chunk:%s:*", transferID)
	keys, err := c.redisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get chunk keys: %w", err)
	}

	if len(keys) > 0 {
		if err := c.redisClient.Del(ctx, keys...).Err(); err != nil {
			return fmt.Errorf("failed to delete chunks: %w", err)
		}
	}

	return nil
}
