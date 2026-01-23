# Architecture

## System Overview

The beforeSend Testing Playground uses a microservices architecture with Docker containers for isolation and safety.

```
┌─────────────────────────────────────────────────────────┐
│                   Web UI (React)                         │
│  Monaco Editors + SDK Selector + Results Viewer         │
│              Port 3000 (Vite Dev Server)                 │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/REST
┌────────────────▼────────────────────────────────────────┐
│              API Gateway (Node.js)                       │
│  Routes requests to appropriate SDK container            │
│         Port 4000 (Express Server)                       │
└────┬────┬────┬────┬────┬────┬────┬────┬────────────────┘
     │    │    │    │    │    │    │    │
┌────▼┐ ┌─▼──┐┌─▼──┐┌─▼─┐┌─▼─┐┌─▼──┐┌─▼──┐┌──▼──┐
│Node │ │Py  ││Ruby││PHP││Go ││.NET││Java││Andr.│
│5000 │ │5001││5004││5005│5006││5002││5007││5008 │
└─────┘ └────┘└────┘└────┘────┘└────┘└────┘└─────┘
```

## Components

### Web UI (React + Vite)

**Purpose:** User interface for testing beforeSend transformations

**Technology:**
- React 18
- TypeScript
- Vite (dev server + HMR)
- Monaco Editor (VS Code editor)
- TailwindCSS

**Features:**
- JSON editor for Sentry events
- Code editor for beforeSend callbacks
- SDK selector dropdown
- Before/after comparison viewer
- Syntax highlighting per language

**Port:** 3000

### API Gateway (Node.js + Express)

**Purpose:** Central routing and orchestration layer

**Technology:**
- Node.js 20
- TypeScript
- Express.js
- Axios (HTTP client)

**Responsibilities:**
- Validate input (JSON, event structure)
- Route requests to appropriate SDK container
- Handle errors and timeouts
- Load SDK registry
- Aggregate responses

**Port:** 4000

**Key Endpoints:**
- `POST /api/transform` - Transform events
- `GET /api/transform/sdks` - List SDKs
- `GET /health` - Health check

### SDK Containers

**Purpose:** Execute beforeSend code in isolated environments

Each SDK runs in its own Docker container with:
- Language runtime (Node, Python, Ruby, etc.)
- Sentry SDK installed
- HTTP server (Express, Flask, Sinatra, etc.)
- Transformation logic

**Common Endpoints:**
- `POST /transform` - Execute transformation
- `GET /health` - Health check

**Ports:**
- JavaScript: 5000
- Python: 5001
- .NET: 5002
- Ruby: 5004
- PHP: 5005
- Go: 5006
- Java: 5007
- Android: 5008

## Request Flow

1. **User Input**
   - User enters event JSON in Web UI
   - User writes beforeSend code
   - User selects SDK (e.g., "Python")
   - User clicks "Transform"

2. **API Gateway Processing**
   ```
   UI → POST /api/transform → API Gateway
   ```
   - Validate JSON syntax
   - Validate Sentry event structure
   - Check SDK availability in registry
   - Route to SDK container

3. **SDK Container Processing**
   ```
   API Gateway → POST /transform → SDK Container
   ```
   - Parse beforeSend code
   - Execute code with event
   - Return transformed event or error

4. **Response Handling**
   ```
   SDK Container → API Gateway → UI
   ```
   - API Gateway receives result
   - Format response with original + transformed events
   - UI displays side-by-side comparison

## Data Flow

```
┌─────────────┐
│  Event JSON │
└──────┬──────┘
       │
       ▼
┌──────────────────┐
│ JSON Validation  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Event Validation │ (has event_id, exception or message)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│  SDK Routing     │ (based on selected SDK)
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ SDK Container    │
│  - Parse code    │
│  - Execute       │
│  - Catch errors  │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│ Response Format  │
│  - success       │
│  - original      │
│  - transformed   │
│  - error         │
└──────┬───────────┘
       │
       ▼
┌──────────────────┐
│   UI Display     │
└──────────────────┘
```

## Docker Network

All containers run on the same Docker network (`beforesend-network`) for inter-service communication:

```yaml
networks:
  beforesend-network:
    driver: bridge
```

**Internal DNS:**
- `api` → API Gateway
- `sdk-javascript` → JavaScript SDK
- `sdk-python` → Python SDK
- etc.

**Environment Variables:**
```bash
JAVASCRIPT_SDK_URL=http://sdk-javascript:5000
PYTHON_SDK_URL=http://sdk-python:5001
# etc.
```

## Security Model

### Isolation

Each SDK runs in a separate container with:
- No network access except internal Docker network
- No volume mounts (except for dev hot reload)
- Limited CPU/memory resources
- Read-only filesystem (where applicable)

### Code Execution

Different strategies per language:
- **JavaScript:** VM2 sandbox (isolated context)
- **Python:** `exec()` with restricted globals
- **Ruby:** Safe evaluation context
- **PHP:** Function execution in isolated scope
- **Go:** Template-based code generation
- **.NET:** Dynamic compilation
- **Java/Android:** Groovy scripting engine

### Validation

- JSON syntax validation
- Event structure validation
- Code syntax validation (where possible)
- 30-second timeout per transformation
- Error handling and sanitization

## Scalability

**Current Design:**
- Single instance per SDK
- Synchronous request/response
- No state persistence

**Future Enhancements:**
- Multiple SDK container replicas
- Load balancing
- Request queuing
- Result caching

## Monitoring

**Health Checks:**
- Each container exposes `/health` endpoint
- API Gateway aggregates health status
- Docker Compose health checks

**Logging:**
- All containers log to stdout
- View with: `docker-compose logs -f`
- Structured logging (JSON format)

## Development vs Production

**Development:**
- Volume mounts for hot reload
- Source maps enabled
- Detailed error messages
- No resource limits

**Production:**
- No volume mounts
- Minified builds
- Generic error messages
- CPU/memory limits enforced

**Note:** This tool is designed for local development only. Do not expose to the internet!
