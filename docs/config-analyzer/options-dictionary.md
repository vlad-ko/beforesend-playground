# Options Dictionary

The options dictionary is the knowledge base that defines all recognized Sentry SDK configuration options with their descriptions, validation rules, and SE guidance.

## Location

```
api/src/config-dictionary/
├── index.ts              # ConfigDictionary class
├── types.ts              # TypeScript interfaces
├── core-options.ts       # Essential options
├── sampling-options.ts   # Sampling configuration
├── hooks-options.ts      # Event hooks/callbacks
├── filtering-options.ts  # Error filtering
├── integrations-options.ts # SDK integrations
├── transport-options.ts  # Network/transport
├── performance-options.ts # Performance monitoring
├── context-options.ts    # Context/tags
└── replay-options.ts     # Session Replay
```

## ConfigOption Interface

Each option in the dictionary follows this structure:

```typescript
interface ConfigOption {
  // Required fields
  key: string;              // Canonical key (camelCase)
  displayName: string;      // Human-readable name
  description: string;      // What this option does
  type: 'string' | 'number' | 'boolean' | 'array' | 'function' | 'object';
  category: ConfigCategory; // Grouping for UI

  // Optional fields
  required?: boolean;       // Is this option mandatory?
  defaultValue?: any;       // SDK default if not specified
  examples?: string[];      // Example values
  docsUrl?: string;         // Link to Sentry documentation
  seGuidance?: string;      // Solutions Engineering advice
  warnings?: string[];      // Cautions to display
  relatedOptions?: string[]; // Related option keys
  supportedSDKs?: string[]; // If not all SDKs support this
}
```

## Categories

Options are grouped into categories for organization:

| Category | Description |
|----------|-------------|
| `core` | Essential: dsn, environment, release |
| `sampling` | Sample rates for events/transactions |
| `performance` | Tracing and performance monitoring |
| `integrations` | SDK plugins and extensions |
| `transport` | Network and event delivery |
| `hooks` | Callbacks: beforeSend, beforeBreadcrumb |
| `filtering` | Error filtering: ignoreErrors, denyUrls |
| `context` | User context, tags |
| `debug` | Debugging options |

## Example Option Definition

```typescript
// From core-options.ts
{
  key: 'dsn',
  displayName: 'DSN',
  description: 'The Data Source Name tells the SDK where to send events.',
  type: 'string',
  category: 'core',
  required: true,
  examples: [
    'https://examplePublicKey@o0.ingest.sentry.io/0',
  ],
  docsUrl: 'https://docs.sentry.io/product/sentry-basics/dsn-explainer/',
  seGuidance: 'The DSN is unique per project. Always use HTTPS. Keep DSNs secure.',
  warnings: [
    'Never commit DSNs to public repositories',
    'Use environment variables to store DSNs',
  ],
  relatedOptions: ['tunnel', 'transport'],
}
```

## SDK-Specific Options

Some options only apply to certain SDKs. Use `supportedSDKs` to restrict:

```typescript
{
  key: 'enableSwizzling',
  displayName: 'Enable Swizzling',
  description: 'Enable method swizzling for automatic instrumentation.',
  type: 'boolean',
  category: 'integrations',
  supportedSDKs: ['cocoa'],  // Only for iOS/macOS
  // ...
}
```

When an option has `supportedSDKs` defined:
- The option is recognized for those SDKs
- A warning is shown if used with an unsupported SDK

## Key Normalization

The dictionary uses **camelCase** keys internally. SDKs that use different conventions are normalized:

| SDK Convention | Example | Normalized |
|----------------|---------|------------|
| snake_case (Python, Ruby, PHP, Rust, Elixir) | `traces_sample_rate` | `tracesSampleRate` |
| PascalCase (Go, .NET) | `TracesSampleRate` | `tracesSampleRate` |
| camelCase (JavaScript, Java, Cocoa) | `tracesSampleRate` | `tracesSampleRate` |

The analyzer handles normalization automatically:

```typescript
// In analyzer.ts
private normalizeKey(key: string): string {
  if (key.includes('_')) {
    return this.snakeToCamelCase(key);
  }
  return key;
}
```

## Using the Dictionary

```typescript
import { configDictionary } from '../config-dictionary';

// Get a specific option
const dsnOption = configDictionary.getOption('dsn');

// Get all options
const allOptions = configDictionary.getAllOptions();

// Get options by category
const coreOptions = configDictionary.getOptionsByCategory('core');

// Check if option exists
const exists = configDictionary.hasOption('tracesSampleRate');

// Get required options
const required = configDictionary.getRequiredOptions();

// Search by keyword
const results = configDictionary.searchOptions('sample');
```

## Current Option Count

The dictionary currently contains **57 options** across all categories:

| Category | Count |
|----------|-------|
| Core | 7 |
| Sampling | 4 |
| Hooks | 4 |
| Filtering | 5 |
| Integrations | 15 |
| Transport | 5 |
| Performance | 8 |
| Context | 4 |
| Replay | 5 |

## Validation Rules

Some options have built-in validation in the analyzer:

### Sample Rates
```typescript
if (key === 'tracesSampleRate' || key === 'sampleRate') {
  if (value < 0 || value > 1) {
    // Error: must be between 0.0 and 1.0
  }
  if (value === 1.0) {
    // Warning: 100% sampling may exhaust quota
  }
}
```

### DSN Format
```typescript
if (key === 'dsn') {
  if (!value.startsWith('https://')) {
    // Error: should use HTTPS
  }
  if (!value.includes('@') || !value.includes('.ingest')) {
    // Warning: format may be invalid
  }
}
```

### Debug Mode
```typescript
if (key === 'debug' && value === true) {
  // Warning: should be disabled in production
}
```
