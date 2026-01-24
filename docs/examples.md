# Example Templates Library

The playground includes **16 pre-built example templates** demonstrating common beforeSend patterns across **9 different SDK languages**.

## How to Use Examples

1. Open the playground at http://localhost:3000
2. Click **"Load Example"** button
3. Browse and select an example from the dropdown
4. Review the populated event JSON and beforeSend code
5. Click **"Transform"** to see the transformation
6. Edit and customize for your needs
7. Copy the working code to your Sentry SDK

## Available Examples (16 Total)

### Core Patterns (Multi-Language)

#### PII Scrubbing
Remove sensitive data (emails, phone numbers, SSNs) from events.

**Available in:**
- JavaScript - Regex-based text redaction
- Python - Python `re.sub()` patterns
- .NET - C# `Regex.Replace()` patterns
- Ruby - Ruby `gsub()` patterns

#### Conditional Event Dropping
Filter out noisy or irrelevant errors.

**Available in:**
- JavaScript - Drop known error patterns
- PHP - Filter bots, third-party scripts, test users
- Go - Health check endpoints, known errors, dev environments

#### Custom Tags & Context
Enrich events with business and technical metadata.

**Available in:**
- JavaScript - Add feature flags, user properties, breadcrumbs
- Java - Payment processor tags, business context
- Cocoa - iOS-specific mobile context (battery, app state, device info)

#### Custom Fingerprinting
Group similar errors by normalizing dynamic values.

**Available in:**
- JavaScript - Normalize IDs, timestamps, URLs for better grouping

### SDK-Specific Examples

#### Unity Metadata Cleanup (JavaScript)
Extract actual exceptions from Unity/Android crash metadata wrapped in system messages.

**What it does:**
- Parses Unity metadata from exception messages
- Extracts thread names, device models, build types
- Cleans up exception type and value
- Adds structured tags instead of polluting exception message

#### Android Context Enrichment (Android/Kotlin)
Add Android-specific device context.

**What it does:**
- Battery level and charging state
- Network type (WiFi, cellular, etc.)
- Device orientation
- Memory info
- App foreground/background state

#### ASP.NET Request Context (.NET)
Enrich .NET backend events with ASP.NET-specific request context.

**What it does:**
- Controller and action names
- Route data
- User claims
- Connection info
- Response metadata

#### iOS Lifecycle & App State Tags (Cocoa)
Add iOS-specific lifecycle events.

**What it does:**
- Memory warnings
- App state transitions (foreground/background)
- Low-power mode detection
- Thermal state
- TestFlight/AppStore detection

#### Go Service Metadata (Go)
Add microservice context for distributed systems.

**What it does:**
- Service name, version, deployment info
- Kubernetes pod details
- Go runtime stats
- Memory metrics
- Feature flags

## What Each Example Includes

- **Pre-configured Event JSON** - Realistic Sentry event data
- **Working beforeSend Code** - Production-ready transformation logic
- **Automatic SDK Selection** - Correct language environment pre-selected
- **Clear Description** - What the example demonstrates and why

## Learning by Example

These examples demonstrate **real-world patterns** used by Sentry customers across different languages and platforms. Use them to:

- **Learn beforeSend syntax** for your SDK
- **Discover best practices** for PII scrubbing, event filtering, and context enrichment
- **Understand SDK differences** - see how the same pattern works across JavaScript, Python, Go, etc.
- **Experiment safely** - test transformations before deploying to production
- **Start quickly** - copy working code instead of writing from scratch

## Extending the Library

Examples are stored in `api/examples/` as JSON files. Each file contains:

```json
{
  "id": "unique-id",
  "name": "Display Name",
  "description": "What it does",
  "sdk": "javascript|python|go|dotnet|ruby|php|java|android|cocoa",
  "event": { /* Sentry event JSON */ },
  "beforeSendCode": "/* Working transformation code */"
}
```

Add your own examples by creating a new JSON file in `api/examples/` - they'll automatically appear in the dropdown.

## Full Example Catalog

| Example | SDK | Pattern |
|---------|-----|---------|
| PII Scrubbing | JavaScript | Core |
| PII Scrubbing | Python | Core |
| PII Scrubbing | .NET | Core |
| PII Scrubbing | Ruby | Core |
| Conditional Dropping | JavaScript | Core |
| Conditional Dropping | PHP | Core |
| Conditional Dropping | Go | Core |
| Custom Tags & Context | JavaScript | Core |
| Custom Tags & Context | Java | Core |
| Custom Tags & Context | Cocoa | Core |
| Custom Fingerprinting | JavaScript | Core |
| Unity Metadata Cleanup | JavaScript | SDK-Specific |
| Android Context Enrichment | Android | SDK-Specific |
| ASP.NET Request Context | .NET | SDK-Specific |
| iOS Lifecycle Tags | Cocoa | SDK-Specific |
| Go Service Metadata | Go | SDK-Specific |
