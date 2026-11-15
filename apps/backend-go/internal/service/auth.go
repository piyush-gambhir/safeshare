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

type AuthService struct {
	cfg     *config.Config
	queries *repository.Queries
}

func NewAuthService(cfg *config.Config, queries *repository.Queries) *AuthService {
	return &AuthService{
		cfg:     cfg,
		queries: queries,
	}
}

type Claims struct {
	UserID string `json:"user_id"`
	jwt.RegisteredClaims
}

func (s *AuthService) IdentifyUser(ctx context.Context, deviceID string) (string, error) {
	fingerprint := util.HashDeviceID(deviceID)

	user, err := s.queries.GetUserByFingerprint(ctx, fingerprint)
	if err == nil {
		user, err = s.queries.UpdateUserLastSeen(ctx, user.ID)
		if err != nil {
			return "", fmt.Errorf("failed to update user last seen: %w", err)
		}
		return user.ID.String(), nil
	}

	user, err = s.queries.GetUserByDeviceID(ctx, deviceID)
	if err == nil {
		user, err = s.queries.UpdateUserLastSeen(ctx, user.ID)
		if err != nil {
			return "", fmt.Errorf("failed to update user last seen: %w", err)
		}
		return user.ID.String(), nil
	}

	user, err = s.queries.CreateUser(ctx, repository.CreateUserParams{
		DeviceID:    deviceID,
		Fingerprint: fingerprint,
	})
	if err != nil {
		return "", fmt.Errorf("failed to create user: %w", err)
	}

	return user.ID.String(), nil
}

func (s *AuthService) GenerateToken(userID string) (string, error) {
	_, err := uuid.Parse(userID)
	if err != nil {
		return "", fmt.Errorf("invalid user ID: %w", err)
	}

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

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	tokenString, err := token.SignedString([]byte(s.cfg.JWTSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %w", err)
	}

	return tokenString, nil
}

func (s *AuthService) ValidateToken(tokenString string) (string, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(s.cfg.JWTSecret), nil
	})
	if err != nil {
		return "", fmt.Errorf("failed to parse token: %w", err)
	}

	if !token.Valid {
		return "", fmt.Errorf("invalid token")
	}

	claims, ok := token.Claims.(*Claims)
	if !ok {
		return "", fmt.Errorf("invalid claims")
	}

	return claims.UserID, nil
}
