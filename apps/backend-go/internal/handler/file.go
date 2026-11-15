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

type FileHandler struct {
	fileService service.FileTransferServiceInterface
	authService service.AuthServiceInterface
}

func NewFileHandler(fileService service.FileTransferServiceInterface, authService service.AuthServiceInterface) *FileHandler {
	return &FileHandler{
		fileService: fileService,
		authService: authService,
	}
}

func (h *FileHandler) Register(router *gin.RouterGroup) {
	router.GET("/transfers/:accessToken", h.getTransferByAccessToken)
	router.GET("/transfers/:accessToken/download", h.downloadTransfer)

	auth := router.Group("/")
	auth.Use(middleware.AuthMiddleware(h.authService))
	{
		auth.POST("/transfers", h.initiateUpload)
		auth.POST("/transfers/:sessionID/chunks/:chunkIndex", h.uploadChunk)
		auth.GET("/transfers", h.getUserTransfers)
	}
}

func (h *FileHandler) initiateUpload(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	var req types.InitiateUploadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

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

	c.JSON(http.StatusOK, types.InitiateUploadResponse{
		TransferID:    transfer.ID.String(),
		SessionID:     session.ID.String(),
		AccessToken:   transfer.AccessToken,
		ChunkCount:    int(session.ChunkCount),
		EncryptionKey: encryptionKey,
		ExpiresAt:     transfer.ExpiresAt,
	})
}

func (h *FileHandler) uploadChunk(c *gin.Context) {
	sessionID := c.Param("sessionID")
	chunkIndexStr := c.Param("chunkIndex")

	chunkIndex, err := strconv.Atoi(chunkIndexStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid chunk index",
		})
		return
	}

	var req types.UploadChunkRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	if req.Data == "" {
		c.JSON(http.StatusBadRequest, types.ErrorResponse{
			Error: "Chunk data is required",
		})
		return
	}

	err = h.fileService.UploadChunk(c, sessionID, chunkIndex, req.Data)
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to upload chunk: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, types.UploadChunkResponse{
		Success: true,
	})
}

func (h *FileHandler) getTransferByAccessToken(c *gin.Context) {
	accessToken := c.Param("accessToken")

	transfer, err := h.fileService.GetTransferByAccessToken(c, accessToken)
	if err != nil {
		c.JSON(http.StatusNotFound, types.ErrorResponse{
			Error: "Transfer not found",
		})
		return
	}

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

func (h *FileHandler) downloadTransfer(c *gin.Context) {
	accessToken := c.Param("accessToken")

	transfer, err := h.fileService.GetTransferByAccessToken(c, accessToken)
	if err != nil {
		c.JSON(http.StatusNotFound, types.ErrorResponse{
			Error: "Transfer not found",
		})
		return
	}

	reader, transfer, err := h.fileService.DownloadTransfer(c, transfer.ID.String())
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to download transfer: " + err.Error(),
		})
		return
	}

	contentDisposition := fmt.Sprintf("attachment; filename=\"%s\"", transfer.Name)
	c.Header("Content-Disposition", contentDisposition)
	c.Header("Content-Type", transfer.ContentType)
	c.Header("Content-Length", strconv.FormatInt(transfer.Size, 10))

	c.Status(http.StatusOK)
	io.Copy(c.Writer, reader)
}

func (h *FileHandler) getUserTransfers(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, types.ErrorResponse{
			Error: "Unauthorized",
		})
		return
	}

	transfers, err := h.fileService.GetUserTransfers(c, userID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, types.ErrorResponse{
			Error: "Failed to get transfers: " + err.Error(),
		})
		return
	}

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

	c.JSON(http.StatusOK, response)
}
