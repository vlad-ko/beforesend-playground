/**
 * Tests for Java configuration parser
 */

import { JavaConfigParser } from '../../src/config-parsers/java';

describe('JavaConfigParser', () => {
  let parser: JavaConfigParser;

  beforeEach(() => {
    parser = new JavaConfigParser();
  });

  describe('parse', () => {
    it('should parse a basic lambda configuration', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    options.setEnvironment("production");
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.get('dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should handle single-line comments', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    // Performance monitoring
    options.setTracesSampleRate(0.1);
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('dsn')).toBe(true);
      expect(result.options.has('tracesSampleRate')).toBe(true);
    });

    it('should handle multi-line comments', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    /* This is a
       multi-line comment */
    options.setSampleRate(0.5);
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('sampleRate')).toBe(true);
    });

    it('should not remove comments inside strings', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    options.setRelease("version-1.0 // not a comment");
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('release')?.value).toBe('version-1.0 // not a comment');
    });

    it('should handle numbers', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    options.setTracesSampleRate(0.1);
    options.setMaxBreadcrumbs(100);
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('tracesSampleRate')?.type).toBe('number');
      expect(result.options.get('tracesSampleRate')?.value).toBe(0.1);
      expect(result.options.get('maxBreadcrumbs')?.type).toBe('number');
      expect(result.options.get('maxBreadcrumbs')?.value).toBe(100);
    });

    it('should handle booleans', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    options.setDebug(true);
    options.setAttachStacktrace(false);
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('debug')?.type).toBe('boolean');
      expect(result.options.get('debug')?.value).toBe(true);
      expect(result.options.get('attachStacktrace')?.type).toBe('boolean');
      expect(result.options.get('attachStacktrace')?.value).toBe(false);
    });

    it('should handle List.of() arrays', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    options.setInAppIncludes(List.of("com.myapp", "com.mylib"));
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('inAppIncludes')?.type).toBe('array');
    });

    it('should handle lambda callbacks', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    options.setBeforeSend((event, hint) -> event);
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('beforeSend')?.type).toBe('function');
    });

    it('should handle method reference callbacks', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    options.setBeforeSend(MyClass::filterEvent);
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('beforeSend')?.type).toBe('function');
    });

    it('should handle different parameter names', () => {
      const config = `Sentry.init(opts -> {
    opts.setDsn("https://test@o0.ingest.sentry.io/0");
    opts.setEnvironment("production");
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle SentryAndroid.init', () => {
      const config = `SentryAndroid.init(this, options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    options.setEnvironment("production");
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle empty configuration', () => {
      const config = `Sentry.init(options -> {
});`;

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

    it('should handle enable* methods', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    options.enableTracing(true);
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('tracing')).toBe(true);
    });

    it('should handle add* methods', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
    options.addInAppInclude("com.myapp");
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('inAppInclude')).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = `Sentry.init(options -> {
    options.setDsn("https://test@o0.ingest.sentry.io/0");
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
});
