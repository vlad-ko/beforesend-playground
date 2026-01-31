# Sentry SDK Playground

> Test Sentry SDK features across multiple languages in isolation

## Overview

**Learn by doing.** The SDK Playground lets you experiment with real Sentry SDKs and webhook integrations in a safe sandbox environment. Load pre-built examples or write your own code, test webhook payloads with signature verification, see transformations in action with visual diffs, share configurations securely, and master `beforeSend` patterns across 11 languages—all before touching production. Perfect for Solutions Engineers impressing customers with live demos and building deep SDK expertise.

**Key Features:**
- ✅ Test with real Sentry SDKs (JavaScript, Python, Ruby, PHP, Go, .NET, Java, Android, Cocoa, Rust, **Elixir**)
- ✅ **19 pre-built example templates** across 10 SDKs
- ✅ **Webhook testing** - Test Sentry webhook payloads with HMAC signature generation and verification
- ✅ **API Query Tester** - Test and validate Sentry API search queries with real-time validation
- ✅ **Diff viewer** - See side-by-side comparison of original vs transformed events
- ✅ **Real-time syntax validation** - Catch errors as you type with SDK-specific parsers (JavaScript, Python, Ruby, PHP, Go, .NET, Rust)
- ✅ **Compile-on-the-fly** - Go and Rust SDKs compile and execute user code for authentic behavior
- ✅ **Secure sharing** - Share configurations with automatic PII scrubbing (event values removed, structure preserved)
- ✅ Monaco editor with syntax highlighting
- ✅ Docker-isolated execution (safe for arbitrary code)

## Quick Start

