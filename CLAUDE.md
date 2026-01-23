# Claude Development Guide - beforeSend Playground

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The beforeSend Testing Playground is a Docker-based tool for testing Sentry `beforeSend` transformations across multiple SDK languages. It's used by Sentry's Solutions Engineering team for customer support and internal testing.

**Tech Stack:**
- Backend: Node.js/TypeScript (Express), Python (Flask)
- Frontend: React + Vite + Monaco Editor + TailwindCSS
- Infrastructure: Docker + Docker Compose
- Testing: Jest (TypeScript), pytest (Python), React Testing Library

## Core Architecture Principles

### 🐳 Docker-First Architecture (CRITICAL)

**RULE: NEVER pollute the local environment. Everything runs in Docker.**

This is a **non-negotiable** architectural principle:

- ✅ **DO:** Run all tests inside Docker containers
- ✅ **DO:** Execute all code within Docker
- ✅ **DO:** Install dependencies in Docker only
- ✅ **DO:** Use `docker run` or `docker-compose exec` for commands
- ❌ **DON'T:** Install language runtimes locally (no `pip install`, `npm install` on host)
- ❌ **DON'T:** Run tests directly on host machine
- ❌ **DON'T:** Execute any code outside of containers

**Why?**
1. **Isolation:** Each SDK has specific runtime requirements
2. **Consistency:** Same environment for dev, test, and production
3. **Clean:** No version conflicts, no leftover dependencies
4. **Portable:** Works on any machine with Docker installed
5. **Realistic:** Tests run in actual deployment environment

**Correct Usage:**
```bash
# ✅ Run tests in Docker
docker run --rm beforesend-playground-api npm test
docker run --rm -e NODE_ENV=test beforesend-playground-sdk-javascript npm test
docker run --rm beforesend-playground-sdk-python pytest

# ✅ Install dependencies via Docker rebuild
docker-compose build api

# ✅ Execute commands in running containers
docker-compose exec api npm install new-package
docker-compose exec sdk-python pip install new-package

# ✅ Start all services
docker-compose up
```

**Incorrect Usage:**
```bash
# ❌ NEVER do this on host machine
cd api && npm install && npm test
cd sdks/python && pip install -r requirements.txt && pytest
```

**Exception:** Only the CLI tools (`cli/sdk-manager.ts`) may run on host for convenience, but they must only orchestrate Docker commands, never execute SDK code directly.

## Development Principles

### 1. Test-Driven Development (TDD)

**CRITICAL:** Always write tests BEFORE implementing features.

**TDD Process:**
1. Write a failing test that describes the desired behavior
2. Run the test to verify it fails (Red)
3. Write the minimum code to make the test pass (Green)
4. Refactor code while keeping tests green (Refactor)
5. Commit with tests included

**Example TDD Workflow:**
```bash
# 1. Create feature branch
git checkout -b feature/add-validation

# 2. Write failing test
# test/parsers/json.test.ts - Test that doesn't pass yet

# 3. Rebuild container with new test
docker-compose build api

# 4. Run test in Docker (should fail - RED)
docker run --rm beforesend-playground-api npm test

# 5. Implement feature
# src/parsers/json.ts - Add validation logic

# 6. Rebuild container
docker-compose build api

# 7. Run test in Docker (should pass - GREEN)
docker run --rm beforesend-playground-api npm test

# 8. Refactor if needed, commit
git add test/ src/
git commit -m "feat: add JSON validation with tests"
```

**Test Coverage Requirements:**
- Minimum 80% code coverage
- 100% coverage for critical paths (transformation logic, SDK routing)
- Unit tests for all functions
- Integration tests for API endpoints
- E2E tests for complete transformation flows

