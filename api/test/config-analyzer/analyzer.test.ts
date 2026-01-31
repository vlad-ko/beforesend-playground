/**
 * Tests for Configuration Analyzer
 *
 * These tests verify that the analyzer correctly handles both
 * JavaScript camelCase and Python snake_case option names.
 */

import { ConfigAnalyzer } from '../../src/config-analyzer/analyzer';
import { PythonConfigParser } from '../../src/config-parsers/python';
import { JavaScriptConfigParser } from '../../src/config-parsers/javascript';
import { CocoaConfigParser } from '../../src/config-parsers/cocoa';

describe('ConfigAnalyzer', () => {
  describe('Python snake_case key normalization', () => {
    let analyzer: ConfigAnalyzer;

    beforeEach(() => {
      analyzer = new ConfigAnalyzer(new PythonConfigParser());
    });

    it('should recognize traces_sample_rate as tracesSampleRate', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    traces_sample_rate=0.1
)`;

      const result = analyzer.analyze(config, 'python');

      const traceOption = result.options.find(o => o.key === 'traces_sample_rate');
      expect(traceOption).toBeDefined();
      expect(traceOption?.recognized).toBe(true);
      expect(traceOption?.displayName).toBe('Traces Sample Rate');
    });

    it('should recognize send_default_pii as sendDefaultPii', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    send_default_pii=True
)`;

      const result = analyzer.analyze(config, 'python');

      const piiOption = result.options.find(o => o.key === 'send_default_pii');
      expect(piiOption).toBeDefined();
      expect(piiOption?.recognized).toBe(true);
    });

    it('should validate traces_sample_rate value', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    traces_sample_rate=1.0
)`;

      const result = analyzer.analyze(config, 'python');

      // Should have a warning about 100% sampling
      const samplingWarning = result.warnings.find(
        w => w.message.includes('100% transaction sampling')
      );
      expect(samplingWarning).toBeDefined();
    });

    it('should validate invalid sample rate values', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    traces_sample_rate=1.5
)`;

      const result = analyzer.analyze(config, 'python');

      // Should have an error about invalid range
      const rangeError = result.warnings.find(
        w => w.severity === 'error' && w.message.includes('between 0.0 and 1.0')
      );
      expect(rangeError).toBeDefined();
    });

    it('should warn about send_default_pii=True', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    send_default_pii=True
)`;

      const result = analyzer.analyze(config, 'python');

      const piiWarning = result.warnings.find(
        w => w.message.includes('PII') || w.message.includes('privacy')
      );
      expect(piiWarning).toBeDefined();
    });

    it('should warn about debug=True', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    debug=True
)`;

      const result = analyzer.analyze(config, 'python');

      const debugWarning = result.warnings.find(
        w => w.message.includes('Debug mode')
      );
      expect(debugWarning).toBeDefined();
    });

    it('should not recommend tracesSampleRate if traces_sample_rate is set', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    environment="production",
    release="1.0.0",
    traces_sample_rate=0.1
)`;

      const result = analyzer.analyze(config, 'python');

      const tracesRec = result.recommendations.find(
        r => r.optionKey === 'tracesSampleRate'
      );
      expect(tracesRec).toBeUndefined();
    });

    it('should not recommend environment if it is already set (snake_case)', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    environment="production"
)`;

      const result = analyzer.analyze(config, 'python');

      const envRec = result.recommendations.find(
        r => r.optionKey === 'environment'
      );
      expect(envRec).toBeUndefined();
    });

    it('should recognize before_send as beforeSend', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    before_send=lambda event, hint: event
)`;

      const result = analyzer.analyze(config, 'python');

      const beforeSendOption = result.options.find(o => o.key === 'before_send');
      expect(beforeSendOption).toBeDefined();
      expect(beforeSendOption?.recognized).toBe(true);
    });

    it('should give bonus score for snake_case options', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    environment="production",
    release="1.0.0",
    before_send=lambda event, hint: event
)`;

      const result = analyzer.analyze(config, 'python');

      // Should get bonus points for having environment, release, and beforeSend
      expect(result.score).toBeGreaterThan(50);
    });

    it('should recognize profiles_sample_rate as profilesSampleRate', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    profiles_sample_rate=0.1
)`;

      const result = analyzer.analyze(config, 'python');

      const profilesOption = result.options.find(o => o.key === 'profiles_sample_rate');
      expect(profilesOption).toBeDefined();
      expect(profilesOption?.recognized).toBe(true);
    });

    it('should recognize max_breadcrumbs as maxBreadcrumbs', () => {
      const config = `sentry_sdk.init(
    dsn="https://test@o0.ingest.sentry.io/0",
    max_breadcrumbs=50
)`;

      const result = analyzer.analyze(config, 'python');

      const breadcrumbsOption = result.options.find(o => o.key === 'max_breadcrumbs');
      expect(breadcrumbsOption).toBeDefined();
      expect(breadcrumbsOption?.recognized).toBe(true);
    });
  });

  describe('JavaScript camelCase keys', () => {
    let analyzer: ConfigAnalyzer;

    beforeEach(() => {
      analyzer = new ConfigAnalyzer(new JavaScriptConfigParser());
    });

    it('should recognize camelCase options', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  tracesSampleRate: 0.1
});`;

      const result = analyzer.analyze(config, 'javascript');

      const traceOption = result.options.find(o => o.key === 'tracesSampleRate');
      expect(traceOption).toBeDefined();
      expect(traceOption?.recognized).toBe(true);
    });

    it('should validate camelCase sample rate', () => {
      const config = `Sentry.init({
  dsn: "https://test@o0.ingest.sentry.io/0",
  tracesSampleRate: 1.0
});`;

      const result = analyzer.analyze(config, 'javascript');

      const samplingWarning = result.warnings.find(
        w => w.message.includes('100% transaction sampling')
      );
      expect(samplingWarning).toBeDefined();
    });
  });

  describe('Cocoa SDK options', () => {
    let analyzer: ConfigAnalyzer;

    beforeEach(() => {
      analyzer = new ConfigAnalyzer(new CocoaConfigParser());
    });

    it('should recognize releaseName option', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.releaseName = "my-app@1.0.0"
}`;

      const result = analyzer.analyze(config, 'cocoa');

      const releaseOption = result.options.find(o => o.key === 'releaseName');
      expect(releaseOption).toBeDefined();
      expect(releaseOption?.recognized).toBe(true);
    });

    it('should recognize enableAutoSessionTracking option', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.enableAutoSessionTracking = true
}`;

      const result = analyzer.analyze(config, 'cocoa');

      const sessionOption = result.options.find(o => o.key === 'enableAutoSessionTracking');
      expect(sessionOption).toBeDefined();
      expect(sessionOption?.recognized).toBe(true);
    });

    it('should recognize enableUIViewControllerTracing option', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.enableUIViewControllerTracing = true
}`;

      const result = analyzer.analyze(config, 'cocoa');

      const tracingOption = result.options.find(o => o.key === 'enableUIViewControllerTracing');
      expect(tracingOption).toBeDefined();
      expect(tracingOption?.recognized).toBe(true);
    });

    it('should recognize enableSwizzling option', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.enableSwizzling = true
}`;

      const result = analyzer.analyze(config, 'cocoa');

      const swizzlingOption = result.options.find(o => o.key === 'enableSwizzling');
      expect(swizzlingOption).toBeDefined();
      expect(swizzlingOption?.recognized).toBe(true);
    });

    it('should recognize enableNetworkBreadcrumbs option', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.enableNetworkBreadcrumbs = true
}`;

      const result = analyzer.analyze(config, 'cocoa');

      const breadcrumbsOption = result.options.find(o => o.key === 'enableNetworkBreadcrumbs');
      expect(breadcrumbsOption).toBeDefined();
      expect(breadcrumbsOption?.recognized).toBe(true);
    });

    it('should recognize enableCaptureFailedRequests option', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.enableCaptureFailedRequests = true
}`;

      const result = analyzer.analyze(config, 'cocoa');

      const failedReqOption = result.options.find(o => o.key === 'enableCaptureFailedRequests');
      expect(failedReqOption).toBeDefined();
      expect(failedReqOption?.recognized).toBe(true);
    });

    it('should give high score for well-configured Cocoa app', () => {
      const config = `SentrySDK.start { options in
    options.dsn = "https://test@o0.ingest.sentry.io/0"
    options.environment = "production"
    options.releaseName = "my-app@1.0.0"
    options.tracesSampleRate = 0.1
    options.enableAutoSessionTracking = true
}`;

      const result = analyzer.analyze(config, 'cocoa');

      // Should have no unknown option warnings
      const unknownWarnings = result.warnings.filter(
        w => w.message.includes('Unknown option')
      );
      expect(unknownWarnings.length).toBe(0);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });
  });
});
