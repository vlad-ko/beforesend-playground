/**
 * Sentry Query Parser
 *
 * Parses Sentry search query syntax into structured components.
 * Supports:
 * - property:value pairs
 * - Negation (!property:value or !:)
 * - Comparison operators (>, <, >=, <=)
 * - Quoted values
 * - Wildcards (*)
 * - Multiple values [val1, val2]
 * - Tag syntax (tags[key]:value)
 * - Free text search
 * - Boolean operators (AND implicit, OR explicit)
 */

export interface QueryComponent {
  property: string;
  operator: string; // ':', '!:', ':>', ':<', ':>=', ':<='
  value: string;
  raw: string;
}

export interface ParsedQuery {
  components: QueryComponent[];
  freeText: string[];
  raw: string;
  hasOr?: boolean;
  hasParentheses?: boolean;
}

/**
 * Tokenize the query string, handling quoted values properly
 */
function tokenize(query: string): string[] {
  const tokens: string[] = [];
  let current = '';
  let inQuotes = false;
  let quoteChar = '';
  let inBrackets = 0;

  for (let i = 0; i < query.length; i++) {
    const char = query[i];

    // Handle quotes
    if ((char === '"' || char === "'") && !inQuotes) {
      inQuotes = true;
      quoteChar = char;
      current += char;
      continue;
    }

    if (char === quoteChar && inQuotes) {
      inQuotes = false;
      quoteChar = '';
      current += char;
      continue;
    }

    // Handle brackets for multiple values [val1, val2]
    if (char === '[' && !inQuotes) {
      inBrackets++;
      current += char;
      continue;
    }

    if (char === ']' && !inQuotes) {
      inBrackets--;
      current += char;
      continue;
    }

    // Handle whitespace (token separator)
    if (char === ' ' && !inQuotes && inBrackets === 0) {
      if (current.trim()) {
        tokens.push(current.trim());
      }
      current = '';
      continue;
    }

    current += char;
  }

  // Add last token
  if (current.trim()) {
    tokens.push(current.trim());
  }

  return tokens;
}

/**
 * Parse a single token into a QueryComponent or free text
 */
function parseToken(token: string): QueryComponent | null {
  // Check for negation at the start
  const isNegated = token.startsWith('!');
  const tokenWithoutNegation = isNegated ? token.slice(1) : token;

  // Regular expression to match property:value patterns
  // First, try to match property:value where value may start with a comparison operator
  // Supports properties with dots (user.email), underscores (http.status_code),
  // brackets (tags[key], flags["key"])
  const propertyPattern = /^([\w.]+(?:\[["']?[\w]+["']?\])?):(.+)$/;
  const match = tokenWithoutNegation.match(propertyPattern);

  if (!match) {
    return null; // This is free text
  }

  const [, property, rawValueWithOperator] = match;

  // Check if value starts with a comparison operator
  let operator = ':';
  let value = rawValueWithOperator;

  // Match comparison operators at the start of value: >=, <=, >, <
  const comparisonMatch = rawValueWithOperator.match(/^(>=|<=|>|<)(.+)$/);
  if (comparisonMatch) {
    operator = ':' + comparisonMatch[1]; // e.g., ':>', ':>=', ':<', ':<='
    value = comparisonMatch[2];
  }

  // Add negation if needed
  if (isNegated && operator === ':') {
    operator = '!:';
  }

  // Process the value (handle quotes)
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }

  return {
    property,
    operator,
    value,
    raw: token,
  };
}

/**
 * Parse a Sentry search query into structured components
 */
export function parseQuery(query: string): ParsedQuery {
  const trimmedQuery = query.trim();

  if (!trimmedQuery) {
    return {
      components: [],
      freeText: [],
      raw: '',
    };
  }

  const hasOr = /\bOR\b/.test(trimmedQuery);
  const hasParentheses = /[()]/.test(trimmedQuery);

  // Remove parentheses for parsing (but keep track of them)
  let cleanQuery = trimmedQuery;
  if (hasParentheses) {
    // Simple removal of parentheses for basic parsing
    // A full implementation would need proper grouping support
    cleanQuery = cleanQuery.replace(/[()]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Tokenize the query
  const tokens = tokenize(cleanQuery);

  const components: QueryComponent[] = [];
  const freeText: string[] = [];

  for (const token of tokens) {
    // Skip OR keyword (it's a boolean operator, not a component)
    if (token === 'OR') {
      continue;
    }

    const component = parseToken(token);
    if (component) {
      components.push(component);
    } else {
      freeText.push(token);
    }
  }

  return {
    components,
    freeText,
    raw: trimmedQuery,
    ...(hasOr && { hasOr }),
    ...(hasParentheses && { hasParentheses }),
  };
}
