package types

type DeviceIDResponse struct {
	DeviceID string `json:"device_id"`
}

type LoginRequest struct {
	DeviceID string `json:"device_id"`
}

type LoginResponse struct {
	Token  string `json:"token"`
	UserID string `json:"user_id"`
}
