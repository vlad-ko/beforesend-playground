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

### React Native
- Uses JavaScript SDK runtime
- Same syntax as JavaScript
- React Native-specific context available
