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

type RabbitMQ struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

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

	err = ch.ExchangeDeclare(
		ExchangeTransfers,
		"topic",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	queues := []string{
		QueueTransferCreated,
		QueueTransferCompleted,
		QueueTransferExpired,
		QueueCleanup,
	}

	for _, queue := range queues {
		_, err = ch.QueueDeclare(
			queue,
			true,
			false,
			false,
			false,
			nil,
		)
		if err != nil {
			ch.Close()
			conn.Close()
			return nil, fmt.Errorf("failed to declare queue %s: %w", queue, err)
		}

		err = ch.QueueBind(
			queue,
			queue,
			ExchangeTransfers,
			false,
			nil,
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

func (r *RabbitMQ) Close() error {
	if r.channel != nil {
		r.channel.Close()
	}
	if r.conn != nil {
		return r.conn.Close()
	}
	return nil
}

func (r *RabbitMQ) Channel() *amqp.Channel {
	return r.channel
}
