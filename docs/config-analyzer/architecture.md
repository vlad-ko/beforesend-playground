# Architecture Overview

The Configuration Analyzer consists of three main components that work together to analyze SDK configurations.

## Component Diagram

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Config Parser  │────▶│  Config         │────▶│  Analysis       │
│  (per SDK)      │     │  Analyzer       │     │  Result         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                              │
                              ▼
                        ┌─────────────────┐
                        │  Config         │
                        │  Dictionary     │
                        └─────────────────┘
```

## File Structure

```
api/src/
├── config-parsers/           # SDK-specific parsers
│   ├── types.ts              # Shared types (IConfigParser, ParsedConfig)
│   ├── index.ts              # Parser exports
│   ├── javascript.ts
│   ├── python.ts
│   ├── go.ts
│   ├── ruby.ts
│   ├── php.ts
│   ├── dotnet.ts
│   ├── java.ts
│   ├── cocoa.ts
│   ├── rust.ts
│   └── elixir.ts
│
├── config-dictionary/        # Options knowledge base
│   ├── types.ts              # ConfigOption type definition
│   ├── index.ts              # Dictionary class and exports
│   ├── core-options.ts       # dsn, environment, release, etc.
│   ├── sampling-options.ts   # tracesSampleRate, sampleRate, etc.
│   ├── hooks-options.ts      # beforeSend, beforeBreadcrumb, etc.
│   ├── filtering-options.ts  # ignoreErrors, denyUrls, etc.
│   ├── integrations-options.ts # integrations, defaultIntegrations, etc.
│   ├── transport-options.ts  # tunnel, transport, etc.
│   ├── performance-options.ts # tracing options
│   ├── context-options.ts    # tags, user context
│   └── replay-options.ts     # Session Replay options
│
├── config-analyzer/          # Analysis logic
│   ├── types.ts              # AnalysisResult, OptionAnalysis types
│   ├── index.ts              # Exports
│   ├── analyzer.ts           # Main ConfigAnalyzer class
│   └── sdk-config.ts         # SDK-specific formatting config
│
└── routes/
    └── config.ts             # /api/config/analyze endpoint
```

## Data Flow

### 1. Request Handling (`routes/config.ts`)

```typescript
// Route receives SDK name and config code
app.post('/api/config/analyze', (req, res) => {
  const { sdk, configCode } = req.body;

  // Select appropriate parser based on SDK
  const parser = getParserForSdk(sdk);

  // Create analyzer with parser
  const analyzer = new ConfigAnalyzer(parser);

  // Analyze and return results
  const result = analyzer.analyze(configCode, sdk);
  res.json({ success: true, data: result });
});
```

### 2. Parsing (`config-parsers/*.ts`)

Each parser implements `IConfigParser` interface:

```typescript
interface IConfigParser {
  parse(configCode: string): ParsedConfig;
  validate(configCode: string): { valid: boolean; errors: ParseError[] };
}

interface ParsedConfig {
  sdk: string;
  valid: boolean;
  options: Map<string, ParsedOption>;
  rawCode: string;
  parseErrors: ParseError[];
}
```

Parsers handle:
- Extracting the initialization block (regex patterns)
- Removing comments while preserving strings
- Splitting statements at proper boundaries
- Parsing key-value pairs with type inference

### 3. Analysis (`config-analyzer/analyzer.ts`)

```typescript
class ConfigAnalyzer {
  analyze(configCode: string, sdk: string): AnalysisResult {
    // 1. Parse the code
    const parsed = this.parser.parse(configCode);

    // 2. Analyze each option
    for (const [key, option] of parsed.options) {
      // Normalize key (snake_case -> camelCase for lookup)
      const normalizedKey = this.normalizeKey(key);

      // Look up in dictionary
      const dictOption = configDictionary.getOption(normalizedKey);

      // Build analysis with warnings
      // ...
    }

    // 3. Check for missing required options
    // 4. Generate recommendations
    // 5. Calculate health score

    return result;
  }
}
```

### 4. Dictionary Lookup (`config-dictionary/index.ts`)

```typescript
class ConfigDictionary {
  private options: Map<string, ConfigOption>;

  getOption(key: string): ConfigOption | undefined {
    return this.options.get(key);
  }

  getRequiredOptions(): ConfigOption[] {
    return this.data.options.filter(opt => opt.required);
  }
}
```

## Key Normalization

Different SDKs use different naming conventions:

| SDK | Code Style | Normalized Key |
|-----|------------|----------------|
| Python | `traces_sample_rate` | `tracesSampleRate` |
| JavaScript | `tracesSampleRate` | `tracesSampleRate` |
| Go | `TracesSampleRate` | `tracesSampleRate` |
| Cocoa | `tracesSampleRate` | `tracesSampleRate` |

The analyzer normalizes all keys to camelCase for dictionary lookup:

```typescript
private normalizeKey(key: string): string {
  // Convert snake_case to camelCase
  if (key.includes('_')) {
    return key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
  }
  // Convert PascalCase to camelCase
  return key.charAt(0).toLowerCase() + key.slice(1);
}
```

## Score Calculation

```typescript
private calculateScore(parsed, warnings, recommendations): number {
  let score = 100;

  // Deductions
  score -= errors.length * 15;           // Errors are severe
  score -= warnings.length * 5;          // Warnings are moderate
  score -= highPriorityRecs.length * 10; // Missing best practices
  score -= mediumPriorityRecs.length * 5;

  // Bonuses for good practices
  if (hasOption('environment')) score += 5;
  if (hasOption('release')) score += 5;
  if (hasOption('beforeSend')) score += 5;

  return Math.max(0, Math.min(100, score));
}
```
