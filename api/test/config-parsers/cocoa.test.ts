/**
 * Tests for Cocoa (Swift) configuration parser
 */

import { CocoaConfigParser } from '../../src/config-parsers/cocoa';

describe('CocoaConfigParser', () => {
  let parser: CocoaConfigParser;

  beforeEach(() => {
    parser = new CocoaConfigParser();
  });

  describe('parse', () => {
    it('should parse a basic closure configuration', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.environment = "production"
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.get('dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should handle single-line comments', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    // Performance monitoring
    options.tracesSampleRate = 0.1
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('dsn')).toBe(true);
      expect(result.options.has('tracesSampleRate')).toBe(true);
    });

    it('should handle multi-line comments', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    /* This is a
       multi-line comment */
    options.sampleRate = 0.5
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('sampleRate')).toBe(true);
    });

    it('should not remove comments inside strings', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.releaseName = "version-1.0 // not a comment"
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('releaseName')?.value).toBe('version-1.0 // not a comment');
    });

    it('should handle numbers', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.tracesSampleRate = 0.1
    options.maxBreadcrumbs = 100
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('tracesSampleRate')?.type).toBe('number');
      expect(result.options.get('tracesSampleRate')?.value).toBe(0.1);
      expect(result.options.get('maxBreadcrumbs')?.type).toBe('number');
      expect(result.options.get('maxBreadcrumbs')?.value).toBe(100);
    });

    it('should handle booleans', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.debug = true
    options.enableAutoSessionTracking = false
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('debug')?.type).toBe('boolean');
      expect(result.options.get('debug')?.value).toBe(true);
      expect(result.options.get('enableAutoSessionTracking')?.type).toBe('boolean');
      expect(result.options.get('enableAutoSessionTracking')?.value).toBe(false);
    });

    it('should handle arrays', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.inAppIncludes = ["MyApp", "MyFramework"]
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('inAppIncludes')?.type).toBe('array');
    });

    it('should handle closure callbacks', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.beforeSend = { event in
        return event
    }
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('beforeSend')?.type).toBe('function');
    });

    it('should handle NSNumber for sample rates', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.tracesSampleRate = NSNumber(value: 0.1)
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('tracesSampleRate')).toBe(true);
    });

    it('should handle different parameter names', () => {
      const config = `SentrySDK.start { opts in
    opts.dsn = "https://test@o0.ingest.sentry.io/0"
    opts.environment = "production"
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle shorthand closure syntax', () => {
      const config = `SentrySDK.start {
    $0.dsn = "https://test@o0.ingest.sentry.io/0"
    $0.environment = "production"
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle empty configuration', () => {
      const config = `SentrySDK.start { options in
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(0);
    });

    it('should return error for invalid syntax', () => {
      const config = `SentrySDK.start(not valid)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(false);
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });

    it('should handle configure method syntax', () => {
      const config = `SentrySDK.start(configureOptions: { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.environment = "production"
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
}`;

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
