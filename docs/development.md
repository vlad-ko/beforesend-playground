# Development Guide

## Test-Driven Development (TDD)

We follow **Test-Driven Development (TDD)** principles. Always write tests BEFORE implementing features.

**🐳 All tests run in Docker - never on host machine!**

### TDD Workflow

1. ✍️ Write failing test first (Red)
2. ✅ Implement minimum code to pass (Green)
3. ♻️ Refactor while keeping tests green (Refactor)
4. 🐳 Run tests in Docker before pushing

Example:
```typescript
// test/my-feature.test.ts
describe('MyFeature', () => {
  it('should transform event correctly', () => {
    const result = myFeature(event);
    expect(result.transformed).toBe(true);
  });
});
```

## Running Tests

**Running Tests:**

```bash
# Run ALL tests across all services
docker run --rm sdk-playground-api npm test
docker run --rm -e NODE_ENV=test sdk-playground-sdk-javascript npm test
docker run --rm sdk-playground-sdk-python pytest
docker run --rm sdk-playground-ui npm test

# Run with coverage
docker run --rm sdk-playground-api npm run test:coverage
docker run --rm sdk-playground-sdk-python pytest --cov
docker run --rm sdk-playground-ui npm run test:coverage

# Run tests in running containers (faster for development)
docker-compose exec api npm test
docker-compose exec sdk-javascript npm test
docker-compose exec sdk-python pytest
docker-compose exec ui npm test
```

### Integration Tests

Integration tests verify that SDK backends are working correctly by making **real HTTP requests** to the running services. Unlike unit tests that mock the SDK clients, these tests actually execute code on each backend.

**Prerequisites:** All containers must be running!

```bash
# Start all services first
docker-compose up -d

# Wait for services to be healthy (about 10-15 seconds)
docker-compose ps  # Check all services are "Up"

# Run integration tests
cd api
npm run test:integration

# Or use the helper script (includes health checks)
./scripts/run-integration-tests.sh

# Start services AND run tests
./scripts/run-integration-tests.sh --start-services
```

**What Integration Tests Cover:**

| Test Suite | Description |
|------------|-------------|
| **Health Checks** | Verify each SDK backend is responding |
| **BeforeSend: Return Event** | Test returning event unchanged |
| **BeforeSend: Modify Event** | Test modifying event with tags |
| **BeforeSend: Drop Event** | Test returning null (drop) |
| **TracesSampler** | Test returning sample rates (0.5) |
| **Error Handling** | Test invalid syntax returns errors |
| **Edge Cases** | Test empty events, special characters, async code |

**Test Files:**
- `api/test/integration/sdk-backends.integration.test.ts` - Main SDK backend tests
- `api/test/integration/traces-sampler.integration.test.ts` - TracesSampler-specific tests
- `api/test/integration/examples.integration.test.ts` - Example file validation

**NPM Scripts:**
```bash
npm test                 # Unit tests only (no integration)
npm run test:integration # Integration tests only (requires running services)
npm run test:all         # All tests (unit + integration)
```

**Test Coverage Requirements:**
- Minimum 80% code coverage (enforced)
- 100% coverage for critical paths (transformation logic)
- All new features must include tests FIRST (TDD)

## Development Workflow

### Running in Development Mode

All services have **hot reload** enabled via volume mounts:

```bash
# Start all services with logs visible
docker-compose up

# Start in background (detached)
docker-compose up -d

# View logs from all services
docker-compose logs -f

# View specific service logs
docker-compose logs -f api
docker-compose logs -f sdk-javascript
docker-compose logs -f sdk-python
docker-compose logs -f ui
```

### Making Code Changes

**Changes are automatically detected and reloaded:**

- **API Gateway (TypeScript):** Edit `api/src/**/*.ts` → auto-rebuild and restart
- **JavaScript SDK (TypeScript):** Edit `sdks/javascript/src/**/*.ts` → auto-rebuild
- **Python SDK:** Edit `sdks/python/**/*.py` → auto-reload
- **React UI:** Edit `ui/src/**/*.tsx` → hot module replacement

**No need to rebuild containers** unless you change:
- `package.json` dependencies
- `requirements.txt` dependencies
- Dockerfile itself

### Rebuilding Services

```bash
# Rebuild specific service
docker-compose build api
docker-compose build ui

# Rebuild all services
docker-compose build

# Rebuild and restart
docker-compose up -d --build
```

## Git Workflow

**ALWAYS work from feature branches with PRs. NEVER commit directly to main.**

### Branch Naming

