package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Producer handles publishing messages to RabbitMQ
type Producer struct {
	channel *amqp.Channel
}

// NewProducer creates a new Producer instance
func NewProducer(channel *amqp.Channel) *Producer {
	return &Producer{
		channel: channel,
	}
}

// TransferCreatedEvent represents a transfer created event
type TransferCreatedEvent struct {
	TransferID string    `json:"transfer_id"`
	UserID     string    `json:"user_id"`
	Size       int64     `json:"size"`
	ExpiresAt  time.Time `json:"expires_at"`
}

// TransferCompletedEvent represents a transfer completed event
type TransferCompletedEvent struct {
	TransferID string `json:"transfer_id"`
	UserID     string `json:"user_id"`
}

// TransferExpiredEvent represents a transfer expired event
type TransferExpiredEvent struct {
	TransferID string `json:"transfer_id"`
	UserID     string `json:"user_id"`
}

// CleanupEvent represents a cleanup event
type CleanupEvent struct {
	RunAt time.Time `json:"run_at"`
}

// PublishTransferCreated publishes a transfer created event
func (p *Producer) PublishTransferCreated(ctx context.Context, event TransferCreatedEvent) error {
	return p.publish(ctx, ExchangeTransfers, QueueTransferCreated, event)
}

// PublishTransferCompleted publishes a transfer completed event
func (p *Producer) PublishTransferCompleted(ctx context.Context, event TransferCompletedEvent) error {
	return p.publish(ctx, ExchangeTransfers, QueueTransferCompleted, event)
}

// PublishTransferExpired publishes a transfer expired event
func (p *Producer) PublishTransferExpired(ctx context.Context, event TransferExpiredEvent) error {
	return p.publish(ctx, ExchangeTransfers, QueueTransferExpired, event)
}

// PublishCleanup publishes a cleanup event
func (p *Producer) PublishCleanup(ctx context.Context, event CleanupEvent) error {
	return p.publish(ctx, ExchangeTransfers, QueueCleanup, event)
}

// publish publishes a message to the specified exchange and routing key
func (p *Producer) publish(ctx context.Context, exchange, routingKey string, message interface{}) error {
	body, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return p.channel.PublishWithContext(
		ctx,
		exchange,   // exchange
		routingKey, // routing key
		false,      // mandatory
		false,      // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now(),
			Body:         body,
		},
	)
}
