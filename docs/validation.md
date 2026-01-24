# Syntax Validation Guide

The beforeSend Testing Playground provides **real-time syntax validation** for 7 SDKs, catching errors as you type before you even click "Transform".

## Supported SDKs

| SDK | Validation Method | Speed | Features |
|-----|------------------|-------|----------|
| **JavaScript** | ESLint + Monaco | Instant | Syntax errors, semantic hints |
| **Python** | `ast.parse()` | Fast | Syntax errors, line/column info |
| **Ruby** | `ruby -c` | Fast | Syntax checking |
| **PHP** | `php -l` | Fast | Linting and syntax errors |
| **Go** | `go build` | Medium | Full compilation, type checking |
| **.NET** | `dotnet build` | Medium | Full compilation, type checking |
| **Rust** | `cargo check` | Medium | Fast compilation checking without codegen |

### Coming Soon
- Java, Android, Cocoa (iOS/macOS)

## How It Works

### Client-Side (Monaco Editor)
- TypeScript/JavaScript get **instant** validation from Monaco's built-in TypeScript language service
- Semantic validation disabled to allow code snippets (no "undefined variable" errors)
- Syntax validation remains active for bracket matching, keywords, etc.

### Server-Side Validation
When you type, after a 500ms debounce:

1. **Editor sends code** to `/api/validate` endpoint with SDK and code
2. **API routes to SDK container** (e.g., `http://sdk-python:5001/validate`)
3. **SDK validates** using its native parser:
   - Python: `ast.parse(code, mode='exec')`
   - Ruby: `ruby -c -e "#{code}"`
   - PHP: `php -l (temp file)`
   - Go: `go build (temp package)`
   - .NET: `dotnet build (temp project)`
   - Rust: `cargo check (temp crate)`
4. **API returns errors** with line/column information
5. **Monaco displays red squiggles** at error locations

### Validation Workflow

```
┌──────────────┐   Type code    ┌─────────────┐
│ Monaco       │─────────────────▶│ Debounce    │
│ Editor       │                  │ (500ms)     │
└──────────────┘                  └─────────────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │ API Gateway │
                                  │ /validate   │
                                  └─────────────┘
                                         │
                                         ▼
                          ┌──────────────┴──────────────┐
                          │                             │
                    ┌──────────┐                 ┌──────────┐
                    │ Python   │                 │ Rust SDK │
                    │ SDK      │      ...        │ cargo    │
                    │ ast.parse│                 │ check    │
                    └──────────┘                 └──────────┘
                          │                             │
                          └──────────────┬──────────────┘
                                         │
                                         ▼
                                  ┌─────────────┐
                                  │ Validation  │
                                  │ Response    │
                                  └─────────────┘
                                         │
                                         ▼
                          ┌──────────────────────────┐
                          │ Monaco displays errors   │
                          │ with red squiggles       │
                          └──────────────────────────┘
```

## Example Validation Responses

### Python Syntax Error

**Code:**
```python
def before_send(event, hint)
    return event
```

**Response:**
```json
{
  "valid": false,
  "errors": [
    {
      "line": 1,
      "column": 32,
      "message": "expected ':'"
    }
  ]
}
```

### Rust Compilation Error

**Code:**
```rust
let tags = event["tags"].as_object_mut()?;
tags.insert("version", json!("1.0"));
```

**Response:**
```json
{
  "valid": false,
  "errors": [
    {
      "line": 2,
      "message": "mismatched types: expected `Value`, found `&str`"
    }
  ]
}
```

## Troubleshooting

### Validation Errors Don't Appear

**Check:**
1. Is your SDK in the supported list?
2. Check browser console for network errors
3. Verify SDK container is running: `docker-compose ps`
4. Check API logs: `docker-compose logs api`

### Validation Too Slow

**Go, .NET, and Rust** require compilation, which takes 1-5 seconds. This is normal and expected.

**To speed up:**
- Debounce is already set to 500ms
- Containers cache dependencies between validations
- First validation is slowest (dependency download)
- Subsequent validations are faster (cached)

### False Positives

**Semantic Validation Disabled:**
For JavaScript, we disable semantic validation so code snippets work:
```javascript
// This is OK - we don't check if 'event' is defined
event.tags = { ...event.tags, custom: 'value' };
```

