package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/piyush-gambhir/safeshare-service/internal/service"
	"github.com/piyush-gambhir/safeshare-service/internal/types"
	"github.com/piyush-gambhir/safeshare-service/internal/util"
)

// AuthHandler handles authentication requests
type AuthHandler struct {
	authService service.AuthServiceInterface
}

// NewAuthHandler creates a new AuthHandler
func NewAuthHandler(authService service.AuthServiceInterface) *AuthHandler {
	return &AuthHandler{
		authService: authService,
	}
}

// Register registers the handler routes
func (h *AuthHandler) Register(router *gin.RouterGroup) {
	router.POST("/auth/device", h.createDeviceID)
	router.POST("/auth/login", h.login)
}

// createDeviceID creates a new device ID
// @Summary Create a new device ID
// @Description Creates a new unique device ID for anonymous authentication
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} types.DeviceIDResponse
// @Router /auth/device [post]
func (h *AuthHandler) createDeviceID(c *gin.Context) {
	// Generate a new device ID
	deviceID, err := util.GenerateDeviceID()
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to generate device ID",
		})
		return
	}

	// Return the device ID
	c.JSON(http.StatusOK, types.DeviceIDResponse{
		DeviceID: deviceID,
	})
}

// login logs in a user with a device ID
// @Summary Login with device ID
// @Description Logs in a user with a device ID, creating a new user if necessary
// @Tags auth
// @Accept json
// @Produce json
// @Param request body types.LoginRequest true "Login request"
// @Success 200 {object} types.LoginResponse
// @Failure 400 {object} types.ErrorResponse
// @Failure 500 {object} types.ErrorResponse
// @Router /auth/login [post]
func (h *AuthHandler) login(c *gin.Context) {
	// Parse request
	var req types.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	// Validate request
	if req.DeviceID == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Device ID is required",
		})
		return
	}

	// Identify user
	userID, err := h.authService.IdentifyUser(c, req.DeviceID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to identify user: " + err.Error(),
		})
		return
	}

	// Generate token
	token, err := h.authService.GenerateToken(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to generate token: " + err.Error(),
		})
		return
	}

	// Return response
	c.JSON(http.StatusOK, types.LoginResponse{
		Token:  token,
		UserID: userID,
	})
}
