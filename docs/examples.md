# Example Templates Library

The playground includes **37 pre-built example templates** demonstrating common patterns across **10 SDK languages** and **5 playground modes**.

## Table of Contents

- [Using Examples](#using-examples)
- [Examples by Mode](#examples-by-mode)
- [Examples by SDK](#examples-by-sdk)
- [Adding Custom Examples](#adding-custom-examples)
- [Example Schema Reference](#example-schema-reference)
- [Validation Requirements](#validation-requirements)
- [Testing Your Examples](#testing-your-examples)

---

## Using Examples

1. Open the playground at http://localhost:3000
2. Select a **mode** from the navigation (Before Send, Fingerprinting, etc.)
3. Click **"Load Example"** dropdown
4. Search or browse available examples
5. Click an example to load it
6. Click **"Transform"** to see the result
7. Edit and customize for your needs

---

## Examples by Mode

| Mode | Count | Description |
|------|-------|-------------|
| **Before Send** | 18 | Transform error events (PII scrubbing, tagging, filtering) |
| **Fingerprinting** | 4 | Control issue grouping with custom fingerprints |
| **Before Send Transaction** | 6 | Transform performance/transaction events |
| **Before Breadcrumb** | 5 | Filter and modify breadcrumbs |
| **Traces Sampler** | 4 | Dynamic sampling rate strategies |

### Before Send Examples (18)

| Example | SDK | Description |
|---------|-----|-------------|
| PII Scrubbing | JavaScript | Regex-based email, phone, SSN redaction |
| PII Scrubbing | Python | Python `re.sub()` patterns |
| PII Scrubbing | .NET | C# `Regex.Replace()` patterns |
| PII Scrubbing | Ruby | Ruby `gsub()` patterns |
| PII Scrubbing | Rust | Rust regex patterns |
| Conditional Event Dropping | JavaScript | Drop known error patterns |
| Conditional Event Dropping | PHP | Filter bots, third-party scripts |
| Conditional Event Dropping | Go | Health checks, dev environments |
| Conditional Event Dropping | Rust | Filter by error type |
| Custom Tags & Context | JavaScript | Feature flags, user properties |
| Custom Tags & Context | Java | Payment processor tags |
| Custom Tags & Context | Cocoa | iOS device context |
| Unity Metadata Cleanup | JavaScript | Extract exceptions from Unity crash dumps |
| Android Context Enrichment | Android | Battery, network, memory info |
| ASP.NET Request Context | .NET | Controller, route, user claims |
| iOS Lifecycle Tags | Cocoa | App state, memory warnings |
| Go Service Metadata | Go | Kubernetes, runtime stats |
| Rust Service Metadata | Rust | Service version, deployment info |

### Fingerprinting Examples (4)

| Example | SDK | Description |
|---------|-----|-------------|
| Custom Fingerprinting | JavaScript | Basic fingerprint customization |
| Normalize Database Errors | JavaScript | Group DB errors by type, not instance |
| Normalize API URL Errors | JavaScript | Remove dynamic IDs from URLs |
| Split by User Type | JavaScript | Separate issues by user segment |

### Before Send Transaction Examples (6)

| Example | SDK | Description |
|---------|-----|-------------|
| Drop Health Checks | JavaScript | Filter `/health` endpoints |
| Drop Health Checks | Python | Python transaction filtering |
| Drop Health Checks | Go | Go transaction filtering |
| Add Custom Tags | JavaScript | Enrich transactions with metadata |
| Filter Slow Spans | JavaScript | Remove spans under threshold |
| Scrub Sensitive URLs | JavaScript | Redact tokens from transaction names |

### Before Breadcrumb Examples (5)

| Example | SDK | Description |
|---------|-----|-------------|
| Filter Console Breadcrumbs | JavaScript | Drop noisy console logs |
| Scrub PII from URLs | JavaScript | Redact tokens from navigation |
| Scrub PII from URLs | Python | Python URL scrubbing |
| Drop HTTP Noise | JavaScript | Filter polling/heartbeat requests |
| Categorize Breadcrumbs | JavaScript | Add custom categories |

### Traces Sampler Examples (4)

| Example | SDK | Description |
|---------|-----|-------------|
| Critical Endpoints Sampling | JavaScript | Higher rates for important routes |
| Health Check Filtering | JavaScript | Zero sampling for health checks |
| User-Based Sampling | JavaScript | Sample by user tier |
| Environment-Based Sampling | Python | Different rates per environment |

---

## Examples by SDK

| SDK | Count | Modes Covered |
|-----|-------|---------------|
| JavaScript | 19 | All 5 modes |
| Python | 4 | beforeSend, beforeSendTransaction, beforeBreadcrumb, tracesSampler |
| Go | 3 | beforeSend, beforeSendTransaction |
| Rust | 3 | beforeSend |
| .NET | 2 | beforeSend |
| Cocoa | 2 | beforeSend |
| Ruby | 1 | beforeSend |
| PHP | 1 | beforeSend |
| Java | 1 | beforeSend |
| Android | 1 | beforeSend |

---

## Adding Custom Examples

### Quick Start

1. Create a JSON file in `api/examples/`
2. Follow the schema for your mode type
3. Rebuild the API container
4. Your example appears in the dropdown

### Step-by-Step Guide

#### Step 1: Choose Your Mode

Decide which playground mode your example belongs to:

| Mode | Use When |
|------|----------|
| `beforeSend` | Transforming error events |
| `fingerprinting` | Customizing issue grouping |
| `beforeSendTransaction` | Transforming transaction events |
| `beforeBreadcrumb` | Filtering/modifying breadcrumbs |
| `tracesSampler` | Dynamic sampling decisions |

#### Step 2: Create the JSON File

Create a new file in `api/examples/` with a descriptive name:

```
api/examples/my-custom-example-javascript.json
```

**Naming convention:** `description-sdk.json`

#### Step 3: Add Required Fields

Every example needs these base fields:

```json
{
  "id": "my-custom-example",
  "name": "My Custom Example",
  "description": "Brief description of what this example does",
  "type": "beforeSend",
  "sdk": "javascript"
}
```

#### Step 4: Add Mode-Specific Fields

See [Example Schema Reference](#example-schema-reference) for the complete schema per mode.

#### Step 5: Rebuild and Test

```bash
docker-compose build api
docker-compose up -d api
```

Open the playground and verify your example appears in the correct mode's dropdown.

---

## Example Schema Reference

### beforeSend / fingerprinting

Both modes use the same schema. Use `fingerprinting` type when your code sets `event.fingerprint`.

```json
{
  "id": "unique-kebab-case-id",
  "name": "Human Readable Name",
  "description": "What this example demonstrates",
  "type": "beforeSend",
  "sdk": "javascript",
  "complexity": "basic",
  "event": {
    "event_id": "example-id",
    "message": "Example error message",
    "exception": {
      "values": [
        {
          "type": "Error",
          "value": "Error details"
        }
      ]
    }
  },
  "beforeSendCode": "(event, hint) => {\n  // Your transformation code\n  return event;\n}"
}
```

### beforeSendTransaction

```json
{
  "id": "unique-kebab-case-id",
  "name": "Human Readable Name",
  "description": "What this example demonstrates",
  "type": "beforeSendTransaction",
  "sdk": "javascript",
  "transaction": {
    "event_id": "example-id",
    "transaction": "GET /api/users",
    "type": "transaction",
    "contexts": {
      "trace": {
        "trace_id": "abc123",
        "span_id": "def456"
      }
    }
  },
  "beforeSendTransactionCode": "(transaction, hint) => {\n  // Your transformation code\n  return transaction;\n}"
}
```

### beforeBreadcrumb

```json
{
  "id": "unique-kebab-case-id",
  "name": "Human Readable Name",
  "description": "What this example demonstrates",
  "type": "beforeBreadcrumb",
  "sdk": "javascript",
  "breadcrumb": {
    "type": "navigation",
    "category": "navigation",
    "message": "User navigated",
    "data": {
      "from": "/home",
      "to": "/profile?token=secret123"
    },
    "level": "info",
    "timestamp": 1234567890
  },
  "beforeBreadcrumbCode": "(breadcrumb, hint) => {\n  // Your transformation code\n  return breadcrumb;\n}"
}
```

### tracesSampler

```json
{
  "id": "unique-kebab-case-id",
  "name": "Human Readable Name",
  "description": "What this example demonstrates",
  "type": "tracesSampler",
  "sdk": "javascript",
  "samplingContext": {
    "transactionContext": {
      "name": "GET /api/users",
      "op": "http.server"
    },
    "parentSampled": true,
    "request": {
      "url": "https://example.com/api/users",
      "method": "GET"
    }
  },
  "tracesSamplerCode": "(samplingContext) => {\n  // Return sample rate 0.0-1.0\n  return 0.1;\n}"
}
```

**Note for Python tracesSampler:** Use snake_case keys in `samplingContext`:

```json
{
  "samplingContext": {
    "transaction_context": {
      "name": "GET /api/users",
      "op": "http.server"
    },
    "parent_sampled": true
  }
}
```

---

## Validation Requirements

### Required Fields (All Types)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Unique identifier (kebab-case) |
| `name` | string | Display name in dropdown |
| `description` | string | Brief explanation |
| `type` | string | One of: `beforeSend`, `fingerprinting`, `beforeSendTransaction`, `beforeBreadcrumb`, `tracesSampler` |
| `sdk` | string | Target SDK: `javascript`, `python`, `ruby`, `php`, `go`, `dotnet`, `java`, `android`, `cocoa`, `rust`, `elixir` |

### Mode-Specific Required Fields

| Type | Required Fields |
|------|-----------------|
| `beforeSend` | `event`, `beforeSendCode` |
| `fingerprinting` | `event`, `beforeSendCode` |
| `beforeSendTransaction` | `transaction`, `beforeSendTransactionCode` |
| `beforeBreadcrumb` | `breadcrumb`, `beforeBreadcrumbCode` |
| `tracesSampler` | `samplingContext`, `tracesSamplerCode` |

### Optional Fields

| Field | Type | Description |
|-------|------|-------------|
| `complexity` | string | `basic`, `intermediate`, `advanced` |

### Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid example structure" | Missing required field | Check `id`, `name`, `description`, `sdk` are present |
| Example not appearing | Wrong or missing `type` | Add correct `type` field |
| Example in wrong mode | Incorrect `type` value | Change `type` to match intended mode |

---

## Testing Your Examples

### 1. Validate JSON Syntax

```bash
cat api/examples/my-example.json | python3 -m json.tool
```

### 2. Check API Loads It

```bash
docker-compose build api
docker-compose up -d api

# Check if your example appears
curl -s "http://localhost:4000/api/examples?type=beforeSend" | \
  python3 -c "import json,sys; d=json.load(sys.stdin); print([e['name'] for e in d['examples']])"
```

### 3. Test in UI

1. Open http://localhost:3000
2. Select the appropriate mode
3. Open "Load Example" dropdown
4. Search for your example name
5. Load and click "Transform"
6. Verify the transformation works correctly

### 4. Run Automated Tests

```bash
docker run --rm sdk-playground-api npm test
```

---

## Best Practices

### Writing Good Examples

1. **Realistic data** - Use event structures that match real Sentry events
2. **Clear names** - Name should describe what the example does
3. **Focused scope** - Each example should demonstrate one concept
4. **Working code** - Test your transformation code before committing
5. **Comments** - Add inline comments explaining the logic

### Naming Conventions

- **File:** `descriptive-name-sdk.json` (e.g., `pii-scrubbing-python.json`)
- **ID:** `descriptive-name` (kebab-case, unique)
- **Name:** "Descriptive Name (SDK)" for language-specific variants

### Code Style by SDK

| SDK | Style |
|-----|-------|
| JavaScript | Arrow functions, camelCase |
| Python | `def` functions, snake_case |
| Ruby | Lambdas, snake_case |
| PHP | Anonymous functions, snake_case |
| Go | Inline code block (no function wrapper) |
| .NET | Lambda expressions, PascalCase |

---

## Contributing Examples

We welcome contributions! To add examples:

1. Fork the repository
2. Create a branch: `git checkout -b examples/my-new-example`
3. Add your JSON file(s) to `api/examples/`
4. Test locally with Docker
5. Submit a PR with description of what the example demonstrates

**Quality checklist:**
- [ ] JSON is valid
- [ ] All required fields present
- [ ] `type` matches intended mode
- [ ] Code syntax is correct for the SDK
- [ ] Transformation produces expected output
- [ ] Example appears in correct dropdown