**Requirements:** Docker & Docker Compose (that's it!)

```bash
# 1. Clone and navigate to the repository
cd sdk-playground

# 2. Build and start all services
docker-compose up -d

# 3. Open the playground
open http://localhost:3000
```

The playground will be available at **http://localhost:3000** 🎉

**Choose your playground mode:**
- **beforeSend** - Transform error events before sending to Sentry
- **Webhooks** - Test webhook payloads with signature generation and verification
- **Config Analyzer** - Analyze and validate Sentry.init() configurations
- **API Query Tester** - Test and debug Sentry API search queries

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

## Webhook Testing

Test Sentry webhook payloads with HMAC-SHA256 signature generation and verification. Perfect for debugging webhook integrations and demonstrating webhook security to customers.

### Quick Example

1. Switch to **Webhooks** tab in the playground
2. Select a webhook type (e.g., "Issue Alert - Created")
3. Customize the payload in the Monaco editor (optional)
4. Enter your webhook endpoint URL
5. Add a webhook secret (optional, for signature generation)
6. Click **Send Webhook**
7. View request details and response

### Available Webhook Templates

**Issue Alerts:**
- Issue Alert - Created (triggered when a new issue is created)
- Issue Alert - Resolved (triggered when an issue is resolved)
- Issue Alert - Assigned (triggered when an issue is assigned)

**Performance & Monitoring:**
- Metric Alert (triggered when a metric threshold is breached)

**Error Events:**
- Error Event (triggered when a new error occurs)

**Collaboration:**
- Comment Created (triggered when a comment is added to an issue)

### Signature Verification

The playground automatically generates Sentry-compatible HMAC-SHA256 signatures when you provide a webhook secret. This signature is included in the `Sentry-Hook-Signature` header:

```
Sentry-Hook-Signature: 98c4da25a5aa896c33fa7edc1a1169a97ac78866002f089c43b49d8971617529
```

**Verification Example (Node.js):**
```javascript
const crypto = require('crypto');

function verifySentrySignature(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)  // IMPORTANT: Use raw request body, not re-serialized JSON
    .digest('hex');

  return signature === expected;
}

// Express.js example
app.post('/webhooks/sentry', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');  // Capture raw body for verification
  }
}), (req, res) => {
  const signature = req.headers['sentry-hook-signature'];
  const secret = process.env.SENTRY_WEBHOOK_SECRET;

  if (!verifySentrySignature(req.rawBody, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook...
  res.json({ success: true });
});
```

**Verification Example (Python):**
```python
import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)

def verify_sentry_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode('utf-8'),
        raw_body,  # Use raw bytes, not JSON-parsed data
        hashlib.sha256
    ).hexdigest()
    return signature == expected

@app.route('/webhooks/sentry', methods=['POST'])
def sentry_webhook():
    signature = request.headers.get('Sentry-Hook-Signature')
    secret = os.environ['SENTRY_WEBHOOK_SECRET']

    if not verify_sentry_signature(request.get_data(), signature, secret):
        return {'error': 'Invalid signature'}, 401

    # Process webhook...
    return {'success': True}
```

### Built-in Receiver for Testing

The playground includes a built-in webhook receiver at `http://localhost:4000/api/webhooks/receive` that automatically verifies signatures. Use this to test your webhook payloads before sending them to your actual endpoint:

1. Keep the default URL: `http://localhost:4000/api/webhooks/receive`
2. Add a webhook secret: `test-secret`
3. Click **Send Webhook**
4. View the verification results with SE guidance

The response will show:
- ✅ Signature verification status
- Received vs expected signatures
- Troubleshooting tips for signature mismatches

### Common Use Cases

**Use Case 1: Test Customer Webhook Integration**

A customer is setting up Sentry webhooks but getting signature verification errors. Use the playground to:
1. Send a test webhook to their endpoint
2. Show them the exact signature generation process
3. Debug their verification code
4. Demonstrate the importance of using raw request body

**Use Case 2: Demonstrate Webhook Security**

Show customers how Sentry webhooks are secured:
1. Send a webhook with a secret
2. Show the HMAC-SHA256 signature
3. Explain why signatures prevent webhook spoofing
4. Share verification code examples

**Use Case 3: Inspect Webhook Payloads**

Understand what data Sentry sends in webhooks:
1. Select different webhook types
2. Review the payload structure
3. Identify useful fields for automation
4. Test with external services like webhook.site for raw inspection

## API Query Tester

Test and validate Sentry API search queries before using them in integrations or API calls. Perfect for debugging query syntax and understanding what data Sentry's API returns.

### Features

- **Real-time query validation** - Validates properties and values as you type
- **Property suggestions** - Get corrections for typos (e.g., `assignee` → `assigned`)
- **Execute queries** - Test queries against real Sentry data
- **cURL generation** - Copy ready-to-use cURL commands
- **URL parsing** - Load queries from Sentry UI URLs

### Quick Example

1. Switch to **API Query Tester** tab in the playground
2. Enter your organization slug (e.g., `demo`)
3. Enter your **Personal Auth Token** (create one at [demo.sentry.io/settings/account/api/auth-tokens/](https://demo.sentry.io/settings/account/api/auth-tokens/))
   - **Note**: Organization Auth Tokens won't work - you need a Personal Auth Token
4. Enter a query (e.g., `is:unresolved level:error`)
5. Click **Execute Query**
6. View results and copy the generated cURL command

### Example Queries

| Query | Description |
|-------|-------------|
| `is:unresolved level:error` | Unresolved error-level issues |
| `assigned:me` | Issues assigned to you |
| `level:fatal age:-24h` | Fatal errors from last 24 hours |
| `!user.email:*@internal.com` | Exclude internal users |
| `timesSeen:>100` | High-volume issues |
| `error.type:TypeError` | Specific exception types |

### Query Syntax

Sentry queries use a `key:value` format with optional operators:

- **Basic:** `level:error`, `is:unresolved`
- **Negation:** `!level:error`, `!is:resolved`
- **Comparison:** `age:>24h`, `timesSeen:>=100`
- **Wildcards:** `user.email:*@example.com`
- **Multiple values:** `release:[12.0, 13.0]`
- **Quoted values:** `user.username:"Jane Doe"`

See the [Sentry Search Docs](https://docs.sentry.io/concepts/search/) for complete syntax reference.

### Supported Endpoints

- **Issues** - Search organization issues (`/api/0/organizations/{org}/issues/`)
- **Events** - Search project events (`/api/0/projects/{org}/{project}/events/`)
- **Projects** - List organization projects (`/api/0/organizations/{org}/projects/`)

### Security Notes

- Auth tokens are stored in memory only (never persisted or logged)
- Use the demo org (`demo`) at demo.sentry.io for testing
- Tokens are masked in generated cURL commands

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

### 4. Share or Deploy

**Deploy:** Copy your tested `beforeSend` code to your Sentry SDK configuration.

**Share:** Click the "Share" button to create a secure, shareable link with your configuration (see [Sharing Configurations](#sharing-configurations) below).

## Sharing Configurations

You can safely share your beforeSend configurations with colleagues or customers:

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

### Config Analyzer
- **[Config Analyzer Overview](docs/config-analyzer/README.md)** - Analyze SDK configurations
- **[Architecture](docs/config-analyzer/architecture.md)** - How the analyzer works
- **[Options Dictionary](docs/config-analyzer/options-dictionary.md)** - Configuration options database
- **[SDK-Specific Details](docs/config-analyzer/sdk-specifics.md)** - Per-SDK parsing details
- **[Adding Options](docs/config-analyzer/adding-options.md)** - Extend the dictionary
- **[Adding SDKs](docs/config-analyzer/adding-sdks.md)** - Add new SDK support

### API Query Tester
- **[API Query Tester Overview](docs/api-query-tester/README.md)** - Test Sentry API queries

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
