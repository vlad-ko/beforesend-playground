# Adding New SDK Support

This guide explains how to add configuration parsing support for a new Sentry SDK.

## Prerequisites

Before adding a new SDK, understand:
1. The SDK's initialization syntax
2. Key naming convention (camelCase, snake_case, PascalCase)
3. Comment syntax for the language
4. String handling (escapes, multi-line, raw strings)

## Step 1: Create the Parser

Create a new file `api/src/config-parsers/{sdk}.ts`:

```typescript
/**
 * {SDK Name} configuration parser
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class {SDK}ConfigParser implements IConfigParser {
  parse(configCode: string): ParsedConfig {
    const result: ParsedConfig = {
      sdk: '{sdk}',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      // 1. Extract the config block
      const configBlock = this.extractConfigBlock(configCode);
      if (!configBlock) {
        result.valid = false;
        result.parseErrors.push({
          message: 'Could not find SDK initialization'
        });
        return result;
      }

      // 2. Parse options from the block
      result.options = this.parseOptions(configBlock);
    } catch (error: any) {
      result.valid = false;
      result.parseErrors.push({
        message: error.message || 'Failed to parse configuration'
      });
    }

    return result;
  }

  validate(configCode: string): { valid: boolean; errors: ParseError[] } {
    const parsed = this.parse(configCode);
    return { valid: parsed.valid, errors: parsed.parseErrors };
  }

  private extractConfigBlock(code: string): string | null {
    // SDK-specific regex to extract config
    const pattern = /YourSDK\.init\s*\(\s*\{([\s\S]*?)\}\s*\)/;
    const match = code.match(pattern);
    return match ? match[1] : null;
  }

  private removeComments(code: string): string {
    // Remove language-specific comments while preserving strings
    // This is critical - see existing parsers for reference
  }

  private parseOptions(content: string): Map<string, ParsedOption> {
    const options = new Map<string, ParsedOption>();
    const cleanContent = this.removeComments(content);
    const statements = this.splitStatements(cleanContent);

    for (const statement of statements) {
      const parsed = this.parseKeyValue(statement);
      if (parsed) {
        options.set(parsed.key, parsed);
      }
    }

    return options;
  }

  private splitStatements(content: string): string[] {
    // Split by delimiter (comma, semicolon, newline) at depth 0
  }

  private parseKeyValue(statement: string): ParsedOption | null {
    // Extract key and value from statement
  }

  private inferType(value: string): ParsedOption['type'] {
    // Determine type from value syntax
  }

  private parseValue(value: string, type: string): any {
    // Convert string value to appropriate JS type
  }
}
```

## Step 2: Write Tests

Create `api/test/config-parsers/{sdk}.test.ts`:

```typescript
import { {SDK}ConfigParser } from '../../src/config-parsers/{sdk}';

describe('{SDK}ConfigParser', () => {
  let parser: {SDK}ConfigParser;

  beforeEach(() => {
    parser = new {SDK}ConfigParser();
  });

  describe('parse', () => {
    it('should parse basic configuration', () => {
      const config = `YourSDK.init({
        dsn: "https://test@o0.ingest.sentry.io/0",
        environment: "production"
      })`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.get('dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
    });

    it('should handle comments', () => {
      const config = `YourSDK.init({
        dsn: "https://test@o0.ingest.sentry.io/0", // comment
        /* block comment */
        environment: "production"
      })`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should preserve strings with special characters', () => {
      const config = `YourSDK.init({
        dsn: "https://key@org.ingest.sentry.io/123"
      })`;

      const result = parser.parse(config);

      // URL with // should not be treated as comment
      expect(result.options.get('dsn')?.value).toContain('https://');
    });

    it('should infer types correctly', () => {
      const config = `YourSDK.init({
        dsn: "string",
        debug: true,
        sampleRate: 0.5,
        tags: ["a", "b"]
      })`;

      const result = parser.parse(config);

      expect(result.options.get('dsn')?.type).toBe('string');
      expect(result.options.get('debug')?.type).toBe('boolean');
      expect(result.options.get('sampleRate')?.type).toBe('number');
      expect(result.options.get('tags')?.type).toBe('array');
    });

    it('should handle nested structures', () => {
      const config = `YourSDK.init({
        dsn: "...",
        integrations: [
          new Integration({ option: true })
        ]
      })`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
    });

    it('should return error for invalid config', () => {
      const config = `console.log("not sentry config")`;

      const result = parser.parse(config);

      expect(result.valid).toBe(false);
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should return valid for correct config', () => {
      const config = `YourSDK.init({ dsn: "..." })`;
      const result = parser.validate(config);
      expect(result.valid).toBe(true);
    });

    it('should return invalid for missing init', () => {
      const config = `other.code()`;
      const result = parser.validate(config);
      expect(result.valid).toBe(false);
    });
  });
});
```

