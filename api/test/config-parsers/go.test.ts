/**
 * Tests for Go configuration parser
 */

import { GoConfigParser } from '../../src/config-parsers/go';

describe('GoConfigParser', () => {
  let parser: GoConfigParser;

  beforeEach(() => {
    parser = new GoConfigParser();
  });

  describe('parse', () => {
    it('should parse a basic configuration', () => {
      const config = `sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  Environment: "production",
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.get('Dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
      expect(result.options.get('Environment')?.value).toBe('production');
    });

    it('should handle single-line comments', () => {
      const config = `sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  // Performance monitoring
  TracesSampleRate: 0.1,
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('Dsn')).toBe(true);
      expect(result.options.has('TracesSampleRate')).toBe(true);
      expect(result.options.get('TracesSampleRate')?.key).toBe('TracesSampleRate');
    });

    it('should handle multi-line comments', () => {
      const config = `sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  /* This is a
     multi-line comment */
  SampleRate: 0.5,
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('SampleRate')).toBe(true);
      expect(result.options.get('SampleRate')?.key).toBe('SampleRate');
    });

    it('should not remove comments inside strings', () => {
      const config = `sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  Release: "version-1.0 // not a comment",
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('Release')?.value).toBe('version-1.0 // not a comment');
    });

    it('should handle numbers', () => {
      const config = `sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  TracesSampleRate: 0.1,
  MaxBreadcrumbs: 100,
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('TracesSampleRate')?.type).toBe('number');
      expect(result.options.get('TracesSampleRate')?.value).toBe(0.1);
      expect(result.options.get('MaxBreadcrumbs')?.type).toBe('number');
      expect(result.options.get('MaxBreadcrumbs')?.value).toBe(100);
    });

    it('should handle booleans', () => {
      const config = `sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  Debug: true,
  EnableTracing: false,
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('Debug')?.type).toBe('boolean');
      expect(result.options.get('Debug')?.value).toBe(true);
      expect(result.options.get('EnableTracing')?.type).toBe('boolean');
      expect(result.options.get('EnableTracing')?.value).toBe(false);
    });

    it('should handle arrays/slices', () => {
      const config = `sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  IgnoreErrors: []string{"context canceled", "deadline exceeded"},
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('IgnoreErrors')?.type).toBe('array');
    });

    it('should handle functions', () => {
      const config = `sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  BeforeSend: func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
    return event
  },
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('BeforeSend')?.type).toBe('function');
    });

    it('should handle just a struct literal without sentry.Init', () => {
      const config = `sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  Environment: "production",
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle trailing commas', () => {
      const config = `sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  Environment: "production",
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle empty configuration', () => {
      const config = `sentry.Init(sentry.ClientOptions{})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(0);
    });

    it('should return error for invalid syntax', () => {
      const config = `sentry.Init(not valid)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(false);
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });

    it('should handle err assignment pattern', () => {
      const config = `err := sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
  Environment: "production",
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = `sentry.Init(sentry.ClientOptions{
  Dsn: "https://test@o0.ingest.sentry.io/0",
})`;

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
});
