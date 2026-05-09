package handler

import (
	"fmt"
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/piyush-gambhir/safeshare-service/internal/middleware"
	"github.com/piyush-gambhir/safeshare-service/internal/service"
	"github.com/piyush-gambhir/safeshare-service/internal/types"
)

// FileHandler handles file transfer requests
type FileHandler struct {
	fileService service.FileTransferServiceInterface
	authService service.AuthServiceInterface
}

// NewFileHandler creates a new FileHandler
func NewFileHandler(fileService service.FileTransferServiceInterface, authService service.AuthServiceInterface) *FileHandler {
	return &FileHandler{
		fileService: fileService,
		authService: authService,
	}
}

// Register registers the handler routes
func (h *FileHandler) Register(router *gin.RouterGroup) {
	// Public routes
	router.GET("/transfers/:accessToken", h.getTransferByAccessToken)
	router.GET("/transfers/:accessToken/download", h.downloadTransfer)

	// Authenticated routes
	auth := router.Group("/")
	auth.Use(middleware.AuthMiddleware(h.authService))
	{
		auth.POST("/transfers", h.initiateUpload)
		auth.POST("/transfers/:sessionID/chunks/:chunkIndex", h.uploadChunk)
		auth.GET("/transfers", h.getUserTransfers)
	}
}

// initiateUpload initiates a file upload
// @Summary Initiate a file upload
// @Description Initiates a new file upload and returns upload details
// @Tags transfers
// @Accept json
// @Produce json
// @Param request body types.InitiateUploadRequest true "Upload request"
// @Success 200 {object} types.InitiateUploadResponse
// @Failure 400 {object} types.ErrorResponse
// @Failure 401 {object} types.ErrorResponse
// @Failure 500 {object} types.ErrorResponse
// @Security BearerAuth
// @Router /transfers [post]
func (h *FileHandler) initiateUpload(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	// Parse request
	var req types.InitiateUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	// Validate request
	if req.FileName == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "File name is required",
		})
		return
	}
	if req.FileSize <= 0 {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "File size must be greater than 0",
		})
		return
	}
	if req.ContentType == "" {
		req.ContentType = "application/octet-stream"
	}

	// Initiate upload
	transfer, session, encryptionKey, err := h.fileService.InitiateUpload(
		c,
		userID.(string),
		req.FileName,
		req.FileSize,
		req.ContentType,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to initiate upload: " + err.Error(),
		})
		return
	}

	// Return response
	c.JSON(http.StatusOK, types.InitiateUploadResponse{
		TransferID:    transfer.ID.String(),
		SessionID:     session.ID.String(),
		AccessToken:   transfer.AccessToken,
		ChunkCount:    int(session.ChunkCount),
		EncryptionKey: encryptionKey,
		ExpiresAt:     transfer.ExpiresAt,
	})
}

// uploadChunk uploads a chunk of a file
// @Summary Upload a file chunk
// @Description Uploads a chunk of a file
// @Tags transfers
// @Accept json
// @Produce json
// @Param sessionID path string true "Session ID"
// @Param chunkIndex path int true "Chunk index"
// @Param request body types.UploadChunkRequest true "Chunk data"
// @Success 200 {object} types.UploadChunkResponse
// @Failure 400 {object} types.ErrorResponse
// @Failure 401 {object} types.ErrorResponse
// @Failure 500 {object} types.ErrorResponse
// @Security BearerAuth
// @Router /transfers/{sessionID}/chunks/{chunkIndex} [post]
func (h *FileHandler) uploadChunk(c *gin.Context) {
	// Get session ID and chunk index from path
	sessionID := c.Param("sessionID")
	chunkIndexStr := c.Param("chunkIndex")

	// Parse chunk index
	chunkIndex, err := strconv.Atoi(chunkIndexStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid chunk index",
		})
		return
	}

	// Parse request
	var req types.UploadChunkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	// Validate request
	if req.Data == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Chunk data is required",
		})
		return
	}

	// Upload chunk
	err = h.fileService.UploadChunk(c, sessionID, chunkIndex, req.Data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to upload chunk: " + err.Error(),
		})
		return
	}

	// Return response
	c.JSON(http.StatusOK, types.UploadChunkResponse{
		Success: true,
	})
}

