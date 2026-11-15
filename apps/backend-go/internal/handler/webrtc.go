package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/piyush-gambhir/safeshare-service/internal/middleware"
	"github.com/piyush-gambhir/safeshare-service/internal/service"
	"github.com/piyush-gambhir/safeshare-service/internal/types"
)

type WebRTCHandler struct {
	webrtcService service.WebRTCServiceInterface
	authService   service.AuthServiceInterface
}

func NewWebRTCHandler(webrtcService service.WebRTCServiceInterface, authService service.AuthServiceInterface) *WebRTCHandler {
	return &WebRTCHandler{
		webrtcService: webrtcService,
		authService:   authService,
	}
}

func (h *WebRTCHandler) Register(router *gin.RouterGroup) {
	auth := router.Group("/webrtc")
	auth.Use(middleware.AuthMiddleware(h.authService))
	{
		auth.POST("/rooms", h.createRoom)
		auth.POST("/rooms/:roomID/join", h.joinRoom)
		auth.POST("/signal", h.signal)
		auth.GET("/signal/:roomID/:type", h.getSignal)
	}
}

func (h *WebRTCHandler) createRoom(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	var req types.CreateWebRTCRoomRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	if req.TransferID == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Transfer ID is required",
		})
		return
	}

	roomID, err := h.webrtcService.CreateRoom(c, userID.(string), req.TransferID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to create room: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.CreateWebRTCRoomResponse{
		RoomID: roomID,
	})
}

func (h *WebRTCHandler) joinRoom(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	roomID := c.Param("roomID")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Room ID is required",
		})
		return
	}

	err := h.webrtcService.JoinRoom(c, userID.(string), roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to join room: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.WebRTCSignalResponse{
		Success: true,
	})
}

func (h *WebRTCHandler) signal(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	var req types.WebRTCSignalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

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

	err := h.webrtcService.StoreSignalData(c, req.RoomID, req.Type, req.Data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to store signal: " + err.Error(),
		})
		return
	}

	if req.Type == "offer" || req.Type == "answer" {
		status := "signaling"
		if req.Type == "answer" {
			status = "connected"
		}
		err = h.webrtcService.UpdateRoomStatus(c, req.RoomID, status)
		if err != nil {
			c.Error(err)
		}
	}

	c.JSON(http.StatusOK, types.WebRTCSignalResponse{
		Success: true,
	})
}

func (h *WebRTCHandler) getSignal(c *gin.Context) {
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	roomID := c.Param("roomID")
	signalType := c.Param("type")

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

	signals, err := h.webrtcService.GetSignalData(c, roomID, signalType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to get signals: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, signals)
}
