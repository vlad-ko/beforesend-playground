/**
 * PHP configuration parser
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class PHPConfigParser implements IConfigParser {
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

  parse(configCode: string): ParsedConfig {
    const result: ParsedConfig = {
      sdk: 'php',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      const configArray = this.extractConfigArray(configCode);
      if (!configArray) {
        result.valid = false;
        result.parseErrors.push({ message: 'Could not find Sentry\\init() configuration array' });
        return result;
      }
      result.options = this.parseArrayLiteral(configArray);
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

  private extractConfigArray(code: string): string | null {
    const initPattern = /\\?Sentry\\init\s*\(\s*(\[[\s\S]*?\])\s*\)/;
    const match = code.match(initPattern);
    if (match && match[1]) return match[1];
    if (/^\s*\[[\s\S]*\]\s*$/.test(code)) return code.trim();
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
      if ((char === '"' || char === "'") && !this.isEscaped(code, i)) {
        if (!inString) { inString = true; stringChar = char; }
        else if (char === stringChar) { inString = false; }
        result += char; i++; continue;
      }

      if (inString) { result += char; i++; continue; }

      if (char === '/' && nextChar === '/') {
        i += 2;
        while (i < code.length && code[i] !== '\n') i++;
        if (i < code.length && code[i] === '\n') { result += '\n'; i++; }
        continue;
      }

      if (char === '#') {
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

  private parseArrayLiteral(arrayStr: string): Map<string, ParsedOption> {
    const options = new Map<string, ParsedOption>();
    arrayStr = arrayStr.trim();
    if (arrayStr.startsWith('[')) arrayStr = arrayStr.slice(1);
    if (arrayStr.endsWith(']')) arrayStr = arrayStr.slice(0, -1);
    arrayStr = this.removeComments(arrayStr);
    const properties = this.splitProperties(arrayStr);
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

      if ((char === '"' || char === "'") && !this.isEscaped(str, i)) {
        if (!inString) { inString = true; stringChar = char; }
        else if (char === stringChar) { inString = false; }
      }

      if (!inString) {
        if (char === '[' || char === '(' || char === '{') depth++;
        else if (char === ']' || char === ')' || char === '}') depth--;
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
    const arrowIndex = propStr.indexOf('=>');
    if (arrowIndex === -1) return null;

    let key = propStr.slice(0, arrowIndex).trim().replace(/[\r\n]+/g, ' ').trim();
    key = key.replace(/^['"]|['"]$/g, '');
    const valueStr = propStr.slice(arrowIndex + 2).trim();
    const type = this.inferType(valueStr);
    const value = this.parseValue(valueStr, type);
    return { key, value, rawValue: valueStr, type };
  }

  private inferType(valueStr: string): ParsedOption['type'] {
    valueStr = valueStr.trim();
    if (valueStr === 'null' || valueStr === 'NULL') return 'unknown';
    if (valueStr === 'true' || valueStr === 'false' || valueStr === 'TRUE' || valueStr === 'FALSE') return 'boolean';
    if (/^-?\d+\.?\d*$/.test(valueStr)) return 'number';
    if (/^['"]/.test(valueStr)) return 'string';
    if (valueStr.startsWith('[')) return 'array';
    if (valueStr.startsWith('function') || valueStr.startsWith('fn(') || valueStr.match(/^fn\s*\(/)) return 'function';
    if (valueStr.includes('::')) return 'function';
    return 'unknown';
  }

  private parseValue(valueStr: string, type: ParsedOption['type']): any {
    valueStr = valueStr.trim();
    switch (type) {
      case 'boolean': return valueStr.toLowerCase() === 'true';
      case 'number': return parseFloat(valueStr);
      case 'string': return valueStr.replace(/^['"]|['"]$/g, '');
      case 'array': return this.parseArray(valueStr);
      default: return valueStr;
    }
  }

  private parseArray(arrayStr: string): any[] {
    arrayStr = arrayStr.trim();
    if (arrayStr.startsWith('[')) arrayStr = arrayStr.slice(1);
    if (arrayStr.endsWith(']')) arrayStr = arrayStr.slice(0, -1);
    if (!arrayStr.trim()) return [];
    const items = this.splitProperties(arrayStr);
    return items.map(item => {
      const type = this.inferType(item);
      return this.parseValue(item, type);
    });
  }
}
