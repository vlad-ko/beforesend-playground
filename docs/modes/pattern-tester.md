# Pattern Tester Mode

Test ignoreErrors, denyUrls, and allowUrls filter patterns.

## Overview

The Pattern Tester lets you validate regex and string patterns before deploying them in your Sentry configuration. Test patterns against sample inputs and generate ready-to-use Sentry.init() code.

## When to Use

- Validating ignoreErrors patterns
- Testing denyUrls/allowUrls patterns
- Debugging why errors aren't being filtered
- Generating configuration code
- Understanding pattern matching behavior

## Pattern Types

### ignoreErrors

Filter error messages from being sent to Sentry.

**Accepts:**
- Strings (exact match)
- Regular expressions

**Example:**
```javascript
ignoreErrors: [
  'ResizeObserver loop limit exceeded',
  /^Network request failed/,
  /Loading chunk \d+ failed/
]
```

### denyUrls

Filter errors from specific script URLs (browser SDKs).

**Accepts:**
- Strings (substring match)
- Regular expressions

**Example:**
```javascript
denyUrls: [
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  'facebook.com/signals'
]
```

### allowUrls

Only capture errors from specific script URLs (whitelist mode).

**Accepts:**
- Strings (substring match)
- Regular expressions

**Example:**
```javascript
allowUrls: [
  'example.com',
  /^https:\/\/cdn\.example\.com/
]
```

## How Pattern Matching Works

### ignoreErrors

1. Sentry extracts error message from the exception
2. Each pattern is tested against the message
3. **String patterns**: Checked as substring match
4. **Regex patterns**: Tested with `.test()`
5. First match causes the error to be dropped

### denyUrls / allowUrls

1. Sentry extracts script URL from stack trace
2. For denyUrls: First match causes error to be dropped
3. For allowUrls: Error must match at least one pattern to be sent

## Examples

### Filter Common Browser Noise

**ignoreErrors patterns:**
```javascript
[
  'ResizeObserver loop limit exceeded',
  'ResizeObserver loop completed with undelivered notifications',
  /^Non-Error promise rejection captured/,
  /^Loading chunk \d+ failed/,
  'Network request failed',
  'Failed to fetch'
]
```

### Filter Browser Extensions

**denyUrls patterns:**
```javascript
[
  /^chrome-extension:\/\//,
  /^moz-extension:\/\//,
  /^safari-extension:\/\//,
  /^safari-web-extension:\/\//
]
```

### Filter Third-Party Scripts

**denyUrls patterns:**
```javascript
[
  'google-analytics.com',
  'googletagmanager.com',
  'facebook.com',
  'hotjar.com',
  'intercom.io'
]
```

### Whitelist Your Domains

**allowUrls patterns:**
```javascript
[
  'example.com',
  'cdn.example.com',
  /^https:\/\/.*\.example\.com/
]
```

## Playground Features

### Test Patterns

1. Add patterns (string or regex)
2. Add test cases (messages or URLs)
3. See which patterns match which inputs
4. Understand match behavior

### Generate Code

The playground generates ready-to-use Sentry.init() code:

```javascript
Sentry.init({
  dsn: "YOUR_DSN",
  ignoreErrors: [
    "ResizeObserver loop limit exceeded",
    /^Loading chunk \d+ failed/
  ],
  denyUrls: [
    /^chrome-extension:\/\//
  ]
});
```

## Regex Tips

### Common Patterns

| Pattern | Matches |
|---------|---------|
| `^` | Start of string |
| `$` | End of string |
| `.*` | Any characters |
| `\d+` | One or more digits |
| `\w+` | One or more word characters |
| `[^/]+` | One or more non-slash characters |
| `\.` | Literal dot (escaped) |

### Example Regexes

```javascript
// Match "Loading chunk X failed"
/^Loading chunk \d+ failed/

// Match Chrome extensions
/^chrome-extension:\/\//

// Match any subdomain of example.com
/^https:\/\/.*\.example\.com/

// Match UUID in message
/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/
```

## Common Mistakes

1. **Not escaping special characters** - Use `\.` for literal dots
2. **Forgetting start anchor** - `^` ensures match at start
3. **Overly broad patterns** - May filter more than intended
4. **Case sensitivity** - Regex is case-sensitive by default

## Testing Approach

1. **Start with test cases** - Collect real error messages
2. **Write specific patterns** - Avoid overly broad matches
3. **Verify in playground** - Test before deploying
4. **Monitor after deployment** - Check Sentry for unexpected filtering

## Related

- [beforeSend Mode](./beforeSend.md) - For programmatic filtering
- [Sentry Filtering Docs](https://docs.sentry.io/platform-redirect/?next=/configuration/filtering/)
