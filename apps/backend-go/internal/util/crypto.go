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
	KeyLength  = 32
	SaltLength = 16
	Iterations = 10000
)

func GenerateRandomBytes(length int) ([]byte, error) {
	b := make([]byte, length)
	_, err := rand.Read(b)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func GenerateEncryptionKey() (string, error) {
	key, err := GenerateRandomBytes(KeyLength)
	if err != nil {
		return "", err
	}
	return base64.URLEncoding.EncodeToString(key), nil
}

func DeriveKey(password, salt []byte) []byte {
	return pbkdf2.Key(password, salt, Iterations, KeyLength, sha256.New)
}

func GenerateSalt() ([]byte, error) {
	return GenerateRandomBytes(SaltLength)
}

func EncryptWithKey(data, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	iv, err := GenerateRandomBytes(aes.BlockSize)
	if err != nil {
		return nil, err
	}

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	ciphertext := aesgcm.Seal(nil, iv, data, nil)

	result := make([]byte, len(iv)+len(ciphertext))
	copy(result, iv)
	copy(result[len(iv):], ciphertext)

	return result, nil
}

func DecryptWithKey(data, key []byte) ([]byte, error) {
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}

	if len(data) < aes.BlockSize {
		return nil, fmt.Errorf("ciphertext too short")
	}

	iv := data[:aes.BlockSize]
	ciphertext := data[aes.BlockSize:]

	aesgcm, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}

	plaintext, err := aesgcm.Open(nil, iv, ciphertext, nil)
	if err != nil {
		return nil, err
	}

	return plaintext, nil
}

func GenerateRandomToken(length int) (string, error) {
	bytes, err := GenerateRandomBytes(length)
	if err != nil {
		return "", err
	}
	return hex.EncodeToString(bytes), nil
}

func GenerateAccessToken() (string, error) {
	token, err := GenerateRandomToken(16)
	if err != nil {
		return "", err
	}

	parts := []string{
		token[0:8],
		token[8:16],
		token[16:24],
		token[24:32],
	}

	return strings.Join(parts, "-"), nil
}

func HashDeviceID(deviceID string) string {
	hash := sha256.Sum256([]byte(deviceID))
	return hex.EncodeToString(hash[:])
}
