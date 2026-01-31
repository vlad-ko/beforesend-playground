/**
 * SDK Configuration
 *
 * Defines syntax patterns and conventions for different SDKs.
 * This provides a scalable way to support multiple languages
 * without scattered if/else checks throughout the codebase.
 */

export interface SDKConfig {
  /** SDK identifier */
  name: string;
  /** Language name for display */
  language: string;
  /** Key naming convention: 'snake_case' | 'camelCase' */
  keyStyle: 'snake_case' | 'camelCase';
  /** Assignment operator for config values */
  assignmentOperator: string;
  /** Comment prefix */
  commentPrefix: string;
  /** String quote style */
  stringQuote: string;
  /** Boolean true value */
  boolTrue: string;
  /** Boolean false value */
  boolFalse: string;
  /** Array syntax: 'brackets' (JS) | 'brackets' (Python) */
  arraySyntax: 'brackets';
  /** Function/lambda syntax example */
  lambdaExample: string;
}

const sdkConfigs: Record<string, SDKConfig> = {
  javascript: {
    name: 'javascript',
    language: 'JavaScript',
    keyStyle: 'camelCase',
    assignmentOperator: ': ',
    commentPrefix: '//',
    stringQuote: '"',
    boolTrue: 'true',
    boolFalse: 'false',
    arraySyntax: 'brackets',
    lambdaExample: '(event) => { return event; }',
  },
  python: {
    name: 'python',
    language: 'Python',
    keyStyle: 'snake_case',
    assignmentOperator: '=',
    commentPrefix: '#',
    stringQuote: '"',
    boolTrue: 'True',
    boolFalse: 'False',
    arraySyntax: 'brackets',
    lambdaExample: 'lambda event, hint: event',
  },
  go: {
    name: 'go',
    language: 'Go',
    keyStyle: 'camelCase',
    assignmentOperator: ': ',
    commentPrefix: '//',
    stringQuote: '"',
    boolTrue: 'true',
    boolFalse: 'false',
    arraySyntax: 'brackets',
    lambdaExample: 'func(event *sentry.Event) *sentry.Event { return event }',
  },
  ruby: {
    name: 'ruby',
    language: 'Ruby',
    keyStyle: 'snake_case',
    assignmentOperator: ': ',
    commentPrefix: '#',
    stringQuote: '"',
    boolTrue: 'true',
    boolFalse: 'false',
    arraySyntax: 'brackets',
    lambdaExample: '->(event, hint) { event }',
  },
  java: {
    name: 'java',
    language: 'Java',
    keyStyle: 'camelCase',
    assignmentOperator: ', ',
    commentPrefix: '//',
    stringQuote: '"',
    boolTrue: 'true',
    boolFalse: 'false',
    arraySyntax: 'brackets',
    lambdaExample: '(event, hint) -> event',
  },
  php: {
    name: 'php',
    language: 'PHP',
    keyStyle: 'snake_case',
    assignmentOperator: ' => ',
    commentPrefix: '//',
    stringQuote: "'",
    boolTrue: 'true',
    boolFalse: 'false',
    arraySyntax: 'brackets',
    lambdaExample: 'function (Event $event): ?Event { return $event; }',
  },
  dotnet: {
    name: 'dotnet',
    language: '.NET',
    keyStyle: 'camelCase',
    assignmentOperator: ' = ',
    commentPrefix: '//',
    stringQuote: '"',
    boolTrue: 'true',
    boolFalse: 'false',
    arraySyntax: 'brackets',
    lambdaExample: '(sentryEvent) => sentryEvent',
  },
  cocoa: {
    name: 'cocoa',
    language: 'Swift/Cocoa',
    keyStyle: 'camelCase',
    assignmentOperator: ' = ',
    commentPrefix: '//',
    stringQuote: '"',
    boolTrue: 'true',
    boolFalse: 'false',
    arraySyntax: 'brackets',
    lambdaExample: '{ event in return event }',
  },
  rust: {
    name: 'rust',
    language: 'Rust',
    keyStyle: 'snake_case',
    assignmentOperator: ': ',
    commentPrefix: '//',
    stringQuote: '"',
    boolTrue: 'true',
    boolFalse: 'false',
    arraySyntax: 'brackets',
    lambdaExample: '|event| { Some(event) }',
  },
  elixir: {
    name: 'elixir',
    language: 'Elixir',
    keyStyle: 'snake_case',
    assignmentOperator: ': ',
    commentPrefix: '#',
    stringQuote: '"',
    boolTrue: 'true',
    boolFalse: 'false',
    arraySyntax: 'brackets',
    lambdaExample: '{MyApp.Sentry, :before_send}',
  },
};

// Default to JavaScript config for unknown SDKs
const defaultConfig = sdkConfigs.javascript;

/**
 * Get SDK configuration by name
 */
export function getSDKConfig(sdk: string): SDKConfig {
  return sdkConfigs[sdk.toLowerCase()] || defaultConfig;
}

/**
 * Convert a camelCase key to the SDK's preferred style
 */
export function formatKeyForSDK(key: string, sdk: string): string {
  const config = getSDKConfig(sdk);
  if (config.keyStyle === 'snake_case') {
    return camelToSnakeCase(key);
  }
  return key;
}

/**
 * Format a configuration example for the SDK
 */
export function formatExample(key: string, value: string, sdk: string, comment?: string): string {
  const config = getSDKConfig(sdk);
  const formattedKey = formatKeyForSDK(key, sdk);
  const formattedValue = formatValue(value, sdk);

  let example = `${formattedKey}${config.assignmentOperator}${formattedValue}`;

  if (comment) {
    example += `  ${config.commentPrefix} ${comment}`;
  }

  return example;
}

/**
 * Format a value for the SDK
 */
export function formatValue(value: string, sdk: string): string {
  const config = getSDKConfig(sdk);

  // Handle booleans
  if (value === 'true' || value === 'false') {
    return value === 'true' ? config.boolTrue : config.boolFalse;
  }

  // Handle numbers (pass through)
  if (!isNaN(Number(value))) {
    return value;
  }

  // Handle strings (add quotes if not already quoted)
  if (!value.startsWith('"') && !value.startsWith("'") && !value.startsWith('[')) {
    return `${config.stringQuote}${value}${config.stringQuote}`;
  }

  return value;
}

/**
 * Get a lambda/function example for the SDK
 */
export function getLambdaExample(sdk: string): string {
  return getSDKConfig(sdk).lambdaExample;
}

/**
 * Convert camelCase to snake_case
 */
function camelToSnakeCase(str: string): string {
  return str.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
}

/**
 * Check if SDK uses snake_case
 */
export function usesSnakeCase(sdk: string): boolean {
  return getSDKConfig(sdk).keyStyle === 'snake_case';
}
