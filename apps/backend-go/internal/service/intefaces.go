package service

import (
	"context"
	"io"

	"github.com/piyush-gambhir/safeshare-service/internal/repository"
)

// AuthServiceInterface defines the interface for the authentication service
type AuthServiceInterface interface {
	// IdentifyUser identifies a user by device ID, creating a new user if necessary
	IdentifyUser(ctx context.Context, deviceID string) (string, error)

	// GenerateToken generates a JWT token for a user
	GenerateToken(userID string) (string, error)

	// ValidateToken validates a JWT token
	ValidateToken(tokenString string) (string, error)
}

// FileTransferServiceInterface defines the interface for the file transfer service
type FileTransferServiceInterface interface {
	// InitiateUpload initiates a file upload
	InitiateUpload(
		ctx context.Context,
		userID string,
		fileName string,
		fileSize int64,
		contentType string,
	) (repository.Transfer, repository.Session, string, error)

	// UploadChunk uploads a chunk of a file
	UploadChunk(
		ctx context.Context,
		sessionID string,
		chunkIndex int,
		chunkData string,
	) error

	// GetTransferByAccessToken gets a transfer by access token
	GetTransferByAccessToken(ctx context.Context, accessToken string) (repository.Transfer, error)

	// DownloadTransfer downloads a transfer
	DownloadTransfer(ctx context.Context, transferID string) (io.Reader, repository.Transfer, error)

	// GetUserTransfers gets transfers for a user
	GetUserTransfers(ctx context.Context, userID string) ([]repository.Transfer, error)
}

// WebRTCServiceInterface defines the interface for the WebRTC service
type WebRTCServiceInterface interface {
	// CreateRoom creates a new WebRTC room for signaling
	CreateRoom(ctx context.Context, userID string, transferID string) (string, error)

	// JoinRoom joins a WebRTC room
	JoinRoom(ctx context.Context, userID string, roomID string) error

	// StoreSignalData stores WebRTC signaling data
	StoreSignalData(ctx context.Context, roomID string, signalType string, data string) error

	// GetSignalData gets WebRTC signaling data
	GetSignalData(ctx context.Context, roomID string, signalType string) ([]string, error)

	// UpdateRoomStatus updates the status of a WebRTC room
	UpdateRoomStatus(ctx context.Context, roomID string, status string) error
}
