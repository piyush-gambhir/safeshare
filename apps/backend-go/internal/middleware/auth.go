package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/piyush-gambhir/safeshare-service/internal/service"
	"github.com/piyush-gambhir/safeshare-service/internal/types"
)

func AuthMiddleware(authService service.AuthServiceInterface) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")

		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, types.ErrorResponse{
				Error: "Authorization header is required",
			})
			c.Abort()
			return
		}

		if !strings.HasPrefix(authHeader, "Bearer ") {
			c.JSON(http.StatusUnauthorized, types.ErrorResponse{
				Error: "Authorization header must be Bearer token",
			})
			c.Abort()
			return
		}

		token := strings.TrimPrefix(authHeader, "Bearer ")

		userID, err := authService.ValidateToken(token)
		if err != nil {
			c.JSON(http.StatusUnauthorized, types.ErrorResponse{
				Error: "Invalid token",
			})
			c.Abort()
			return
		}

		c.Set("userID", userID)

		c.Next()
	}
}
