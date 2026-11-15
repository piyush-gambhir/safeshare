package service

import (
	"context"
	"io"

	"github.com/piyush-gambhir/safeshare-service/internal/repository"
)

type AuthServiceInterface interface {
	IdentifyUser(ctx context.Context, deviceID string) (string, error)

	GenerateToken(userID string) (string, error)

	ValidateToken(tokenString string) (string, error)
}

type FileTransferServiceInterface interface {
	InitiateUpload(
		ctx context.Context,
		userID string,
		fileName string,
		fileSize int64,
		contentType string,
	) (repository.Transfer, repository.Session, string, error)

	UploadChunk(
		ctx context.Context,
		sessionID string,
		chunkIndex int,
		chunkData string,
	) error

	GetTransferByAccessToken(ctx context.Context, accessToken string) (repository.Transfer, error)

	DownloadTransfer(ctx context.Context, transferID string) (io.Reader, repository.Transfer, error)

	GetUserTransfers(ctx context.Context, userID string) ([]repository.Transfer, error)
}

type WebRTCServiceInterface interface {
	CreateRoom(ctx context.Context, userID string, transferID string) (string, error)

	JoinRoom(ctx context.Context, userID string, roomID string) error

	StoreSignalData(ctx context.Context, roomID string, signalType string, data string) error

	GetSignalData(ctx context.Context, roomID string, signalType string) ([]string, error)

	UpdateRoomStatus(ctx context.Context, roomID string, status string) error
}