**Testing Commands (Docker-First):**
```bash
# Build containers first
docker-compose build

# Run API Gateway tests
docker run --rm beforesend-playground-api npm test

# Run JavaScript SDK tests
docker run --rm -e NODE_ENV=test beforesend-playground-sdk-javascript npm test

# Run Python SDK tests
docker run --rm beforesend-playground-sdk-python pytest

# Run with coverage
docker run --rm beforesend-playground-api npm run test:coverage
docker run --rm beforesend-playground-sdk-python pytest --cov

# Run specific test file
docker run --rm beforesend-playground-api npm test -- json.test.ts

# Run in watch mode (requires docker-compose up for hot reload)
docker-compose up api
# In another terminal:
docker-compose exec api npm run test:watch
```

### 2. SOLID Principles

Follow SOLID principles for maintainable, scalable code:

#### Single Responsibility Principle (SRP)
- Each module/class has ONE reason to change
- Example: `json.ts` only handles JSON validation, not transformation

```typescript
// ✅ Good - Single responsibility
export function validateJSON(input: string): ValidationResult {
  // Only validates JSON syntax
}

export function validateSentryEvent(event: any): ValidationResult {
  // Only validates Sentry event structure
}

// ❌ Bad - Multiple responsibilities
export function validateAndTransform(input: string, code: string) {
  // Mixes validation and transformation
}
```

#### Open/Closed Principle (OCP)
- Open for extension, closed for modification
- Use interfaces and abstractions

```typescript
// ✅ Good - Extensible SDK client interface
interface SDKClient {
  transform(event: Record<string, any>, code: string): Promise<TransformResponse>;
}

export class JavaScriptSDKClient implements SDKClient { }
export class PythonSDKClient implements SDKClient { }
```

#### Liskov Substitution Principle (LSP)
- Subtypes must be substitutable for base types

#### Interface Segregation Principle (ISP)
- Many small interfaces > one large interface

#### Dependency Inversion Principle (DIP)
- Depend on abstractions, not concrete implementations
- Use dependency injection

### 3. Git Workflow

**ALWAYS work from feature branches with PRs. NEVER commit directly to main.**

**Branch Naming:**
```
feature/description    # New features
fix/description        # Bug fixes
test/description       # Test additions
docs/description       # Documentation
refactor/description   # Code refactoring
chore/description      # Maintenance tasks
```

**Commit Message Format:**
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

**Workflow:**
```bash
# 1. Create feature branch from main
git checkout main
git pull origin main
git checkout -b feature/add-timeout-handling

# 2. Write tests (TDD)
# Write failing tests first

# 3. Implement feature
# Make tests pass

# 4. Commit with descriptive message
git add .
git commit -m "feat(api): add 10s timeout for SDK requests

- Add timeout configuration to axios clients
- Add timeout tests for JS and Python SDKs
- Update error handling for timeout scenarios

Closes #12"

# 5. Push and create PR
git push origin feature/add-timeout-handling
gh pr create --title "Add timeout handling for SDK requests" --body "Closes #12"

# 6. Wait for Seer code review to complete (REQUIRED)
# Check status: gh pr view <PR#> --json statusCheckRollup
# Seer must show: status="COMPLETED", conclusion="SUCCESS"

# 7. Address any Seer feedback if needed

# 8. Merge PR after Seer approval (squash merge preferred)
gh pr merge <PR#> --squash --delete-branch --admin

# 9. Switch back to main
git checkout main
git pull origin main
```

**Seer Code Review Requirement:**
- **CRITICAL:** All PRs MUST pass Seer code review before merging
- Wait for Seer to complete (usually 30-60 seconds)
- Review any comments/suggestions from Seer
- Address critical issues before merging
- Seer checks code quality, security, best practices

### 4. GitHub Issues

**Create issues for:**
- New features
- Bugs
- Enhancements
- Documentation improvements
- Technical debt

**Issue Template:**
```markdown
## Description
[Clear description of the feature/bug]

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2
- [ ] Tests added
- [ ] Documentation updated

## Technical Details
[Implementation notes, if applicable]

## Related Issues
Closes #X
Relates to #Y
```

