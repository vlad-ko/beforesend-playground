/**
 * Sentry Query Validator
 *
 * Validates parsed queries against known Sentry search properties.
 * Provides suggestions for typos and invalid values.
 */

import { ParsedQuery, QueryComponent } from './query-parser';

export interface ValidatedComponent {
  component: QueryComponent;
  valid: boolean;
  error?: string;
  suggestion?: string;
}

export interface Suggestion {
  original: string;
  suggested: string;
  reason: string;
}

export interface ValidationResult {
  valid: boolean;
  components: ValidatedComponent[];
  suggestions: Suggestion[];
}

interface PropertyDefinition {
  type: 'string' | 'enum' | 'boolean' | 'number' | 'date' | 'user' | 'any';
  values?: string[];
  aliases?: string[];
  description?: string;
  supportsComparison?: boolean;
  supportsWildcard?: boolean;
}

/**
 * Known Sentry search properties with their valid values
 * Based on https://docs.sentry.io/concepts/search/searchable-properties/
 */
export const VALID_PROPERTIES: Record<string, PropertyDefinition> = {
  // Status and assignment
  is: {
    type: 'enum',
    values: [
      'unresolved',
      'resolved',
      'ignored',
      'assigned',
      'unassigned',
      'for_review',
      'linked',
      'unlinked',
      'archived',
    ],
    description: 'Issue status',
  },
  assigned: {
    type: 'user',
    aliases: ['assignee'],
    description: 'Assigned user or team',
  },
  assigned_or_suggested: {
    type: 'user',
    description: 'Assigned or suggested user/team',
  },
  bookmarks: {
    type: 'user',
    description: 'Bookmarked by user',
  },

  // Level and severity
  level: {
    type: 'enum',
    values: ['fatal', 'error', 'warning', 'info', 'debug'],
    aliases: ['lvl', 'severity'],
    description: 'Event level',
  },

  // Time-based
  age: {
    type: 'date',
    supportsComparison: true,
    description: 'Issue age (relative time)',
  },
  firstSeen: {
    type: 'date',
    supportsComparison: true,
    description: 'When issue was first seen',
  },
  lastSeen: {
    type: 'date',
    supportsComparison: true,
    description: 'When issue was last seen',
  },
  'event.timestamp': {
    type: 'date',
    supportsComparison: true,
    description: 'Event timestamp',
  },
  timestamp: {
    type: 'date',
    supportsComparison: true,
    description: 'Event timestamp',
  },
  timesSeen: {
    type: 'number',
    supportsComparison: true,
    description: 'Number of times seen',
  },

  // Release and version
  release: {
    type: 'string',
    supportsWildcard: true,
    description: 'Release version',
  },
  firstRelease: {
    type: 'string',
    supportsWildcard: true,
    description: 'First release version',
  },
  'release.build': {
    type: 'string',
    description: 'Release build number',
  },
  'release.stage': {
    type: 'enum',
    values: ['adopted', 'low', 'replaced'],
    description: 'Release stage',
  },
  dist: {
    type: 'string',
    description: 'Distribution identifier',
  },

  // Error properties
  'error.type': {
    type: 'string',
    supportsWildcard: true,
    description: 'Exception type',
  },
  'error.value': {
    type: 'string',
    supportsWildcard: true,
    description: 'Error value',
  },
  'error.handled': {
    type: 'boolean',
    description: 'Whether error was handled',
  },
  'error.unhandled': {
    type: 'boolean',
    description: 'Whether error was unhandled',
  },
  'error.main_thread': {
    type: 'boolean',
    description: 'Error on main thread',
  },
  'error.mechanism': {
    type: 'string',
    description: 'Error mechanism',
  },

  // User properties
  'user.id': {
    type: 'string',
    supportsWildcard: true,
    description: 'User ID',
  },
  'user.email': {
    type: 'string',
    supportsWildcard: true,
    description: 'User email',
  },
  'user.username': {
    type: 'string',
    supportsWildcard: true,
    description: 'Username',
  },
  'user.ip': {
    type: 'string',
    supportsWildcard: true,
    description: 'User IP address',
  },

  // HTTP properties
  'http.method': {
    type: 'enum',
    values: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'],
    description: 'HTTP method',
  },
  'http.status_code': {
    type: 'number',
    supportsComparison: true,
    description: 'HTTP status code',
  },
  'http.url': {
    type: 'string',
    supportsWildcard: true,
    description: 'HTTP URL',
  },
  'http.referer': {
    type: 'string',
    supportsWildcard: true,
    description: 'HTTP referer',
  },

  // Device properties
  'device.family': {
    type: 'string',
    supportsWildcard: true,
    description: 'Device family',
  },
  'device.brand': {
    type: 'string',
    supportsWildcard: true,
    description: 'Device brand',
  },
  'device.arch': {
    type: 'string',
    description: 'Device architecture',
  },
  'device.orientation': {
    type: 'enum',
    values: ['portrait', 'landscape'],
    description: 'Device orientation',
  },
  'device.screen_height_pixels': {
    type: 'number',
    supportsComparison: true,
    description: 'Screen height in pixels',
  },
  'device.screen_width_pixels': {
    type: 'number',
    supportsComparison: true,
    description: 'Screen width in pixels',
  },
  'device.screen_density': {
    type: 'number',
    supportsComparison: true,
    description: 'Screen density',
  },
  'device.screen_dpi': {
    type: 'number',
    supportsComparison: true,
    description: 'Screen DPI',
  },
  'app.in_foreground': {
    type: 'boolean',
    description: 'App in foreground',
  },

  // Geo properties
  'geo.country_code': {
    type: 'string',
    description: 'Country code (ISO 3166-1)',
  },
  'geo.region': {
    type: 'string',
    supportsWildcard: true,
    description: 'Geographic region',
  },
  'geo.city': {
    type: 'string',
    supportsWildcard: true,
    description: 'City name',
  },

  // Stack properties
  'stack.filename': {
    type: 'string',
    supportsWildcard: true,
    description: 'Stack trace filename',
  },
  'stack.abs_path': {
    type: 'string',
    supportsWildcard: true,
    description: 'Stack trace absolute path',
  },
  'stack.function': {
    type: 'string',
    supportsWildcard: true,
    description: 'Stack trace function name',
  },
  'stack.module': {
    type: 'string',
    supportsWildcard: true,
    description: 'Stack trace module',
  },
  'stack.package': {
    type: 'string',
    supportsWildcard: true,
    description: 'Stack trace package',
  },

  // Platform and SDK
  'platform.name': {
    type: 'string',
    description: 'Platform name',
  },
  platform: {
    type: 'string',
    description: 'Platform',
  },
  'sdk.name': {
    type: 'string',
    description: 'SDK name',
  },
  'sdk.version': {
    type: 'string',
    supportsWildcard: true,
    description: 'SDK version',
  },

  // Project properties
  project: {
    type: 'string',
    description: 'Project name',
  },
  'project.id': {
    type: 'number',
    description: 'Project ID',
  },

  // Issue properties
  issue: {
    type: 'string',
    description: 'Issue short ID',
  },
  'issue.category': {
    type: 'enum',
    values: ['error', 'performance', 'replay', 'cron'],
    description: 'Issue category',
  },
  'issue.type': {
    type: 'string',
    description: 'Issue type',
  },

  // Content properties
  message: {
    type: 'string',
    supportsWildcard: true,
    description: 'Event message',
  },
  title: {
    type: 'string',
    supportsWildcard: true,
    description: 'Event title',
  },
  transaction: {
    type: 'string',
    supportsWildcard: true,
    description: 'Transaction name',
  },
  trace: {
    type: 'string',
    description: 'Trace ID',
  },
  location: {
    type: 'string',
    supportsWildcard: true,
    description: 'Error location',
  },

  // Event type
  'event.type': {
    type: 'enum',
    values: ['error', 'csp', 'default', 'transaction'],
    description: 'Event type',
  },

  // OS properties
  'os.build': {
    type: 'string',
    description: 'OS build',
  },
  'os.kernel_version': {
    type: 'string',
    description: 'OS kernel version',
  },
  'os.distribution_name': {
    type: 'string',
    description: 'OS distribution name',
  },
  'os.distribution_version': {
    type: 'string',
    description: 'OS distribution version',
  },
  os: {
    type: 'string',
    supportsWildcard: true,
    description: 'Operating system',
  },

  // Browser properties
  browser: {
    type: 'string',
    supportsWildcard: true,
    description: 'Browser',
  },
  'browser.name': {
    type: 'string',
    supportsWildcard: true,
    description: 'Browser name',
  },
  'browser.version': {
    type: 'string',
    supportsWildcard: true,
    description: 'Browser version',
  },

  // Special operators
  has: {
    type: 'any',
    description: 'Check if field exists',
  },

  // Environment
  environment: {
    type: 'string',
    aliases: ['env'],
    description: 'Environment name',
  },

  // Unreal
  'unreal.crash_type': {
    type: 'string',
    description: 'Unreal crash type',
  },
};

