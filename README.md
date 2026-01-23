# beforeSend Testing Playground

> Test Sentry `beforeSend` transformations across multiple SDKs before deploying to production

## Overview

The beforeSend Testing Playground is a Docker-based local tool for testing how `beforeSend` callbacks transform Sentry events across different SDK languages (JavaScript, Python, C#, Java, etc.).

**Key Features:**
- ✅ Test `beforeSend` transformations with real Sentry SDKs
- ✅ Support for JavaScript and Python SDKs (default)
- ✅ Dynamic SDK loading for additional languages (.NET, Java, Ruby, PHP, Go)
- ✅ JSON event input with Monaco editor
- ✅ See before/after transformation results
- ✅ Built-in examples (Unity metadata cleanup, etc.)
- ✅ Docker-isolated execution (safe for arbitrary code)

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Web UI (React)                         │
│  Monaco Editors + SDK Selector + Results Viewer         │
└────────────────┬────────────────────────────────────────┘
                 │ HTTP/REST
┌────────────────▼────────────────────────────────────────┐
│              API Gateway (Node.js)                       │
│  Routes requests to appropriate SDK container            │
└────────┬────────┬────────┬────────┬─────────────────────┘
         │        │        │        │
    ┌────▼───┐┌──▼───┐┌───▼──┐┌────▼───┐
    │  Node  ││Python││ .NET ││  Java  │
    │   SDK  ││ SDK  ││ SDK  ││  SDK   │
    └────────┘└──────┘└──────┘└────────┘
```

## Quick Start

### Prerequisites
- **Docker & Docker Compose** (required)
- No other dependencies needed - everything runs in Docker!

### Installation & Startup

```bash
# 1. Clone or navigate to the project directory
cd beforesend-playground

# 2. Build all services (first time only)
docker-compose build

# 3. Start all services
docker-compose up -d

# 4. Verify all services are running
docker-compose ps
```

The playground will be available at:
- **🌐 Web UI:** http://localhost:3000 (start here!)
- **🔌 API Gateway:** http://localhost:4000
- **📦 JavaScript SDK:** http://localhost:5000
- **🐍 Python SDK:** http://localhost:5001
- **💎 Ruby SDK:** http://localhost:5004

### Basic Usage

1. **Open the Web UI** at http://localhost:3000
2. **See the example:** Default event and Transformers 🤖 beforeSend code is pre-loaded
3. **Click "Transform"** to see the result
4. **Experiment:**
   - Modify the event JSON in the left editor
   - Edit the `beforeSend` code in the right editor
   - Switch between JavaScript and Python SDKs
   - Click "Transform" again to see different results

### Demo: Transformers by Sentry 🤖

The default `beforeSend` code demonstrates a fun transformation:

**Input:**
```json
{
  "exception": {
    "values": [{
      "type": "Error",
      "value": "Example error message"
    }]
  }
}
```

**Output:**
```json
{
  "exception": {
    "values": [{
      "type": "TransformerError",
      "value": "Transformers by Sentry 🤖"
    }]
  },
  "tags": {
    "transformed": true
  }
}
```

This shows how `beforeSend` can modify error messages, types, and add custom tags before sending to Sentry.

### Stop Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (clean slate)
docker-compose down -v
```

## SDK Management

### View Running SDKs

```bash
# Check all service status
docker-compose ps

# View logs for specific SDK
docker-compose logs sdk-javascript
docker-compose logs sdk-python
```

### Start/Stop SDKs

```bash
# Start all SDKs
docker-compose up -d

# Start specific SDK
docker-compose up -d sdk-javascript

# Stop all SDKs
docker-compose down

# Stop specific SDK
docker-compose stop sdk-python

# Restart an SDK
docker-compose restart sdk-javascript
```

### Current SDKs

- ✅ **JavaScript** (Node.js) - Port 5000
- ✅ **Python** - Port 5001
- ✅ **Ruby** - Port 5004

### Additional SDKs (In Progress)

Support for additional SDKs is planned:
- 🔲 PHP (Phase 2)
- 🔲 Go (Phase 2)
- 🔲 .NET (Phase 3)
- 🔲 Java (Phase 3)
- 🔲 React Native (Phase 3)

## Examples

### Unity Metadata Cleanup

**Problem:** Unity/Android crashes include device metadata in the exception message, making titles unreadable:

```
FATAL EXCEPTION [Thread-94] Unity version : 6000.2.14f1 Device model : realme RMX3151 Device fingerprint: realme/RMX3151RU/RE54B4L1:13/SP1A.210812.016/R.18a3aa1-4194:user/release-keys...
```

**Solution:** Use `beforeSend` to extract the actual exception type:

**JavaScript:**
```javascript
(event, hint) => {
  if (event.exception && event.exception.values) {
    for (const exception of event.exception.values) {
      if (exception.value && exception.value.includes('Unity version')) {
        const match = exception.value.match(/([\w\.]+(?:Exception|Error))/);
        if (match) {
          exception.type = match[1];
          exception.value = match[1];
        }
      }
    }
  }
  return event;
}
```

**Result:**
```
Title: Resources$NotFoundException
```

**Try it:**
1. Load example: `api/examples/unity-metadata.json`
2. Load beforeSend: `api/examples/unity-metadata-beforesend.js`
3. Click "Transform"

## Project Structure

```
beforesend-playground/
├── docker-compose.yml           # Service definitions
├── package.json                 # Root scripts
├── README.md                    # This file
│
├── api/                         # Express API Gateway
│   ├── src/
│   │   ├── index.ts             # Main API server
│   │   ├── routes/
│   │   │   └── transform.ts     # Transform endpoint
│   │   ├── parsers/
│   │   │   └── json.ts          # JSON validation
│   │   └── sdk-clients/
│   │       ├── javascript.ts    # JS SDK HTTP client
│   │       └── python.ts        # Python SDK HTTP client
│   └── examples/                # Built-in examples
│       ├── unity-metadata.json
│       ├── unity-metadata-beforesend.js
│       └── unity-metadata-beforesend.py
│
├── cli/                         # SDK management CLI
│   ├── sdk-manager.ts           # Main CLI tool
│   └── package.json
│
├── sdks/                        # SDK containers
│   ├── registry.json            # SDK metadata
│   ├── javascript/              # Default: JS SDK
│   │   ├── Dockerfile
│   │   ├── src/index.ts
│   │   └── package.json
│   ├── python/                  # Default: Python SDK
│   │   ├── Dockerfile
│   │   ├── app.py
│   │   └── requirements.txt
│   └── templates/               # Templates for dynamic SDKs (Phase 2)
│
└── ui/                          # React Web UI (Phase 1b)
    ├── src/
    │   ├── App.tsx
    │   └── components/
    └── package.json
```

## API Documentation

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

**Response:**
```json
{
  "success": true,
  "originalEvent": { ... },
  "transformedEvent": { ... },
  "sdk": "javascript"
}
```

### GET /api/transform/sdks

List available SDKs.

**Response:**
```json
{
  "sdks": [
    {
      "key": "javascript",
      "name": "JavaScript",
      "language": "javascript",
      "default": true,
      "status": "running"
    }
  ]
}
```

## Development

### Running in Development Mode

All services have **hot reload** enabled via volume mounts:

```bash
# Start all services with logs visible
docker-compose up

# Start in background (detached)
docker-compose up -d

# View logs from all services
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f sdk-javascript
docker-compose logs -f sdk-python
docker-compose logs -f ui
```

### Making Code Changes

**Changes are automatically detected and reloaded:**

- **API Gateway (TypeScript):** Edit `api/src/**/*.ts` → auto-rebuild and restart
- **JavaScript SDK (TypeScript):** Edit `sdks/javascript/src/**/*.ts` → auto-rebuild
- **Python SDK:** Edit `sdks/python/**/*.py` → auto-reload
- **React UI:** Edit `ui/src/**/*.tsx` → hot module replacement

**No need to rebuild containers** unless you change:
- `package.json` dependencies
- `requirements.txt` dependencies
- Dockerfile itself

### Rebuilding Services

```bash
# Rebuild specific service
docker-compose build api
docker-compose build ui

# Rebuild all services
docker-compose build

# Rebuild and restart
docker-compose up -d --build
```

### Adding a New Example

1. Create event JSON: `api/examples/my-example.json`
2. Create beforeSend code: `api/examples/my-example-beforesend.js`
3. (Optional) Add Python version: `api/examples/my-example-beforesend.py`
4. Restart API to load examples: `docker-compose restart api`

### Testing

We follow **Test-Driven Development (TDD)** principles. Always write tests BEFORE implementing features.

**🐳 All tests run in Docker - never on host machine!**

**Running Tests:**

```bash
# Run ALL tests across all services
docker run --rm beforesend-playground-api npm test
docker run --rm -e NODE_ENV=test beforesend-playground-sdk-javascript npm test
docker run --rm beforesend-playground-sdk-python pytest
docker run --rm beforesend-playground-ui npm test

# Run with coverage
docker run --rm beforesend-playground-api npm run test:coverage
docker run --rm beforesend-playground-sdk-python pytest --cov
docker run --rm beforesend-playground-ui npm run test:coverage

# Run tests in running containers (faster for development)
docker-compose exec api npm test
docker-compose exec sdk-javascript npm test
docker-compose exec sdk-python pytest
docker-compose exec ui npm test
```

**Test Results (Current):**
- ✅ API Gateway: 37 tests
- ✅ JavaScript SDK: 11 tests
- ✅ Python SDK: 10 tests (86% coverage)
- ✅ Ruby SDK: 10 tests (86% coverage)
- ✅ React UI: 39 tests (95% coverage)
- **Total: 107 tests, all passing**

**Test Coverage Requirements:**
- Minimum 80% code coverage (enforced)
- 100% coverage for critical paths (transformation logic)
- All new features must include tests FIRST (TDD)

**TDD Workflow:**

1. ✍️ Write failing test first (Red)
2. ✅ Implement minimum code to pass (Green)
3. ♻️ Refactor while keeping tests green (Refactor)
4. 🐳 Run tests in Docker before pushing

Example:
```typescript
// test/my-feature.test.ts
describe('MyFeature', () => {
  it('should transform event correctly', () => {
    const result = myFeature(event);
    expect(result.transformed).toBe(true);
  });
});
```

**IMPORTANT:** Never run tests directly on host. Always use Docker commands above.

**See `CLAUDE.md` for detailed testing guidelines and mandatory pre-push checklist.**

### Troubleshooting

**SDK container won't start:**
```bash
# Check logs
docker-compose logs sdk-javascript

# Rebuild container
docker-compose build sdk-javascript
docker-compose up -d sdk-javascript
```

**Port conflicts:**
```bash
# Change ports in docker-compose.yml
# UI: 3000 → 3001
# API: 4000 → 4001
# SDKs: 5000+ → 6000+
```

**Clean slate:**
```bash
npm run clean
npm run setup
npm start
```

## Roadmap

### ✅ Phase 1: MVP (COMPLETE!)
- [x] Docker Compose setup
- [x] API Gateway with transform endpoint
- [x] JavaScript SDK container
- [x] Python SDK container
- [x] SDK registry system
- [x] **React UI with Monaco editors** ⭐
- [x] **Comprehensive test suite (97 tests, 90%+ coverage)** ⭐
- [x] Unity metadata example
- [x] Transformers demo 🤖

**Phase 1 is production-ready!** The tool is fully functional for JavaScript and Python SDKs.

### 🚧 Phase 2: Additional SDKs (Next)
- [ ] Ruby SDK support
- [ ] PHP SDK support
- [ ] Go SDK support
- [ ] SDK health checks and monitoring
- [ ] Enhanced error messages with stack traces

### 📋 Phase 3: Enhanced UI
- [ ] Diff viewer (side-by-side before/after)
- [ ] Example templates library with dropdown
- [ ] Syntax validation in editors
- [ ] Error highlighting in code
- [ ] Save/export configurations
- [ ] Dark mode toggle

### 🔨 Phase 4: Compiled SDKs
- [ ] .NET SDK (template-based approach)
- [ ] Java SDK (template-based approach)
- [ ] React Native SDK
- [ ] Dynamic SDK installation from templates

### 🚀 Phase 5: Advanced Features
- [ ] YAML input support
- [ ] Batch testing (multiple events at once)
- [ ] Fingerprint rule testing
- [ ] Performance metrics (transformation time)
- [ ] Event history and replay

## Contributing

This tool is maintained by Sentry's Solutions Engineering team for customer support and internal testing.

## License

MIT

## Support

For questions or issues, reach out to the Sentry SE team or file an issue in the repository.
