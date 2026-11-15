package queue

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type Producer struct {
	channel *amqp.Channel
}

func NewProducer(channel *amqp.Channel) *Producer {
	return &Producer{
		channel: channel,
	}
}

type TransferCreatedEvent struct {
	TransferID string    `json:"transfer_id"`
	UserID     string    `json:"user_id"`
	Size       int64     `json:"size"`
	ExpiresAt  time.Time `json:"expires_at"`
}

type TransferCompletedEvent struct {
	TransferID string `json:"transfer_id"`
	UserID     string `json:"user_id"`
}

type TransferExpiredEvent struct {
	TransferID string `json:"transfer_id"`
	UserID     string `json:"user_id"`
}

type CleanupEvent struct {
	RunAt time.Time `json:"run_at"`
}

func (p *Producer) PublishTransferCreated(ctx context.Context, event TransferCreatedEvent) error {
	return p.publish(ctx, ExchangeTransfers, QueueTransferCreated, event)
}

func (p *Producer) PublishTransferCompleted(ctx context.Context, event TransferCompletedEvent) error {
	return p.publish(ctx, ExchangeTransfers, QueueTransferCompleted, event)
}

func (p *Producer) PublishTransferExpired(ctx context.Context, event TransferExpiredEvent) error {
	return p.publish(ctx, ExchangeTransfers, QueueTransferExpired, event)
}

func (p *Producer) PublishCleanup(ctx context.Context, event CleanupEvent) error {
	return p.publish(ctx, ExchangeTransfers, QueueCleanup, event)
}

func (p *Producer) publish(ctx context.Context, exchange, routingKey string, message interface{}) error {
	body, err := json.Marshal(message)
	if err != nil {
		return fmt.Errorf("failed to marshal message: %w", err)
	}

	return p.channel.PublishWithContext(
		ctx,
		exchange,
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType:  "application/json",
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now(),
			Body:         body,
		},
	)
}
