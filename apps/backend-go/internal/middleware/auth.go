package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/piyush-gambhir/safeshare-service/internal/service"
	"github.com/piyush-gambhir/safeshare-service/internal/types"
)

// AuthMiddleware creates a middleware for authentication
func AuthMiddleware(authService service.AuthServiceInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		// Get the Authorization header
		authHeader := c.GetHeader("Authorization")

		// Check if the header is empty
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, types.ErrorResponse{
				Error: "Authorization header is required",
			})
			c.Abort()
			return
		}

		// Check if the header has the correct format
		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, types.ErrorResponse{
				Error: "Authorization header must be Bearer token",
			})
			c.Abort()
			return
		}

		// Extract the token
		token := strings.TrimPrefix(authHeader, "Bearer ")

		// Validate the token
		userID, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, types.ErrorResponse{
				Error: "Invalid token",
			})
			c.Abort()
			return
		}

		// Set the user ID in the context
		c.Set("userID", userID)

		c.Next()
	}
}
