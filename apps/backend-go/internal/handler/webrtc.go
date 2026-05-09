package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/piyush-gambhir/safeshare-service/internal/middleware"
	"github.com/piyush-gambhir/safeshare-service/internal/service"
	"github.com/piyush-gambhir/safeshare-service/internal/types"
)

// WebRTCHandler handles WebRTC signaling requests
type WebRTCHandler struct {
	webrtcService service.WebRTCServiceInterface
	authService   service.AuthServiceInterface
}

// NewWebRTCHandler creates a new WebRTCHandler
func NewWebRTCHandler(webrtcService service.WebRTCServiceInterface, authService service.AuthServiceInterface) *WebRTCHandler {
	return &WebRTCHandler{
		webrtcService: webrtcService,
		authService:   authService,
	}
}

// Register registers the handler routes
func (h *WebRTCHandler) Register(router *gin.RouterGroup) {
	// Authenticated routes
	auth := router.Group("/webrtc")
	auth.Use(middleware.AuthMiddleware(h.authService))
	{
		auth.POST("/rooms", h.createRoom)
		auth.POST("/rooms/:roomID/join", h.joinRoom)
		auth.POST("/signal", h.signal)
		auth.GET("/signal/:roomID/:type", h.getSignal)
	}
}

// createRoom creates a new WebRTC room
// @Summary Create a WebRTC room
// @Description Creates a new WebRTC room for P2P file transfer
// @Tags webrtc
// @Accept json
// @Produce json
// @Param request body types.CreateWebRTCRoomRequest true "Room creation request"
// @Success 200 {object} types.CreateWebRTCRoomResponse
// @Failure 400 {object} types.ErrorResponse
// @Failure 401 {object} types.ErrorResponse
// @Failure 500 {object} types.ErrorResponse
// @Security BearerAuth
// @Router /webrtc/rooms [post]
func (h *WebRTCHandler) createRoom(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	// Parse request
	var req types.CreateWebRTCRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	// Validate request
	if req.TransferID == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Transfer ID is required",
		})
		return
	}

	// Create room
	roomID, err := h.webrtcService.CreateRoom(c, userID.(string), req.TransferID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to create room: " + err.Error(),
		})
		return
	}

	// Return response
	c.JSON(http.StatusOK, types.CreateWebRTCRoomResponse{
		RoomID: roomID,
	})
}

// joinRoom joins a WebRTC room
// @Summary Join a WebRTC room
// @Description Joins an existing WebRTC room for P2P file transfer
// @Tags webrtc
// @Accept json
// @Produce json
// @Param roomID path string true "Room ID"
// @Success 200 {object} types.WebRTCSignalResponse
// @Failure 400 {object} types.ErrorResponse
// @Failure 401 {object} types.ErrorResponse
// @Failure 500 {object} types.ErrorResponse
// @Security BearerAuth
// @Router /webrtc/rooms/{roomID}/join [post]
func (h *WebRTCHandler) joinRoom(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	// Get room ID from path
	roomID := c.Param("roomID")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Room ID is required",
		})
		return
	}

	// Join room
	err := h.webrtcService.JoinRoom(c, userID.(string), roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to join room: " + err.Error(),
		})
		return
	}

	// Return response
	c.JSON(http.StatusOK, types.WebRTCSignalResponse{
		Success: true,
	})
}

// signal sends a WebRTC signal
// @Summary Send WebRTC signal
// @Description Sends a WebRTC signaling message (offer, answer, or ICE candidate)
// @Tags webrtc
// @Accept json
// @Produce json
// @Param request body types.WebRTCSignalRequest true "Signal request"
// @Success 200 {object} types.WebRTCSignalResponse
// @Failure 400 {object} types.ErrorResponse
// @Failure 401 {object} types.ErrorResponse
// @Failure 500 {object} types.ErrorResponse
// @Security BearerAuth
// @Router /webrtc/signal [post]
func (h *WebRTCHandler) signal(c *gin.Context) {
	// Get user ID from context (not used but ensures auth)
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	// Parse request
	var req types.WebRTCSignalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	// Validate request
	if req.RoomID == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Room ID is required",
		})
		return
	}
	if req.Type == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Signal type is required",
		})
		return
	}
	if req.Data == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Signal data is required",
		})
		return
	}

	// Store signal
	err := h.webrtcService.StoreSignalData(c, req.RoomID, req.Type, req.Data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to store signal: " + err.Error(),
		})
		return
	}

	// Update room status for special signals
	if req.Type == "offer" || req.Type == "answer" {
		status := "signaling"
		if req.Type == "answer" {
			status = "connected"
		}
		err = h.webrtcService.UpdateRoomStatus(c, req.RoomID, status)
		if err != nil {
			// Non-fatal error, just log it
			c.Error(err)
		}
	}

	// Return response
	c.JSON(http.StatusOK, types.WebRTCSignalResponse{
		Success: true,
	})
}

// getSignal gets WebRTC signals
// @Summary Get WebRTC signals
// @Description Gets WebRTC signaling messages (offers, answers, or ICE candidates)
// @Tags webrtc
// @Produce json
// @Param roomID path string true "Room ID"
// @Param type path string true "Signal type"
// @Success 200 {array} string
// @Failure 400 {object} types.ErrorResponse
// @Failure 401 {object} types.ErrorResponse
// @Failure 500 {object} types.ErrorResponse
// @Security BearerAuth
// @Router /webrtc/signal/{roomID}/{type} [get]
func (h *WebRTCHandler) getSignal(c *gin.Context) {
	// Get user ID from context (not used but ensures auth)
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	// Get parameters from path
	roomID := c.Param("roomID")
	signalType := c.Param("type")

	// Validate parameters
	if roomID == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Room ID is required",
		})
		return
	}
	if signalType == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Signal type is required",
		})
		return
	}

	// Get signals
	signals, err := h.webrtcService.GetSignalData(c, roomID, signalType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to get signals: " + err.Error(),
		})
		return
	}

	// Return response
	c.JSON(http.StatusOK, signals)
}
