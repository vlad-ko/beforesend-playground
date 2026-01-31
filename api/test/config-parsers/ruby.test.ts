/**
 * Tests for Ruby configuration parser
 */

import { RubyConfigParser } from '../../src/config-parsers/ruby';

describe('RubyConfigParser', () => {
  let parser: RubyConfigParser;

  beforeEach(() => {
    parser = new RubyConfigParser();
  });

  describe('parse', () => {
    it('should parse a basic block configuration', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  config.environment = 'production'
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.get('dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should handle single-line comments', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  # Performance monitoring
  config.traces_sample_rate = 0.1
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('dsn')).toBe(true);
      expect(result.options.has('traces_sample_rate')).toBe(true);
      expect(result.options.get('traces_sample_rate')?.key).toBe('traces_sample_rate');
    });

    it('should not remove comments inside strings', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  config.release = 'version-1.0 # not a comment'
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('release')?.value).toBe('version-1.0 # not a comment');
    });

    it('should handle numbers', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  config.traces_sample_rate = 0.1
  config.max_breadcrumbs = 100
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('traces_sample_rate')?.type).toBe('number');
      expect(result.options.get('traces_sample_rate')?.value).toBe(0.1);
      expect(result.options.get('max_breadcrumbs')?.type).toBe('number');
      expect(result.options.get('max_breadcrumbs')?.value).toBe(100);
    });

    it('should handle booleans', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  config.send_default_pii = true
  config.capture_exception_frame_locals = false
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('send_default_pii')?.type).toBe('boolean');
      expect(result.options.get('send_default_pii')?.value).toBe(true);
      expect(result.options.get('capture_exception_frame_locals')?.type).toBe('boolean');
      expect(result.options.get('capture_exception_frame_locals')?.value).toBe(false);
    });

    it('should handle arrays', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  config.excluded_exceptions = ['ActiveRecord::RecordNotFound', 'ActionController::RoutingError']
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('excluded_exceptions')?.type).toBe('array');
    });

    it('should handle lambda/proc', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  config.before_send = ->(event, hint) { event }
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('before_send')?.type).toBe('function');
    });

    it('should handle Proc.new', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  config.before_send = Proc.new { |event| event }
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('before_send')?.type).toBe('function');
    });

    it('should handle symbols', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  config.environment = :production
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('environment')?.value).toBe(':production');
    });

    it('should handle curly brace block syntax', () => {
      const config = `Sentry.init { |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  config.environment = 'production'
}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle trailing commas/newlines', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
  config.environment = 'production'

end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle empty configuration', () => {
      const config = `Sentry.init do |config|
end`;

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

    it('should handle double-quoted strings', () => {
      const config = `Sentry.init do |config|
  config.dsn = "https://test@o0.ingest.sentry.io/0"
  config.environment = "production"
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle different block variable names', () => {
      const config = `Sentry.init do |c|
  c.dsn = 'https://test@o0.ingest.sentry.io/0'
  c.environment = 'production'
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = `Sentry.init do |config|
  config.dsn = 'https://test@o0.ingest.sentry.io/0'
end`;

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
      const config = `Sentry.init do |config|
  config.dsn = "https://test@o0.ingest.sentry.io/0"
  config.server_name = "C:\\\\Users\\\\"
  config.environment = "production"
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(3);
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should handle escaped quotes inside strings', () => {
      const config = `Sentry.init do |config|
  config.dsn = "https://test@o0.ingest.sentry.io/0"
  config.release = "version-\\"beta\\""
  config.environment = "production"
end`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(3);
      expect(result.options.get('environment')?.value).toBe('production');
    });
  });
});