// getTransferByAccessToken gets a transfer by access token
// @Summary Get transfer details
// @Description Gets transfer details by access token
// @Tags transfers
// @Produce json
// @Param accessToken path string true "Access token"
// @Success 200 {object} types.TransferResponse
// @Failure 400 {object} types.ErrorResponse
// @Failure 404 {object} types.ErrorResponse
// @Failure 500 {object} types.ErrorResponse
// @Router /transfers/{accessToken} [get]
func (h *FileHandler) getTransferByAccessToken(c *gin.Context) {
	// Get access token from path
	accessToken := c.Param("accessToken")

	// Get transfer
	transfer, err := h.fileService.GetTransferByAccessToken(c, accessToken)
	if err != nil {
		c.JSON(http.StatusNotFound, types.ErrorResponse{
			Error: "Transfer not found",
		})
		return
	}

	// Return response
	c.JSON(http.StatusOK, types.TransferResponse{
		ID:          transfer.ID.String(),
		Name:        transfer.Name,
		Size:        transfer.Size,
		ContentType: transfer.ContentType,
		ExpiresAt:   transfer.ExpiresAt,
		CreatedAt:   transfer.CreatedAt,
		Downloaded:  transfer.Downloaded,
	})
}

// downloadTransfer downloads a transfer
// @Summary Download a file
// @Description Downloads a file by access token
// @Tags transfers
// @Produce octet-stream
// @Param accessToken path string true "Access token"
// @Success 200 {file} binary
// @Failure 400 {object} types.ErrorResponse
// @Failure 404 {object} types.ErrorResponse
// @Failure 500 {object} types.ErrorResponse
// @Router /transfers/{accessToken}/download [get]
func (h *FileHandler) downloadTransfer(c *gin.Context) {
	// Get access token from path
	accessToken := c.Param("accessToken")

	// Get transfer
	transfer, err := h.fileService.GetTransferByAccessToken(c, accessToken)
	if err != nil {
		c.JSON(http.StatusNotFound, types.ErrorResponse{
			Error: "Transfer not found",
		})
		return
	}

	// Download transfer
	reader, transfer, err := h.fileService.DownloadTransfer(c, transfer.ID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to download transfer: " + err.Error(),
		})
		return
	}

	// Set headers for file download
	contentDisposition := fmt.Sprintf("attachment; filename=\"%s\"", transfer.Name)
	c.Header("Content-Disposition", contentDisposition)
	c.Header("Content-Type", transfer.ContentType)
	c.Header("Content-Length", strconv.FormatInt(transfer.Size, 10))

	// Stream the file
	c.Status(http.StatusOK)
	io.Copy(c.Writer, reader)
}

// getUserTransfers gets transfers for a user
// @Summary Get user transfers
// @Description Gets transfers for the logged in user
// @Tags transfers
// @Produce json
// @Success 200 {array} types.TransferResponse
// @Failure 401 {object} types.ErrorResponse
// @Failure 500 {object} types.ErrorResponse
// @Security BearerAuth
// @Router /transfers [get]
func (h *FileHandler) getUserTransfers(c *gin.Context) {
	// Get user ID from context
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	// Get transfers
	transfers, err := h.fileService.GetUserTransfers(c, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to get transfers: " + err.Error(),
		})
		return
	}

	// Convert to response
	var response []types.TransferResponse
	for _, transfer := range transfers {
		response = append(response, types.TransferResponse{
			ID:          transfer.ID.String(),
			Name:        transfer.Name,
			Size:        transfer.Size,
			ContentType: transfer.ContentType,
			ExpiresAt:   transfer.ExpiresAt,
			CreatedAt:   transfer.CreatedAt,
			Downloaded:  transfer.Downloaded,
		})
	}

	// Return response
	c.JSON(http.StatusOK, response)
}
