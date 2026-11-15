FROM golang:1.27-alpine AS builder


RUN apk add --no-cache git


WORKDIR /app


COPY go.mod go.sum ./
RUN go mod download


COPY . .


RUN go build -o safeshare-service ./cmd/api


FROM alpine:latest


RUN apk add --no-cache ca-certificates tzdata


WORKDIR /app


COPY --from=builder /app/safeshare-service .


EXPOSE 8080


CMD ["./safeshare-service"]
