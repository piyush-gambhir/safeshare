package util

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"strings"

	"golang.org/x/crypto/pbkdf2"
)

const (
	// KeyLength is the length of the encryption key in bytes
	KeyLength = 32
	// SaltLength is the length of the salt in bytes
	SaltLength = 16
	// Iterations is the number of iterations for PBKDF2
	Iterations = 10000
)

// GenerateRandomBytes generates random bytes of the specified length
func GenerateRandomBytes(length int) ([]byte, error) {
	b := make([]byte, length)
	_, err := rand.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

// GenerateEncryptionKey generates a random encryption key
func GenerateEncryptionKey() (string, error) {
	key, err := GenerateRandomBytes(KeyLength)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(key), nil
}

// DeriveKey derives a key from a password and salt using PBKDF2
func DeriveKey(password, salt []byte) []byte {
	return pbkdf2.Key(password, salt, Iterations, KeyLength, sha256.New)
}

// GenerateSalt generates a random salt for key derivation
func GenerateSalt() ([]byte, error) {
	return GenerateRandomBytes(SaltLength)
}

// EncryptWithKey encrypts data with the given key
func EncryptWithKey(data, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	// Generate a random IV
	iv, err := GenerateRandomBytes(aes.BlockSize)
	if err != nil {
		return nil, err
	}

	// Use GCM mode for authenticated encryption
	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// Encrypt the data
	ciphertext := aesgcm.Seal(nil, iv, data, nil)

	// Prepend the IV to the ciphertext
	result := make([]byte, len(iv)+len(ciphertext))
	copy(result, iv)
	copy(result[len(iv):], ciphertext)

	return result, nil
}

// DecryptWithKey decrypts data with the given key
func DecryptWithKey(data, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	// Check if the data is large enough to contain the IV and ciphertext
	if len(data) < aes.BlockSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	// Extract the IV from the beginning of the data
	iv := data[:aes.BlockSize]
	ciphertext := data[aes.BlockSize:]

	// Use GCM mode for authenticated decryption
	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	// Decrypt the data
	plaintext, err := aesgcm.Open(nil, iv, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}

// GenerateRandomToken generates a random hex string token
func GenerateRandomToken(length int) (string, error) {
	bytes, err := GenerateRandomBytes(length)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

// GenerateAccessToken generates a random access token for file transfers
func GenerateAccessToken() (string, error) {
	token, err := GenerateRandomToken(16)
	if err != nil {
		return "", err
	}

	// Format as 4 groups of 8 characters for better readability
	// Example: 1a2b3c4d-5e6f7g8h-9i0j1k2l-3m4n5o6p
	parts := []string{
		token[0:8],
		token[8:16],
		token[16:24],
		token[24:32],
	}

	return strings.Join(parts, "-"), nil
}

// HashDeviceID hashes a device ID to create a fingerprint
func HashDeviceID(deviceID string) string {
	hash := sha256.Sum256([]byte(deviceID))
	return hex.EncodeToString(hash[:])
}
