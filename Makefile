.PHONY: build run test clean lint generate-sqlc migrate migrate-up migrate-down help docker-build docker-up docker-down swagger
# Default target
all: build
# Help command
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
# Build the application
build:
	go build -o bin/safeshare-service ./cmd/api
# Run the application
run:
	go run ./cmd/api
# Run tests
test:
	go test -v ./...
# Clean build artifacts
clean:
	rm -rf bin
	rm -rf tmp
# Run linters
lint:
	golangci-lint run
# Generate SQLC code
generate-sqlc:
	sqlc generate
# Create a new migration
migrate:
	@read -p "Enter migration name: " name; \
	goose -dir=./migrations create $$name sql
# Run migrations up
migrate-up:
	goose -dir=./migrations postgres "host=localhost user=postgres password=postgres123 dbname=safeshare sslmode=disable" up
# Run migrations down
migrate-down:
	goose -dir=./migrations postgres "host=localhost user=postgres password=postgres123 dbname=safeshare sslmode=disable" down
# Build Docker images
docker-build:
	docker-compose build
# Start Docker containers
docker-up:
	docker-compose up -d
# Stop Docker containers
docker-down:
	docker-compose down
# Generate Swagger documentation
swagger:
	swag init -g cmd/api/main.go -o docs
