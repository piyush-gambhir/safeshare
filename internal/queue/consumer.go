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

// Consumer handles consuming messages from RabbitMQ
type Consumer struct {
	channel     *amqp.Channel
	queries     *repository.Queries
	redisClient *redis.Client
}

// NewConsumer creates a new Consumer instance
func NewConsumer(channel *amqp.Channel, queries *repository.Queries, redisClient *redis.Client) *Consumer {
	return &Consumer{
		channel:     channel,
		queries:     queries,
		redisClient: redisClient,
	}
}

// StartConsumers starts all consumers
func (c *Consumer) StartConsumers(ctx context.Context) error {
	// Setup consumers for each queue
	if err := c.consumeCleanup(ctx); err != nil {
		return err
	}

	if err := c.consumeTransferExpired(ctx); err != nil {
		return err
	}

	// Add more consumers as needed

	return nil
}

// consumeCleanup consumes cleanup events
func (c *Consumer) consumeCleanup(ctx context.Context) error {
	msgs, err := c.channel.ConsumeWithContext(
		ctx,
		QueueCleanup, // queue
		"",           // consumer
		false,        // auto-ack
		false,        // exclusive
		false,        // no-local
		false,        // no-wait
		nil,          // args
	)
	if err != nil {
		return fmt.Errorf("failed to register a consumer for cleanup: %w", err)
	}

	go func() {
		for d := range msgs {
			var event CleanupEvent
			if err := json.Unmarshal(d.Body, &event); err != nil {
				log.Printf("Error unmarshaling cleanup event: %v", err)
				d.Nack(false, true) // Requeue the message
				continue
			}

			// Delete expired transfers and sessions from database
			err := c.cleanupExpiredData(ctx)
			if err != nil {
				log.Printf("Error cleaning up expired data: %v", err)
				d.Nack(false, true) // Requeue the message
				continue
			}

			d.Ack(false) // Acknowledge the message

			// Schedule the next cleanup
			nextCleanup := time.Now().Add(1 * time.Hour)
			producer := NewProducer(c.channel)
			producer.PublishCleanup(ctx, CleanupEvent{RunAt: nextCleanup})
		}
	}()

	return nil
}

// consumeTransferExpired consumes transfer expired events
func (c *Consumer) consumeTransferExpired(ctx context.Context) error {
	msgs, err := c.channel.ConsumeWithContext(
		ctx,
		QueueTransferExpired, // queue
		"",                   // consumer
		false,                // auto-ack
		false,                // exclusive
		false,                // no-local
		false,                // no-wait
		nil,                  // args
	)
	if err != nil {
		return fmt.Errorf("failed to register a consumer for transfer expired: %w", err)
	}

	go func() {
		for d := range msgs {
			var event TransferExpiredEvent
			if err := json.Unmarshal(d.Body, &event); err != nil {
				log.Printf("Error unmarshaling transfer expired event: %v", err)
				d.Nack(false, true) // Requeue the message
				continue
			}

			// Clean up Redis chunks
			err := c.cleanupTransferChunks(ctx, event.TransferID)
			if err != nil {
				log.Printf("Error cleaning up transfer chunks: %v", err)
				d.Nack(false, true) // Requeue the message
				continue
			}

			d.Ack(false) // Acknowledge the message
		}
	}()

	return nil
}

// cleanupExpiredData cleans up expired transfers and sessions
func (c *Consumer) cleanupExpiredData(ctx context.Context) error {
	// Delete expired sessions
	if err := c.queries.DeleteExpiredSessions(ctx); err != nil {
		return fmt.Errorf("failed to delete expired sessions: %w", err)
	}

	// Delete expired transfers
	if err := c.queries.DeleteExpiredTransfers(ctx); err != nil {
		return fmt.Errorf("failed to delete expired transfers: %w", err)
	}

	return nil
}

// cleanupTransferChunks cleans up transfer chunks from Redis
func (c *Consumer) cleanupTransferChunks(ctx context.Context, transferID string) error {
	// Get all chunk keys for this transfer
	pattern := fmt.Sprintf("chunk:%s:*", transferID)
	keys, err := c.redisClient.Keys(ctx, pattern).Result()
	if err != nil {
		return fmt.Errorf("failed to get chunk keys: %w", err)
	}

	// Delete all chunks
	if len(keys) > 0 {
		if err := c.redisClient.Del(ctx, keys...).Err(); err != nil {
			return fmt.Errorf("failed to delete chunks: %w", err)
		}
	}

	return nil
}
