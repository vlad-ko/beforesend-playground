/**
 * Configuration Dictionary
 *
 * Central registry of all Sentry SDK configuration options with descriptions,
 * SE guidance, and validation information.
 */

import { ConfigOption, ConfigDictionaryData, ConfigCategory } from './types';
import { coreOptions } from './core-options';
import { samplingOptions } from './sampling-options';
import { hooksOptions } from './hooks-options';
import { filteringOptions } from './filtering-options';
import { integrationsOptions } from './integrations-options';
import { transportOptions } from './transport-options';

const categoryDescriptions: Record<ConfigCategory, { name: string; description: string }> = {
  core: {
    name: 'Core',
    description: 'Essential configuration options like DSN, environment, and release',
  },
  sampling: {
    name: 'Sampling',
    description: 'Control what percentage of events and transactions to capture',
  },
  performance: {
    name: 'Performance',
    description: 'Performance monitoring and tracing configuration',
  },
  integrations: {
    name: 'Integrations',
    description: 'SDK integrations and extensions',
  },
  transport: {
    name: 'Transport',
    description: 'Network and event delivery configuration',
  },
  hooks: {
    name: 'Hooks',
    description: 'Callbacks for modifying or filtering events',
  },
  filtering: {
    name: 'Filtering',
    description: 'Options for filtering errors and transactions',
  },
  context: {
    name: 'Context',
    description: 'User, tags, and contextual data configuration',
  },
  debug: {
    name: 'Debug',
    description: 'Debugging and diagnostic options',
  },
};

export class ConfigDictionary {
  private options: Map<string, ConfigOption>;
  private data: ConfigDictionaryData;

  constructor() {
    const allOptions = [
      ...coreOptions,
      ...samplingOptions,
      ...hooksOptions,
      ...filteringOptions,
      ...integrationsOptions,
      ...transportOptions,
    ];

    this.options = new Map();
    allOptions.forEach(option => {
      this.options.set(option.key, option);
    });

    this.data = {
      options: allOptions,
      categories: categoryDescriptions,
    };
  }

  /**
   * Get a specific configuration option by key
   */
  getOption(key: string): ConfigOption | undefined {
    return this.options.get(key);
  }

  /**
   * Get all configuration options
   */
  getAllOptions(): ConfigOption[] {
    return this.data.options;
  }

  /**
   * Get options by category
   */
  getOptionsByCategory(category: ConfigCategory): ConfigOption[] {
    return this.data.options.filter(opt => opt.category === category);
  }

  /**
   * Get all categories with descriptions
   */
  getCategories(): Record<ConfigCategory, { name: string; description: string }> {
    return this.data.categories;
  }

  /**
   * Check if an option exists
   */
  hasOption(key: string): boolean {
    return this.options.has(key);
  }

  /**
   * Get all required options
   */
  getRequiredOptions(): ConfigOption[] {
    return this.data.options.filter(opt => opt.required);
  }

  /**
   * Search options by keyword (searches key, display name, description)
   */
  searchOptions(keyword: string): ConfigOption[] {
    const lowerKeyword = keyword.toLowerCase();
    return this.data.options.filter(opt =>
      opt.key.toLowerCase().includes(lowerKeyword) ||
      opt.displayName.toLowerCase().includes(lowerKeyword) ||
      opt.description.toLowerCase().includes(lowerKeyword)
    );
  }

  /**
   * Get full dictionary data
   */
  getData(): ConfigDictionaryData {
    return this.data;
  }
}

// Export singleton instance
export const configDictionary = new ConfigDictionary();

// Re-export types
export * from './types';
