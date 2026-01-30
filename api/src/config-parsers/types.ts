/**
 * Configuration parser types
 */

export interface ParsedOption {
  key: string;
  value: any;
  rawValue: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array' | 'function' | 'regexp' | 'unknown';
  line?: number;
}

export interface ParseError {
  message: string;
  line?: number;
  column?: number;
  code?: string;
}

export interface ParsedConfig {
  sdk: string;
  valid: boolean;
  options: Map<string, ParsedOption>;
  rawCode: string;
  parseErrors: ParseError[];
}

export interface IConfigParser {
  parse(configCode: string): ParsedConfig;
  validate(configCode: string): { valid: boolean; errors: ParseError[] };
}
