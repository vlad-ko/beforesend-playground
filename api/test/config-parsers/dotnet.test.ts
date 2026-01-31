/**
 * Tests for .NET configuration parser
 */

import { DotNetConfigParser } from '../../src/config-parsers/dotnet';

describe('DotNetConfigParser', () => {
  let parser: DotNetConfigParser;

  beforeEach(() => {
    parser = new DotNetConfigParser();
  });

  describe('parse', () => {
    it('should parse a basic lambda configuration', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  o.Environment = "production";
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.get('Dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
      expect(result.options.get('Environment')?.value).toBe('production');
    });

    it('should handle single-line comments', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  // Performance monitoring
  o.TracesSampleRate = 0.1;
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('Dsn')).toBe(true);
      expect(result.options.has('TracesSampleRate')).toBe(true);
    });

    it('should handle multi-line comments', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  /* This is a
     multi-line comment */
  o.SampleRate = 0.5;
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
      expect(result.options.has('SampleRate')).toBe(true);
    });

    it('should not remove comments inside strings', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  o.Release = "version-1.0 // not a comment";
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('Release')?.value).toBe('version-1.0 // not a comment');
    });

    it('should handle numbers', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  o.TracesSampleRate = 0.1;
  o.MaxBreadcrumbs = 100;
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('TracesSampleRate')?.type).toBe('number');
      expect(result.options.get('TracesSampleRate')?.value).toBe(0.1);
      expect(result.options.get('MaxBreadcrumbs')?.type).toBe('number');
      expect(result.options.get('MaxBreadcrumbs')?.value).toBe(100);
    });

    it('should handle booleans', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  o.Debug = true;
  o.AttachStacktrace = false;
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('Debug')?.type).toBe('boolean');
      expect(result.options.get('Debug')?.value).toBe(true);
      expect(result.options.get('AttachStacktrace')?.type).toBe('boolean');
      expect(result.options.get('AttachStacktrace')?.value).toBe(false);
    });

    it('should handle arrays/lists', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  o.InAppInclude = new List<string> { "MyApp", "MyLib" };
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('InAppInclude')?.type).toBe('array');
    });

    it('should handle lambda expressions for callbacks', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  o.BeforeSend = (sentryEvent) => sentryEvent;
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('BeforeSend')?.type).toBe('function');
    });

    it('should handle different parameter names', () => {
      const config = `SentrySdk.Init(options => {
  options.Dsn = "https://test@o0.ingest.sentry.io/0";
  options.Environment = "production";
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle UseSentry extension method', () => {
      const config = `builder.WebHost.UseSentry(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  o.Environment = "production";
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(2);
    });

    it('should handle empty configuration', () => {
      const config = `SentrySdk.Init(o => {
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(0);
    });

    it('should return error for invalid syntax', () => {
      const config = `SentrySdk.Init(not valid)`;

      const result = parser.parse(config);

      expect(result.valid).toBe(false);
      expect(result.parseErrors.length).toBeGreaterThan(0);
    });

    it('should handle verbatim strings', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = @"https://test@o0.ingest.sentry.io/0";
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.get('Dsn')?.value).toBe('https://test@o0.ingest.sentry.io/0');
    });

    it('should handle nullable types', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  o.SampleRate = 0.5f;
  o.MaxRequestBodySize = RequestSize.Medium;
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.has('SampleRate')).toBe(true);
    });
  });

  describe('validate', () => {
    it('should validate valid configuration', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
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
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  o.ServerName = "C:\\\\Users\\\\";
  o.Environment = "production";
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(3);
      expect(result.options.get('Environment')?.value).toBe('production');
    });

    it('should handle escaped quotes inside strings', () => {
      const config = `SentrySdk.Init(o => {
  o.Dsn = "https://test@o0.ingest.sentry.io/0";
  o.Release = "version-\\"beta\\"";
  o.Environment = "production";
});`;

      const result = parser.parse(config);

      expect(result.valid).toBe(true);
      expect(result.options.size).toBe(3);
      expect(result.options.get('Environment')?.value).toBe('production');
    });
  });
});
