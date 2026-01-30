/**
 * Hook configuration options
 */

import { ConfigOption } from './types';

export const hooksOptions: ConfigOption[] = [
  {
    key: 'beforeSend',
    displayName: 'Before Send',
    description: 'A callback invoked before error events are sent. Use to modify events, scrub PII, or drop events by returning null.',
    type: 'function',
    category: 'hooks',
    required: false,
    examples: [
      '(event, hint) => { return event; }',
      '(event, hint) => { delete event.user; return event; }',
      '(event, hint) => { if (event.exception?.values?.[0]?.value?.includes("ignore")) return null; return event; }',
    ],
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/configuration/filtering/',
    seGuidance: 'Primary tool for PII scrubbing and event filtering. Return null to drop events. Modify event object to scrub sensitive data. Common use: remove user emails, filter test errors, sanitize URLs.',
    warnings: [
      'Runs synchronously - keep logic fast to avoid blocking',
      'Returning null drops the event entirely',
      'Exceptions in beforeSend are caught and logged, event is sent unmodified',
    ],
    relatedOptions: ['beforeBreadcrumb', 'beforeSendTransaction'],
  },
  {
    key: 'beforeSendTransaction',
    displayName: 'Before Send Transaction',
    description: 'A callback invoked before performance transactions are sent. Use to modify transactions, adjust sampling, or drop transactions by returning null.',
    type: 'function',
    category: 'hooks',
    required: false,
    examples: [
      '(transaction, hint) => { return transaction; }',
      '(transaction, hint) => { if (transaction.transaction === "GET /health") return null; return transaction; }',
    ],
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/configuration/filtering/',
    seGuidance: 'Use to filter out health checks, internal endpoints, or low-value transactions. Common pattern: drop OPTIONS requests, filter by transaction name. Helps control quota consumption.',
    warnings: [
      'Runs synchronously - keep logic fast',
      'Returning null drops the transaction',
      'Does not affect error events - use beforeSend for those',
    ],
    relatedOptions: ['beforeSend', 'tracesSampler'],
  },
  {
    key: 'beforeBreadcrumb',
    displayName: 'Before Breadcrumb',
    description: 'A callback invoked before a breadcrumb is added. Use to modify, filter, or drop breadcrumbs by returning null.',
    type: 'function',
    category: 'hooks',
    required: false,
    examples: [
      '(breadcrumb, hint) => { return breadcrumb; }',
      '(breadcrumb, hint) => { if (breadcrumb.category === "console") return null; return breadcrumb; }',
      '(breadcrumb, hint) => { if (breadcrumb.message?.includes("password")) return null; return breadcrumb; }',
    ],
    docsUrl: 'https://docs.sentry.io/platform-redirect/?next=/enriching-events/breadcrumbs/',
    seGuidance: 'Use to filter noisy breadcrumbs (console logs, frequent clicks) or scrub sensitive data from breadcrumb messages. Return null to drop breadcrumb. Helps reduce event payload size.',
    warnings: [
      'Called frequently - keep logic extremely fast',
      'Returning null drops the breadcrumb',
      'Breadcrumbs are not sent separately - they are attached to events',
    ],
    relatedOptions: ['maxBreadcrumbs', 'beforeSend'],
  },
];
