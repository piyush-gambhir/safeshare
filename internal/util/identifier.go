package util

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

// GenerateDeviceID generates a unique device ID
func GenerateDeviceID() (string, error) {
	// Generate 32 random bytes
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	// Encode as URL-safe base64
	deviceID := base64.RawURLEncoding.EncodeToString(bytes)

	return deviceID, nil
}
