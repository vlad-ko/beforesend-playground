# API Query Tester

Test and validate Sentry REST API search queries in a safe sandbox environment.

## Overview

The API Query Tester helps Solutions Engineers:
- **Debug query syntax** before using in integrations
- **Validate search properties** with real-time feedback
- **Test queries** against actual Sentry data
- **Generate cURL commands** for documentation or debugging
- **Parse Sentry URLs** to extract query parameters

## Getting Started

### Prerequisites

1. **Sentry Organization Access**: You need access to a Sentry organization
2. **Personal Auth Token**: Create a **Personal Auth Token** at [demo.sentry.io/settings/account/api/auth-tokens/](https://demo.sentry.io/settings/account/api/auth-tokens/) (or replace `demo` with your org)
   - **Important**: Organization Auth Tokens won't work for API queries - you need a Personal Auth Token
   - The token needs access to the organization you want to query

### Basic Usage

1. Navigate to the **API Query Tester** tab in the playground
2. Enter your organization slug (e.g., `demo`)
3. Enter your auth token
4. Type a query (e.g., `is:unresolved level:error`)
5. Click **Execute Query**

## Query Syntax

Sentry uses a structured query language for searching issues and events.

### Basic Syntax

```
property:value
```

**Examples:**
- `level:error` - Find error-level issues
- `is:unresolved` - Find unresolved issues
- `assigned:me` - Find issues assigned to you

### Operators

| Operator | Example | Description |
|----------|---------|-------------|
| `:` | `level:error` | Exact match |
| `!:` | `!level:error` | Not equal |
| `:>` | `age:>24h` | Greater than |
| `:<` | `timesSeen:<100` | Less than |
| `:>=` | `count:>=10` | Greater than or equal |
| `:<=` | `count:<=10` | Less than or equal |

### Special Values

| Value | Example | Description |
|-------|---------|-------------|
| `me` | `assigned:me` | Current user |
| `none` | `assigned:none` | No assignment |
| `my_teams` | `assigned:my_teams` | User's teams |
| `#team-name` | `assigned:#team-backend` | Specific team |

### Wildcards

Use `*` for pattern matching:
- `user.email:*@example.com` - Emails ending with @example.com
- `browser:Safari*` - Browser starting with Safari
- `!message:*Timeout` - Messages not ending with Timeout

### Multiple Values

Use brackets for multiple values (OR logic):
- `release:[12.0, 13.0]` - Either release 12.0 or 13.0
- `level:[error, warning]` - Error or warning level

### Quoted Values

Use quotes for values with spaces:
- `user.username:"Jane Doe"`
- `message:"Connection failed"`

## Available Properties

### Status & Assignment
| Property | Values | Example |
|----------|--------|---------|
| `is` | unresolved, resolved, ignored, assigned, unassigned, for_review, linked, unlinked, archived | `is:unresolved` |
| `assigned` | user ID, me, none, my_teams, #team-name | `assigned:me` |
| `bookmarks` | user ID, me | `bookmarks:me` |

### Severity
| Property | Values | Example |
|----------|--------|---------|
| `level` | fatal, error, warning, info, debug | `level:error` |

### Time-based
| Property | Format | Example |
|----------|--------|---------|
| `age` | Relative time (h, d, w) | `age:>24h` |
| `firstSeen` | Relative time or ISO date | `firstSeen:-7d` |
| `lastSeen` | Relative time or ISO date | `lastSeen:+30d` |
| `timesSeen` | Number | `timesSeen:>100` |

### Release
| Property | Format | Example |
|----------|--------|---------|
| `release` | Version string or `latest` | `release:1.0.0` |
| `firstRelease` | Version string | `firstRelease:1.0.0` |

### Error Properties
| Property | Format | Example |
|----------|--------|---------|
| `error.type` | Exception type | `error.type:TypeError` |
| `error.handled` | Boolean | `error.handled:false` |
| `error.unhandled` | Boolean | `error.unhandled:true` |

### User Properties
| Property | Format | Example |
|----------|--------|---------|
| `user.id` | User ID | `user.id:12345` |
| `user.email` | Email | `user.email:*@example.com` |
| `user.username` | Username | `user.username:"Jane Doe"` |
| `user.ip` | IP address | `user.ip:192.168.*` |

### HTTP Properties
| Property | Values | Example |
|----------|--------|---------|
| `http.method` | GET, POST, PUT, DELETE, etc. | `http.method:GET` |
| `http.status_code` | HTTP status code | `http.status_code:500` |
| `http.url` | URL pattern | `http.url:*/api/*` |

### Device Properties
| Property | Format | Example |
|----------|--------|---------|
| `device.family` | Device family | `device.family:iPhone` |
| `device.brand` | Device brand | `device.brand:Apple` |

### Geo Properties
| Property | Format | Example |
|----------|--------|---------|
| `geo.country_code` | ISO 3166-1 code | `geo.country_code:US` |
| `geo.city` | City name | `geo.city:Seattle` |

### Utility
| Property | Format | Example |
|----------|--------|---------|
| `has` | Field name | `has:user` |
| `environment` | Environment name | `environment:production` |
| `project` | Project name | `project:my-app` |

## API Endpoints

### Issues Endpoint
```
GET /api/0/organizations/{org}/issues/
```

**Query Parameters:**
- `query` - Search query string
- `environment` - Environment filter
- `project` - Project ID filter
- `statsPeriod` - Time period (24h, 7d, 14d, 30d, 90d)

### Events Endpoint
```
GET /api/0/projects/{org}/{project}/events/
```

**Query Parameters:**
- `query` - Search query string
- `statsPeriod` - Time period
- `full` - Include full event body

### Projects Endpoint
```
GET /api/0/organizations/{org}/projects/
```

## Real-time Validation

The query tester validates your queries as you type:

### Valid Properties
- Known properties show a green checkmark
- The tester knows 60+ Sentry search properties

### Invalid Properties
- Unknown properties show a warning
- Typo suggestions are provided (e.g., `assignee` → `assigned`)

### Value Validation
- Enum values are checked (e.g., `level:critical` is invalid)
- Suggestions for valid values are shown

## Rate Limiting

Sentry API has rate limits:
- **Per-second limits** vary by endpoint
- **Concurrent request limits** apply

The tester shows rate limit info in responses:
- Limit: Maximum requests allowed
- Remaining: Requests left in current window
- Rate limited responses (429) are indicated clearly

## Pagination

For large result sets, Sentry uses cursor-based pagination:
- Results indicate if more pages are available
- Cursor values are shown for follow-up requests

## Security Considerations

- **Auth tokens are stored in memory only** - Never persisted
- **Tokens are masked in cURL commands** - Safe to share
- **Use the SE testing org** for demonstrations
- **Don't use customer org tokens** in shared environments

## Common Use Cases

### 1. Debug Customer Query Issues

Customer reports their integration isn't finding issues:
1. Paste their query into the tester
2. Check for validation errors
3. Execute to verify results
4. Share corrected query with cURL command

### 2. Build API Integrations

Building a dashboard or automation:
1. Test queries interactively
2. Validate response format
3. Copy cURL commands for implementation
4. Check rate limits for capacity planning

### 3. Customer Demo

Showing Sentry's API capabilities:
1. Demonstrate real-time validation
2. Show query syntax flexibility
3. Execute queries against test data
4. Share cURL commands

### 4. Troubleshoot Empty Results

Query returning no results:
1. Validate query syntax
2. Check for typos in properties
3. Try broader queries
4. Verify org/project access

## Troubleshooting

### "Unauthorized" Error
- Check auth token is valid
- Verify token has `event:read` scope
- Token may have expired

### "Not Found" Error
- Check organization slug is correct
- Verify you have access to the organization
- For events endpoint, check project slug

### "Rate Limited" Error
- Wait before making more requests
- Check the `Retry-After` guidance
- Consider reducing query frequency

### No Results
- Broaden your query
- Check time period (statsPeriod)
- Verify environment filter
- Try removing filters one by one

## API Reference

### POST /api/sentry-query/validate
Validate query syntax without executing.

**Request:**
```json
{
  "query": "level:error is:unresolved"
}
```

**Response:**
```json
{
  "valid": true,
  "components": [...],
  "suggestions": []
}
```

### POST /api/sentry-query/test
Execute a query against Sentry API.

**Request:**
```json
{
  "org": "demo",
  "authToken": "sntrys_...",
  "endpoint": "issues",
  "query": "level:error",
  "environment": "production",
  "statsPeriod": "24h"
}
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "count": 10,
  "generatedUrl": "https://...",
  "generatedCurl": "curl ..."
}
```

### POST /api/sentry-query/parse-url
Extract query parameters from Sentry UI URL.

**Request:**
```json
{
  "url": "https://demo.sentry.io/issues/?query=level%3Aerror"
}
```

**Response:**
```json
{
  "success": true,
  "org": "demo",
  "query": "level:error",
  "endpoint": "issues"
}
```

### GET /api/sentry-query/properties
List all valid query properties.

### GET /api/sentry-query/examples
Get example queries.

## Resources

- [Sentry Search Docs](https://docs.sentry.io/concepts/search/)
- [Sentry API Reference](https://docs.sentry.io/api/)
- [Issue Properties Reference](https://docs.sentry.io/concepts/search/searchable-properties/issues/)
- [Event Properties Reference](https://docs.sentry.io/concepts/search/searchable-properties/events/)
