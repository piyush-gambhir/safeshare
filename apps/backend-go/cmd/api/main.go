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

	_ "github.com/piyush-gambhir/safeshare-service/docs"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Failed to load configuration: %v", err)
	}

	db, err := database.NewPgPool(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	defer db.Close()

	redisClient, err := database.NewRedisClient(ctx, cfg)
	if err != nil {
		log.Fatalf("Failed to connect to Redis: %v", err)
	}
	defer redisClient.Close()

	rabbitMQ, err := queue.NewRabbitMQ(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to RabbitMQ: %v", err)
	}
	defer rabbitMQ.Close()

	queries := repository.New(db)

	producer := queue.NewProducer(rabbitMQ.Channel())

	consumer := queue.NewConsumer(rabbitMQ.Channel(), queries, redisClient)
	if err := consumer.StartConsumers(ctx); err != nil {
		log.Fatalf("Failed to start consumers: %v", err)
	}

	err = producer.PublishCleanup(ctx, queue.CleanupEvent{
		RunAt: time.Now(),
	})
	if err != nil {
		log.Fatalf("Failed to schedule cleanup: %v", err)
	}

	authService := service.NewAuthService(cfg, queries)
	storageManager := storage.NewTemporaryStorageManager(redisClient, queries)
	fileService := service.NewFileTransferService(queries, storageManager, producer)

	webrtcService := service.NewWebRTCService(queries, redisClient)

	authHandler := handler.NewAuthHandler(authService)
	fileHandler := handler.NewFileHandler(fileService, authService)
	healthHandler := handler.NewHealthHandler()
	webrtcHandler := handler.NewWebRTCHandler(webrtcService, authService)

	limiter := middleware.NewIPRateLimiter(rate.Limit(10), 30)

	router := setupRouter(cfg, authService, limiter)

	apiGroup := router.Group("/api")
	authHandler.Register(apiGroup)
	fileHandler.Register(apiGroup)
	healthHandler.Register(apiGroup)
	webrtcHandler.Register(apiGroup)

	router.GET("/swagger/*any", ginSwagger.WrapHandler(swaggerFiles.Handler))

	router.Static("/js", "./public/js")
	router.StaticFile("/webrtc-test.html", "./public/webrtc-test.html")

	srv := &http.Server{
		Addr:    ":" + cfg.ServerPort,
		Handler: router,
	}

	go func() {
		fmt.Printf("Server listening on port %s\n", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Failed to start server: %v", err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer shutdownCancel()

	if err := srv.Shutdown(shutdownCtx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	log.Println("Server exited")
}

func setupRouter(cfg *config.Config, authService service.AuthServiceInterface, limiter *middleware.IPRateLimiter) *gin.Engine {
	if cfg.Environment == "production" {
		gin.SetMode(gin.ReleaseMode)
	}

	router := gin.New()

	router.Use(gin.Recovery())
	router.Use(middleware.LoggerMiddleware())
	router.Use(middleware.RateLimiterMiddleware(limiter))

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

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Next()
	}
}
