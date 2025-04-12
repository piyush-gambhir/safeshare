package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment    string
	ServerPort     string
	DatabaseURL    string
	RedisURL       string
	RabbitMQURL    string
	MaxFileSize    int64 // in bytes
	FileExpiration time.Duration
	JWTSecret      string
	CORSOrigins    []string
}

// LoadConfig loads configuration from environment variables
func LoadConfig() (*Config, error) {
	// Load .env file if it exists
	godotenv.Load()

	// Set default values
	config := &Config{
		Environment:    getEnv("ENVIRONMENT", "development"),
		ServerPort:     getEnv("PORT", "8080"),
		DatabaseURL:    getEnv("DATABASE_URL", "postgres://postgres:postgres@localhost:5432/safeshare?sslmode=disable"),
		RedisURL:       getEnv("REDIS_URL", "redis://localhost:6379/0"),
		RabbitMQURL:    getEnv("RABBITMQ_URL", "amqp://guest:guest@localhost:5672/"),
		MaxFileSize:    getEnvAsInt64("MAX_FILE_SIZE", 5*1024*1024*1024), // 5GB default
		FileExpiration: getEnvAsDuration("FILE_EXPIRATION", 24*time.Hour),
		JWTSecret:      getEnv("JWT_SECRET", "your-secret-key"),
		CORSOrigins:    getEnvAsSlice("CORS_ORIGINS", []string{"*"}),
	}

	// Validate required config
	if config.JWTSecret == "your-secret-key" && config.Environment == "production" {
		return nil, fmt.Errorf("JWT_SECRET must be set in production environment")
	}

	return config, nil
}

func getEnv(key, defaultValue string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return defaultValue
}

func getEnvAsInt64(key string, defaultValue int64) int64 {
	if value, exists := os.LookupEnv(key); exists {
		if intVal, err := strconv.ParseInt(value, 10, 64); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvAsDuration(key string, defaultValue time.Duration) time.Duration {
	if value, exists := os.LookupEnv(key); exists {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return strings.Split(value, ",")
	}
	return defaultValue
}
