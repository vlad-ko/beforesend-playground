/**
 * Cocoa (Swift) configuration parser
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class CocoaConfigParser implements IConfigParser {
  parse(configCode: string): ParsedConfig {
    const result: ParsedConfig = {
      sdk: 'cocoa',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      const closureBody = this.extractClosureBody(configCode);
      if (!closureBody) {
        result.valid = false;
        result.parseErrors.push({ message: 'Could not find SentrySDK.start closure configuration' });
        return result;
      }
      result.options = this.parseClosureBody(closureBody.content, closureBody.varName);
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

  private extractClosureBody(code: string): { content: string; varName: string } | null {
    const trailingPattern = /SentrySDK\.start\s*\{\s*(\w+)\s+in([\s\S]*?)\n?\}(?:\s*\)|$)/;
    const trailingMatch = code.match(trailingPattern);
    if (trailingMatch) return { varName: trailingMatch[1], content: trailingMatch[2] };

    const shorthandPattern = /SentrySDK\.start\s*\{([\s\S]*?)\n?\}/;
    const shorthandMatch = code.match(shorthandPattern);
    if (shorthandMatch && shorthandMatch[1].includes('$0.')) {
      return { varName: '$0', content: shorthandMatch[1] };
    }

    const configurePattern = /SentrySDK\.start\s*\(\s*configureOptions:\s*\{\s*(\w+)\s+in([\s\S]*?)\}\s*\)/;
    const configureMatch = code.match(configurePattern);
    if (configureMatch) return { varName: configureMatch[1], content: configureMatch[2] };

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
        result += char; i++; continue;
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

  private parseClosureBody(content: string, varName: string): Map<string, ParsedOption> {
    const options = new Map<string, ParsedOption>();
    content = this.removeComments(content);
    const lines = content.split('\n');
    for (const line of lines) {
      const parsed = this.parseAssignment(line.trim(), varName);
      if (parsed) options.set(parsed.key, parsed);
    }
    return options;
  }

  private parseAssignment(line: string, varName: string): ParsedOption | null {
    if (!line) return null;
    const escapedVarName = varName === '$0' ? '\\$0' : varName;
    const pattern = new RegExp('^' + escapedVarName + '\\.([\\w]+)\\s*=\\s*(.+)$');
    const match = line.match(pattern);
    if (!match) return null;

    const key = match[1];
    const valueStr = match[2].trim();
    const type = this.inferType(valueStr);
    const value = this.parseValue(valueStr, type);
    return { key, value, rawValue: valueStr, type };
  }

  private inferType(valueStr: string): ParsedOption['type'] {
    valueStr = valueStr.trim();
    if (valueStr === 'nil') return 'unknown';
    if (valueStr === 'true' || valueStr === 'false') return 'boolean';
    if (/^-?\d+\.?\d*$/.test(valueStr)) return 'number';
    if (/^"/.test(valueStr)) return 'string';
    if (valueStr.startsWith('[')) return 'array';
    if (valueStr.startsWith('{')) return 'function';
    if (valueStr.startsWith('NSNumber(')) return 'number';
    return 'unknown';
  }

  private parseValue(valueStr: string, type: ParsedOption['type']): any {
    valueStr = valueStr.trim();
    switch (type) {
      case 'boolean': return valueStr === 'true';
      case 'number':
        if (valueStr.startsWith('NSNumber(')) {
          const numMatch = valueStr.match(/NSNumber\s*\(\s*value:\s*([\d.]+)\s*\)/);
          if (numMatch) return parseFloat(numMatch[1]);
        }
        return parseFloat(valueStr);
      case 'string': return valueStr.replace(/^"|"$/g, '');
      case 'array': return this.parseArray(valueStr);
      default: return valueStr;
    }
  }

  private parseArray(arrayStr: string): any[] {
    arrayStr = arrayStr.trim();
    if (arrayStr.startsWith('[')) arrayStr = arrayStr.slice(1);
    if (arrayStr.endsWith(']')) arrayStr = arrayStr.slice(0, -1);
    if (!arrayStr.trim()) return [];
    const items = this.splitArrayItems(arrayStr);
    return items.map(item => {
      const type = this.inferType(item.trim());
      return this.parseValue(item.trim(), type);
    });
  }

  private splitArrayItems(str: string): string[] {
    const items: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const prevChar = i > 0 ? str[i - 1] : '';

      if (char === '"' && prevChar !== '\\') inString = !inString;

      if (!inString) {
        if (char === '[' || char === '(' || char === '{') depth++;
        else if (char === ']' || char === ')' || char === '}') depth--;
      }

      if (char === ',' && depth === 0 && !inString) {
        items.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) items.push(current.trim());
    return items;
  }
}
