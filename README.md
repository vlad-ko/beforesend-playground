# beforeSend Testing Playground

> Test Sentry `beforeSend` transformations across multiple SDKs before deploying to production

## Overview

The beforeSend Testing Playground is a Docker-based tool for testing how `beforeSend` callbacks transform Sentry events across different SDK languages. Perfect for Solutions Engineers helping customers debug complex event transformations.

**Key Features:**
- ✅ Test with real Sentry SDKs (JavaScript, Python, Ruby, PHP, Go, .NET, Java, Android, Cocoa)
- ✅ **16 pre-built example templates** across 9 SDKs
- ✅ **Diff viewer** - See side-by-side comparison of original vs transformed events
- ✅ Monaco editor with syntax highlighting
- ✅ Docker-isolated execution (safe for arbitrary code)

## Quick Start

```bash
# 1. Clone and navigate to the repository
cd beforesend-playground

# 2. Build and start all services
docker-compose up -d

# 3. Open the playground
open http://localhost:3000
```

The playground will be available at **http://localhost:3000** 🎉

### Stop Services

```bash
docker-compose down
```

## Using the Playground

### 1. Load an Example (Recommended)

Click **"Load Example"** to browse **16 pre-built templates**:
- PII Scrubbing (JavaScript, Python, .NET, Ruby)
- Conditional Event Dropping (JavaScript, PHP, Go)
- Custom Tags & Context (JavaScript, Java, Cocoa)
- Custom Fingerprinting (JavaScript)
- Unity Metadata Cleanup (Android)
- iOS Lifecycle Tags (Cocoa)
- And more!

See **[Example Templates Guide](docs/examples.md)** for full catalog.

### 2. Or Write Your Own

1. Paste a Sentry event JSON (or use the default)
2. Select your SDK (JavaScript, Python, Go, etc.)
3. Write your `beforeSend` callback
4. Click **"Transform"** to see the result

### 3. Review Changes

- **Full Output** tab: See the complete transformed event
- **Diff View** tab: Side-by-side comparison with color-coded changes
  - 🟢 Green = Added/Modified
  - 🔴 Red = Removed/Original

See **[Diff Viewer Guide](docs/diff-viewer.md)** for details.

### 4. Copy & Deploy

Copy your tested `beforeSend` code to your Sentry SDK configuration.

## Real-World Example

**Problem:** Android Unity crashes include device metadata in the exception message, making issue titles unreadable.

**Before:**
```
Type: UnityException
Value: FATAL EXCEPTION [RxComputationThreadPool-1] Unity version : 6000.2.14f1 Device model : samsung SM-A022M Resources$NotFoundException: File resource not found
```

**After:**
```
Type: Resources$NotFoundException
Value: File resource not found

Tags: thread: RxComputationThreadPool-1, device_model: samsung SM-A022M
```

**Solution:** Load the "Unity Metadata Cleanup" example from the templates library, or see **[full example](docs/examples.md#unity-metadata-cleanup)**.

## Documentation

### Getting Started
- **[Examples Library](docs/examples.md)** - Complete guide to 16 pre-built templates
- **[Diff Viewer](docs/diff-viewer.md)** - Using the side-by-side comparison view
- **[SDK Support](docs/sdk-support.md)** - Available SDKs and versions

### Advanced
- **[API Reference](docs/api-reference.md)** - API endpoints and usage
- **[Architecture](docs/architecture.md)** - System design and structure
- **[Development Guide](docs/development.md)** - Contributing, testing, and TDD workflow
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

## Requirements

- **Docker & Docker Compose** (required)
- That's it! Everything runs in Docker.

## Support

This tool is maintained by Sentry's Solutions Engineering team for customer support and internal testing.

For questions or issues, reach out to the SE team or file an issue in the repository.

## License

MIT
