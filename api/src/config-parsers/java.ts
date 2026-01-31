/**
 * Java configuration parser
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class JavaConfigParser implements IConfigParser {
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
      sdk: 'java',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      const lambdaBody = this.extractLambdaBody(configCode);
      if (!lambdaBody) {
        result.valid = false;
        result.parseErrors.push({ message: 'Could not find Sentry.init() or SentryAndroid.init() lambda configuration' });
        return result;
      }
      result.options = this.parseLambdaBody(lambdaBody.content, lambdaBody.varName);
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

  private extractLambdaBody(code: string): { content: string; varName: string } | null {
    const lambdaPattern = /(?:Sentry|SentryAndroid)\.init\s*\([^,]*?,?\s*(\w+)\s*->\s*\{([\s\S]*?)\}\s*\)/;
    const match = code.match(lambdaPattern);
    if (match) return { varName: match[1], content: match[2] };
    return null;
  }

  private removeComments(code: string): string {
    let result = '';
    let i = 0;
    let inString = false;

    while (i < code.length) {
      const char = code[i];
      const nextChar = i + 1 < code.length ? code[i + 1] : '';

      if (char === '"' && !this.isEscaped(code, i)) {
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

  private parseLambdaBody(content: string, varName: string): Map<string, ParsedOption> {
    const options = new Map<string, ParsedOption>();
    content = this.removeComments(content);
    const statements = this.splitStatements(content);
    for (const statement of statements) {
      const parsed = this.parseSetterCall(statement.trim(), varName);
      if (parsed) options.set(parsed.key, parsed);
    }
    return options;
  }

  private splitStatements(content: string): string[] {
    const statements: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];

      if (char === '"' && !this.isEscaped(content, i)) inString = !inString;

      if (!inString) {
        if (char === '{' || char === '[' || char === '(') depth++;
        else if (char === '}' || char === ']' || char === ')') depth--;
      }

      if (char === ';' && depth === 0 && !inString) {
        if (current.trim()) statements.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    if (current.trim()) statements.push(current.trim());
    return statements;
  }

  private parseSetterCall(statement: string, varName: string): ParsedOption | null {
    if (!statement) return null;
    const setterPattern = new RegExp('^' + varName + '\\.(set|enable|add)([A-Z][\\w]*)\\s*\\((.+)\\)$');
    const match = statement.match(setterPattern);
    if (!match) return null;

    const prefix = match[1];
    const propertyName = match[2];
    const valueStr = match[3].trim();

    let key: string;
    if (prefix === 'set') key = propertyName.charAt(0).toLowerCase() + propertyName.slice(1);
    else key = propertyName.charAt(0).toLowerCase() + propertyName.slice(1);

    const type = this.inferType(valueStr);
    const value = this.parseValue(valueStr, type);
    return { key, value, rawValue: valueStr, type };
  }

  private inferType(valueStr: string): ParsedOption['type'] {
    valueStr = valueStr.trim();
    if (valueStr === 'null') return 'unknown';
    if (valueStr === 'true' || valueStr === 'false') return 'boolean';
    if (/^-?\d+\.?\d*[fFdDlL]?$/.test(valueStr)) return 'number';
    if (/^"/.test(valueStr)) return 'string';
    if (valueStr.startsWith('List.of(') || valueStr.startsWith('Arrays.asList(')) return 'array';
    if (valueStr.includes('->')) return 'function';
    if (valueStr.includes('::')) return 'function';
    if (valueStr.startsWith('new ')) return 'object';
    return 'unknown';
  }

  private parseValue(valueStr: string, type: ParsedOption['type']): any {
    valueStr = valueStr.trim();
    switch (type) {
      case 'boolean': return valueStr === 'true';
      case 'number': return parseFloat(valueStr.replace(/[fFdDlL]$/, ''));
      case 'string': return valueStr.replace(/^"|"$/g, '');
      default: return valueStr;
    }
  }
}
