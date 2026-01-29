/**
 * Playground mode types and configurations
 */

export type PlaygroundMode =
  | 'beforeSend'
  | 'beforeSendTransaction'
  | 'webhooks';

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
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Test Sentry webhook integrations',
    helpText: 'Webhooks allow you to receive HTTP callbacks when events occur in your Sentry projects. Test your webhook endpoints and validate payload handling with real Sentry event data.',
    docsUrl: 'https://docs.sentry.io/product/integrations/integration-platform/webhooks/',
  },
];
