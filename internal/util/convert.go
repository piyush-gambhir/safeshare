package util

import (
	"github.com/google/uuid"
	"github.com/jackc/pgtype"
)

// Convert google uuid.UUID to pgtype.UUID
func toPgUUID(u uuid.UUID) pgtype.UUID {
	return pgtype.UUID{
		Bytes: u,
	}
}