// Build alias map for suggestions
const ALIAS_MAP: Record<string, string> = {};
for (const [property, def] of Object.entries(VALID_PROPERTIES)) {
  if (def.aliases) {
    for (const alias of def.aliases) {
      ALIAS_MAP[alias] = property;
    }
  }
}
// Add common typos
ALIAS_MAP['assignee'] = 'assigned';
ALIAS_MAP['lvl'] = 'level';
ALIAS_MAP['severity'] = 'level';
ALIAS_MAP['status'] = 'is';
ALIAS_MAP['env'] = 'environment';
ALIAS_MAP['user_id'] = 'user.id';
ALIAS_MAP['user_email'] = 'user.email';
ALIAS_MAP['error_type'] = 'error.type';

/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Find the closest matching property for a given unknown property
 */
function findClosestProperty(unknown: string): string | undefined {
  // First check alias map
  if (ALIAS_MAP[unknown]) {
    return ALIAS_MAP[unknown];
  }

  // Then try fuzzy matching
  let minDistance = Infinity;
  let closest: string | undefined;

  for (const property of Object.keys(VALID_PROPERTIES)) {
    const distance = levenshteinDistance(unknown.toLowerCase(), property.toLowerCase());
    if (distance < minDistance && distance <= 3) {
      minDistance = distance;
      closest = property;
    }
  }

  return closest;
}

