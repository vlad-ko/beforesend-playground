# beforeSendTransaction Mode

Transform transaction events before they are sent to Sentry.

## Overview

The `beforeSendTransaction` callback is invoked before every performance transaction is sent to Sentry. Use it to modify transaction data, add context, or drop transactions entirely.

## When to Use

- Filtering health check transactions
- Adding environment/deployment context
- Modifying transaction names
- Adding team ownership tags
- Dropping transactions from certain endpoints

## Input Format

```json
{
  "event_id": "abc123",
  "type": "transaction",
  "transaction": "GET /api/users",
  "contexts": {
    "trace": {
      "op": "http.server",
      "status": "ok"
    }
  },
  "measurements": {
    "lcp": { "value": 2500 }
  },
  "tags": {}
}
```

## Output Format

The same transaction object, modified as needed, or `null` to drop.

## Examples

### Drop Health Check Transactions

**JavaScript:**
```javascript
(transaction, hint) => {
  if (transaction.transaction === 'GET /health' ||
      transaction.transaction === 'GET /healthz' ||
      transaction.transaction === 'GET /ready') {
    return null; // Don't send health checks
  }
  return transaction;
}
```

**Python:**
```python
def before_send_transaction(transaction, hint):
    name = transaction.get('transaction', '')
    if name in ['GET /health', 'GET /healthz', 'GET /ready']:
        return None
    return transaction
```

### Add Environment Context

**JavaScript:**
```javascript
(transaction, hint) => {
  transaction.tags = {
    ...transaction.tags,
    environment: process.env.NODE_ENV,
    deployment: process.env.DEPLOYMENT_ID,
    team: 'backend'
  };
  return transaction;
}
```

### Filter by Transaction Name Pattern

**JavaScript:**
```javascript
(transaction, hint) => {
  // Drop internal API calls
  if (transaction.transaction?.startsWith('GET /internal/')) {
    return null;
  }

  // Drop static asset requests
  if (transaction.transaction?.includes('/static/')) {
    return null;
  }

  return transaction;
}
```

### Normalize Transaction Names

**JavaScript:**
```javascript
(transaction, hint) => {
  // Convert /users/123 to /users/{id}
  if (transaction.transaction) {
    transaction.transaction = transaction.transaction
      .replace(/\/users\/\d+/g, '/users/{id}')
      .replace(/\/orders\/\d+/g, '/orders/{id}');
  }
  return transaction;
}
```

## SDK-Specific Notes

### JavaScript/TypeScript
- Callback receives `(transaction: Event, hint: EventHint)`
- Transaction events have `type: 'transaction'`
- Access trace context via `contexts.trace`

### Python
- Function receives `(transaction, hint)`
- Return transaction dict or `None` to drop
- Check for `type === 'transaction'` if needed

## Common Patterns

1. **Check transaction name** before filtering
2. **Add team tags** for ownership tracking
3. **Normalize dynamic segments** in URLs
4. **Filter by operation type** (e.g., only keep `http.server`)

## Difference from tracesSampler

| beforeSendTransaction | tracesSampler |
|----------------------|---------------|
| Runs after transaction completes | Runs before transaction starts |
| Can modify transaction data | Only controls sampling decision |
| Returns event or null | Returns number 0.0-1.0 |
| For filtering/enrichment | For sampling rate control |

Use `tracesSampler` when you want to control **what percentage** gets sampled.
Use `beforeSendTransaction` when you want to **modify or filter** completed transactions.

## Related

- [beforeSend Mode](./beforeSend.md) - For error events
- [tracesSampler Mode](./tracesSampler.md) - For sampling decisions
- [Examples Library](../examples.md) - Pre-built templates
