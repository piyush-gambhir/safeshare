package queue

import (
	"fmt"

	"github.com/piyush-gambhir/safeshare-service/internal/config"
	amqp "github.com/rabbitmq/amqp091-go"
)

const (
	ExchangeTransfers      = "transfers"
	QueueTransferCreated   = "transfer.created"
	QueueTransferCompleted = "transfer.completed"
	QueueTransferExpired   = "transfer.expired"
	QueueCleanup           = "cleanup"
)

// RabbitMQ handles the connection and channel to RabbitMQ
type RabbitMQ struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

// NewRabbitMQ creates a new RabbitMQ connection and sets up exchanges and queues
func NewRabbitMQ(cfg *config.Config) (*RabbitMQ, error) {
	conn, err := amqp.Dial(cfg.RabbitMQURL)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, fmt.Errorf("failed to open a channel: %w", err)
	}

	// Declare exchange
	err = ch.ExchangeDeclare(
		ExchangeTransfers, // name
		"topic",           // type
		true,              // durable
		false,             // auto-deleted
		false,             // internal
		false,             // no-wait
		nil,               // arguments
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	// Declare queues
	queues := []string{
		QueueTransferCreated,
		QueueTransferCompleted,
		QueueTransferExpired,
		QueueCleanup,
	}

	for _, queue := range queues {
		_, err = ch.QueueDeclare(
			queue, // name
			true,  // durable
			false, // delete when unused
			false, // exclusive
			false, // no-wait
			nil,   // arguments
		)
		if err != nil {
			ch.Close()
			conn.Close()
			return nil, fmt.Errorf("failed to declare queue %s: %w", queue, err)
		}

		// Bind queue to exchange
		err = ch.QueueBind(
			queue,             // queue name
			queue,             // routing key
			ExchangeTransfers, // exchange
			false,             // no-wait
			nil,               // arguments
		)
		if err != nil {
			ch.Close()
			conn.Close()
			return nil, fmt.Errorf("failed to bind queue %s: %w", queue, err)
		}
	}

	return &RabbitMQ{
		conn:    conn,
		channel: ch,
	}, nil
}

// Close closes the RabbitMQ connection and channel
func (r *RabbitMQ) Close() error {
	if r.channel != nil {
		r.channel.Close()
	}
	if r.conn != nil {
		return r.conn.Close()
	}
	return nil
}

// Channel returns the AMQP channel
func (r *RabbitMQ) Channel() *amqp.Channel {
	return r.channel
}
