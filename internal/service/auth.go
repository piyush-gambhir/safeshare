package service

import (
	"context"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"github.com/piyush-gambhir/safeshare-service/internal/config"
	"github.com/piyush-gambhir/safeshare-service/internal/repository"
	"github.com/piyush-gambhir/safeshare-service/internal/util"
)

// AuthService handles authentication and user identification
type AuthService struct {
	cfg     *config.Config
	queries *repository.Queries
}

// NewAuthService creates a new AuthService
func NewAuthService(cfg *config.Config, queries *repository.Queries) *AuthService {
	return &AuthService{
		cfg:     cfg,
		queries: queries,
	}
}

// Claims represents the JWT claims
type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

// IdentifyUser identifies a user by device ID, creating a new user if necessary
func (s *AuthService) IdentifyUser(ctx context.Context, deviceID string) (string, error) {
	// Hash the device ID to create a fingerprint
	fingerprint := util.HashDeviceID(deviceID)

	// Try to find the user by fingerprint
	user, err := s.queries.GetUserByFingerprint(ctx, fingerprint)
	if err == nil {
		// User found, update last seen
		user, err = s.queries.UpdateUserLastSeen(ctx, user.ID)
		if err != nil {
			return "", fmt.Errorf("failed to update user last seen: %w", err)
		}
		return user.ID.String(), nil
	}

	// Try to find the user by device ID
	user, err = s.queries.GetUserByDeviceID(ctx, deviceID)
	if err == nil {
		// User found, update last seen
		user, err = s.queries.UpdateUserLastSeen(ctx, user.ID)
		if err != nil {
			return "", fmt.Errorf("failed to update user last seen: %w", err)
		}
		return user.ID.String(), nil
	}

	// User not found, create a new one
	user, err = s.queries.CreateUser(ctx, repository.CreateUserParams{
		DeviceID:    deviceID,
		Fingerprint: fingerprint,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create user: %w", err)
	}

	return user.ID.String(), nil
}

// GenerateToken generates a JWT token for a user
func (s *AuthService) GenerateToken(userID string) (string, error) {
	// Parse the user ID to ensure it's a valid UUID
	_, err := uuid.Parse(userID)
	if err != nil {
		return "", fmt.Errorf("invalid user ID: %w", err)
	}

	// Create the claims
	now := time.Now()
	expiresAt := now.Add(24 * time.Hour)
	claims := &Claims{
		UserID: userID,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(expiresAt),
			IssuedAt:  jwt.NewNumericDate(now),
			NotBefore: jwt.NewNumericDate(now),
			Issuer:    "safeshare",
			Subject:   userID,
		},
	}

	// Create the token
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	// Sign the token
	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

// ValidateToken validates a JWT token
func (s *AuthService) ValidateToken(tokenString string) (string, error) {
	// Parse the token
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		// Validate the signing method
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return "", fmt.Errorf("failed to parse token: %w", err)
	}

	// Validate the token
	if !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	// Get the claims
	claims, ok := token.Claims.(*Claims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}

	return claims.UserID, nil
}
