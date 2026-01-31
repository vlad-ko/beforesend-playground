/**
 * Rust configuration parser
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class RustConfigParser implements IConfigParser {
  parse(configCode: string): ParsedConfig {
    const result: ParsedConfig = {
      sdk: 'rust',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      const configObject = this.extractConfigObject(configCode);
      if (!configObject) {
        result.valid = false;
        result.parseErrors.push({ message: 'Could not find sentry::ClientOptions configuration struct' });
        return result;
      }
      result.options = this.parseStructLiteral(configObject);
    } catch (error: any) {
      result.valid = false;
      result.parseErrors.push({ message: error.message || 'Failed to parse configuration' });
    }
    return result;
  }

  validate(configCode: string): { valid: boolean; errors: ParseError[] } {
    const parsed = this.parse(configCode);
    return { valid: parsed.valid, errors: parsed.parseErrors };
  }

  private extractConfigObject(code: string): string | null {
    const initPattern = /sentry::init\s*\(\s*sentry::ClientOptions\s*(\{[\s\S]*?\})\s*\)/;
    const match = code.match(initPattern);
    if (match && match[1]) return match[1];

    const structPattern = /sentry::ClientOptions\s*(\{[\s\S]*?\})/;
    const structMatch = code.match(structPattern);
    if (structMatch && structMatch[1]) return structMatch[1];

    if (/^\s*\{[\s\S]*\}\s*$/.test(code)) return code.trim();
    return null;
  }

  private removeComments(code: string): string {
    let result = '';
    let i = 0;
    let inString = false;

    while (i < code.length) {
      const char = code[i];
      const nextChar = i + 1 < code.length ? code[i + 1] : '';
      const prevChar = i > 0 ? code[i - 1] : '';

      if (char === '"' && prevChar !== '\\') {
        inString = !inString;
        result += char;
        i++;
        continue;
      }

      if (inString) { result += char; i++; continue; }

      if (char === '/' && nextChar === '/') {
        i += 2;
        while (i < code.length && code[i] !== '\n') i++;
        if (i < code.length && code[i] === '\n') { result += '\n'; i++; }
        continue;
      }

      if (char === '/' && nextChar === '*') {
        i += 2;
        while (i < code.length - 1) {
          if (code[i] === '*' && code[i + 1] === '/') { i += 2; break; }
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
      if (prop.trim().startsWith('..')) continue;
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

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const prevChar = i > 0 ? str[i - 1] : '';

      if (char === '"' && prevChar !== '\\') inString = !inString;

      if (!inString) {
        if (char === '{' || char === '[' || char === '(' || char === '<') depth++;
        else if (char === '}' || char === ']' || char === ')' || char === '>') depth--;
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

    let key = propStr.slice(0, colonIndex).trim().replace(/[\r\n]+/g, ' ').trim();
    const valueStr = propStr.slice(colonIndex + 1).trim();
    const type = this.inferType(valueStr);
    const value = this.parseValue(valueStr, type);
    return { key, value, rawValue: valueStr, type };
  }

  private inferType(valueStr: string): ParsedOption['type'] {
    valueStr = valueStr.trim();
    if (valueStr === 'None' || valueStr === 'nil') return 'unknown';
    if (valueStr === 'true' || valueStr === 'false') return 'boolean';
    if (/^-?\d+\.?\d*$/.test(valueStr)) return 'number';
    // Check for closures before Some() since Some(Box::new(|...)) should be function
    if (valueStr.includes('Box::new(|') || valueStr.match(/^\|[\w\s,]*\|/)) return 'function';
    if (valueStr.includes('fn(')) return 'function';
    if (/^["']/.test(valueStr) || valueStr.startsWith('Some(')) return 'string';
    if (valueStr.startsWith('vec!')) return 'array';
    if (valueStr.startsWith('{') || valueStr.startsWith('[')) return 'array';
    return 'unknown';
  }

  private parseValue(valueStr: string, type: ParsedOption['type']): any {
    valueStr = valueStr.trim();
    switch (type) {
      case 'boolean': return valueStr === 'true';
      case 'number': return parseFloat(valueStr);
      case 'string':
        if (valueStr.startsWith('Some(')) {
          const inner = valueStr.slice(5, -1).trim().replace(/\.into\(\)$/, '');
          return inner.replace(/^["']|["']$/g, '');
        }
        return valueStr.replace(/^["']|["']$/g, '');
      default: return valueStr;
    }
  }
}
