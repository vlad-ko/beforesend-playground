/**
 * JavaScript configuration parser
 *
 * Parses Sentry.init() configurations using basic pattern matching
 * and JSON-like object parsing.
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class JavaScriptConfigParser implements IConfigParser {
  parse(configCode: string): ParsedConfig {
    const result: ParsedConfig = {
      sdk: 'javascript',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      // Extract the object literal from Sentry.init({ ... })
      const configObject = this.extractConfigObject(configCode);

      if (!configObject) {
        result.valid = false;
        result.parseErrors.push({
          message: 'Could not find Sentry.init() configuration object',
        });
        return result;
      }

      // Parse the configuration object
      const options = this.parseObjectLiteral(configObject);
      result.options = options;

    } catch (error: any) {
      result.valid = false;
      result.parseErrors.push({
        message: error.message || 'Failed to parse configuration',
      });
    }

    return result;
  }

  validate(configCode: string): { valid: boolean; errors: ParseError[] } {
    const parsed = this.parse(configCode);
    return {
      valid: parsed.valid,
      errors: parsed.parseErrors,
    };
  }

  /**
   * Extract the config object from Sentry.init({ ... })
   */
  private extractConfigObject(code: string): string | null {
    // Look for Sentry.init({ ... })
    const initPattern = /Sentry\.init\s*\(\s*(\{[\s\S]*?\})\s*\)/;
    const match = code.match(initPattern);

    if (match && match[1]) {
      return match[1];
    }

    // Also try to handle just an object literal if that's what's provided
    const objectPattern = /^\s*\{[\s\S]*\}\s*$/;
    if (objectPattern.test(code)) {
      return code.trim();
    }

    return null;
  }

  /**
   * Remove JavaScript comments from code
   * Handles both single-line and multi-line comments
   */
  private removeComments(code: string): string {
    let result = '';
    let i = 0;
    let inString = false;
    let stringChar = '';

    while (i < code.length) {
      const char = code[i];
      const nextChar = i + 1 < code.length ? code[i + 1] : '';
      const prevChar = i > 0 ? code[i - 1] : '';

      // Handle strings - don't remove comments inside strings
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
        result += char;
        i++;
        continue;
      }

      if (inString) {
        result += char;
        i++;
        continue;
      }

      // Handle single-line comments (//)
      if (char === '/' && nextChar === '/') {
        // Skip until end of line
        i += 2;
        while (i < code.length && code[i] !== '\n') {
          i++;
        }
        // Keep the newline for proper formatting
        if (i < code.length && code[i] === '\n') {
          result += '\n';
          i++;
        }
        continue;
      }

      // Handle multi-line comments (/* */)
      if (char === '/' && nextChar === '*') {
        // Skip until */
        i += 2;
        while (i < code.length - 1) {
          if (code[i] === '*' && code[i + 1] === '/') {
            i += 2;
            break;
          }
          i++;
        }
        // Add a space to maintain separation
        result += ' ';
        continue;
      }

      result += char;
      i++;
    }

    return result;
  }

  /**
   * Parse object literal into key-value pairs
   * This is a simplified parser that handles common cases
   */
  private parseObjectLiteral(objectStr: string): Map<string, ParsedOption> {
    const options = new Map<string, ParsedOption>();

    // Remove outer braces
    objectStr = objectStr.trim();
    if (objectStr.startsWith('{')) {
      objectStr = objectStr.slice(1);
    }
    if (objectStr.endsWith('}')) {
      objectStr = objectStr.slice(0, -1);
    }

    // Remove comments before parsing
    objectStr = this.removeComments(objectStr);

    // Split by commas (but not inside nested objects/arrays/strings)
    const properties = this.splitProperties(objectStr);

    for (const prop of properties) {
      const parsed = this.parseProperty(prop);
      if (parsed) {
        options.set(parsed.key, parsed);
      }
    }

    return options;
  }

  /**
   * Split properties by commas, respecting nested structures
   */
  private splitProperties(str: string): string[] {
    const properties: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';
    let inRegex = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const prevChar = i > 0 ? str[i - 1] : '';

      // Handle strings
      if ((char === '"' || char === "'" || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      // Handle regex
      if (char === '/' && !inString && prevChar !== '\\') {
        // Simple regex detection
        if (!inRegex && (prevChar === '(' || prevChar === '[' || prevChar === ',' || prevChar === ':' || prevChar === '=')) {
          inRegex = true;
        } else if (inRegex) {
          inRegex = false;
        }
      }

      if (!inString && !inRegex) {
        if (char === '{' || char === '[' || char === '(') {
          depth++;
        } else if (char === '}' || char === ']' || char === ')') {
          depth--;
        }
      }

      if (char === ',' && depth === 0 && !inString && !inRegex) {
        properties.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      properties.push(current.trim());
    }

    return properties;
  }

  /**
   * Parse a single property (key: value)
   */
  private parseProperty(propStr: string): ParsedOption | null {
    const colonIndex = propStr.indexOf(':');
    if (colonIndex === -1) {
      return null;
    }

    let key = propStr.slice(0, colonIndex).trim();
    const valueStr = propStr.slice(colonIndex + 1).trim();

    // Remove any remaining newlines or extra whitespace from key
    key = key.replace(/[\r\n]+/g, ' ').trim();

    // Remove quotes from key if present
    const cleanKey = key.replace(/^['"]|['"]$/g, '');

    const type = this.inferType(valueStr);
    const value = this.parseValue(valueStr, type);

    return {
      key: cleanKey,
      value,
      rawValue: valueStr,
      type,
    };
  }

  /**
   * Infer the type of a value from its string representation
   */
  private inferType(valueStr: string): ParsedOption['type'] {
    valueStr = valueStr.trim();

    if (valueStr === 'null' || valueStr === 'undefined') {
      return 'unknown';
    }

    if (valueStr === 'true' || valueStr === 'false') {
      return 'boolean';
    }

    if (/^-?\d+\.?\d*$/.test(valueStr)) {
      return 'number';
    }

    if (/^['"`]/.test(valueStr)) {
      return 'string';
    }

    if (valueStr.startsWith('[')) {
      return 'array';
    }

    if (valueStr.startsWith('{')) {
      return 'object';
    }

    if (valueStr.startsWith('function') || valueStr.includes('=>')) {
      return 'function';
    }

    if (valueStr.startsWith('/') && valueStr.match(/^\/.*\/[gimuy]*$/)) {
      return 'regexp';
    }

    return 'unknown';
  }

  /**
   * Parse value based on type
   */
  private parseValue(valueStr: string, type: ParsedOption['type']): any {
    valueStr = valueStr.trim();

    switch (type) {
      case 'boolean':
        return valueStr === 'true';

      case 'number':
        return parseFloat(valueStr);

      case 'string':
        // Remove quotes
        return valueStr.replace(/^['"`]|['"`]$/g, '');

      case 'array':
        // For arrays, try to parse as JSON or return raw
        try {
          // Simple array parsing
          return this.parseArray(valueStr);
        } catch {
          return valueStr;
        }

      case 'object':
        // Return raw object string
        return valueStr;

      case 'function':
        return valueStr;

      case 'regexp':
        return valueStr;

      default:
        return valueStr;
    }
  }

  /**
   * Parse array literal
   */
  private parseArray(arrayStr: string): any[] {
    arrayStr = arrayStr.trim();
    if (arrayStr.startsWith('[')) {
      arrayStr = arrayStr.slice(1);
    }
    if (arrayStr.endsWith(']')) {
      arrayStr = arrayStr.slice(0, -1);
    }

    if (!arrayStr.trim()) {
      return [];
    }

    const items = this.splitProperties(arrayStr);
    return items.map(item => {
      const type = this.inferType(item);
      return this.parseValue(item, type);
    });
  }
}