/**
 * Check if a property is valid (including tags[] and flags[] syntax)
 */
function isValidProperty(property: string): boolean {
  // Direct match
  if (VALID_PROPERTIES[property]) {
    return true;
  }

  // Tags syntax: tags[key]
  if (property.startsWith('tags[')) {
    return true;
  }

  // Flags syntax: flags["key"]
  if (property.startsWith('flags[')) {
    return true;
  }

  // Check for parent property (e.g., user.custom -> user)
  const parts = property.split('.');
  if (parts.length > 1) {
    const parent = parts[0];
    // Allow custom sub-properties for known parents
    if (
      ['user', 'device', 'http', 'geo', 'stack', 'error', 'os', 'browser', 'sdk', 'platform', 'release', 'event', 'issue', 'app'].includes(
        parent
      )
    ) {
      return true;
    }
  }

  return false;
}

/**
 * Validate a value against a property definition
 */
function validateValue(
  property: string,
  value: string,
  definition: PropertyDefinition
): { valid: boolean; error?: string } {
  // Skip validation for wildcards
  if (value.includes('*')) {
    return { valid: true };
  }

  // Skip validation for multiple values
  if (value.startsWith('[') && value.endsWith(']')) {
    return { valid: true };
  }

  switch (definition.type) {
    case 'enum':
      if (definition.values && !definition.values.includes(value)) {
        return {
          valid: false,
          error: `Invalid value "${value}" for ${property}. Valid values: ${definition.values.join(', ')}`,
        };
      }
      break;

    case 'boolean':
      if (!['true', 'false', '1', '0'].includes(value.toLowerCase())) {
        return {
          valid: false,
          error: `Invalid boolean value "${value}" for ${property}. Use true/false or 1/0`,
        };
      }
      break;

    case 'user':
      // User type accepts: me, none, my_teams, #team-name, or any user identifier
      // All are valid
      break;

    case 'number':
      // Allow numeric values (may have comparison in operator)
      if (!/^-?\d+(\.\d+)?$/.test(value)) {
        // Not strictly a number, but might be valid in context
      }
      break;

    case 'date':
      // Date type accepts relative time (24h, 7d) or ISO dates
      // All are valid as long as they're not empty
      break;

    case 'any':
    case 'string':
    default:
      // Accept any value
      break;
  }

  return { valid: true };
}

/**
 * Validate a single component
 */
function validateComponent(component: QueryComponent): ValidatedComponent {
  const { property, value } = component;

  // Check if property is valid
  if (!isValidProperty(property)) {
    const suggestion = findClosestProperty(property);
    return {
      component,
      valid: false,
      error: `Unknown property "${property}"`,
      suggestion,
    };
  }

  // Get property definition
  const definition = VALID_PROPERTIES[property];

  // If we have a definition, validate the value
  if (definition) {
    const valueValidation = validateValue(property, value, definition);
    if (!valueValidation.valid) {
      return {
        component,
        valid: false,
        error: valueValidation.error,
      };
    }
  }

  return {
    component,
    valid: true,
  };
}

/**
 * Validate a parsed Sentry query
 */
export function validateQuery(parsed: ParsedQuery): ValidationResult {
  const components: ValidatedComponent[] = [];
  const suggestions: Suggestion[] = [];

  for (const component of parsed.components) {
    const validated = validateComponent(component);
    components.push(validated);

    if (validated.suggestion) {
      suggestions.push({
        original: component.property,
        suggested: validated.suggestion,
        reason: `Did you mean "${validated.suggestion}"?`,
      });
    }
  }

  const valid = components.every((c) => c.valid);

  return {
    valid,
    components,
    suggestions,
  };
}
