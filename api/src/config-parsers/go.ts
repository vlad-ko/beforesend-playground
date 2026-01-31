/**
 * Go configuration parser
 *
 * Parses sentry.Init(sentry.ClientOptions{ ... }) configurations
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class GoConfigParser implements IConfigParser {
  parse(configCode: string): ParsedConfig {
    const result: ParsedConfig = {
      sdk: 'go',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      const configObject = this.extractConfigObject(configCode);

      if (!configObject) {
        result.valid = false;
        result.parseErrors.push({
          message: 'Could not find sentry.ClientOptions configuration struct',
        });
        return result;
      }

      const options = this.parseStructLiteral(configObject);
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
    return { valid: parsed.valid, errors: parsed.parseErrors };
  }

  private extractConfigObject(code: string): string | null {
    const initPattern = /sentry\.Init\s*\(\s*sentry\.ClientOptions\s*(\{[\s\S]*?\})\s*\)/;
    const match = code.match(initPattern);
    if (match && match[1]) return match[1];

    const structPattern = /sentry\.ClientOptions\s*(\{[\s\S]*?\})/;
    const structMatch = code.match(structPattern);
    if (structMatch && structMatch[1]) return structMatch[1];

    if (/^\s*\{[\s\S]*\}\s*$/.test(code)) return code.trim();
    return null;
  }

  private removeComments(code: string): string {
    let result = '';
    let i = 0;
    let inString = false;
    let stringChar = '';

    while (i < code.length) {
      const char = code[i];
      const nextChar = i + 1 < code.length ? code[i + 1] : '';
      const prevChar = i > 0 ? code[i - 1] : '';

      if ((char === '"' || char === '`') && prevChar !== '\\') {
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

      if (char === '/' && nextChar === '/') {
        i += 2;
        while (i < code.length && code[i] !== '\n') i++;
        if (i < code.length && code[i] === '\n') {
          result += '\n';
          i++;
        }
        continue;
      }

      if (char === '/' && nextChar === '*') {
        i += 2;
        while (i < code.length - 1) {
          if (code[i] === '*' && code[i + 1] === '/') {
            i += 2;
            break;
          }
          i++;
        }
        result += ' ';
        continue;
      }

      result += char;
      i++;
    }
    return result;
  }

  private parseStructLiteral(structStr: string): Map<string, ParsedOption> {
    const options = new Map<string, ParsedOption>();
    structStr = structStr.trim();
    if (structStr.startsWith('{')) structStr = structStr.slice(1);
    if (structStr.endsWith('}')) structStr = structStr.slice(0, -1);
    structStr = this.removeComments(structStr);
    const properties = this.splitProperties(structStr);
    for (const prop of properties) {
      const parsed = this.parseProperty(prop);
      if (parsed) options.set(parsed.key, parsed);
    }
    return options;
  }

  private splitProperties(str: string): string[] {
    const properties: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const prevChar = i > 0 ? str[i - 1] : '';

      if ((char === '"' || char === '`') && prevChar !== '\\') {
        if (!inString) {
          inString = true;
          stringChar = char;
        } else if (char === stringChar) {
          inString = false;
        }
      }

      if (!inString) {
        if (char === '{' || char === '[' || char === '(') depth++;
        else if (char === '}' || char === ']' || char === ')') depth--;
      }

      if (char === ',' && depth === 0 && !inString) {
        properties.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) properties.push(current.trim());
    return properties;
  }

  private parseProperty(propStr: string): ParsedOption | null {
    const colonIndex = propStr.indexOf(':');
    if (colonIndex === -1) return null;

    let key = propStr.slice(0, colonIndex).trim();
    const valueStr = propStr.slice(colonIndex + 1).trim();
    key = key.replace(/[\r\n]+/g, ' ').trim();

    const type = this.inferType(valueStr);
    const value = this.parseValue(valueStr, type);

    return { key, value, rawValue: valueStr, type };
  }

  private inferType(valueStr: string): ParsedOption['type'] {
    valueStr = valueStr.trim();
    if (valueStr === 'nil') return 'unknown';
    if (valueStr === 'true' || valueStr === 'false') return 'boolean';
    if (/^-?\d+\.?\d*$/.test(valueStr)) return 'number';
    if (/^["'`]/.test(valueStr)) return 'string';
    if (valueStr.match(/^\[\][\w.]+\s*\{/)) return 'array';
    if (valueStr.startsWith('{')) return 'object';
    if (valueStr.startsWith('func')) return 'function';
    return 'unknown';
  }

  private parseValue(valueStr: string, type: ParsedOption['type']): any {
    valueStr = valueStr.trim();
    switch (type) {
      case 'boolean': return valueStr === 'true';
      case 'number': return parseFloat(valueStr);
      case 'string': return valueStr.replace(/^["'`]|["'`]$/g, '');
      case 'array': return this.parseArray(valueStr);
      default: return valueStr;
    }
  }

  private parseArray(arrayStr: string): any[] {
    arrayStr = arrayStr.trim();
    const braceStart = arrayStr.indexOf('{');
    const braceEnd = arrayStr.lastIndexOf('}');
    if (braceStart === -1 || braceEnd === -1) return [];
    const content = arrayStr.slice(braceStart + 1, braceEnd).trim();
    if (!content) return [];
    const items = this.splitProperties(content);
    return items.map(item => {
      const type = this.inferType(item);
      return this.parseValue(item, type);
    });
  }
}
