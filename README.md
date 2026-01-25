# beforeSend Testing Playground

> Test Sentry `beforeSend` transformations across multiple SDKs before deploying to production

## Overview

**Learn by doing.** The beforeSend Testing Playground lets you experiment with real Sentry SDKs in a safe sandbox environment. Load pre-built examples, see transformations in action with visual diffs, and master `beforeSend` patterns across 11 languages—all before touching production. Perfect for Solutions Engineers impressing customers with live demos and building deep SDK expertise.

**Key Features:**
- ✅ Test with real Sentry SDKs (JavaScript, Python, Ruby, PHP, Go, .NET, Java, Android, Cocoa, Rust, **Elixir**)
- ✅ **19 pre-built example templates** across 10 SDKs
- ✅ **Diff viewer** - See side-by-side comparison of original vs transformed events
- ✅ **Real-time syntax validation** - Catch errors as you type with SDK-specific parsers (JavaScript, Python, Ruby, PHP, Go, .NET, Rust)
- ✅ **Compile-on-the-fly** - Go and Rust SDKs compile and execute user code for authentic behavior
- ✅ Monaco editor with syntax highlighting
- ✅ Docker-isolated execution (safe for arbitrary code)

## Quick Start

**Requirements:** Docker & Docker Compose (that's it!)

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

## Simple Examples

### Example 1: Add Custom Tags

**Event JSON:**
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

### Example 2: Scrub Sensitive Data

**Event JSON:**
```json
{
  "event_id": "test-2",
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
        event['user']['email'] = '[REDACTED]'
        event['user']['ip_address'] = None
    return event
```

### Example 3: Drop Noisy Errors

**beforeSend (JavaScript):**
```javascript
(event, hint) => {
  // Don't send 404 errors to Sentry
  if (event.message && event.message.includes('404')) {
    return null;  // Event dropped
  }
  return event;
}
```

### Example 4: Service Metadata (Rust)

**beforeSend (Rust):**
```rust
use serde_json::json;

// Add service version and build information
if !event.as_object()?.contains_key("tags") {
    event["tags"] = json!({});
}

let tags = event["tags"].as_object_mut()?;
tags.insert("service_version".to_string(), json!("1.2.3"));
tags.insert("build_number".to_string(), json!("42"));
tags.insert("rust_version".to_string(), json!("1.75.0"));

Some(event)
```

### Example 5: Pattern Matching (Elixir)

**beforeSend (Elixir):**
```elixir
fn event, _hint ->
  # Add custom tags using Elixir pattern matching
  event
  |> Map.put(:tags, %{environment: "production", service: "api"})
  |> Map.update(:level, "error", &String.upcase/1)
end
```

## Using the Playground

### 1. Load an Example (Recommended)

Click **"Load Example"** to browse **19 pre-built templates**:
- **PII Scrubbing** - JavaScript, Python, .NET, Ruby, Rust
- **Conditional Event Dropping** - JavaScript, PHP, Go, Rust
- **Service Metadata Enrichment** - Go, Rust
- **Custom Tags & Context** - JavaScript, Java, Cocoa
- **Custom Fingerprinting** - JavaScript
- **Unity Metadata Cleanup** - Android
- **iOS Lifecycle Tags** - Cocoa
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

## Sharing Configurations

You can safely share your beforeSend configurations with colleagues:

1. Configure your event JSON and beforeSend code
2. Click the "Share" button (right side of controls)
3. A paste will be created with your configuration (expires after 30 days)
4. Copy the URL and share it with others

**Security**: Event values are automatically scrubbed before sharing to prevent accidental PII leakage. Only the event structure (field names and types) is shared, along with your beforeSend code. For example:
```json
{
  "user": {
    "email": "<string>",
    "ip_address": "<string>"
  },
  "exception": {
    "values": [...]
  }
}
```

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

## Validation Features

Real-time syntax validation is available for 7 SDKs:

- **JavaScript/React Native** - ESLint + syntax checking
- **Python** - `ast.parse()` syntax validation
- **Ruby** - `ruby -c` syntax checking
- **PHP** - `php -l` linting
- **Go** - `go build` compilation
- **.NET** - `dotnet build` compilation
- **Rust** - `cargo check` fast compilation checking

When you type, the editor will show red squiggles for syntax errors before you even click Transform!

## Documentation

### Getting Started
- **[Examples Library](docs/examples.md)** - Complete guide to 19 pre-built templates
- **[Diff Viewer](docs/diff-viewer.md)** - Using the side-by-side comparison view
- **[SDK Support](docs/sdk-support.md)** - Available SDKs and versions
- **[Validation Guide](docs/validation.md)** - How real-time validation works

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
