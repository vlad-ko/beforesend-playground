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
- Docker & Docker Compose
- Node.js 20+ (for CLI tools)

### Installation

```bash
# Clone or navigate to the project directory
cd beforesend-playground

# Install dependencies and build CLI
npm run setup

# Start default SDKs (JavaScript + Python)
npm start
```

The playground will be available at:
- **Web UI:** http://localhost:3000
- **API Gateway:** http://localhost:4000

### Basic Usage

1. **Open the Web UI** at http://localhost:3000
2. **Paste your Sentry event JSON** in the left editor
3. **Write your `beforeSend` code** in the right editor
4. **Select SDK** (JavaScript or Python)
5. **Click "Transform"** to see the result

## SDK Management

### List Available SDKs

```bash
npm run sdk:list
```

Output:
```
📦 Available SDKs:

JavaScript [DEFAULT] (running)
  Language: javascript
  Port: 5000
  Description: Official Sentry JavaScript/Node.js SDK

Python [DEFAULT] (running)
  Language: python
  Port: 5001
  Description: Official Sentry Python SDK

.NET (not-installed)
  Language: csharp
  Port: 5002
  Description: Official Sentry .NET SDK
  Notes: Requires template-based approach (compiled language)
```

### Start/Stop SDKs

```bash
# Start default SDKs (JavaScript + Python)
npm start

# Start a specific SDK
npm run sdk:start javascript

# Stop all SDKs
npm run sdk:stop

# Stop a specific SDK
npm run sdk:stop python
```

### Install Additional SDKs (Coming in Phase 2)

```bash
# Install .NET SDK
npm run sdk:install dotnet

# Install Java SDK
npm run sdk:install java
```

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

```bash
# Start with live reload
docker-compose up

# View logs
npm run logs

# View specific service logs
npm run logs:api
npm run logs:js
npm run logs:python
```

### Adding a New Example

1. Create event JSON: `api/examples/my-example.json`
2. Create beforeSend code: `api/examples/my-example-beforesend.js`
3. (Optional) Add Python version: `api/examples/my-example-beforesend.py`

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

### Phase 1: MVP ✅ (Current)
- [x] Docker Compose setup
- [x] API Gateway
- [x] JavaScript SDK container
- [x] Python SDK container
- [x] SDK registry & CLI
- [ ] React UI with Monaco editors
- [x] Unity metadata example

### Phase 2: Enhanced UI
- [ ] Diff viewer (before/after)
- [ ] Code input tab
- [ ] Example templates library
- [ ] Syntax validation
- [ ] Error highlighting

### Phase 3: Compiled SDKs
- [ ] .NET SDK (template-based)
- [ ] Java SDK (template-based)
- [ ] Dynamic SDK installation from templates

### Phase 4: Advanced Features
- [ ] YAML input support
- [ ] Batch testing (multiple events)
- [ ] Save/load configurations
- [ ] Fingerprint rule testing
- [ ] Performance metrics

## Contributing

This tool is maintained by Sentry's Solutions Engineering team for customer support and internal testing.

## License

MIT

## Support

For questions or issues, reach out to the Sentry SE team or file an issue in the repository.
