# SDK-Specific Details

Each SDK has unique syntax patterns, option naming conventions, and special options. This document details the specifics of each supported SDK.

## Overview

| SDK | File | Key Style | Comment Style | Unique Features |
|-----|------|-----------|---------------|-----------------|
| JavaScript | `javascript.ts` | camelCase | `//`, `/* */` | Object literal syntax |
| Python | `python.ts` | snake_case | `#` | Keyword arguments |
| Go | `go.ts` | PascalCase | `//`, `/* */` | Struct literal syntax |
| Ruby | `ruby.ts` | snake_case | `#` | Block syntax with `do...end` |
| PHP | `php.ts` | snake_case | `//`, `/* */`, `#` | Array syntax with `=>` |
| .NET | `dotnet.ts` | PascalCase | `//`, `/* */` | Lambda with property assignments |
| Java | `java.ts` | camelCase | `//`, `/* */` | Setter methods `.setX()` |
| Cocoa | `cocoa.ts` | camelCase | `//`, `/* */` | Swift closure syntax |
| Rust | `rust.ts` | snake_case | `//`, `/* */` | Struct literal with `::` |
| Elixir | `elixir.ts` | snake_case | `#` | Mix config file syntax |

---

## JavaScript

**Parser:** `JavaScriptConfigParser`

**Init Pattern:**
```javascript
Sentry.init({
  dsn: "https://...",
  environment: "production",
  tracesSampleRate: 0.1,
});
```

**Regex:** `/Sentry\.init\s*\(\s*\{([\s\S]*?)\}\s*\)/`

**Key Features:**
- Standard object literal syntax
- Trailing commas allowed
- Supports template literals (backtick strings)
- Handles spread operators gracefully

**Special Options:** None - JavaScript uses the canonical camelCase names.

---

## Python

**Parser:** `PythonConfigParser`

**Init Pattern:**
```python
sentry_sdk.init(
    dsn="https://...",
    environment="production",
    traces_sample_rate=0.1,
)
```

**Regex:** `/sentry_sdk\.init\s*\(([\s\S]*?)\)/`

**Key Features:**
- Keyword argument syntax (`key=value`)
- snake_case naming convention
- Python booleans: `True`, `False`, `None`
- Supports both `"` and `'` strings
- Triple-quoted strings supported

**Key Normalization:**
| Python Key | Normalized Key |
|------------|----------------|
| `traces_sample_rate` | `tracesSampleRate` |
| `send_default_pii` | `sendDefaultPii` |
| `before_send` | `beforeSend` |
| `max_breadcrumbs` | `maxBreadcrumbs` |

---

## Go

**Parser:** `GoConfigParser`

**Init Pattern:**
```go
sentry.Init(sentry.ClientOptions{
    Dsn:              "https://...",
    Environment:      "production",
    TracesSampleRate: 0.1,
})
```

**Regex:** `/sentry\.Init\s*\(\s*sentry\.ClientOptions\s*\{([\s\S]*?)\}\s*\)/`

**Key Features:**
- PascalCase field names (Go convention)
- Struct literal syntax with `:` assignment
- No trailing commas after last field
- Supports raw strings with backticks

**Key Normalization:**
| Go Key | Normalized Key |
|--------|----------------|
| `Dsn` | `dsn` |
| `TracesSampleRate` | `tracesSampleRate` |
| `BeforeSend` | `beforeSend` |

---

## Ruby

**Parser:** `RubyConfigParser`

**Init Pattern:**
```ruby
Sentry.init do |config|
  config.dsn = "https://..."
  config.environment = "production"
  config.traces_sample_rate = 0.1
end
```

**Regex:** `/Sentry\.init\s+do\s*\|(\w+)\|([\s\S]*?)end/`

**Key Features:**
- Block syntax with `do |var| ... end`
- Assignment with `config.key = value`
- snake_case naming convention
- Supports symbols `:symbol`

**Key Normalization:** Same as Python (snake_case → camelCase)

---

## PHP

**Parser:** `PHPConfigParser`

**Init Pattern:**
```php
\Sentry\init([
    'dsn' => 'https://...',
    'environment' => 'production',
    'traces_sample_rate' => 0.1,
]);
```

**Regex:** `/\\?Sentry\\init\s*\(\s*\[([\s\S]*?)\]\s*\)/`

**Key Features:**
- Array syntax with `=>` assignment
- snake_case keys as strings (`'key'`)
- Supports both single and double quotes
- Backslash namespace prefix optional

