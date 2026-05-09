package types

// DeviceIDResponse represents a response containing a device ID
type DeviceIDResponse struct {
	DeviceID string `json:"device_id"`
}

// LoginRequest represents a login request
type LoginRequest struct {
	DeviceID string `json:"device_id"`
}

// LoginResponse represents a login response
type LoginResponse struct {
	Token  string `json:"token"`
	UserID string `json:"user_id"`
}
