# API Reference

## Base URL

```
http://localhost:4000
```

## Endpoints

### POST /api/transform

Transform a Sentry event using a beforeSend callback.

**Request:**
```json
{
  "sdk": "javascript",
  "event": {
    "event_id": "...",
    "exception": { ... }
  },
  "beforeSendCode": "(event, hint) => { /* transformation */ return event; }"
}
```

**Parameters:**
- `sdk` (string, required): SDK to use. One of: `javascript`, `python`, `ruby`, `php`, `go`, `dotnet`, `java`, `android`, `react-native`
- `event` (object, required): Sentry event object to transform
- `beforeSendCode` (string, required): beforeSend callback code

**Response (Success):**
```json
{
  "success": true,
  "originalEvent": {
    "event_id": "...",
    "exception": { ... }
  },
  "transformedEvent": {
    "event_id": "...",
    "exception": { ... },
    "tags": { "custom": "tag" }
  },
  "sdk": "javascript"
}
```

**Response (Error):**
```json
{
  "success": false,
  "error": "Transformation error: ...",
  "traceback": "..."
}
```

**HTTP Status Codes:**
- `200 OK`: Transformation successful (even if event was dropped)
- `400 Bad Request`: Invalid input (missing fields, invalid JSON, etc.)
- `500 Internal Server Error`: Unexpected server error

**Example:**
```bash
curl -X POST http://localhost:4000/api/transform \
  -H "Content-Type: application/json" \
  -d '{
    "sdk": "javascript",
    "event": {
      "event_id": "test-123",
      "message": "Test error"
    },
    "beforeSendCode": "(event, hint) => { event.tags = { test: true }; return event; }"
  }'
```

### GET /api/transform/sdks

List available SDKs and their status.

**Response:**
```json
{
  "sdks": [
    {
      "key": "javascript",
      "name": "JavaScript",
      "language": "javascript",
      "default": true,
      "status": "available",
      "port": 5000,
      "package": "@sentry/node",
      "version": "8.55.0"
    },
    {
      "key": "python",
      "name": "Python",
      "language": "python",
      "default": true,
      "status": "available",
      "port": 5001,
      "package": "sentry-sdk",
      "version": "2.20.0"
    }
  ]
}
```

**Example:**
```bash
curl http://localhost:4000/api/transform/sdks
```

### GET /health

Health check endpoint for API Gateway.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2026-01-23T12:00:00.000Z"
}
```

**Example:**
```bash
curl http://localhost:4000/health
```

## SDK Container Endpoints

Each SDK container exposes similar endpoints:

### POST /transform

SDK-specific transformation endpoint.

**Request:**
```json
{
  "event": { ... },
  "beforeSendCode": "..."
}
```

**Response:**
```json
{
  "success": true,
  "transformedEvent": { ... },
  "error": null,
  "traceback": null
}
```

**Example:**
```bash
# JavaScript SDK (port 5000)
curl -X POST http://localhost:5000/transform \
  -H "Content-Type: application/json" \
  -d '{"event": {...}, "beforeSendCode": "..."}'

# Python SDK (port 5001)
curl -X POST http://localhost:5001/transform \
  -H "Content-Type: application/json" \
  -d '{"event": {...}, "beforeSendCode": "..."}'
```

### GET /health

SDK health check.

**Response:**
```json
{
  "status": "healthy",
  "sdk": "javascript"
}
```

**Example:**
```bash
curl http://localhost:5000/health  # JavaScript
curl http://localhost:5001/health  # Python
```

## Error Codes

| Error | Description |
|-------|-------------|
| `Missing required fields` | Request missing `sdk`, `event`, or `beforeSendCode` |
| `Invalid JSON in event input` | Event JSON is malformed |
| `Unsupported SDK` | Requested SDK not available |
| `SDK not installed` | SDK not built/started |
| `Compilation failed` | beforeSend code has syntax errors |
| `Transformation error` | Runtime error in beforeSend code |
| `Timeout` | Transformation took longer than 30 seconds |

## Rate Limits

None. This is a local development tool.

## Authentication

None. This is a local development tool - do not expose to the internet!
