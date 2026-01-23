FROM golang:1.22-alpine

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Copy go module files
COPY go.mod ./

# Copy source code
COPY . .

# Tidy dependencies and download
RUN go mod tidy && go mod download

# Build the application
RUN go build -o server main.go

EXPOSE 5006

CMD ["./server"]
