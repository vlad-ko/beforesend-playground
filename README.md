# beforeSend Testing Playground

> Test Sentry `beforeSend` transformations across multiple SDKs before deploying to production

## Overview

The beforeSend Testing Playground is a Docker-based tool for testing how `beforeSend` callbacks transform Sentry events across different SDK languages. Perfect for Solutions Engineers helping customers debug complex event transformations.

**Key Features:**
- ✅ Test with real Sentry SDKs (JavaScript, Python, Ruby, PHP, Go, .NET, Java, Android)
- ✅ Monaco editor with syntax highlighting
- ✅ See before/after transformation results
- ✅ Docker-isolated execution (safe for arbitrary code)

## Requirements

- **Docker & Docker Compose** (required)
- That's it! Everything runs in Docker.

## Getting Started

```bash
# 1. Clone the repository
cd beforesend-playground

# 2. Build and start all services
docker-compose up -d

# 3. Open the playground
# Web UI: http://localhost:3000
```

The playground will be available at **http://localhost:3000** 🎉

### Stop Services

```bash
docker-compose down
```

## Real-World Example: Android Unity Exception Cleanup

**Problem:** Android Unity crashes include device metadata in the exception message, making issue titles unreadable and preventing proper grouping.

**Before:**
```
Type: UnityException
Value: FATAL EXCEPTION [RxComputationThreadPool-1] Unity version : 6000.2.14f1 Device model : samsung SM-A022M Device fingerprint: samsung/a02ub/a02:11/RP1A.200720.012/A022MUBS4BWL2:user/release-keys CPU supported ABI : [armeabi-v7a, armeabi] Build Type : Release Scripting Backend : IL2CPP Libs loaded from : Unknown Strip Engine Code : Undefined Resources$NotFoundException: File resource not found
```

**After:**
```
Type: Resources$NotFoundException
Value: File resource not found

Tags:
  - thread: RxComputationThreadPool-1
  - device_model: samsung SM-A022M
  - build_type: Release

Extras:
  - unity_version: 6000.2.14f1
  - cpu_abi: armeabi-v7a, armeabi
  - scripting_backend: IL2CPP
```

**Solution - Use this in the playground:**

**Event JSON:**
```json
{
  "event_id": "test-123",
  "exception": {
    "values": [
      {
        "type": "UnityException",
        "value": "FATAL EXCEPTION [RxComputationThreadPool-1] Unity version : 6000.2.14f1 Device model : samsung SM-A022M Resources$NotFoundException: File resource not found"
      }
    ]
  },
  "platform": "android"
}
```

**beforeSend Code (select Android SDK):**
```groovy
if (event.exception && event.exception.values) {
  def fullValue = event.exception.values[0].value

  // Extract thread
  def threadMatcher = (fullValue =~ /\[([^\]]+)\]/)
  if (threadMatcher.find()) {
    event.setTag('thread', threadMatcher[0][1])
  }

  // Extract device model
  def deviceMatcher = (fullValue =~ /Device model\s*:\s*([^\s]+\s+[^\s]+)/)
  if (deviceMatcher.find()) {
    event.setTag('device_model', deviceMatcher[0][1])
  }

  // Extract actual exception
  def exceptionPattern = (fullValue =~ /([\w\$]+(?:Exception|Error)):\s*([^\n]+?)\s*$/)
  if (exceptionPattern.find()) {
    event.exception.values[0].type = exceptionPattern[0][1]
    event.exception.values[0].value = exceptionPattern[0][2]
  }
}

return event
```

**Result:** Clean, actionable issue titles that group properly!

## Simple Examples

### Example 1: Add Custom Tags

**Event:**
```json
{
  "event_id": "test-1",
  "message": "Payment failed"
}
```

**beforeSend (JavaScript):**
```javascript
(event, hint) => {
  event.tags = { ...event.tags, payment_type: 'credit_card' };
  return event;
}
```

### Example 2: Filter Sensitive Data

**Event:**
```json
{
  "event_id": "test-2",
  "message": "User login failed",
  "user": {
    "email": "user@example.com",
    "ip_address": "192.168.1.1"
  }
}
```

**beforeSend (Python):**
```python
def before_send(event, hint):
    if 'user' in event:
        event['user'].pop('email', None)
        event['user']['ip_address'] = None
    return event
```

### Example 3: Modify Error Messages

**Event:**
```json
{
  "event_id": "test-3",
  "exception": {
    "values": [{
      "type": "Error",
      "value": "Database connection failed: timeout after 30s"
    }]
  }
}
```

**beforeSend (JavaScript):**
```javascript
(event, hint) => {
  if (event.exception && event.exception.values) {
    event.exception.values[0].value = "Database connection timeout";
  }
  return event;
}
```

## Documentation

- **[SDK Support](docs/sdk-support.md)** - Available SDKs and versions
- **[Development Guide](docs/development.md)** - Contributing, testing, and TDD workflow
- **[API Reference](docs/api-reference.md)** - API endpoints and usage
- **[Architecture](docs/architecture.md)** - System design and structure
- **[Troubleshooting](docs/troubleshooting.md)** - Common issues and solutions

## Support

This tool is maintained by Sentry's Solutions Engineering team for customer support and internal testing.

For questions or issues, reach out to the SE team or file an issue in the repository.

## License

MIT
