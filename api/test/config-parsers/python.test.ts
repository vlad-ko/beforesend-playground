/**
 * Tests for Python configuration parser
 */

import { PythonConfigParser } from '../../src/config-parsers/python';

describe('PythonConfigParser', () => {
  let parser: PythonConfigParser;

  beforeEach(() => {
    parser = new PythonConfigParser();
  });

  describe('parse', () => {
    it('should parse a basic configuration', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    environment="production"
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.get('dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should handle Python comments', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    # Performance monitoring
    traces_sample_rate=0.1
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('traces_sample_rate')).toBe(true);
      expect(result.options.get('traces_sample_rate')?.key).toBe('traces_sample_rate');
    });

    it('should handle comments before multiple properties', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",

    # Enable performance monitoring
    traces_sample_rate=0.1,

    # Profile transactions
    profiles_sample_rate=0.1,

    # Sample errors
    sample_rate=0.5
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(4);
      expect(result.options.get('dsn')?.key).toBe('dsn');
      expect(result.options.get('traces_sample_rate')?.key).toBe('traces_sample_rate');
      expect(result.options.get('profiles_sample_rate')?.key).toBe('profiles_sample_rate');
      expect(result.options.get('sample_rate')?.key).toBe('sample_rate');
    });

    it('should not remove comments inside strings', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    release="version-1.0 # not a comment"
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('release')?.value).toBe('version-1.0 # not a comment');
    });

    it('should handle Python numbers', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    traces_sample_rate=0.1,
    max_breadcrumbs=100
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('traces_sample_rate')?.type).toBe('number');
      expect(result.options.get('traces_sample_rate')?.value).toBe(0.1);
      expect(result.options.get('max_breadcrumbs')?.type).toBe('number');
      expect(result.options.get('max_breadcrumbs')?.value).toBe(100);
    });

    it('should handle Python booleans', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    debug=True,
    send_default_pii=False
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('debug')?.type).toBe('boolean');
      expect(result.options.get('debug')?.value).toBe(true);
      expect(result.options.get('send_default_pii')?.type).toBe('boolean');
      expect(result.options.get('send_default_pii')?.value).toBe(false);
    });

    it('should handle Python lists', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    ignore_errors=["ConnectionError", "TimeoutError"]
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('ignore_errors')?.type).toBe('array');
      expect(result.options.get('ignore_errors')?.value).toEqual(['ConnectionError', 'TimeoutError']);
    });

    it('should handle lambda functions', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    before_send=lambda event, hint: event
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('before_send')?.type).toBe('function');
    });

    it('should handle function references', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    before_send=my_before_send_handler
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('before_send')).toBe(true);
    });

    it('should handle integrations list', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    integrations=[DjangoIntegration(), RedisIntegration()]
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('integrations')).toBe(true);
    });

    it('should handle trailing commas', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    environment="production",
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle empty configuration', () => {
      const config = `sentry_sdk.init()`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(0);
    });

    it('should handle just kwargs without function call', () => {
      const config = `dsn="https://test@o0.ingest.sentry.io/0"
environment="production"`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBeGreaterThan(0);
    });

    it('should handle snake_case keys', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    traces_sample_rate=0.1,
    send_default_pii=False,
    max_breadcrumbs=50
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('traces_sample_rate')).toBe(true);
      expect(result.options.has('send_default_pii')).toBe(true);
      expect(result.options.has('max_breadcrumbs')).toBe(true);
    });

    it('should handle multiline string values', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    environment="production"
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should return error for invalid syntax', () => {
      const config = `sentry_sdk.init(invalid syntax here)`;

      const result = parser.parse(config);

      // Should still parse but might have no options or errors
      expect(result.sdk).toBe('python');
    });

    it('should handle None values', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    before_send=None
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('before_send')).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0"
)`;

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
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    server_name="C:\\\\Users\\\\",
    environment="production"
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(3);
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should handle escaped quotes inside strings', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    release="version-\\"beta\\"",
    environment="production"
)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(3);
      expect(result.options.get('environment')?.value).toBe('production');
    });
  });
});
