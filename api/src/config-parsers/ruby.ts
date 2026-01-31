/**
 * Ruby configuration parser
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class RubyConfigParser implements IConfigParser {
  parse(configCode: string): ParsedConfig {
    const result: ParsedConfig = {
      sdk: 'ruby',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      const blockContent = this.extractBlockContent(configCode);
      if (!blockContent) {
        result.valid = false;
        result.parseErrors.push({ message: 'Could not find Sentry.init block configuration' });
        return result;
      }
      result.options = this.parseBlockContent(blockContent.content, blockContent.varName);
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

  private extractBlockContent(code: string): { content: string; varName: string } | null {
    const doEndPattern = /Sentry\.init\s+do\s*\|(\w+)\|([\s\S]*?)\bend\b/;
    const doEndMatch = code.match(doEndPattern);
    if (doEndMatch) return { varName: doEndMatch[1], content: doEndMatch[2] };

    const bracePattern = /Sentry\.init\s*\{\s*\|(\w+)\|([\s\S]*?)\}/;
    const braceMatch = code.match(bracePattern);
    if (braceMatch) return { varName: braceMatch[1], content: braceMatch[2] };

    return null;
  }

  private removeComments(code: string): string {
    let result = '';
    let i = 0;
    let inString = false;
    let stringChar = '';

    while (i < code.length) {
      const char = code[i];
      const prevChar = i > 0 ? code[i - 1] : '';

      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) { inString = true; stringChar = char; }
        else if (char === stringChar) { inString = false; }
        result += char; i++; continue;
      }

      if (inString) { result += char; i++; continue; }

      if (char === '#') {
        while (i < code.length && code[i] !== '\n') i++;
        if (i < code.length && code[i] === '\n') { result += '\n'; i++; }
        continue;
      }

      result += char;
      i++;
    }
    return result;
  }

  private parseBlockContent(content: string, varName: string): Map<string, ParsedOption> {
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
    const pattern = new RegExp('^' + varName + '\\.([\\w_]+)\\s*=\\s*(.+)$');
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
    if (/^['"]/.test(valueStr)) return 'string';
    if (valueStr.startsWith(':')) return 'string';
    if (valueStr.startsWith('[')) return 'array';
    if (valueStr.startsWith('{')) return 'object';
    if (valueStr.startsWith('->')) return 'function';
    if (valueStr.startsWith('Proc.new') || valueStr.startsWith('proc')) return 'function';
    if (valueStr.startsWith('lambda')) return 'function';
    return 'unknown';
  }

  private parseValue(valueStr: string, type: ParsedOption['type']): any {
    valueStr = valueStr.trim();
    switch (type) {
      case 'boolean': return valueStr === 'true';
      case 'number': return parseFloat(valueStr);
      case 'string':
        if (valueStr.startsWith(':')) return valueStr;
        return valueStr.replace(/^['"]|['"]$/g, '');
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
    let stringChar = '';

    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const prevChar = i > 0 ? str[i - 1] : '';

      if ((char === '"' || char === "'") && prevChar !== '\\') {
        if (!inString) { inString = true; stringChar = char; }
        else if (char === stringChar) { inString = false; }
      }

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
