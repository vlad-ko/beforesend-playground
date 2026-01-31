# Choosing the Right Mode

Use this guide to determine which playground mode best fits your testing needs.

## Decision Flowchart

```
What do you want to test?
│
├─ Modify error events before sending?
│   └─ Use: beforeSend Mode
│
├─ Modify transaction/performance data?
│   └─ Use: beforeSendTransaction Mode
│
├─ Filter or modify breadcrumbs?
│   └─ Use: beforeBreadcrumb Mode
│
├─ Control which transactions are sampled?
│   └─ Use: tracesSampler Mode
│
├─ Test webhook integrations?
│   └─ Use: Webhooks Mode
│
├─ Validate SDK configuration?
│   └─ Use: Config Analyzer Mode
│
├─ Test API search queries?
│   └─ Use: API Query Tester Mode
│
└─ Test error/URL filter patterns?
    └─ Use: Pattern Tester Mode
```

## Mode Comparison Table

| Mode | Input | Output | Difficulty | Common Use Cases |
|------|-------|--------|------------|------------------|
| **beforeSend** | Error Event JSON | Modified event or `null` | Beginner | PII scrubbing, custom tags, dropping errors |
| **beforeSendTransaction** | Transaction JSON | Modified transaction or `null` | Beginner | Drop health checks, add context, filter by name |
| **beforeBreadcrumb** | Breadcrumb JSON | Modified breadcrumb or `null` | Beginner | Filter console logs, scrub URLs, categorize |
| **tracesSampler** | Sampling Context | Number (0.0-1.0) | Intermediate | Dynamic sampling rates, cost optimization |
| **Webhooks** | Webhook Payload | HTTP Response | Intermediate | Test integrations, debug signatures |
| **Config Analyzer** | Sentry.init() code | Analysis Report | Beginner | Validate config, get recommendations |
| **API Query Tester** | Search Query | API Results | Intermediate | Build queries, test syntax |
| **Pattern Tester** | Patterns + Test Cases | Match Results | Intermediate | Validate regex, test filters |

## When to Use Each Mode

### beforeSend Mode

**Use when you need to:**
- Remove sensitive data (PII) from error events
- Add custom tags or context to errors
- Drop specific types of errors entirely
- Modify exception messages or stack traces
- Add business context to error events

**Example scenarios:**
- Customer needs to scrub email addresses from events
- Want to tag errors by team/service
- Filter out known benign errors

### beforeSendTransaction Mode

**Use when you need to:**
- Filter out health check transactions
- Add environment/deployment context
- Modify transaction names for better grouping
- Drop transactions from certain endpoints
- Add custom measurements or tags

**Example scenarios:**
- Customer sees too many health check transactions
- Need to add team ownership tags to transactions
- Want to normalize transaction names

### beforeBreadcrumb Mode

**Use when you need to:**
- Reduce breadcrumb noise (console.log spam)
- Scrub tokens/secrets from navigation URLs
- Categorize breadcrumbs by service
- Filter HTTP breadcrumbs by domain
- Limit breadcrumb data size

**Example scenarios:**
- Debug logs filling up breadcrumb limit
- Tokens appearing in navigation breadcrumbs
- Need to organize breadcrumbs by service

### tracesSampler Mode

**Use when you need to:**
- Sample different endpoints at different rates
- Always capture critical paths (payments, auth)
- Drop health checks from sampling entirely
- Implement user-based sampling (VIP users)
- Optimize performance monitoring costs

**Example scenarios:**
- Customer wants 100% sampling for checkout flow
- Need to reduce tracing costs by 80%
- Different sampling for dev vs production

### Webhooks Mode

**Use when you need to:**
- Test webhook endpoint integration
- Debug HMAC signature verification
- Understand webhook payload structure
- Demonstrate webhook security to customers
- Verify endpoint is receiving data correctly

**Example scenarios:**
- Customer's webhook verification is failing
- Building a new webhook integration
- Demonstrating Sentry webhooks in a demo

### Config Analyzer Mode

**Use when you need to:**
- Validate a customer's Sentry.init() configuration
- Understand what each config option does
- Get recommendations for improvement
- Check for common misconfigurations
- Review configuration during implementation

**Example scenarios:**
- Customer shares their config for review
- Onboarding new Sentry implementation
- Debugging unexpected SDK behavior

### API Query Tester Mode

**Use when you need to:**
- Build complex search queries
- Test query syntax before using in code
- Debug why a query isn't returning expected results
- Generate cURL commands for API calls
- Understand Sentry's query syntax

**Example scenarios:**
- Building an integration that queries issues
- Customer needs help with search syntax
- Testing queries for dashboards/alerts

### Pattern Tester Mode

**Use when you need to:**
- Validate ignoreErrors patterns
- Test denyUrls/allowUrls patterns
- Generate Sentry.init() configuration
- Debug why errors aren't being filtered
- Test regex patterns before deployment

**Example scenarios:**
- Customer wants to ignore specific error messages
- Need to filter errors from third-party scripts
- Testing URL patterns for browser SDK

## Tips for Mode Selection

1. **Start simple** - If you're unsure, start with the mode that matches the callback name in Sentry docs
2. **Check the output type** - Modes that modify data return the modified object; tracesSampler returns a number
3. **Consider the data flow** - Breadcrumbs are captured first, then events/transactions are sent
4. **Combine modes** - You may need to test multiple modes for a complete solution
5. **Use examples** - Each mode has pre-built examples showing common patterns
