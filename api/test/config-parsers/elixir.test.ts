/**
 * Tests for Elixir configuration parser
 */

import { ElixirConfigParser } from '../../src/config-parsers/elixir';

describe('ElixirConfigParser', () => {
  let parser: ElixirConfigParser;

  beforeEach(() => {
    parser = new ElixirConfigParser();
  });

  describe('parse', () => {
    it('should parse a basic config file', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  environment: "production"`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.get('dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
      expect(result.options.get('environment')?.value).toBe('production');
    });

    it('should handle single-line comments', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  # Performance monitoring
  traces_sample_rate: 0.1`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('dsn')).toBe(true);
      expect(result.options.has('traces_sample_rate')).toBe(true);
    });

    it('should not remove comments inside strings', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  release: "version-1.0 # not a comment"`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('release')?.value).toBe('version-1.0 # not a comment');
    });

    it('should handle numbers', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  traces_sample_rate: 0.1,
  max_breadcrumbs: 100`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('traces_sample_rate')?.type).toBe('number');
      expect(result.options.get('traces_sample_rate')?.value).toBe(0.1);
      expect(result.options.get('max_breadcrumbs')?.type).toBe('number');
      expect(result.options.get('max_breadcrumbs')?.value).toBe(100);
    });

    it('should handle booleans', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  enable_source_code_context: true,
  send_default_pii: false`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('enable_source_code_context')?.type).toBe('boolean');
      expect(result.options.get('enable_source_code_context')?.value).toBe(true);
      expect(result.options.get('send_default_pii')?.type).toBe('boolean');
      expect(result.options.get('send_default_pii')?.value).toBe(false);
    });

    it('should handle lists', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  included_environments: [:prod, :staging]`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('included_environments')?.type).toBe('array');
    });

    it('should handle atoms', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  environment_name: :production`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('environment_name')?.value).toBe(':production');
    });

    it('should handle function references', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  before_send_event: {MyApp.Sentry, :before_send}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('before_send_event')?.type).toBe('function');
    });

    it('should handle MFA tuples', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  filter: {MyApp.SentryFilter, :filter}`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('filter')).toBe(true);
    });

    it('should handle runtime config with System.get_env', () => {
      const config = `config :sentry,
  dsn: System.get_env("SENTRY_DSN"),
  environment_name: System.get_env("MIX_ENV")`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('dsn')).toBe(true);
      expect(result.options.has('environment_name')).toBe(true);
    });

    it('should handle trailing commas', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  environment: "production",`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle empty configuration', () => {
      const config = `config :sentry`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(0);
    });

    it('should return error for invalid syntax', () => {
      const config = `not valid elixir config`;

      const result = parser.parse(config);

      expect(result.valid).toBe(false);
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });

    it('should handle multi-line config with various options', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0",
  environment_name: Mix.env(),
  included_environments: [:prod, :staging],
  enable_source_code_context: true,
  root_source_code_paths: [File.cwd!()]`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(5);
    });

    it('should handle keyword list syntax', () => {
      const config = `config :sentry, [
  dsn: "https://test@o0.ingest.sentry.io/0",
  environment: "production"
]`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = `config :sentry,
  dsn: "https://test@o0.ingest.sentry.io/0"`;

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
