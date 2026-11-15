package util

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
)

func GenerateDeviceID() (string, error) {
	bytes := make([]byte, 32)
	_, err := rand.Read(bytes)
	if err != nil {
		return "", fmt.Errorf("failed to generate random bytes: %w", err)
	}

	deviceID := base64.RawURLEncoding.EncodeToString(bytes)

	return deviceID, nil
}
