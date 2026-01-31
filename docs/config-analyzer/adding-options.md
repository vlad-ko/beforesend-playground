# Adding New Options

This guide explains how to add new configuration options to the dictionary.

## When to Add Options

Add new options when:
- Sentry releases a new SDK configuration option
- An SDK-specific option is missing
- Users report "Unknown option" warnings for valid options

## Step 1: Identify the Category

Options are organized by category. Choose the most appropriate:

| Category | File | Use For |
|----------|------|---------|
| `core` | `core-options.ts` | dsn, environment, release, enabled |
| `sampling` | `sampling-options.ts` | Sample rates, sampling functions |
| `hooks` | `hooks-options.ts` | beforeSend, beforeBreadcrumb, etc. |
| `filtering` | `filtering-options.ts` | ignoreErrors, denyUrls, allowUrls |
| `integrations` | `integrations-options.ts` | SDK integrations, auto-instrumentation |
| `transport` | `transport-options.ts` | Network, tunneling, offline |
| `performance` | `performance-options.ts` | Tracing configuration |
| `context` | `context-options.ts` | Tags, user context |
| `replay` | `replay-options.ts` | Session Replay options |

## Step 2: Write the Test First (TDD)

Add a test in `api/test/config-analyzer/analyzer.test.ts`:

```typescript
it('should recognize myNewOption', () => {
  const config = `Sentry.init({
    dsn: "https://test@o0.ingest.sentry.io/0",
    myNewOption: true
  });`;

  const result = analyzer.analyze(config, 'javascript');

  const option = result.options.find(o => o.key === 'myNewOption');
  expect(option).toBeDefined();
  expect(option?.recognized).toBe(true);
});
```

Run the test to verify it fails:
```bash
docker run --rm sdk-playground-api npm test -- --testPathPattern="analyzer"
```

## Step 3: Add the Option

Open the appropriate file in `api/src/config-dictionary/` and add:

```typescript
{
  key: 'myNewOption',           // camelCase, canonical name
  displayName: 'My New Option', // Human-readable
  description: 'What this option does and when to use it.',
  type: 'boolean',              // string | number | boolean | array | function | object
  category: 'core',             // Must match the file's category
  required: false,
  defaultValue: false,
  examples: ['true', 'false'],
  docsUrl: 'https://docs.sentry.io/...',
  seGuidance: 'SE advice for customers asking about this option.',
  warnings: [
    'Any important cautions',
  ],
  relatedOptions: ['otherOption'],
  supportedSDKs: ['javascript', 'python'], // Optional: if not all SDKs
},
```

## Step 4: Run Tests

```bash
# Run analyzer tests
docker run --rm sdk-playground-api npm test -- --testPathPattern="analyzer"

# Run all tests
docker run --rm sdk-playground-api npm test
```

## Step 5: Rebuild Container

```bash
# Force rebuild without cache
DOCKER_BUILDKIT=0 docker-compose build --no-cache api

# Restart
docker-compose up -d api
```

## Adding SDK-Specific Options

For options that only apply to certain SDKs:

```typescript
{
  key: 'enableSwizzling',
  displayName: 'Enable Swizzling',
  description: 'Enable method swizzling for automatic instrumentation.',
  type: 'boolean',
  category: 'integrations',
  supportedSDKs: ['cocoa'],  // Only for Cocoa SDK
  // ...
},
```

When `supportedSDKs` is specified:
- Option is recognized only for listed SDKs
- Warning shown if used with unsupported SDK

## Naming Conventions

Use **camelCase** for the `key` field. This is the canonical name used internally.

SDKs with different conventions are normalized by the parser:
- Python `traces_sample_rate` → `tracesSampleRate`
- Go `TracesSampleRate` → `tracesSampleRate`
- .NET `TracesSampleRate` → `tracesSampleRate`

## Adding Validation Rules

For options requiring special validation, add logic to `analyzer.ts`:

```typescript
// In validateOptionValue method
if (normalizedKey === 'myNewOption') {
  if (someCondition) {
    warnings.push({
      severity: 'warning',
      message: 'Warning message',
      optionKey: parsedOption.key,
      fix: 'How to fix this issue',
    });
  }
}
```

## Example: Adding Cocoa Option

Here's a complete example of adding `enableNetworkTracking` for Cocoa:

### 1. Add Test
```typescript
// analyzer.test.ts
it('should recognize enableNetworkTracking option', () => {
  const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.enableNetworkTracking = true
  }`;

  const result = analyzer.analyze(config, 'cocoa');

  const option = result.options.find(o => o.key === 'enableNetworkTracking');
  expect(option).toBeDefined();
  expect(option?.recognized).toBe(true);
});
```

### 2. Add Option
```typescript
// integrations-options.ts
{
  key: 'enableNetworkTracking',
  displayName: 'Enable Network Tracking',
  description: 'Automatically create spans for network requests.',
  type: 'boolean',
  category: 'performance',
  required: false,
  defaultValue: true,
  examples: ['true', 'false'],
  docsUrl: 'https://docs.sentry.io/platforms/apple/tracing/',
  seGuidance: 'Enable to see HTTP requests as spans in traces.',
  relatedOptions: ['tracesSampleRate', 'enableSwizzling'],
  supportedSDKs: ['cocoa'],
},
```

### 3. Verify
```bash
docker run --rm sdk-playground-api npm test -- --testPathPattern="analyzer"
# Should pass

DOCKER_BUILDKIT=0 docker-compose build --no-cache api
docker-compose up -d api
```

## Checklist

- [ ] Test written first (TDD)
- [ ] Option added to correct category file
- [ ] All required fields filled in
- [ ] `docsUrl` points to valid documentation
- [ ] `seGuidance` provides helpful SE advice
- [ ] `supportedSDKs` specified if not universal
- [ ] Tests pass
- [ ] Container rebuilt and restarted
