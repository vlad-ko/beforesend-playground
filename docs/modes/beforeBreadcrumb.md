# beforeBreadcrumb Mode

Filter and modify breadcrumbs before they are added to events.

## Overview

The `beforeBreadcrumb` callback is invoked before each breadcrumb is added to the scope. Breadcrumbs are automatic or manual records of actions/events leading up to an error. This callback lets you filter noise and scrub sensitive data.

## When to Use

- Filtering console.log noise
- Scrubbing tokens from URLs
- Removing sensitive HTTP request data
- Categorizing breadcrumbs by service
- Limiting breadcrumb volume

## Input Format

```json
{
  "type": "default",
  "category": "navigation",
  "level": "info",
  "timestamp": 1704067200.0,
  "message": "Navigation to dashboard",
  "data": {
    "from": "/login",
    "to": "/dashboard?token=abc123"
  }
}
```

### Breadcrumb Types

| Type | Category Examples | Description |
|------|------------------|-------------|
| `default` | `navigation`, `ui.click` | User interactions |
| `http` | `xhr`, `fetch` | HTTP requests |
| `console` | `console` | Console logs |
| `navigation` | `navigation` | Page navigation |
| `query` | `query` | Database queries |

## Output Format

The same breadcrumb object, modified as needed, or `null` to drop.

## Examples

### Filter Console Breadcrumbs

**JavaScript:**
```javascript
(breadcrumb, hint) => {
  // Drop console breadcrumbs to reduce noise
  if (breadcrumb.category === 'console') {
    return null;
  }
  return breadcrumb;
}
```

**Python:**
```python
def before_breadcrumb(breadcrumb, hint):
    if breadcrumb.get('category') == 'console':
        return None
    return breadcrumb
```

### Scrub Tokens from URLs

**JavaScript:**
```javascript
(breadcrumb, hint) => {
  if (breadcrumb.category === 'navigation') {
    if (breadcrumb.data?.to) {
      breadcrumb.data.to = breadcrumb.data.to
        .replace(/token=[^&]+/g, 'token=[REDACTED]')
        .replace(/api_key=[^&]+/g, 'api_key=[REDACTED]');
    }
    if (breadcrumb.data?.from) {
      breadcrumb.data.from = breadcrumb.data.from
        .replace(/token=[^&]+/g, 'token=[REDACTED]');
    }
  }
  return breadcrumb;
}
```

### Drop HTTP Noise

**JavaScript:**
```javascript
(breadcrumb, hint) => {
  if (breadcrumb.category === 'xhr' || breadcrumb.category === 'fetch') {
    const url = breadcrumb.data?.url || '';

    // Drop analytics and monitoring calls
    if (url.includes('google-analytics.com') ||
        url.includes('segment.io') ||
        url.includes('hotjar.com')) {
      return null;
    }
  }
  return breadcrumb;
}
```

### Categorize by Service

**JavaScript:**
```javascript
(breadcrumb, hint) => {
  const message = breadcrumb.message || '';

  // Categorize by service based on message prefix
  if (message.includes('[PaymentService]')) {
    breadcrumb.category = 'payment';
    breadcrumb.level = 'info';
  } else if (message.includes('[AuthService]')) {
    breadcrumb.category = 'auth';
  }

  // Upgrade level for errors
  if (message.toLowerCase().includes('error')) {
    breadcrumb.level = 'error';
  }

  return breadcrumb;
}
```

### Limit Breadcrumb Data Size

**JavaScript:**
```javascript
(breadcrumb, hint) => {
  // Truncate long messages
  if (breadcrumb.message && breadcrumb.message.length > 200) {
    breadcrumb.message = breadcrumb.message.substring(0, 200) + '...';
  }

  // Remove large data payloads
  if (breadcrumb.data && JSON.stringify(breadcrumb.data).length > 1000) {
    breadcrumb.data = { truncated: true };
  }

  return breadcrumb;
}
```

## SDK-Specific Notes

### JavaScript/TypeScript
- Callback receives `(breadcrumb: Breadcrumb, hint?: BreadcrumbHint)`
- Return breadcrumb or `null` to drop
- Hint may contain DOM event or XHR object

### Python
- Function receives `(breadcrumb, hint)`
- Return breadcrumb dict or `None` to drop
- Common categories: `console`, `http`, `navigation`

## Breadcrumb Levels

- `fatal` - Critical errors
- `error` - Errors
- `warning` - Warnings
- `info` - Information (default)
- `debug` - Debug information

## Common Patterns

1. **Filter by category** to reduce specific types of noise
2. **Scrub URLs** in navigation breadcrumbs
3. **Drop third-party HTTP calls** that aren't relevant
4. **Categorize by service** for easier debugging
5. **Truncate large payloads** to stay within limits

## Related

- [beforeSend Mode](./beforeSend.md) - For error events
- [beforeSendTransaction Mode](./beforeSendTransaction.md) - For transactions
- [Examples Library](../examples.md) - Pre-built templates
