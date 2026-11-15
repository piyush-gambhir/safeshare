package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/piyush-gambhir/safeshare-service/internal/service"
	"github.com/piyush-gambhir/safeshare-service/internal/types"
	"github.com/piyush-gambhir/safeshare-service/internal/util"
)

type AuthHandler struct {
	authService service.AuthServiceInterface
}

func NewAuthHandler(authService service.AuthServiceInterface) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

func (h *AuthHandler) Register(router *gin.RouterGroup) {
	router.POST("/auth/device", h.createDeviceID)
	router.POST("/auth/login", h.login)
}

func (h *AuthHandler) createDeviceID(c *gin.Context) {
	deviceID, err := util.GenerateDeviceID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to generate device ID",
		})
		return
	}

	c.JSON(http.StatusOK, types.DeviceIDResponse{
		DeviceID: deviceID,
	})
}

func (h *AuthHandler) login(c *gin.Context) {
	var req types.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	if req.DeviceID == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Device ID is required",
		})
		return
	}

	userID, err := h.authService.IdentifyUser(c, req.DeviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to identify user: " + err.Error(),
		})
		return
	}

	token, err := h.authService.GenerateToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to generate token: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.LoginResponse{
		Token:  token,
		UserID: userID,
	})
}
