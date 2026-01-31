# Webhooks Mode

Test Sentry webhook payloads with HMAC-SHA256 signature generation and verification.

## Overview

Sentry sends webhooks for various events (new issues, alerts, comments). The Webhooks mode lets you test webhook integrations, debug signature verification, and understand payload structures.

## When to Use

- Testing webhook endpoint integration
- Debugging HMAC signature verification
- Understanding webhook payload structure
- Demonstrating webhook security to customers
- Verifying endpoint receives data correctly

## Available Webhook Templates

### Issue Alerts

| Template | Trigger |
|----------|---------|
| Issue Alert - Created | New issue created |
| Issue Alert - Resolved | Issue marked resolved |
| Issue Alert - Assigned | Issue assigned to user |

### Performance & Monitoring

| Template | Trigger |
|----------|---------|
| Metric Alert | Metric threshold breached |

### Error Events

| Template | Trigger |
|----------|---------|
| Error Event | New error occurs |

### Collaboration

| Template | Trigger |
|----------|---------|
| Comment Created | Comment added to issue |

## How It Works

1. Select a webhook template
2. Customize the payload (optional)
3. Enter your webhook endpoint URL
4. Add a webhook secret (optional)
5. Click **Send Webhook**
6. View request details and response

## Signature Verification

When you provide a webhook secret, the playground generates an HMAC-SHA256 signature. This signature is included in the `Sentry-Hook-Signature` header.

### Signature Format

```
Sentry-Hook-Signature: 98c4da25a5aa896c33fa7edc1a1169a97ac78866002f089c43b49d8971617529
```

### How Signatures Work

1. Take the raw request body (exact bytes)
2. Compute HMAC-SHA256 using your secret
3. Compare with the received signature
4. Reject if they don't match

### Verification Code

**Node.js:**
```javascript
const crypto = require('crypto');

function verifySentrySignature(rawBody, signature, secret) {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)  // Raw body, not re-serialized JSON
    .digest('hex');

  return signature === expected;
}

// Express.js
app.post('/webhooks/sentry', express.json({
  verify: (req, res, buf) => {
    req.rawBody = buf.toString('utf8');
  }
}), (req, res) => {
  const signature = req.headers['sentry-hook-signature'];
  const secret = process.env.SENTRY_WEBHOOK_SECRET;

  if (!verifySentrySignature(req.rawBody, signature, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // Process webhook...
  res.json({ success: true });
});
```

**Python:**
```python
import hmac
import hashlib
from flask import Flask, request

def verify_sentry_signature(raw_body: bytes, signature: str, secret: str) -> bool:
    expected = hmac.new(
        secret.encode('utf-8'),
        raw_body,  # Raw bytes, not JSON
        hashlib.sha256
    ).hexdigest()
    return signature == expected

@app.route('/webhooks/sentry', methods=['POST'])
def sentry_webhook():
    signature = request.headers.get('Sentry-Hook-Signature')
    secret = os.environ['SENTRY_WEBHOOK_SECRET']

    if not verify_sentry_signature(request.get_data(), signature, secret):
        return {'error': 'Invalid signature'}, 401

    # Process webhook...
    return {'success': True}
```

## Built-in Receiver

The playground includes a test receiver at:
```
http://localhost:4000/api/webhooks/receive
```

Use this to test your webhook payloads:

1. Keep the default URL
2. Add secret: `test-secret`
3. Click **Send Webhook**
4. View verification results

The response shows:
- Signature verification status
- Received vs expected signatures
- Troubleshooting tips

## Common Issues

### Signature Mismatch

**Cause:** Using re-serialized JSON instead of raw body

**Fix:** Capture the raw request body before JSON parsing

### Missing Headers

**Cause:** Proxy/load balancer stripping headers

**Fix:** Configure proxy to pass through `Sentry-Hook-Signature`

### Timing Issues

**Cause:** Request body modified in transit

**Fix:** Ensure no middleware modifies the body

## Webhook Payload Structure

### Issue Alert Payload

```json
{
  "action": "created",
  "data": {
    "issue": {
      "id": "123",
      "title": "Error: Something went wrong",
      "culprit": "app/controllers/main.js",
      "level": "error",
      "platform": "javascript"
    }
  },
  "actor": {
    "type": "user",
    "name": "John Doe"
  }
}
```

### Key Fields

| Field | Description |
|-------|-------------|
| `action` | Event type (created, resolved, etc.) |
| `data.issue` | Issue details |
| `data.event` | Event details (for error webhooks) |
| `actor` | Who/what triggered the action |

## Use Cases

### Test Customer Integration

1. Send test webhook to customer's endpoint
2. Show exact signature generation
3. Debug their verification code
4. Demonstrate raw body importance

### Demonstrate Security

1. Send webhook with secret
2. Show HMAC-SHA256 signature
3. Explain spoofing prevention
4. Share verification examples

### Inspect Payloads

1. Select different webhook types
2. Review payload structure
3. Identify useful fields
4. Plan automation logic

## Related

- [Sentry Webhook Docs](https://docs.sentry.io/product/integrations/integration-platform/webhooks/)
- [API Reference](../api-reference.md)
