package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/piyush-gambhir/safeshare-service/internal/types"
)

// HealthHandler handles health check requests
type HealthHandler struct{}

// NewHealthHandler creates a new HealthHandler
func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

// Register registers the handler routes
func (h *HealthHandler) Register(router *gin.RouterGroup) {
	router.GET("/health", h.healthCheck)
}

// healthCheck checks the health of the API
// @Summary Health check
// @Description Checks the health of the API
// @Tags health
// @Produce json
// @Success 200 {object} types.HealthResponse
// @Router /health [get]
func (h *HealthHandler) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, types.HealthResponse{
		Status: "ok",
	})
}
