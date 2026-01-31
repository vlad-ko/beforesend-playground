/**
 * Playground mode types and configurations
 */

export type PlaygroundMode =
  | 'beforeSend'
  | 'beforeSendTransaction'
  | 'beforeBreadcrumb'
  | 'tracesSampler'
  | 'webhooks'
  | 'configAnalyzer'
  | 'apiQueryTester'
  | 'patternTester';

export interface ModeConfig {
  id: PlaygroundMode;
  name: string;
  description: string;
  helpText: string;
  docsUrl: string;
}

export const MODES: ModeConfig[] = [
  {
    id: 'beforeSend',
    name: 'beforeSend',
    description: 'Transform error events before they are sent to Sentry',
    helpText: 'The beforeSend callback is invoked before error events are sent to Sentry. Use it to modify events, filter out sensitive data, or drop events entirely by returning null.',
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/configuration/filtering/',
  },
  {
    id: 'beforeSendTransaction',
    name: 'beforeSendTransaction',
    description: 'Transform transaction events before they are sent to Sentry',
    helpText: 'The beforeSendTransaction callback is invoked before performance transaction events are sent to Sentry. Use it to modify transaction data, adjust sampling decisions, or filter performance events.',
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/configuration/filtering/',
  },
  {
    id: 'beforeBreadcrumb',
    name: 'beforeBreadcrumb',
    description: 'Filter and modify breadcrumbs before they are added to events',
    helpText: 'The beforeBreadcrumb callback is invoked before each breadcrumb is added to the scope. Use it to filter noisy breadcrumbs, scrub PII from console logs or navigation URLs, or modify breadcrumb data.',
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/configuration/filtering/',
  },
  {
    id: 'tracesSampler',
    name: 'tracesSampler',
    description: 'Test dynamic sampling strategies for performance monitoring',
    helpText: 'The tracesSampler callback returns a sample rate (0.0-1.0) for each transaction. Use it to sample critical endpoints at higher rates, filter out health checks, or implement user-based sampling strategies.',
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/configuration/sampling/',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Test Sentry webhook integrations',
    helpText: 'Webhooks allow you to receive HTTP callbacks when events occur in your Sentry projects. Test your webhook endpoints and validate payload handling with real Sentry event data.',
    docsUrl: 'https://docs.sentry.io/product/integrations/integration-platform/webhooks/',
  },
  {
    id: 'configAnalyzer',
    name: 'Config Analyzer',
    description: 'Analyze and validate Sentry.init() configurations',
    helpText: 'The Config Analyzer helps validate your Sentry SDK configuration, provides SE-focused recommendations, and explains what each option does. Paste your Sentry.init() code to get instant feedback.',
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/configuration/options/',
  },
  {
    id: 'apiQueryTester',
    name: 'API Query Tester',
    description: 'Test and validate Sentry API search queries',
    helpText: 'Test API query syntax, validate search properties, and debug query issues. Use the demo org at demo.sentry.io for testing. Supports issues, events, and projects endpoints with real-time validation.',
    docsUrl: 'https://docs.sentry.io/concepts/search/',
  },
  {
    id: 'patternTester',
    name: 'Pattern Tester',
    description: 'Test ignoreErrors, denyUrls, and allowUrls filter patterns',
    helpText: 'Validate regex patterns for filtering errors and URLs before deploying. Test ignoreErrors patterns against error messages, and denyUrls/allowUrls patterns against script URLs to ensure your filters work correctly.',
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/configuration/filtering/',
  },
];
