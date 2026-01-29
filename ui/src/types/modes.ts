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
}

export const MODES: ModeConfig[] = [
  {
    id: 'beforeSend',
    name: 'beforeSend',
    description: 'Transform error events before they are sent to Sentry',
  },
  {
    id: 'beforeSendTransaction',
    name: 'beforeSendTransaction',
    description: 'Transform transaction events before they are sent to Sentry',
  },
  {
    id: 'webhooks',
    name: 'Webhooks',
    description: 'Test Sentry webhook integrations',
  },
];