**Key Normalization:** Same as Python (snake_case → camelCase)

---

## .NET (C#)

**Parser:** `DotNetConfigParser`

**Init Pattern:**
```csharp
SentrySdk.Init(o => {
    o.Dsn = "https://...";
    o.Environment = "production";
    o.TracesSampleRate = 0.1;
});
```

**Regex:** `/(?:SentrySdk\.Init|\.UseSentry)\s*\(\s*(\w+)\s*=>\s*\{([\s\S]*?)\}\s*\)/`

**Key Features:**
- Lambda expression syntax
- PascalCase property names
- Property assignment with `=` and semicolon
- Verbatim strings with `@"..."` supported
- Also matches `UseSentry()` for ASP.NET

**Key Normalization:**
| .NET Key | Normalized Key |
|----------|----------------|
| `Dsn` | `dsn` |
| `TracesSampleRate` | `tracesSampleRate` |
| `SendDefaultPii` | `sendDefaultPii` |

**Special Note:** Handles verbatim strings `@"..."` which can contain unescaped `//` in URLs.

---

## Java

**Parser:** `JavaConfigParser`

**Init Pattern:**
```java
Sentry.init(options -> {
    options.setDsn("https://...");
    options.setEnvironment("production");
    options.setTracesSampleRate(0.1);
});
```

**Regex:** `/(?:Sentry|SentryAndroid)\.init\s*\([^,]*?,?\s*(\w+)\s*->\s*\{([\s\S]*?)\}\s*\)/`

**Key Features:**
- Lambda arrow syntax with `->`
- Setter method calls: `.setX()`, `.enableX()`, `.addX()`
- camelCase method names (after removing set/enable/add prefix)
- Also matches `SentryAndroid.init()` for Android

**Key Extraction:**
| Java Method | Extracted Key |
|-------------|---------------|
| `setDsn(...)` | `dsn` |
| `setTracesSampleRate(...)` | `tracesSampleRate` |
| `enableTracing()` | `tracing` |

---

## Cocoa (Swift/iOS)

**Parser:** `CocoaConfigParser`

**Init Pattern:**
```swift
SentrySDK.start { options in
    options.dsn = "https://..."
    options.environment = "production"
    options.tracesSampleRate = 0.1
}
```

**Regex:** `/SentrySDK\.start\s*\{\s*(\w+)\s+in([\s\S]*?)\}/`

**Key Features:**
- Swift closure syntax with `{ var in ... }`
- camelCase property names
- Property assignment without semicolons
- `NSNumber(value: ...)` for numeric values

**SDK-Specific Options:**

| Option | Description |
|--------|-------------|
| `releaseName` | Release version (instead of `release`) |
| `enableAutoSessionTracking` | Automatic session tracking |
| `enableUIViewControllerTracing` | UIViewController lifecycle tracing |
| `enableSwizzling` | Method swizzling for auto-instrumentation |
| `enableNetworkBreadcrumbs` | Automatic network breadcrumbs |
| `enableNetworkTracking` | Network request spans |
| `enableCaptureFailedRequests` | Capture HTTP errors |

---

## Rust

**Parser:** `RustConfigParser`

**Init Pattern:**
```rust
sentry::init(sentry::ClientOptions {
    dsn: Some("https://...".into()),
    environment: Some("production".into()),
    traces_sample_rate: 0.1,
    ..Default::default()
});
```

**Regex:** `/sentry::init\s*\(\s*(?:sentry::)?ClientOptions\s*\{([\s\S]*?)\}\s*\)/`

**Key Features:**
- Struct literal with `::` namespace
- snake_case field names
- `Some(...)` wrapper for optional values
- `..Default::default()` for remaining fields
- `.into()` conversions

**Type Inference:**
| Pattern | Inferred Type |
|---------|---------------|
| `Some(Box::new(\|...\|))` | function |
| `Some("...".into())` | string |
| `0.1` | number |

---

## Elixir

**Parser:** `ElixirConfigParser`

**Init Pattern:**
```elixir
config :sentry,
  dsn: "https://...",
  environment: "production",
  traces_sample_rate: 0.1
```

**Regex:** `/config\s+:sentry\s*,?([\s\S]*?)(?=config\s+:|$)/`

**Key Features:**
- Mix config file syntax
- Atom keys (`:key`)
- snake_case naming
- No explicit end delimiter (reads until next `config` or EOF)
- Supports module references like `{MyApp.Sentry, :before_send}`

**Key Normalization:** Same as Python (snake_case → camelCase)
