/**
 * Configuration dictionary types for Sentry SDK options
 */

export type ConfigOptionType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'function'
  | 'regexp';

export type ConfigCategory =
  | 'core'
  | 'sampling'
  | 'performance'
  | 'integrations'
  | 'transport'
  | 'hooks'
  | 'filtering'
  | 'context'
  | 'debug';

export interface ConfigOption {
  key: string;
  displayName: string;
  description: string;
  type: ConfigOptionType;
  category: ConfigCategory;
  required: boolean;
  defaultValue?: any;
  examples?: string[];
  docsUrl?: string;
  seGuidance?: string;
  warnings?: string[];
  relatedOptions?: string[];
  supportedSDKs?: string[]; // Undefined means all SDKs
}

export interface ConfigDictionaryData {
  options: ConfigOption[];
  categories: Record<ConfigCategory, { name: string; description: string }>;
}
