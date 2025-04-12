package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	_ "github.com/jackc/pgx/v5/pgxpool"
	"github.com/piyush-gambhir/safeshare-service/internal/config"
	"github.com/piyush-gambhir/safeshare-service/internal/database"
	"github.com/piyush-gambhir/safeshare-service/internal/handler"
	"github.com/piyush-gambhir/safeshare-service/internal/middleware"
	"github.com/piyush-gambhir/safeshare-service/internal/queue"
	"github.com/piyush-gambhir/safeshare-service/internal/repository"
	"github.com/piyush-gambhir/safeshare-service/internal/service"
	"github.com/piyush-gambhir/safeshare-service/internal/storage"
	_ "github.com/redis/go-redis/v9"
	swaggerFiles "github.com/swaggo/files"
	ginSwagger "github.com/swaggo/gin-swagger"
	"golang.org/x/time/rate"

	_ "github.com/piyush-gambhir/safeshare-service/docs" // Import swagger docs
)

// @title SafeShare API
// @version 1.0
// @description End-to-End Encrypted File Sharing Service
// @BasePath /api
// @securityDefinitions.apikey BearerAuth
// @in header
// @name Authorization
func main() {
	// Create context
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Load configuration
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	// Set up database connection
	db, err := database.NewPgPool(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	// Set up Redis connection
	redisClient, err := database.NewRedisClient(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	// Set up RabbitMQ connection
	rabbitMQ, err := queue.NewRabbitMQ(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer rabbitMQ.Close()

	// Set up repository
	queries := repository.New(db)

	// Set up producer
	producer := queue.NewProducer(rabbitMQ.Channel())

	// Set up consumer
	consumer := queue.NewConsumer(rabbitMQ.Channel(), queries, redisClient)
	if err := consumer.StartConsumers(ctx); err != nil {
		log.Fatalf("Failed to start consumers: %v", err)
	}

	// Schedule first cleanup
	err = producer.PublishCleanup(ctx, queue.CleanupEvent{
		RunAt: time.Now(),
	})
	if err != nil {
		log.Fatalf("Failed to schedule cleanup: %v", err)
	}

	// Set up services
	authService := service.NewAuthService(cfg, queries)
	storageManager := storage.NewTemporaryStorageManager(redisClient, queries)
	fileService := service.NewFileTransferService(queries, storageManager, producer)

	// Set up WebRTC service
	webrtcService := service.NewWebRTCService(queries, redisClient)

	// Set up handlers
	authHandler := handler.NewAuthHandler(authService)
	fileHandler := handler.NewFileHandler(fileService, *authService)
	healthHandler := handler.NewHealthHandler()
	webrtcHandler := handler.NewWebRTCHandler(webrtcService, authService)

	// Set up rate limiter
	limiter := middleware.NewIPRateLimiter(rate.Limit(10), 30) // 10 requests per second with burst of 30

	// Set up API server
	router := setupRouter(cfg, authService, limiter)

	// Register routes
	apiGroup := router.Group("/api")
	authHandler.Register(apiGroup)
	fileHandler.Register(apiGroup)
	healthHandler.Register(apiGroup)
	webrtcHandler.Register(apiGroup)

	// Set up Swagger
	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	// Serve static files for WebRTC client
	router.Static("/js", "./public/js")
	router.StaticFile("/webrtc-test.html", "./public/webrtc-test.html")

	// Start server
	srv := &http.Server{
		Addr:    ":" + cfg.ServerPort,
		Handler: router,
	}

	// Start server in a goroutine
	go func() {
		fmt.Printf("Server listening on port %s\n", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	// Handle graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	// Create shutdown context with 10 second timeout
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func setupRouter(cfg *config.Config, authService service.AuthServiceInterface, limiter *middleware.IPRateLimiter) *gin.Engine {
	// Set mode
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	// Use middleware
	router.Use(gin.Recovery())
	router.Use(middleware.LoggerMiddleware())
	router.Use(middleware.RateLimiterMiddleware(limiter))

	// Set up CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = cfg.CORSOrigins
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Content-Length", "Accept-Encoding", "X-CSRF-Token", "Authorization"}
	corsConfig.ExposeHeaders = []string{"Content-Length", "Content-Disposition"}
	corsConfig.AllowCredentials = true
	corsConfig.MaxAge = 12 * time.Hour
	router.Use(cors.New(corsConfig))

	return router
}

// AuthMiddleware creates middleware for the auth handler
func AuthMiddleware() gin.HandlerFunc {
	// This is just a stub that will be replaced with the actual auth middleware
	// We need this to make the code compile since we can't directly import the middleware package here
	return func(c *gin.Context) {
		c.Next()
	}
}