**For other SDKs**, we validate in a wrapper context:
- Python: Wrapped in `def before_send(event, hint):`
- Rust: Wrapped in `(|| -> Option<Value> { code })()`
- Go: Wrapped in `func beforeSend(event map[string]interface{}) map[string]interface{} { code }`

## Adding Validation to New SDKs

### 1. Implement `/validate` Endpoint

Add to SDK container (e.g., `sdks/java/app.java`):

```java
@PostMapping("/validate")
public ValidationResponse validate(@RequestBody ValidationRequest request) {
    try {
        // Wrap code in context
        String wrappedCode = wrapUserCode(request.getCode());

        // Attempt to compile/parse
        CompilationResult result = compile(wrappedCode);

        if (result.hasErrors()) {
            return new ValidationResponse(false, result.getErrors());
        }

        return new ValidationResponse(true, Collections.emptyList());
    } catch (Exception e) {
        return new ValidationResponse(false,
            Collections.singletonList(new ValidationError(null, null, e.getMessage()))
        );
    }
}
```

### 2. Add to API Client

Add SDK client in `api/src/sdk-clients/java.ts`:

```typescript
export async function validateWithJava(code: string): Promise<ValidationResponse> {
  try {
    const response = await axios.post<ValidationResponse>(
      `${JAVA_SDK_URL}/validate`,
      { code },
      { timeout: 10000 }
    );
    return response.data;
  } catch (error: any) {
    return {
      valid: false,
      errors: [{ message: `Validation service error: ${error.message}` }]
    };
  }
}
```

### 3. Enable in UI

Add to `VALIDATION_SUPPORTED_SDKS` in `ui/src/components/BeforeSendEditor.tsx`:

```typescript
const VALIDATION_SUPPORTED_SDKS = [
  'javascript',
  'python',
  'ruby',
  'php',
  'go',
  'dotnet',
  'rust',
  'java', // NEW!
];
```

### 4. Test

```bash
# Rebuild SDK container
docker-compose build sdk-java

# Test validation endpoint
curl -X POST http://localhost:5007/validate \
  -H "Content-Type: application/json" \
  -d '{"code": "event.setTag(\"test\", \"value\");"}'

# Test in UI
# 1. Select Java SDK
# 2. Type invalid code
# 3. Verify red squiggles appear
```

## Performance Considerations

### Debouncing
- Validation triggers 500ms after you stop typing
- Prevents excessive validation requests
- Balance between responsiveness and server load

### Caching
- SDK containers cache dependencies (Go modules, Rust crates, NuGet packages)
- Docker volumes persist between restarts
- First validation is slow, subsequent ones are fast

### Timeouts
- Client timeout: 10 seconds
- Server timeout: Varies by SDK (5-10s)
- If validation times out, transformation still works (validation is optional)

## Best Practices

### For Users
1. **Wait for validation** - Green checkmark = valid, red squiggles = errors
2. **Read error messages** - Click on red squiggles to see details
3. **Test anyway** - Validation catches syntax errors, but logic errors require testing

### For Developers
1. **Wrap user code properly** - Provide function context so variables are defined
2. **Return line numbers** - Parse error messages to extract line/column info
3. **Handle timeouts gracefully** - Don't block user if validation is slow
4. **Test with examples** - Ensure examples validate successfully

## API Reference

### POST `/api/validate`

**Request:**
```json
{
  "sdk": "python",
  "beforeSendCode": "def before_send(event, hint):\n    return event"
}
```

**Response:**
```json
{
  "valid": true,
  "errors": []
}
```

Or with errors:

```json
{
  "valid": false,
  "errors": [
    {
      "line": 1,
      "column": 32,
      "message": "expected ':'"
    }
  ]
}
```

### Error Object Schema

```typescript
interface ValidationError {
  line?: number;      // Line number (1-indexed), optional
  column?: number;    // Column number (1-indexed), optional
  message: string;    // Error description
}
```

## See Also

- [API Reference](api-reference.md) - Complete API documentation
- [SDK Support](sdk-support.md) - Supported SDKs and versions
- [Development Guide](development.md) - Adding new SDKs
- [Testing Guide](testing.md) - Testing validation features