```
feature/description    # New features
fix/description        # Bug fixes
test/description       # Test additions
docs/description       # Documentation
refactor/description   # Code refactoring
chore/description      # Maintenance tasks
```

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Examples:**
```bash
feat(api): add request timeout handling
fix(python-sdk): handle None return from beforeSend
test(api): add integration tests for transform endpoint
docs(readme): update SDK installation instructions
refactor(sdk-clients): extract common HTTP client logic
```

### Workflow

```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/add-timeout-handling

# 2. Write tests (TDD)
# Write failing tests first

# 3. Implement feature
# Make tests pass

# 4. Run tests in Docker
docker run --rm sdk-playground-api npm test

# 5. Commit with descriptive message
git add .
git commit -m "feat(api): add 10s timeout for SDK requests

- Add timeout configuration to axios clients
- Add timeout tests for JS and Python SDKs
- Update error handling for timeout scenarios

Closes #12"

# 6. Push and create PR
git push origin feature/add-timeout-handling
gh pr create --title "Add timeout handling for SDK requests" --body "Closes #12"

# 7. Wait for Seer code review to complete (REQUIRED)
# Check status: gh pr view <PR#> --json statusCheckRollup
# Seer must show: status="COMPLETED", conclusion="SUCCESS"

# 8. Merge PR after Seer approval (squash merge preferred)
gh pr merge <PR#> --squash --delete-branch --admin

# 9. Switch back to main
git checkout main
git pull origin main
```

## Project Structure

```
sdk-playground/
├── docker-compose.yml           # Service definitions
├── README.md                    # Main documentation
│
├── api/                         # Express API Gateway
│   ├── src/
│   │   ├── index.ts             # Main API server
│   │   ├── routes/
│   │   │   └── transform.ts     # Transform endpoint
│   │   ├── parsers/
│   │   │   └── json.ts          # JSON validation
│   │   └── sdk-clients/
│   │       ├── javascript.ts    # JS SDK HTTP client
│   │       └── python.ts        # Python SDK HTTP client
│   └── test/                    # API tests
│
├── sdks/                        # SDK containers
│   ├── registry.json            # SDK metadata
│   ├── javascript/              # Node.js SDK
│   ├── python/                  # Python SDK
│   ├── ruby/                    # Ruby SDK
│   ├── php/                     # PHP SDK
│   ├── go/                      # Go SDK
│   ├── dotnet/                  # .NET SDK
│   ├── java/                    # Java SDK
│   └── android/                 # Android SDK
│
├── ui/                          # React Web UI
│   ├── src/
│   │   ├── App.tsx
│   │   └── components/
│   └── test/                    # UI tests
│
└── docs/                        # Documentation
    ├── sdk-support.md
    ├── development.md
    ├── api-reference.md
    ├── architecture.md
    └── troubleshooting.md
```

## Adding a New SDK

1. **Create tests first** (TDD):
   ```typescript
   // test/sdk-clients/ruby.test.ts
   describe('RubySDKClient', () => {
     it('should transform event using Ruby beforeSend', async () => {
       // Test implementation
     });
   });
   ```

2. **Add to registry:**
   ```json
   // sdks/registry.json
   "ruby": {
     "name": "Ruby",
     "language": "ruby",
     "status": "available",
     "port": 5004
   }
   ```

3. **Create Docker container:**
   ```dockerfile
   # sdks/ruby/Dockerfile
   FROM ruby:3.2-alpine
   # ...
   ```

4. **Add SDK client:**
   ```typescript
   // api/src/sdk-clients/ruby.ts
   export async function transformWithRuby(...) {
     // Implementation
   }
   ```

5. **Update docker-compose.yml**

6. **Run tests in Docker:**
   ```bash
   docker run --rm sdk-playground-api npm test
   ```

7. **Update documentation**

8. **Create PR**

## Code Review Checklist

**Before Creating a PR:**

- [ ] Tests written BEFORE implementation (TDD)
- [ ] All tests pass in Docker containers
- [ ] Code coverage ≥ 80%
- [ ] No console.log statements (use proper logging)
- [ ] Documentation updated (README.md, code comments)
- [ ] No hardcoded values (use env vars or config)
- [ ] Error handling implemented
- [ ] All tests run via Docker (never on host)

**Before Merging a PR:**

- [ ] **Seer code review completed successfully (REQUIRED)**
- [ ] All status checks passing
- [ ] Seer feedback addressed (if any)
- [ ] PR description includes issue reference (Closes #X)
- [ ] Conventional commit message format used

## Resources

- [TDD Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Sentry Docs](https://docs.sentry.io/)
- See `CLAUDE.md` for detailed development guidelines
