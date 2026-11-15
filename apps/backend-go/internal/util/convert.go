package util

import (
	"github.com/google/uuid"
	"github.com/jackc/pgtype"
)

func toPgUUID(u uuid.UUID) pgtype.UUID {
	return pgtype.UUID{
		Bytes: u,
	}
}
