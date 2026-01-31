/**
 * Python configuration parser
 *
 * Parses sentry_sdk.init() configurations using pattern matching
 * and Python-like syntax parsing.
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class PythonConfigParser implements IConfigParser {
  parse(configCode: string): ParsedConfig {
    const result: ParsedConfig = {
      sdk: 'python',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      // Extract the arguments from sentry_sdk.init(...)
      const configArgs = this.extractConfigArgs(configCode);

      if (configArgs === null) {
        result.valid = false;
        result.parseErrors.push({
          message: 'Could not find sentry_sdk.init() configuration',
        });
        return result;
      }

      // Remove comments before parsing
      const cleanedArgs = this.removeComments(configArgs);

      // Parse the configuration arguments
      const options = this.parseKwargs(cleanedArgs);
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
   * Extract the config arguments from sentry_sdk.init(...)
   */
  private extractConfigArgs(code: string): string | null {
    // Look for sentry_sdk.init(...)
    const initPattern = /sentry_sdk\.init\s*\(([\s\S]*?)\)(?:\s*$|[;\n])/;
    const match = code.match(initPattern);

    if (match) {
      return match[1] ?? '';
    }

    // If no function call found, check if it's just kwargs
    if (code.trim().match(/^\w+\s*=/)) {
      return code;
    }

    return null;
  }

  /**
   * Check if character at index is escaped by counting preceding backslashes.
   */
  private isEscaped(str: string, index: number): boolean {
    let backslashes = 0;
    let i = index - 1;
    while (i >= 0 && str[i] === '\\') {
      backslashes++;
      i--;
    }
    return backslashes % 2 === 1;
  }

  /**
   * Remove Python comments from code
   */
  private removeComments(code: string): string {
    let result = '';
    let i = 0;
    let inString = false;
    let stringChar = '';

    while (i < code.length) {
      const char = code[i];

      // Handle strings - don't remove comments inside strings
      if ((char === '"' || char === "'") && !this.isEscaped(code, i)) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          // Check if it's a triple quote
          if (i + 2 < code.length && code[i + 1] === char && code[i + 2] === char) {
            // Skip triple quote handling for now
            result += char;
            i++;
            continue;
          }
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

      // Handle single-line comments (#)
      if (char === '#') {
        // Skip until end of line
        while (i < code.length && code[i] !== '\n') {
          i++;
        }
        // Keep the newline
        if (i < code.length && code[i] === '\n') {
          result += '\n';
          i++;
        }
        continue;
      }

      result += char;
      i++;
    }

    return result;
  }

  /**
   * Parse Python kwargs into key-value pairs
   */
  private parseKwargs(argsStr: string): Map<string, ParsedOption> {
    const options = new Map<string, ParsedOption>();

    // Split by commas (but not inside nested structures)
    const args = this.splitArgs(argsStr);

    for (const arg of args) {
      const parsed = this.parseKwarg(arg);
      if (parsed) {
        options.set(parsed.key, parsed);
      }
    }

    return options;
  }

  /**
   * Split arguments by commas, respecting nested structures
   */
  private splitArgs(str: string): string[] {
    const args: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      // Handle strings with proper escape handling
      if ((char === '"' || char === "'") && !this.isEscaped(str, i)) {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '(' || char === '[' || char === '{') {
          depth++;
        } else if (char === ')' || char === ']' || char === '}') {
          depth--;
        }
      }

      if (char === ',' && depth === 0 && !inString) {
        if (current.trim()) {
          args.push(current.trim());
        }
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      args.push(current.trim());
    }

    return args;
  }

  /**
   * Parse a single kwarg (key=value)
   */
  private parseKwarg(argStr: string): ParsedOption | null {
    const equalsIndex = argStr.indexOf('=');
    if (equalsIndex === -1) {
      return null;
    }

    let key = argStr.slice(0, equalsIndex).trim();
    const valueStr = argStr.slice(equalsIndex + 1).trim();

    // Remove any remaining newlines from key
    key = key.replace(/[\r\n]+/g, ' ').trim();

    const type = this.inferType(valueStr);
    const value = this.parseValue(valueStr, type);

    return {
      key,
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

    if (valueStr === 'None' || valueStr === 'null') {
      return 'unknown';
    }

    if (valueStr === 'True' || valueStr === 'False') {
      return 'boolean';
    }

    if (/^-?\d+\.?\d*$/.test(valueStr)) {
      return 'number';
    }

    if (/^['"]/.test(valueStr)) {
      return 'string';
    }

    if (valueStr.startsWith('[')) {
      return 'array';
    }

    if (valueStr.startsWith('{')) {
      return 'object';
    }

    if (valueStr.startsWith('lambda') || valueStr.includes('def ')) {
      return 'function';
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
        return valueStr === 'True';

      case 'number':
        return parseFloat(valueStr);

      case 'string':
        // Remove quotes
        return valueStr.replace(/^['"]|['"]$/g, '');

      case 'array':
        try {
          return this.parseArray(valueStr);
        } catch {
          return valueStr;
        }

      case 'object':
        return valueStr;

      case 'function':
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

    const items = this.splitArgs(arrayStr);
    return items.map(item => {
      const type = this.inferType(item);
      return this.parseValue(item, type);
    });
  }
}
