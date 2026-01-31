/**
 * .NET configuration parser
 */

import { IConfigParser, ParsedConfig, ParsedOption, ParseError } from './types';

export class DotNetConfigParser implements IConfigParser {
  parse(configCode: string): ParsedConfig {
    const result: ParsedConfig = {
      sdk: 'dotnet',
      valid: true,
      options: new Map(),
      rawCode: configCode,
      parseErrors: [],
    };

    try {
      const lambdaBody = this.extractLambdaBody(configCode);
      if (!lambdaBody) {
        result.valid = false;
        result.parseErrors.push({ message: 'Could not find SentrySdk.Init() or UseSentry() lambda configuration' });
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
    const lambdaPattern = /(?:SentrySdk\.Init|\.UseSentry)\s*\(\s*(\w+)\s*=>\s*\{([\s\S]*?)\}\s*\)/;
    const match = code.match(lambdaPattern);
    if (match) return { varName: match[1], content: match[2] };
    return null;
  }

  private removeComments(code: string): string {
    let result = '';
    let i = 0;
    let inString = false;
    let inVerbatimString = false;

    while (i < code.length) {
      const char = code[i];
      const nextChar = i + 1 < code.length ? code[i + 1] : '';
      const prevChar = i > 0 ? code[i - 1] : '';

      // Handle verbatim string start: @"
      if (char === '@' && nextChar === '"' && !inString && !inVerbatimString) {
        inVerbatimString = true;
        result += char + nextChar;
        i += 2;
        continue;
      }

      // Handle verbatim string content and end
      if (inVerbatimString) {
        if (char === '"') {
          // "" is an escaped quote inside verbatim string
          if (nextChar === '"') {
            result += char + nextChar;
            i += 2;
            continue;
          }
          // Single " ends the verbatim string
          result += char;
          inVerbatimString = false;
          i++;
          continue;
        }
        // Any other character inside verbatim string
        result += char;
        i++;
        continue;
      }

      // Handle regular string
      if (char === '"' && prevChar !== '\\') {
        inString = !inString;
        result += char;
        i++;
        continue;
      }

      // Skip comment detection if inside regular string
      if (inString) {
        result += char;
        i++;
        continue;
      }

      // Single-line comment
      if (char === '/' && nextChar === '/') {
        i += 2;
        while (i < code.length && code[i] !== '\n') i++;
        if (i < code.length && code[i] === '\n') { result += '\n'; i++; }
        continue;
      }

      // Multi-line comment
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
      const parsed = this.parseAssignment(statement.trim(), varName);
      if (parsed) options.set(parsed.key, parsed);
    }
    return options;
  }

  private splitStatements(content: string): string[] {
    const statements: string[] = [];
    let current = '';
    let depth = 0;
    let inString = false;
    let inVerbatimString = false;

    for (let i = 0; i < content.length; i++) {
      const char = content[i];
      const nextChar = i + 1 < content.length ? content[i + 1] : '';
      const prevChar = i > 0 ? content[i - 1] : '';

      // Handle verbatim string start: @"
      if (char === '@' && nextChar === '"' && !inString && !inVerbatimString) {
        inVerbatimString = true;
        current += char + nextChar;
        i++;
        continue;
      }

      // Handle verbatim string content and end
      if (inVerbatimString) {
        if (char === '"') {
          if (nextChar === '"') {
            current += char + nextChar;
            i++;
            continue;
          }
          current += char;
          inVerbatimString = false;
          continue;
        }
        current += char;
        continue;
      }

      // Handle regular string toggle
      if ((char === '"' || char === "'") && prevChar !== '\\') inString = !inString;

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

  private parseAssignment(statement: string, varName: string): ParsedOption | null {
    if (!statement) return null;
    const pattern = new RegExp('^' + varName + '\\.([\\w]+)\\s*=\\s*(.+)$');
    const match = statement.match(pattern);
    if (!match) return null;

    const key = match[1];
    const valueStr = match[2].trim();
    const type = this.inferType(valueStr);
    const value = this.parseValue(valueStr, type);
    return { key, value, rawValue: valueStr, type };
  }

  private inferType(valueStr: string): ParsedOption['type'] {
    valueStr = valueStr.trim();
    if (valueStr === 'null') return 'unknown';
    if (valueStr === 'true' || valueStr === 'false') return 'boolean';
    if (/^-?\d+\.?\d*[fdmluLUFDM]?$/.test(valueStr)) return 'number';
    if (/^[@]?"/.test(valueStr)) return 'string';
    if (valueStr.startsWith('new List') || valueStr.startsWith('new []') || valueStr.startsWith('new string[]')) return 'array';
    if (valueStr.includes('=>')) return 'function';
    return 'unknown';
  }

  private parseValue(valueStr: string, type: ParsedOption['type']): any {
    valueStr = valueStr.trim();
    switch (type) {
      case 'boolean': return valueStr === 'true';
      case 'number': return parseFloat(valueStr.replace(/[fdmluLUFDM]$/, ''));
      case 'string':
        if (valueStr.startsWith('@"')) return valueStr.slice(2, -1);
        return valueStr.replace(/^["']|["']$/g, '');
      default: return valueStr;
    }
  }
}
