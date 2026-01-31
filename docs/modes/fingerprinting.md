# Fingerprinting Mode Guide

Fingerprinting mode helps you test custom issue grouping strategies. Control how Sentry groups errors into issues by setting the `event.fingerprint` property.

## Overview

By default, Sentry groups errors using its built-in algorithm based on:
- Exception type
- Exception message (normalized)
- Stack trace

Sometimes this creates too many issues (dynamic data in messages) or too few (different errors grouped together). Custom fingerprinting gives you control.

## How It Works

Fingerprinting is done via the `beforeSend` callback by setting `event.fingerprint`:

```javascript
Sentry.init({
  beforeSend(event, hint) {
    // Set custom fingerprint
    event.fingerprint = ['my-custom-group'];
    return event;
  }
});
```

The Fingerprinting mode in the playground provides:
- Visual comparison of default vs custom fingerprint
- Clear indication when fingerprint is set
- Explanation of grouping impact

## Fingerprint Values

### Simple Grouping

Group all matching errors into one issue:

```javascript
event.fingerprint = ['payment-error'];
```

### Include Default Grouping

Combine custom grouping with Sentry's default:

```javascript
event.fingerprint = ['payment-error', '{{ default }}'];
```

### Dynamic Grouping

Use event data to create groups:

```javascript
event.fingerprint = [
  'api-error',
  event.tags?.endpoint || 'unknown'
];
```

## Common Patterns

### Normalize Database Errors

Group by error type, not instance name:

```javascript
(event, hint) => {
  if (event.message?.includes('Database connection failed')) {
    // Groups all DB connection errors together
    // regardless of which database instance failed
    event.fingerprint = ['database-connection-error'];
  }
  return event;
}
```

**Before:** Separate issues for `db-prod-1`, `db-prod-2`, etc.
**After:** One issue for all database connection errors.

### Normalize API URLs

Remove dynamic IDs from URL-based grouping:

```javascript
(event, hint) => {
  const url = event.request?.url || '';
  if (url.includes('/api/users/')) {
    // Replace user IDs with placeholder
    const normalized = url.replace(/\/users\/\d+/, '/users/:id');
    event.fingerprint = ['api-error', normalized];
  }
  return event;
}
```

**Before:** `/api/users/123` and `/api/users/456` create separate issues.
**After:** All user endpoint errors grouped together.

### Split by User Type

Create separate issues for different user segments:

```javascript
(event, hint) => {
  const userType = event.user?.subscription || 'free';

  if (event.exception?.values?.[0]?.type === 'PaymentError') {
    event.fingerprint = [
      'payment-error',
      userType,  // 'free' or 'premium'
      '{{ default }}'
    ];
  }
  return event;
}
```

**Result:** Premium user payment errors in separate issue for faster response.

### Group by Error Category

Categorize errors by business impact:

```javascript
(event, hint) => {
  const errorType = event.exception?.values?.[0]?.type;

  const categories = {
    'NetworkError': 'connectivity',
    'TimeoutError': 'connectivity',
    'AuthError': 'authentication',
    'PermissionError': 'authentication',
    'ValidationError': 'user-input',
  };

  const category = categories[errorType];
  if (category) {
    event.fingerprint = [category, '{{ default }}'];
  }
  return event;
}
```

## SDK-Specific Syntax

### JavaScript

```javascript
(event, hint) => {
  event.fingerprint = ['custom-group'];
  return event;
}
```

### Python

```python
def before_send(event, hint):
    event['fingerprint'] = ['custom-group']
    return event
```

### Ruby

```ruby
lambda do |event, hint|
  event['fingerprint'] = ['custom-group']
  event
end
```

### PHP

```php
function($event, $hint) {
    $event['fingerprint'] = ['custom-group'];
    return $event;
}
```

### Go

```go
event["fingerprint"] = []string{"custom-group"}
return event
```

### .NET

```csharp
(sentryEvent) => {
    sentryEvent.SetFingerprint(new[] { "custom-group" });
    return sentryEvent;
}
```

## Special Values

| Value | Meaning |
|-------|---------|
| `{{ default }}` | Include Sentry's default grouping |
| `{{ transaction }}` | Include transaction name |
| `{{ function }}` | Include function name from stack trace |
| `{{ module }}` | Include module name from stack trace |
| `{{ package }}` | Include package name from stack trace |
| `{{ type }}` | Include exception type |
| `{{ value }}` | Include exception message |

## Best Practices

1. **Start broad, refine later** - Begin with simple fingerprints, add specificity as needed
2. **Use `{{ default }}`** - Combine with default grouping to avoid over-grouping
3. **Test thoroughly** - Use the playground to verify grouping before deploying
4. **Document your rules** - Comment why each fingerprint rule exists
5. **Monitor issue count** - Too few issues may hide important errors

## Debugging

### Event Not Grouped as Expected

1. Check if `beforeSend` is returning the event
2. Verify `event.fingerprint` is an array
3. Ensure fingerprint values are strings
4. Check for typos in special values like `{{ default }}`

### Too Many Issues

- Fingerprint may include dynamic data
- Remove variable parts (IDs, timestamps)
- Use broader categories

### Too Few Issues

- Fingerprint may be too generic
- Add `{{ default }}` to include Sentry's grouping
- Add more specific identifiers

## Related

- [Before Send Mode](./beforeSend.md) - General event transformation
- [Sentry Fingerprinting Docs](https://docs.sentry.io/platform-redirect/?next=/configuration/grouping/)
