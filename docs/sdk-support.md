# SDK Support

## Available SDKs

| SDK | Language | Port | Status | Package Version |
|-----|----------|------|--------|-----------------|
| **JavaScript** | Node.js | 5000 | ✅ Available | @sentry/node 8.55.0 |
| **Python** | Python 3.12 | 5001 | ✅ Available | sentry-sdk 2.20.0 |
| **Ruby** | Ruby 3.2 | 5004 | ✅ Available | sentry-ruby 5.22.0 |
| **PHP** | PHP 8.2 | 5005 | ✅ Available | sentry/sentry 4.12.0 |
| **Go** | Go 1.21 | 5006 | ✅ Available | github.com/getsentry/sentry-go 0.29.1 |
| **.NET** | C# / .NET 8.0 | 5002 | ✅ Available | Sentry 5.0.0 |
| **Java** | Java 21 | 5007 | ✅ Available | io.sentry:sentry 7.16.0 |
| **Android** | Kotlin / Groovy | 5008 | ✅ Available | io.sentry:sentry 7.16.0 |
| **Cocoa** | Swift / JavaScript | 5009 | ✅ Available | Sentry 8.40.1 |
| **Rust** | Rust | 5010 | ✅ Available | sentry 0.35.0 |
| **Elixir** | Elixir | 5011 | ✅ Available | sentry 10.8.0 |
| **React Native** | JavaScript | 5000 | ✅ Available | @sentry/react-native 6.3.0 |

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

### Health Checks

All SDKs expose a health endpoint:

```bash
curl http://localhost:5000/health  # JavaScript
curl http://localhost:5001/health  # Python
curl http://localhost:5004/health  # Ruby
curl http://localhost:5009/health  # Cocoa
# etc.
```

## SDK-Specific Notes

### JavaScript / Node.js
- Supports full ES6+ syntax
- `event` and `hint` parameters available
- Uses VM2 for safe code execution

### Python
- Python 3.12+
- Full access to standard library in beforeSend
- Uses `exec()` for code execution

### Ruby
- Ruby 3.2+
- Lambda syntax: `lambda do |event, hint| ... end`
- Safe evaluation environment

### PHP
- PHP 8.2+
- Function syntax: `function($event, $hint) { ... }`
- Composer autoloading available

### Go
- Go 1.21+
- Dynamic code execution via script template
- Map-based event manipulation

### .NET
- .NET 8.0 / C# 12
- Full LINQ support
- `SentryEvent` object manipulation

### Java
- Java 21 with Groovy scripting
- Full Groovy syntax support
- Dynamic event transformation

### Android
- Kotlin/Groovy syntax
- Simulates Android SDK behavior
- EventWrapper API for transformations

### Cocoa (iOS/macOS)
- Swift-based with JavaScript execution via JXKit
- Plain JavaScript syntax (no arrow functions)
- Cross-platform: JavaScriptCore on macOS, JXKit on Linux
- Direct `event` object manipulation

### Rust
- Rust (stable toolchain)
- Compiles user code on-the-fly for each transformation
- Uses `rust:slim-bookworm` (Debian) for better glibc compatibility
- Supports both `Option<Value>` returns (beforeSend) and numeric returns (tracesSampler)
- Full serde_json support for event manipulation
- Example: `event["tags"] = json!({"key": "value"}); Some(event)`

### Elixir
- Elixir 1.15+ with OTP 26
- Pattern matching and functional syntax
- Map-based event manipulation
- Example: `Map.put(event, :tags, %{key: "value"})`

### React Native
- Uses JavaScript SDK runtime
- Same syntax as JavaScript
- React Native-specific context available

## Docker Base Images

Different SDKs use different base images based on their runtime requirements:

| SDK | Base Image | Notes |
|-----|------------|-------|
| JavaScript | node:alpine | Small footprint, musl libc |
| Python | python:slim | Debian-based, glibc |
| Ruby | ruby:alpine | Small footprint |
| PHP | php:alpine | With FPM |
| Go | golang:alpine (build) + scratch (runtime) | Minimal runtime |
| .NET | mcr.microsoft.com/dotnet/sdk | Microsoft official |
| Java | eclipse-temurin | OpenJDK |
| Rust | rust:slim-bookworm | Debian-based for glibc compatibility |
| Elixir | elixir:alpine | Small footprint |

**Note on Alpine vs Debian**: Some SDKs (like Rust) use Debian-based images instead of Alpine because Alpine's musl libc can cause dynamic linking issues with certain compiled binaries. If you encounter silent startup failures, consider switching to a Debian-based image.
