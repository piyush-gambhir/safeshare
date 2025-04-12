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
