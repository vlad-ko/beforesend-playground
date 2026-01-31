/**
 * Tests for PHP configuration parser
 */

import { PHPConfigParser } from '../../src/config-parsers/php';

describe('PHPConfigParser', () => {
  let parser: PHPConfigParser;

  beforeEach(() => {
    parser = new PHPConfigParser();
  });

  describe('parse', () => {
    it('should parse a basic configuration', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  'environment' => 'production',
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.get('dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should handle Sentry\\init without backslash prefix', () => {
      const config = `Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  'environment' => 'production',
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle single-line comments', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  // Performance monitoring
  'traces_sample_rate' => 0.1,
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('dsn')).toBe(true);
      expect(result.options.has('traces_sample_rate')).toBe(true);
    });

    it('should handle hash comments', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  # Performance monitoring
  'traces_sample_rate' => 0.1,
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle multi-line comments', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  /* This is a
     multi-line comment */
  'sample_rate' => 0.5,
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('sample_rate')).toBe(true);
    });

    it('should not remove comments inside strings', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  'release' => 'version-1.0 // not a comment',
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('release')?.value).toBe('version-1.0 // not a comment');
    });

    it('should handle numbers', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  'traces_sample_rate' => 0.1,
  'max_breadcrumbs' => 100,
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('traces_sample_rate')?.type).toBe('number');
      expect(result.options.get('traces_sample_rate')?.value).toBe(0.1);
      expect(result.options.get('max_breadcrumbs')?.type).toBe('number');
      expect(result.options.get('max_breadcrumbs')?.value).toBe(100);
    });

    it('should handle booleans', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  'send_default_pii' => true,
  'attach_stacktrace' => false,
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('send_default_pii')?.type).toBe('boolean');
      expect(result.options.get('send_default_pii')?.value).toBe(true);
      expect(result.options.get('attach_stacktrace')?.type).toBe('boolean');
      expect(result.options.get('attach_stacktrace')?.value).toBe(false);
    });

    it('should handle arrays', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  'ignore_exceptions' => ['Exception', 'RuntimeException'],
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('ignore_exceptions')?.type).toBe('array');
    });

    it('should handle closures', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  'before_send' => function (Event $event): ?Event {
    return $event;
  },
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('before_send')?.type).toBe('function');
    });

    it('should handle arrow functions', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  'before_send' => fn($event) => $event,
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('before_send')?.type).toBe('function');
    });

    it('should handle just an array literal without Sentry\\init', () => {
      const config = `[
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  'environment' => 'production',
]`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle trailing commas', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
  'environment' => 'production',
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle empty configuration', () => {
      const config = `\\Sentry\\init([]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(0);
    });

    it('should return error for invalid syntax', () => {
      const config = `Sentry::init(not valid)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(false);
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });

    it('should handle double-quoted strings', () => {
      const config = `\\Sentry\\init([
  "dsn" => "https://test@o0.ingest.sentry.io/0",
  "environment" => "production",
]);`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = `\\Sentry\\init([
  'dsn' => 'https://test@o0.ingest.sentry.io/0',
]);`;

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
