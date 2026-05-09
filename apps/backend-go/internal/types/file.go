package types

import "time"

// InitiateUploadRequest represents a request to initiate a file upload
type InitiateUploadRequest struct {
	FileName    string `json:"file_name"`
	FileSize    int64  `json:"file_size"`
	ContentType string `json:"content_type"`
}

// InitiateUploadResponse represents a response to an upload initiation
type InitiateUploadResponse struct {
	TransferID    string    `json:"transfer_id"`
	SessionID     string    `json:"session_id"`
	AccessToken   string    `json:"access_token"`
	ChunkCount    int       `json:"chunk_count"`
	EncryptionKey string    `json:"encryption_key"`
	ExpiresAt     time.Time `json:"expires_at"`
}

// UploadChunkRequest represents a request to upload a chunk
type UploadChunkRequest struct {
	Data string `json:"data"` // Base64 encoded chunk data
}

// UploadChunkResponse represents a response to a chunk upload
type UploadChunkResponse struct {
	Success bool `json:"success"`
}

// TransferResponse represents a file transfer
type TransferResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Size        int64     `json:"size"`
	ContentType string    `json:"content_type"`
	ExpiresAt   time.Time `json:"expires_at"`
	CreatedAt   time.Time `json:"created_at"`
	Downloaded  bool      `json:"downloaded"`
}
