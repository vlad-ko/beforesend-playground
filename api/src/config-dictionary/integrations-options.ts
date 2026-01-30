/**
 * Integration configuration options
 */

import { ConfigOption } from './types';

export const integrationsOptions: ConfigOption[] = [
  {
    key: 'integrations',
    displayName: 'Integrations',
    description: 'An array of integration instances to use. Integrations extend SDK functionality (e.g., breadcrumbs, context, framework-specific features).',
    type: 'array',
    category: 'integrations',
    required: false,
    examples: [
      '[]',
      '[new Sentry.BrowserTracing()]',
      '[new Sentry.Replay()]',
      '(defaults) => defaults.filter(i => i.name !== "Breadcrumbs")',
    ],
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/configuration/integrations/',
    seGuidance: 'Most integrations are enabled by default. Use this to add custom integrations or disable default ones. Common: add Replay, customize BrowserTracing, disable Console integration.',
    warnings: [
      'Removing default integrations may disable core features',
      'Use function form to filter defaults: (defaults) => [...defaults, newIntegration]',
      'Order can matter for some integrations',
    ],
    relatedOptions: ['defaultIntegrations'],
  },
  {
    key: 'defaultIntegrations',
    displayName: 'Default Integrations',
    description: 'Whether to use default integrations. Set to false to start with no integrations, then manually add what you need.',
    type: 'boolean',
    category: 'integrations',
    required: false,
    defaultValue: true,
    examples: ['true', 'false'],
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/configuration/integrations/',
    seGuidance: 'Rarely needed. Setting to false disables all default integrations - you must manually add everything. Only use for advanced customization or minimal SDK footprint.',
    warnings: [
      'Disables all default integrations - SDK will have minimal functionality',
      'You must manually add integrations you need',
      'Not recommended unless you have specific requirements',
    ],
    relatedOptions: ['integrations'],
  },
  {
    key: 'autoSessionTracking',
    displayName: 'Auto Session Tracking',
    description: 'Automatically track user sessions for release health metrics. Enabled by default in browser SDKs.',
    type: 'boolean',
    category: 'integrations',
    required: false,
    defaultValue: true,
    examples: ['true', 'false'],
    docsUrl: 'https://docs.sentry.io/product/releases/health/',
    seGuidance: 'Leave enabled to track crash-free sessions and release health. Disable only if you have custom session tracking. Required for accurate release health metrics in Sentry UI.',
    warnings: [
      'Disabling loses release health visibility',
      'Sessions are used for quota but are typically a small percentage',
    ],
    relatedOptions: ['release', 'environment'],
    supportedSDKs: ['javascript'],
  },
  {
    key: 'sendDefaultPii',
    displayName: 'Send Default PII',
    description: 'Whether to include personally identifiable information (PII) by default. When false, user IP, cookies, and similar data are stripped.',
    type: 'boolean',
    category: 'context',
    required: false,
    defaultValue: false,
    examples: ['true', 'false'],
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/data-management/sensitive-data/',
    seGuidance: 'Keep false (default) for GDPR compliance. Enable only if you need user IPs and have proper consent. Better approach: explicitly set user context with consented data.',
    warnings: [
      'Enabling may violate privacy regulations (GDPR, CCPA)',
      'Includes user IP addresses, cookies, authentication headers',
      'Consider using beforeSend for fine-grained PII control',
    ],
    relatedOptions: ['beforeSend'],
  },
];
