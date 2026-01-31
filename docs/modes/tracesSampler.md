# tracesSampler Mode

Test dynamic sampling strategies for performance monitoring.

## Overview

The `tracesSampler` callback returns a sample rate (0.0-1.0) for each transaction. Unlike `tracesSampleRate` which applies a fixed rate to all transactions, `tracesSampler` lets you implement dynamic, context-aware sampling decisions.

## When to Use

- Sampling critical endpoints at higher rates
- Dropping health checks entirely
- Implementing user-based sampling (VIP users)
- Environment-based sampling (dev vs prod)
- Cost optimization while maintaining visibility

## Input Format (Sampling Context)

```json
{
  "transactionContext": {
    "name": "GET /api/payment/process",
    "op": "http.server"
  },
  "parentSampled": true,
  "request": {
    "url": "https://example.com/api/payment/process",
    "method": "GET"
  },
  "customSamplingContext": {
    "user": {
      "plan": "enterprise",
      "isBetaTester": true
    }
  }
}
```

### Context Fields

| Field | Description |
|-------|-------------|
| `transactionContext.name` | Transaction name (e.g., endpoint) |
| `transactionContext.op` | Operation type (http.server, db.query) |
| `parentSampled` | Whether parent span was sampled |
| `request` | HTTP request details (if applicable) |
| `customSamplingContext` | Custom data passed via tracing |

## Output Format

A number between 0.0 and 1.0:
- `0.0` - Never sample (0%)
- `1.0` - Always sample (100%)
- `0.1` - Sample 10%
- `0.5` - Sample 50%

## Examples

### Critical Endpoints Sampling

**JavaScript:**
```javascript
(samplingContext) => {
  const name = samplingContext.transactionContext.name;

  // Always sample payment and checkout endpoints
  if (name.includes('/payment') || name.includes('/checkout')) {
    return 1.0; // 100%
  }

  // Higher sampling for auth
  if (name.includes('/auth') || name.includes('/login')) {
    return 0.5; // 50%
  }

  // Lower sampling for API
  if (name.includes('/api/')) {
    return 0.1; // 10%
  }

  return 0.05; // 5% default
}
```

### Health Check Filtering

**JavaScript:**
```javascript
(samplingContext) => {
  const name = samplingContext.transactionContext.name;

  // Never sample health checks
  if (name === 'GET /health' ||
      name === 'GET /healthz' ||
      name === 'GET /ready' ||
      name.includes('/metrics')) {
    return 0.0; // 0%
  }

  // Never sample favicon
  if (name.includes('favicon')) {
    return 0.0;
  }

  return 0.2; // 20% for everything else
}
```

### User-Based Sampling

**JavaScript:**
```javascript
(samplingContext) => {
  const user = samplingContext.customSamplingContext?.user || {};

  // Always sample enterprise customers
  if (user.plan === 'enterprise') {
    return 1.0;
  }

  // Always sample beta testers
  if (user.isBetaTester) {
    return 1.0;
  }

  // Higher sampling for paid plans
  if (user.plan === 'pro' || user.plan === 'business') {
    return 0.5;
  }

  // Lower sampling for free tier
  if (user.plan === 'free') {
    return 0.05;
  }

  return 0.1; // 10% default
}
```

### Environment-Based Sampling

**Python:**
```python
def traces_sampler(sampling_context):
    custom_ctx = sampling_context.get('custom_sampling_context', {})
    environment = custom_ctx.get('environment', 'production')

    # 100% in development
    if environment in ('development', 'dev', 'local'):
        return 1.0

    # 50% in staging
    if environment in ('staging', 'uat', 'qa'):
        return 0.5

    # 10% in production (with exceptions)
    if environment == 'production':
        name = sampling_context.get('transaction_context', {}).get('name', '')

        # Higher for critical paths
        if '/payment' in name:
            return 0.5

        return 0.1

    return 0.05
```

## SDK-Specific Notes

### JavaScript/TypeScript
- Callback receives `samplingContext` object
- Return number 0.0-1.0
- Access custom context via SDK integration

### Python
- Function receives `sampling_context` dict
- Keys use snake_case (`transaction_context`)
- Return float 0.0-1.0

## Playground Output

When you evaluate a tracesSampler in the playground, you'll see:

1. **Sampling Rate** - Large percentage display
2. **Decision Indicator** - Shows if transaction will be sent or dropped
3. **Visual Progress Bar** - Color-coded rate visualization
4. **Explanation** - "X% sampled (Y% dropped)"

## Common Patterns

1. **Always sample critical paths** - Payments, auth, checkout
2. **Never sample monitoring endpoints** - Health, metrics, status
3. **Higher rates for paid customers** - VIP/enterprise users
4. **Lower rates in production** - Cost optimization
5. **Inherit parent decision** - Use `parentSampled` for consistency

## Difference from tracesSampleRate

| tracesSampleRate | tracesSampler |
|------------------|---------------|
| Fixed rate for all transactions | Dynamic rate per transaction |
| Simple configuration | Custom logic |
| `tracesSampleRate: 0.1` | Function returning 0.0-1.0 |

**Use tracesSampleRate** for simple, uniform sampling.
**Use tracesSampler** for dynamic, context-aware sampling.

## Related

- [beforeSendTransaction Mode](./beforeSendTransaction.md) - Post-capture filtering
- [Examples Library](../examples.md) - Pre-built templates
- [Sentry Sampling Docs](https://docs.sentry.io/platform-redirect/?next=/configuration/sampling/)
