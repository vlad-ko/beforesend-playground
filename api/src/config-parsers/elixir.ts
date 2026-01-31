/**
 * Elixir configuration parser
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class ElixirConfigParser implements IConfigParser {
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
      sdk: 'elixir',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      const configOptions = this.extractConfigOptions(configCode);
      if (configOptions === null) {
        result.valid = false;
        result.parseErrors.push({ message: 'Could not find config :sentry configuration' });
        return result;
      }
      result.options = this.parseKeywordList(configOptions);
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

  private extractConfigOptions(code: string): string | null {
    const bracketPattern = /config\s+:sentry\s*,\s*\[([\s\S]*?)\]/;
    const bracketMatch = code.match(bracketPattern);
    if (bracketMatch) return bracketMatch[1];

    const inlinePattern = /config\s+:sentry\s*,?\s*([\s\S]*?)$/;
    const inlineMatch = code.match(inlinePattern);
    if (inlineMatch && inlineMatch[1].trim()) return inlineMatch[1];

    if (/config\s+:sentry\s*$/.test(code.trim())) return '';
    return null;
  }

  private removeComments(code: string): string {
    let result = '';
    let i = 0;
    let inString = false;

    while (i < code.length) {
      const char = code[i];

      if (char === '"' && !this.isEscaped(code, i)) {
        inString = !inString;
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

  private parseKeywordList(content: string): Map<string, ParsedOption> {
    const options = new Map<string, ParsedOption>();
    if (!content.trim()) return options;
    content = this.removeComments(content);
    const pairs = this.splitKeywordPairs(content);
    for (const pair of pairs) {
      const parsed = this.parseKeywordPair(pair.trim());
      if (parsed) options.set(parsed.key, parsed);
    }
    return options;
  }

  private splitKeywordPairs(str: string): string[] {
    const pairs: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;

    for (let i = 0; i < str.length; i++) {
      const char = str[i];

      if (char === '"' && !this.isEscaped(str, i)) inString = !inString;

      if (!inString) {
        if (char === '[' || char === '(' || char === '{') depth++;
        else if (char === ']' || char === ')' || char === '}') depth--;
      }

      if (char === ',' && depth === 0 && !inString) {
        if (current.trim()) pairs.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) pairs.push(current.trim());
    return pairs;
  }

  private parseKeywordPair(pairStr: string): ParsedOption | null {
    if (!pairStr) return null;
    const colonIndex = pairStr.indexOf(':');
    if (colonIndex === -1) return null;

    const beforeColon = pairStr.slice(0, colonIndex).trim();
    const afterColon = pairStr.slice(colonIndex + 1).trim();

    if (!beforeColon || beforeColon.startsWith(':')) return null;

    const key = beforeColon;
    const valueStr = afterColon;
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
    if (valueStr.startsWith(':')) return 'string';
    if (valueStr.startsWith('[')) return 'array';
    if (valueStr.startsWith('{')) return 'function';
    if (valueStr.includes('(') && valueStr.includes(')')) return 'unknown';
    return 'unknown';
  }

  private parseValue(valueStr: string, type: ParsedOption['type']): any {
    valueStr = valueStr.trim();
    switch (type) {
      case 'boolean': return valueStr === 'true';
      case 'number': return parseFloat(valueStr);
      case 'string':
        if (valueStr.startsWith(':')) return valueStr;
        return valueStr.replace(/^"|"$/g, '');
      default: return valueStr;
    }
  }
}
