/**
 * Tests for JavaScript configuration parser
 */

import { JavaScriptConfigParser } from '../../src/config-parsers/javascript';

describe('JavaScriptConfigParser', () => {
  let parser: JavaScriptConfigParser;

  beforeEach(() => {
    parser = new JavaScriptConfigParser();
  });

  describe('parse', () => {
    it('should parse a basic configuration', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  environment: "production"
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.get('dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should handle single-line comments', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  // Performance monitoring
  tracesSampleRate: 0.1
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('dsn')).toBe(true);
      expect(result.options.has('tracesSampleRate')).toBe(true);
      // Make sure comment is not part of the key
      expect(result.options.get('tracesSampleRate')?.key).toBe('tracesSampleRate');
    });

    it('should handle multi-line comments', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  /* This is a
     multi-line comment */
  sampleRate: 0.5
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('sampleRate')).toBe(true);
      expect(result.options.get('sampleRate')?.key).toBe('sampleRate');
    });

    it('should handle comments before multiple properties', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",

  // Ignore known browser errors
  ignoreErrors: ["Script error"],

  // Performance monitoring at 10%
  tracesSampleRate: 0.1,

  // Sample only 50% of errors
  sampleRate: 0.5
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(4);

      // All keys should be clean without comments
      expect(result.options.get('dsn')?.key).toBe('dsn');
      expect(result.options.get('ignoreErrors')?.key).toBe('ignoreErrors');
      expect(result.options.get('tracesSampleRate')?.key).toBe('tracesSampleRate');
      expect(result.options.get('sampleRate')?.key).toBe('sampleRate');
    });

    it('should not remove comments inside strings', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  release: "version-1.0 // not a comment"
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('release')?.value).toBe('version-1.0 // not a comment');
    });

    it('should handle numbers', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  tracesSampleRate: 0.1,
  maxBreadcrumbs: 100
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('tracesSampleRate')?.type).toBe('number');
      expect(result.options.get('tracesSampleRate')?.value).toBe(0.1);
      expect(result.options.get('maxBreadcrumbs')?.type).toBe('number');
      expect(result.options.get('maxBreadcrumbs')?.value).toBe(100);
    });

    it('should handle booleans', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  debug: true,
  enabled: false
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('debug')?.type).toBe('boolean');
      expect(result.options.get('debug')?.value).toBe(true);
      expect(result.options.get('enabled')?.type).toBe('boolean');
      expect(result.options.get('enabled')?.value).toBe(false);
    });

    it('should handle arrays', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  ignoreErrors: ["Script error", "NetworkError"]
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('ignoreErrors')?.type).toBe('array');
      expect(result.options.get('ignoreErrors')?.value).toEqual(['Script error', 'NetworkError']);
    });

    it('should handle functions', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  beforeSend: (event) => { return event; }
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('beforeSend')?.type).toBe('function');
    });

    it('should handle nested objects', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  integrations: [new BrowserTracing()]
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('integrations')).toBe(true);
    });

    it('should handle just an object literal without Sentry.init', () => {
      const config = `{
  dsn: "https://test@o0.ingest.sentry.io/0",
  environment: "production"
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle trailing commas', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  environment: "production",
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle empty configuration', () => {
      const config = `Sentry.init({});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(0);
    });

    it('should return error for invalid syntax', () => {
      const config = `Sentry.init(not valid)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(false);
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0"
});`;

      const result = parser.validate(config);

      expect(result.valid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should return errors for invalid configuration', () => {
      const config = `invalid`;

      const result = parser.validate(config);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('escaped backslash handling', () => {
    it('should handle strings ending with escaped backslash', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  serverName: "C:\\\\Users\\\\",
  environment: "production",
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(3);
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should handle escaped quotes inside strings', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  release: "version-\\"beta\\"",
  environment: "production",
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(3);
      expect(result.options.get('environment')?.value).toBe('production');
    });
  });
});
