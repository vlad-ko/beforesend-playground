# Modes Overview

The SDK Playground provides 8 specialized testing modes for different Sentry SDK features.

## Mode Comparison

| Mode | Input | Output | Purpose |
|------|-------|--------|---------|
| [beforeSend](./beforeSend.md) | Error Event | Event or null | Transform/filter errors |
| [beforeSendTransaction](./beforeSendTransaction.md) | Transaction | Transaction or null | Transform/filter transactions |
| [beforeBreadcrumb](./beforeBreadcrumb.md) | Breadcrumb | Breadcrumb or null | Filter/modify breadcrumbs |
| [tracesSampler](./tracesSampler.md) | Sampling Context | Number 0.0-1.0 | Dynamic sampling decisions |
| [Webhooks](./webhooks.md) | Webhook Payload | HTTP Response | Test integrations |
| [Config Analyzer](../config-analyzer/README.md) | Sentry.init() | Analysis Report | Validate configuration |
| [API Query Tester](../api-query-tester/README.md) | Search Query | API Results | Test API queries |
| [Pattern Tester](./pattern-tester.md) | Patterns + Tests | Match Results | Validate filter patterns |

## Event Data Flow

Understanding when each callback runs:

```
User Action
    │
    ▼
┌─────────────────────────────┐
│    beforeBreadcrumb         │ ← Breadcrumbs captured here
│    (filters/modifies)       │
└─────────────────────────────┘
    │
    ▼
┌─────────────────────────────┐
│    tracesSampler            │ ← Sampling decision made here
│    (returns 0.0-1.0)        │
└─────────────────────────────┘
    │
    ▼
   [Transaction runs...]
    │
    ▼
┌─────────────────────────────┐
│    beforeSendTransaction    │ ← Transaction filtered/modified
│    (event or null)          │
└─────────────────────────────┘
    │
    ▼
   Error occurs...
    │
    ▼
┌─────────────────────────────┐
│    beforeSend               │ ← Error filtered/modified
│    (event or null)          │
└─────────────────────────────┘
    │
    ▼
   Sent to Sentry
```

## Callback vs Configuration

| Feature | Callback-Based | Configuration-Based |
|---------|---------------|---------------------|
| beforeSend | ✓ Dynamic logic | - |
| beforeSendTransaction | ✓ Dynamic logic | - |
| beforeBreadcrumb | ✓ Dynamic logic | - |
| tracesSampler | ✓ Dynamic rates | tracesSampleRate (fixed) |
| Error filtering | beforeSend | ignoreErrors patterns |
| URL filtering | - | denyUrls/allowUrls |

## When to Use Callbacks vs Patterns

### Use Patterns (Pattern Tester)
- Simple string/regex matching
- No runtime logic needed
- Filtering known noise patterns
- Static configuration

### Use Callbacks (beforeSend, etc.)
- Complex conditional logic
- Inspecting error details
- Adding dynamic context
- Modifying data structure

## Mode Categories

### Event Transformation
- **beforeSend** - Error events
- **beforeSendTransaction** - Performance transactions
- **beforeBreadcrumb** - Breadcrumbs

### Sampling & Filtering
- **tracesSampler** - Dynamic sampling
- **Pattern Tester** - Static filtering

### Testing & Validation
- **Webhooks** - Integration testing
- **Config Analyzer** - Configuration review
- **API Query Tester** - Query testing

## Next Steps

1. **New to SDK Playground?** Start with [beforeSend](./beforeSend.md)
2. **Need to choose a mode?** See [Choosing a Mode](../choosing-a-mode.md)
3. **Looking for examples?** See [Examples Library](../examples.md)
