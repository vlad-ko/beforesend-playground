# Configuration Analyzer

The Configuration Analyzer is a feature that parses Sentry SDK initialization code, validates options, and provides recommendations for best practices.

## Documentation

- [Architecture Overview](./architecture.md) - How the analyzer works
- [Options Dictionary](./options-dictionary.md) - The configuration options database
- [SDK-Specific Details](./sdk-specifics.md) - Per-SDK parsing and options
- [Adding New Options](./adding-options.md) - How to extend the dictionary
- [Adding New SDKs](./adding-sdks.md) - How to add parser support for new SDKs

## Quick Start

The analyzer works in three stages:

1. **Parsing** - SDK-specific parsers extract configuration options from code
2. **Analysis** - Options are validated against the dictionary and rules
3. **Scoring** - A health score (0-100) is calculated based on findings

## Supported SDKs

| SDK | Parser | Key Style | Example Init Pattern |
|-----|--------|-----------|---------------------|
| JavaScript | `JavaScriptConfigParser` | camelCase | `Sentry.init({ dsn: "..." })` |
| Python | `PythonConfigParser` | snake_case | `sentry_sdk.init(dsn="...")` |
| Go | `GoConfigParser` | PascalCase | `sentry.Init(sentry.ClientOptions{Dsn: "..."})` |
| Ruby | `RubyConfigParser` | snake_case | `Sentry.init { \|c\| c.dsn = "..." }` |
| PHP | `PHPConfigParser` | snake_case | `\Sentry\init(['dsn' => '...'])` |
| .NET | `DotNetConfigParser` | PascalCase | `SentrySdk.Init(o => { o.Dsn = "..."; })` |
| Java | `JavaConfigParser` | setters | `Sentry.init(o -> { o.setDsn("..."); })` |
| Cocoa | `CocoaConfigParser` | camelCase | `SentrySDK.start { options in options.dsn = "..." }` |
| Rust | `RustConfigParser` | snake_case | `sentry::init(sentry::ClientOptions { dsn: ... })` |
| Elixir | `ElixirConfigParser` | snake_case | `config :sentry, dsn: "..."` |

## Health Score

The health score (0-100) is calculated based on:

- **Errors** (-15 points each): Invalid values, missing required options
- **Warnings** (-5 points each): Unknown options, potentially problematic values
- **Missing best practices** (-10 high priority, -5 medium priority)
- **Bonuses** (+5 each): Having environment, release, beforeSend configured

| Score Range | Rating |
|-------------|--------|
| 90-100 | Excellent |
| 70-89 | Good |
| 0-69 | Needs Improvement |

## API Endpoint

```
POST /api/config/analyze
Content-Type: application/json

{
  "sdk": "javascript",
  "configCode": "Sentry.init({ dsn: '...', environment: 'production' })"
}
```

Response includes:
- `score`: Health score (0-100)
- `summary`: Human-readable summary
- `options`: Array of analyzed options with descriptions
- `warnings`: Issues found (errors, warnings, info)
- `recommendations`: Suggested improvements