## Step 3: Export the Parser

Add to `api/src/config-parsers/index.ts`:

```typescript
export { {SDK}ConfigParser } from './{sdk}';
```

## Step 4: Register in Routes

Update `api/src/routes/config.ts`:

```typescript
import { {SDK}ConfigParser } from '../config-parsers/{sdk}';

// Add parser instance
const {sdk}Parser = new {SDK}ConfigParser();

// Add to switch statement
case '{sdk}':
  analyzer = new ConfigAnalyzer({sdk}Parser);
  break;
```

## Step 5: Add SDK Config

Update `api/src/config-analyzer/sdk-config.ts`:

```typescript
{sdk}: {
  name: '{sdk}',
  language: '{Language}',
  keyStyle: 'camelCase',  // or 'snake_case'
  assignmentOperator: ': ',
  commentPrefix: '//',
  stringQuote: '"',
  boolTrue: 'true',
  boolFalse: 'false',
  arraySyntax: 'brackets',
  lambdaExample: '(event) => event',
},
```

## Step 6: Add Config Examples

Create 3 example files in `api/config-examples/`:

1. `{sdk}-basic.json` - Minimal setup
2. `{sdk}-framework.json` - Framework integration
3. `{sdk}-performance.json` - Performance monitoring

Example structure:
```json
{
  "id": "{sdk}-basic",
  "name": "{SDK} - Basic Setup",
  "description": "Minimal {SDK} SDK configuration",
  "sdk": "{sdk}",
  "complexity": "basic",
  "useCase": "Getting started",
  "seGuidance": "SE guidance text...",
  "configCode": "YourSDK.init({\n  dsn: \"...\"\n})"
}
```

## Step 7: Update UI (if needed)

If this is a completely new SDK (not already in the UI), update:

`ui/src/components/SdkSelector.tsx`:
```typescript
{ key: '{sdk}', name: '{SDK Name}', language: '{language}', ... }
```

## Common Parsing Challenges

### Comment Removal

The most complex part is removing comments while preserving strings:

```typescript
private removeComments(code: string): string {
  let result = '';
  let i = 0;
  let inString = false;
  let stringChar = '';

  while (i < code.length) {
    const char = code[i];
    const nextChar = code[i + 1] || '';
    const prevChar = code[i - 1] || '';

    // Track string state
    if ((char === '"' || char === "'") && prevChar !== '\\') {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
      }
      result += char;
      i++;
      continue;
    }

    // Skip comments only when not in string
    if (!inString) {
      if (char === '/' && nextChar === '/') {
        // Single-line comment
        while (i < code.length && code[i] !== '\n') i++;
        continue;
      }
      if (char === '/' && nextChar === '*') {
        // Multi-line comment
        i += 2;
        while (i < code.length - 1) {
          if (code[i] === '*' && code[i + 1] === '/') {
            i += 2;
            break;
          }
          i++;
        }
        continue;
      }
    }

    result += char;
    i++;
  }

  return result;
}
```

### Depth Tracking

Track nesting depth to split at the right level:

```typescript
private splitStatements(content: string): string[] {
  const statements: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;

  for (let i = 0; i < content.length; i++) {
    const char = content[i];

    // Track strings
    if (char === '"' && content[i - 1] !== '\\') {
      inString = !inString;
    }

    // Track depth only outside strings
    if (!inString) {
      if (char === '{' || char === '[' || char === '(') depth++;
      if (char === '}' || char === ']' || char === ')') depth--;
    }

    // Split at delimiter when depth is 0
    if (char === ',' && depth === 0 && !inString) {
      if (current.trim()) statements.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  if (current.trim()) statements.push(current.trim());
  return statements;
}
```

## Checklist

- [ ] Parser implements `IConfigParser` interface
- [ ] Tests cover: basic parsing, comments, strings, types, errors
- [ ] Parser exported from `index.ts`
- [ ] Parser registered in `routes/config.ts`
- [ ] SDK config added to `sdk-config.ts`
- [ ] 3 example files created
- [ ] All tests pass
- [ ] Container rebuilt and tested
