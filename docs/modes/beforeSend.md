# beforeSend Mode

Transform error events before they are sent to Sentry.

## Overview

The `beforeSend` callback is invoked before every error event is sent to Sentry. It receives the event and an optional hint object, and must return either:
- The modified event (to send it)
- `null` (to drop it entirely)

## When to Use

- Scrubbing PII (emails, IP addresses, tokens)
- Adding custom tags or context
- Filtering specific error types
- Modifying exception messages
- Adding business context

## Input Format

```json
{
  "event_id": "abc123",
  "message": "Something went wrong",
  "level": "error",
  "user": {
    "email": "user@example.com",
    "ip_address": "192.168.1.1"
  },
  "exception": {
    "values": [
      {
        "type": "TypeError",
        "value": "Cannot read property 'foo' of undefined"
      }
    ]
  },
  "tags": {},
  "extra": {}
}
```

## Output Format

The same event object, modified as needed, or `null` to drop.

## Examples

### Scrub PII

**JavaScript:**
```javascript
(event, hint) => {
  if (event.user) {
    event.user.email = '[REDACTED]';
    event.user.ip_address = null;
  }
  return event;
}
```

**Python:**
```python
def before_send(event, hint):
    if 'user' in event:
        event['user']['email'] = '[REDACTED]'
        event['user']['ip_address'] = None
    return event
```

### Add Custom Tags

**JavaScript:**
```javascript
(event, hint) => {
  event.tags = {
    ...event.tags,
    team: 'payments',
    environment: 'production'
  };
  return event;
}
```

### Drop Specific Errors

**JavaScript:**
```javascript
(event, hint) => {
  // Don't send 404 errors
  if (event.message?.includes('404')) {
    return null;
  }
  return event;
}
```

### Modify Exception Message

**JavaScript:**
```javascript
(event, hint) => {
  const exception = event.exception?.values?.[0];
  if (exception?.value?.includes('secret')) {
    exception.value = exception.value.replace(/secret=\w+/g, 'secret=[REDACTED]');
  }
  return event;
}
```

## SDK-Specific Notes

### JavaScript/TypeScript
- Callback receives `(event: Event, hint: EventHint)`
- Return event to send, `null` to drop
- Hint contains `originalException` for error inspection

### Python
- Function receives `(event, hint)`
- Return event dict or `None` to drop
- Hint contains `exc_info` tuple

### Go
- Uses interface-based approach
- Must compile before execution
- Return event or nil

### .NET
- Uses `SetBeforeSend` method
- Callback receives `SentryEvent`
- Return event or null

## Common Patterns

1. **Always check for field existence** before accessing nested properties
2. **Clone objects** if you need to preserve the original
3. **Use hint** to access the original error for additional context
4. **Test with real events** from your application for accuracy

## Related

- [beforeSendTransaction Mode](./beforeSendTransaction.md) - For performance transactions
- [beforeBreadcrumb Mode](./beforeBreadcrumb.md) - For breadcrumbs
- [Examples Library](../examples.md) - Pre-built templates
