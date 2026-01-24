# Testing Guide

This guide covers testing practices, running tests, and adding tests for new features in the beforeSend Testing Playground.

## Table of Contents
- [Testing Philosophy](#testing-philosophy)
- [Running Tests](#running-tests)
- [Test Structure](#test-structure)
- [Coverage Requirements](#coverage-requirements)
- [TDD Workflow](#tdd-workflow)
- [Adding Tests](#adding-tests)
- [Troubleshooting](#troubleshooting)

## Testing Philosophy

### Docker-First Testing
**CRITICAL:** All tests run inside Docker containers. Never run tests directly on your host machine.

**Why?**
- Tests run in the same environment as production
- No version conflicts or dependency issues
- Consistent results across all machines
- Prevents pollution of local environment

### Test-Driven Development (TDD)
**REQUIRED:** Write tests BEFORE implementing features.

**Process:**
1. **RED** - Write failing test that describes desired behavior
2. **GREEN** - Write minimum code to make test pass
3. **REFACTOR** - Clean up code while keeping tests green

## Running Tests

### Quick Start

```bash
# Build all containers first
docker-compose build

# Run all tests for a specific service
docker run --rm beforesend-playground-api npm test
docker run --rm beforesend-playground-sdk-python pytest
docker run --rm beforesend-playground-sdk-javascript npm test

# Run with coverage
docker run --rm beforesend-playground-api npm run test:coverage
```

### All Test Commands

#### API Gateway Tests

```bash
# All tests
docker run --rm beforesend-playground-api npm test

# Specific test file
docker run --rm beforesend-playground-api npm test -- routes/transform.test.ts

# Watch mode (requires running container)
docker-compose up api
docker-compose exec api npm run test:watch

# Coverage report
docker run --rm beforesend-playground-api npm run test:coverage

# View coverage report
open api/coverage/lcov-report/index.html
```

#### SDK Container Tests

**JavaScript SDK:**
```bash
docker run --rm -e NODE_ENV=test beforesend-playground-sdk-javascript npm test
```

**Python SDK:**
```bash
docker run --rm beforesend-playground-sdk-python pytest
docker run --rm beforesend-playground-sdk-python pytest --cov  # With coverage
```

**Go SDK:**
```bash
docker run --rm beforesend-playground-sdk-go go test ./...
```

**Rust SDK:**
```bash
docker run --rm beforesend-playground-sdk-rust cargo test
```

#### UI Tests

```bash
# All UI tests
docker run --rm beforesend-playground-ui npm test

# Watch mode
docker-compose up ui
docker-compose exec ui npm run test:watch
```

### Integration Tests

```bash
# Start all services
docker-compose up -d

# Run integration tests (requires services running)
docker run --rm --network beforesend-network \
  -e API_URL=http://api:4000 \
  beforesend-playground-api npm run test:integration
```

## Test Structure

### Unit Tests
Test individual functions and modules in isolation.

**Location:** `api/test/`, `sdks/*/test/`

**Example:**
```typescript
// api/test/parsers/json.test.ts
describe('validateJSON', () => {
  it('should validate correct JSON', () => {
    const result = validateJSON('{"test": "value"}');
    expect(result.valid).toBe(true);
  });

  it('should reject invalid JSON', () => {
    const result = validateJSON('{invalid}');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('Unexpected token');
  });
});
```

### Integration Tests
Test interactions between components.

**Location:** `api/test/integration/`

**Example:**
```typescript
// api/test/integration/transform.test.ts
describe('Transform API Integration', () => {
  it('should transform event with Python SDK', async () => {
    const response = await request(app)
      .post('/api/transform')
      .send({
        sdk: 'python',
        event: { message: 'test' },
        beforeSendCode: 'return event'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });
});
```

### End-to-End Tests
Test complete user workflows through the UI.

**Location:** `ui/test/e2e/`

**Example:**
```typescript
// ui/test/e2e/transformation.test.tsx
describe('Transformation Workflow', () => {
  it('should load example, transform, and show diff', () => {
    render(<App />);

    // Load example
    fireEvent.click(screen.getByText('Load Example'));
    fireEvent.click(screen.getByText('PII Scrubbing'));

    // Transform
    fireEvent.click(screen.getByText('Transform'));

    // Check result
    expect(screen.getByText('Transformation Successful')).toBeInTheDocument();
  });
});
```

## Coverage Requirements

### Overall Coverage
- **Minimum:** 80% statement coverage
- **Minimum:** 80% branch coverage
- **Goal:** 90%+ for critical paths

### Critical Paths (100% Required)
- Transformation logic
- SDK routing
- Event validation
- Error handling

### View Coverage Reports

```bash
# Generate coverage report
docker run --rm beforesend-playground-api npm run test:coverage

# Open HTML report
open api/coverage/lcov-report/index.html
```

### Coverage Badges

Check current coverage in CI:
- Statement: ![Coverage](https://img.shields.io/badge/coverage-85%25-green)
- Branch: ![Coverage](https://img.shields.io/badge/branches-82%25-green)

## TDD Workflow

### Example: Adding Rust SDK Support

#### 1. RED Phase - Write Failing Tests

```typescript
// api/test/sdk-clients/rust.test.ts
describe('Rust SDK Client', () => {
  it('should successfully transform event with Rust SDK', async () => {
    const event = { message: 'test error' };
    const beforeSendCode = 'Some(event)';

    const result = await transformWithRust(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toEqual(event);
  });

  it('should handle transformation that returns None', async () => {
    const event = { message: 'test' };
    const beforeSendCode = 'None';

    const result = await transformWithRust(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toBeNull();
  });
});
```

**Run test to verify it fails:**
```bash
docker run --rm beforesend-playground-api npm test -- sdk-clients/rust.test.ts
# Expected: FAIL - transformWithRust is not defined
```

#### 2. GREEN Phase - Make Tests Pass

**Create SDK client:**
```typescript
// api/src/sdk-clients/rust.ts
export async function transformWithRust(
  event: Record<string, any>,
  beforeSendCode: string
): Promise<TransformResponse> {
  const response = await axios.post(`${RUST_SDK_URL}/transform`, {
    event,
    beforeSendCode,
  });
  return response.data;
}
```

**Create mock for tests:**
```typescript
// api/test/sdk-clients/rust.test.ts
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

beforeEach(() => {
  mockedAxios.post.mockClear();
});
```

**Run tests again:**
```bash
docker-compose build api
docker run --rm beforesend-playground-api npm test -- sdk-clients/rust.test.ts
# Expected: PASS - all tests green
```

#### 3. REFACTOR Phase

Clean up code while keeping tests green:
- Extract common logic
- Improve error handling
- Add JSDoc comments
- Ensure code is DRY

**Run tests after refactoring:**
```bash
docker run --rm beforesend-playground-api npm test
# Expected: All tests still pass
```

## Adding Tests

### For New SDK

1. **Create test file:**
```bash
touch api/test/sdk-clients/new-sdk.test.ts
```

2. **Write comprehensive tests:**
```typescript
describe('New SDK Client', () => {
  it('should successfully transform event', async () => {
    // Test success case
  });

  it('should handle transformation errors', async () => {
    // Test error handling
  });

  it('should handle connection failures', async () => {
    // Test network errors
  });

  it('should handle timeout', async () => {
    // Test timeout scenario
  });

  it('should validate beforeSend code', async () => {
    // Test validation
  });

  it('should handle complex event structures', async () => {
    // Test with nested objects, arrays
  });
});
```

3. **Run tests in Docker:**
```bash
docker-compose build api
docker run --rm beforesend-playground-api npm test -- sdk-clients/new-sdk.test.ts
```

### For New Feature

1. **Write failing test first (RED):**
```typescript
describe('New Feature', () => {
  it('should do what we want', () => {
    const result = newFeature();
    expect(result).toBe(expectedValue);
  });
});
```

2. **Implement feature (GREEN):**
```typescript
export function newFeature() {
  return expectedValue;
}
```

3. **Refactor and add edge cases:**
```typescript
it('should handle edge case 1', () => { });
it('should handle edge case 2', () => { });
it('should throw on invalid input', () => { });
```

## Test Organization

### Directory Structure

```
api/
├── src/
│   ├── routes/
│   ├── sdk-clients/
│   └── parsers/
└── test/
    ├── routes/
    │   ├── transform.test.ts
    │   ├── examples.test.ts
    │   └── health.test.ts
    ├── sdk-clients/
    │   ├── javascript.test.ts
    │   ├── python.test.ts
    │   ├── rust.test.ts
    │   └── ...
    ├── parsers/
    │   └── json.test.ts
    └── integration/
        └── e2e.test.ts

sdks/
├── python/
│   ├── app.py
│   └── test_app.py
├── rust/
│   ├── src/main.rs
│   └── tests/
│       └── integration_test.rs
└── ...

ui/
├── src/
│   └── components/
└── test/
    └── components/
```

### Naming Conventions

- Test files: `*.test.ts`, `*.test.tsx`, `test_*.py`
- Test suites: `describe('Component/Feature', () => {})`
- Test cases: `it('should do something specific', () => {})`

## Mock Data

### Reusable Test Fixtures

Create shared test data:

```typescript
// api/test/fixtures/events.ts
export const validEvent = {
  event_id: 'test-123',
  message: 'Test error',
  level: 'error'
};

export const eventWithException = {
  event_id: 'test-456',
  exception: {
    values: [
      { type: 'Error', value: 'Test exception' }
    ]
  }
};
```

Use in tests:

```typescript
import { validEvent } from '../fixtures/events';

it('should transform valid event', () => {
  const result = transform(validEvent);
  expect(result.success).toBe(true);
});
```

## Troubleshooting

### Tests Fail in Docker but Pass Locally

**Problem:** You ran tests on host instead of Docker.

**Solution:**
```bash
# WRONG - don't do this
cd api && npm test

# CORRECT - always use Docker
docker run --rm beforesend-playground-api npm test
```

### Tests Timeout

**Causes:**
- Container not built with latest changes
- Network issues between containers
- SDK service not responding

**Solutions:**
```bash
# Rebuild containers
docker-compose build --no-cache

# Check container logs
docker-compose logs api
docker-compose logs sdk-python

# Verify containers are running
docker-compose ps
```

### Mock Axios Not Working

**Problem:** Axios calls are hitting real URLs.

**Solution:**
```typescript
// Add to top of test file
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Reset mocks before each test
beforeEach(() => {
  mockedAxios.post.mockClear();
});

// Mock response
mockedAxios.post.mockResolvedValueOnce({
  data: { success: true }
});
```

### Coverage Report Not Generated

**Problem:** Coverage directory not created.

**Solution:**
```bash
# Run tests with coverage flag
docker run --rm beforesend-playground-api npm run test:coverage

# Check if coverage directory exists
ls -la api/coverage/
```

### Test Hangs on `transformWith*` Call

**Problem:** SDK container not running or wrong network.

**Solution:**
```bash
# Start SDK containers
docker-compose up -d sdk-python sdk-rust

# Use network flag for integration tests
docker run --rm --network beforesend-network \
  beforesend-playground-api npm test
```

## CI/CD Integration

### GitHub Actions Workflow

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build containers
        run: docker-compose build

      - name: Run API tests
        run: docker run --rm beforesend-playground-api npm test

      - name: Run Python SDK tests
        run: docker run --rm beforesend-playground-sdk-python pytest

      - name: Generate coverage
        run: docker run --rm beforesend-playground-api npm run test:coverage

      - name: Upload coverage
        uses: codecov/codecov-action@v3
```

## Best Practices

### Do's ✅
- Write tests before code (TDD)
- Run all tests in Docker
- Mock external dependencies
- Test error cases
- Maintain 80%+ coverage
- Use descriptive test names
- Keep tests isolated (no shared state)

### Don'ts ❌
- Run tests on host machine
- Skip writing tests
- Test implementation details
- Share state between tests
- Have flaky tests
- Ignore failing tests
- Commit without running tests

## Quick Reference

```bash
# Build all containers
docker-compose build

# Run all API tests
docker run --rm beforesend-playground-api npm test

# Run specific test file
docker run --rm beforesend-playground-api npm test -- transform.test.ts

# Run tests with coverage
docker run --rm beforesend-playground-api npm run test:coverage

# Run Python SDK tests
docker run --rm beforesend-playground-sdk-python pytest

# Run Rust SDK tests
docker run --rm beforesend-playground-sdk-rust cargo test

# Watch mode (requires running container)
docker-compose exec api npm run test:watch

# Integration tests (requires services running)
docker-compose up -d
docker run --rm --network beforesend-network beforesend-playground-api npm run test:integration
```

## See Also

- [Development Guide](development.md) - Contributing and development workflow
- [Validation Guide](validation.md) - Testing validation features
- [API Reference](api-reference.md) - API endpoints and schemas
- [Architecture](architecture.md) - System design and structure
