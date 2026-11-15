.PHONY: build run test clean lint generate-sqlc migrate migrate-up migrate-down help docker-build docker-up docker-down swagger

all: build

help:
	@echo "Available commands:"
	@echo "  make build          - Build the application"
	@echo "  make run            - Run the application"
	@echo "  make test           - Run tests"
	@echo "  make clean          - Clean build artifacts"
	@echo "  make lint           - Run linters"
	@echo "  make generate-sqlc  - Generate SQLC code"
	@echo "  make migrate        - Create a new migration"
	@echo "  make migrate-up     - Run migrations up"
	@echo "  make migrate-down   - Run migrations down"
	@echo "  make docker-build   - Build Docker images"
	@echo "  make docker-up      - Start Docker containers"
	@echo "  make docker-down    - Stop Docker containers"
	@echo "  make swagger        - Generate Swagger documentation"

build:
	go build -o bin/safeshare-service ./cmd/api

run:
	go run ./cmd/api

test:
	go test -v ./...

clean:
	rm -rf bin
	rm -rf tmp

lint:
	golangci-lint run

generate-sqlc:
	sqlc generate

migrate:
	@read -p "Enter migration name: " name; \
	goose -dir=./migrations create $$name sql

migrate-up:
	goose -dir=./migrations postgres "host=localhost user=postgres password=postgres123 dbname=safeshare sslmode=disable" up

migrate-down:
	goose -dir=./migrations postgres "host=localhost user=postgres password=postgres123 dbname=safeshare sslmode=disable" down

docker-build:
	docker-compose build

docker-up:
	docker-compose up -d

docker-down:
	docker-compose down

swagger:
	swag init -g cmd/api/main.go -o docs
