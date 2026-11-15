package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/piyush-gambhir/safeshare-service/internal/types"
)

type HealthHandler struct{}

func NewHealthHandler() *HealthHandler {
	return &HealthHandler{}
}

func (h *HealthHandler) Register(router *gin.RouterGroup) {
	router.GET("/health", h.healthCheck)
}

func (h *HealthHandler) healthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, types.HealthResponse{
		Status: "ok",
	})
}
