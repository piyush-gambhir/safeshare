package types

import "time"

type InitiateUploadRequest struct {
	FileName    string `json:"file_name"`
	FileSize    int64  `json:"file_size"`
	ContentType string `json:"content_type"`
}

type InitiateUploadResponse struct {
	TransferID    string    `json:"transfer_id"`
	SessionID     string    `json:"session_id"`
	AccessToken   string    `json:"access_token"`
	ChunkCount    int       `json:"chunk_count"`
	EncryptionKey string    `json:"encryption_key"`
	ExpiresAt     time.Time `json:"expires_at"`
}

type UploadChunkRequest struct {
	Data string `json:"data"`
}

type UploadChunkResponse struct {
	Success bool `json:"success"`
}

type TransferResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Size        int64     `json:"size"`
	ContentType string    `json:"content_type"`
	ExpiresAt   time.Time `json:"expires_at"`
	CreatedAt   time.Time `json:"created_at"`
	Downloaded  bool      `json:"downloaded"`
}