**Labels:**
- `feature` - New features
- `bug` - Bug fixes
- `enhancement` - Improvements
- `documentation` - Docs updates
- `test` - Test additions
- `good-first-issue` - Good for new contributors
- `priority:high` - High priority
- `priority:low` - Low priority
- `blocked` - Blocked by another issue

**Create issues BEFORE starting work:**
```bash
# Create issue via CLI
gh issue create --title "Add validation for beforeSend code syntax" --label feature

# Or via web UI
# Then reference in commits and PRs
```

### 5. Code Style & Standards

**TypeScript:**
- Use strict mode (`"strict": true`)
- Prefer interfaces over types for objects
- Use `const` over `let`, never use `var`
- Use async/await over promises
- Use descriptive variable names
- Max function length: 30 lines (refactor if longer)

**Python:**
- Follow PEP 8 style guide
- Use type hints
- Max function length: 30 lines
- Docstrings for all public functions

**General:**
- Meaningful function/variable names (no `a`, `b`, `temp`)
- Comments explain WHY, not WHAT
- Keep functions small and focused
- DRY principle (Don't Repeat Yourself)

### 6. Documentation

**Keep documentation up-to-date:**

**When adding a feature:**
1. Update `README.md` with usage examples
2. Update API documentation section
3. Add JSDoc/docstring comments
4. Update this `.claude.md` if workflow changes

**Documentation locations:**
- `README.md` - User-facing documentation
- `.claude.md` - Developer guidelines (this file)
- `api/examples/` - Example code with comments
- Code comments - For complex logic
- JSDoc/docstrings - For all public functions

**Example JSDoc:**
```typescript
/**
 * Validates a Sentry event structure
 *
 * @param event - The event object to validate
 * @returns Validation result with success flag and optional error
 *
 * @example
 * ```typescript
 * const result = validateSentryEvent({ event_id: "123" });
 * if (!result.valid) {
 *   console.error(result.error);
 * }
 * ```
 */
export function validateSentryEvent(event: any): ValidationResult {
  // ...
}
```

### 7. Project-Specific Patterns

#### Adding a New SDK

**1. Create GitHub Issue:**
```bash
gh issue create --title "Add Ruby SDK support" --label feature
```

**2. Create Feature Branch:**
```bash
git checkout -b feature/add-ruby-sdk
```

**3. Write Tests First (TDD):**
```typescript
// test/sdk-clients/ruby.test.ts
describe('RubySDKClient', () => {
  it('should transform event using Ruby beforeSend', async () => {
    // Test implementation
  });
});
```

**4. Add to Registry:**
```json
// sdks/registry.json
"ruby": {
  "name": "Ruby",
  "language": "ruby",
  "default": false,
  "status": "available",
  "port": 5004,
  // ...
}
```

**5. Create Docker Container:**
```dockerfile
# sdks/ruby/Dockerfile
FROM ruby:3.2-alpine
# ...
```

**6. Add SDK Client:**
```typescript
// api/src/sdk-clients/ruby.ts
export async function transformWithRuby(...) {
  // Implementation
}
```

**7. Update docker-compose.yml**

**8. Run Tests:**
```bash
npm test
```

**9. Update Documentation:**
- Update `README.md` with Ruby in supported SDKs
- Add Ruby example if applicable

**10. Create PR:**
```bash
git push origin feature/add-ruby-sdk
gh pr create --title "Add Ruby SDK support" --body "Closes #X"
```

#### Adding an API Endpoint

**1. Write Test First:**
```typescript
// test/routes/health.test.ts
describe('GET /health', () => {
  it('should return 200 with status healthy', async () => {
    const response = await request(app).get('/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('healthy');
  });
});
```

**2. Implement Endpoint:**
```typescript
// src/routes/health.ts
router.get('/', (req, res) => {
  res.json({ status: 'healthy' });
});
```

**3. Register Route:**
```typescript
// src/index.ts
app.use('/health', healthRouter);
```

**4. Run Tests:**
```bash
npm test
```

**5. Update API Documentation in README**

### 8. Common Commands (Docker-First)

```bash
# Development (Docker)
docker-compose build              # Build all containers
docker-compose up                 # Start all services
docker-compose up -d              # Start in background
docker-compose logs -f            # View all logs
docker-compose logs -f api        # View API logs only
docker-compose down               # Stop all services

# Testing (Docker - NEVER run tests on host)
docker run --rm beforesend-playground-api npm test
docker run --rm -e NODE_ENV=test beforesend-playground-sdk-javascript npm test
docker run --rm beforesend-playground-sdk-python pytest

# Testing with running containers
docker-compose exec api npm test
docker-compose exec sdk-python pytest

# Git
git checkout -b feature/X         # Create feature branch
git commit -m "feat: X"           # Commit with message
gh pr create                      # Create PR
gh issue create                   # Create issue

# SDK Management (via npm scripts - orchestrate Docker)
npm run sdk:list                  # List SDKs (CLI tool)
npm run sdk:start python          # Start specific SDK (docker-compose)
npm run sdk:stop                  # Stop all (docker-compose down)

# Cleanup
docker-compose down -v            # Remove containers and volumes
docker system prune -a            # Clean Docker system
```

### 9. Code Review Checklist

**Before Creating a PR:**

- [ ] Tests written BEFORE implementation (TDD)
- [ ] All tests pass in Docker containers
- [ ] Code coverage ≥ 80%
- [ ] No console.log statements (use proper logging)
- [ ] Documentation updated (README.md, code comments)
- [ ] No hardcoded values (use env vars or config)
- [ ] Error handling implemented
- [ ] TypeScript strict mode passes
- [ ] All tests run via Docker (never on host)

**Before Merging a PR:**

- [ ] **Seer code review completed successfully (REQUIRED)**
- [ ] All status checks passing
- [ ] Seer feedback addressed (if any)
- [ ] PR description includes issue reference (Closes #X)
- [ ] Conventional commit message format used
- [ ] Linting passes (if configured)
- [ ] Commit messages follow convention
- [ ] PR description includes issue reference
- [ ] Breaking changes documented

### 10. Troubleshooting

**Tests failing:**
1. Check if all services are running
2. Verify environment variables
3. Check for port conflicts
4. Review test logs

**Docker issues:**
```bash
# Rebuild containers
docker-compose build --no-cache

# Clean slate
docker-compose down -v
docker system prune -a
npm run setup
npm start
```

**Type errors:**
```bash
# Rebuild TypeScript
npm run build
```

## Architecture Patterns

### Request Flow

```
User Request → API Gateway → SDK Client → SDK Container → Response
     ↓
  Validation → Parsing → Routing → Transformation → Result
```

### Error Handling

```typescript
// Always return structured errors
interface ErrorResponse {
  success: false;
  error: string;
  details?: any;
}

// Catch at boundaries
try {
  const result = await riskyOperation();
  return { success: true, data: result };
} catch (error) {
  console.error('Operation failed:', error);
  return { success: false, error: error.message };
}
```

### Configuration

- Use environment variables for configuration
- Provide defaults
- Document all env vars in README

```typescript
const PORT = process.env.PORT || 4000;
const JS_SDK_URL = process.env.JAVASCRIPT_SDK_URL || 'http://sdk-javascript:5000';
```

## Contributing

This is an internal Sentry SE tool. Follow the practices above to maintain code quality and consistency.

**Questions?** Ask in #solutions-engineering or file an issue.

## Resources

- [TDD Guide](https://martinfowler.com/bliki/TestDrivenDevelopment.html)
- [SOLID Principles](https://en.wikipedia.org/wiki/SOLID)
- [Conventional Commits](https://www.conventionalcommits.org/)
- [Sentry Docs](https://docs.sentry.io/)

---

**Remember:** Tests first, quality code, clear documentation, proper workflow. No shortcuts!
