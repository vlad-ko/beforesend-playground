/**
 * Tests for Rust configuration parser
 */

import { RustConfigParser } from '../../src/config-parsers/rust';

describe('RustConfigParser', () => {
  let parser: RustConfigParser;

  beforeEach(() => {
    parser = new RustConfigParser();
  });

  describe('parse', () => {
    it('should parse a basic configuration', () => {
      const config = `let _guard = sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    environment: Some("production".into()),
    ..Default::default()
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBeGreaterThanOrEqual(2);
      expect(result.options.has('dsn')).toBe(true);
      expect(result.options.has('environment')).toBe(true);
    });

    it('should handle single-line comments', () => {
      const config = `sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    // Performance monitoring
    traces_sample_rate: 0.1,
    ..Default::default()
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('dsn')).toBe(true);
      expect(result.options.has('traces_sample_rate')).toBe(true);
      expect(result.options.get('traces_sample_rate')?.key).toBe('traces_sample_rate');
    });

    it('should handle multi-line comments', () => {
      const config = `sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    /* This is a
       multi-line comment */
    sample_rate: 0.5,
    ..Default::default()
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('sample_rate')).toBe(true);
      expect(result.options.get('sample_rate')?.key).toBe('sample_rate');
    });

    it('should not remove comments inside strings', () => {
      const config = `sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    release: Some("version-1.0 // not a comment".into()),
    ..Default::default()
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      // The raw value should contain the full string
      expect(result.options.get('release')?.rawValue).toContain('not a comment');
    });

    it('should handle numbers', () => {
      const config = `sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    traces_sample_rate: 0.1,
    max_breadcrumbs: 100,
    ..Default::default()
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('traces_sample_rate')?.type).toBe('number');
      expect(result.options.get('traces_sample_rate')?.value).toBe(0.1);
      expect(result.options.get('max_breadcrumbs')?.type).toBe('number');
      expect(result.options.get('max_breadcrumbs')?.value).toBe(100);
    });

    it('should handle booleans', () => {
      const config = `sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    debug: true,
    auto_session_tracking: false,
    ..Default::default()
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('debug')?.type).toBe('boolean');
      expect(result.options.get('debug')?.value).toBe(true);
      expect(result.options.get('auto_session_tracking')?.type).toBe('boolean');
      expect(result.options.get('auto_session_tracking')?.value).toBe(false);
    });

    it('should handle vec! arrays', () => {
      const config = `sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    in_app_include: vec!["my_crate", "my_other_crate"],
    ..Default::default()
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('in_app_include')?.type).toBe('array');
    });

    it('should handle closures', () => {
      const config = `sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    before_send: Some(Box::new(|event| {
        Some(event)
    })),
    ..Default::default()
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('before_send')?.type).toBe('function');
    });

    it('should handle just a struct literal without sentry::init', () => {
      const config = `sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    environment: Some("production".into()),
    ..Default::default()
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBeGreaterThanOrEqual(2);
    });

    it('should handle trailing commas', () => {
      const config = `sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    environment: Some("production".into()),
    ..Default::default()
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
    });

    it('should handle empty configuration', () => {
      const config = `sentry::init(sentry::ClientOptions {
    ..Default::default()
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
    });

    it('should return error for invalid syntax', () => {
      const config = `sentry::init(not valid)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(false);
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });

    it('should handle Default::default() spread', () => {
      const config = `sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    ..Default::default()
})`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('dsn')).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = `sentry::init(sentry::ClientOptions {
    dsn: Some("https://test@o0.ingest.sentry.io/0".into()),
    ..Default::default()
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
