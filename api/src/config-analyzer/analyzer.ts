/**
 * Configuration Analyzer
 *
 * Analyzes Sentry SDK configurations and provides:
 * - Validation of options
 * - Warnings for misconfigurations
 * - Recommendations for best practices
 * - Health score calculation
 */

import { configDictionary } from '../config-dictionary';
import { IConfigParser, ParsedConfig, ParsedOption } from '../config-parsers/types';
import { AnalysisResult, OptionAnalysis, Warning, Recommendation, WarningSeverity } from './types';

export class ConfigAnalyzer {
  private parser: IConfigParser;

  constructor(parser: IConfigParser) {
    this.parser = parser;
  }

  /**
   * Analyze a configuration code string
   */
  analyze(configCode: string, sdk: string): AnalysisResult {
    // Parse the configuration
    const parsed = this.parser.parse(configCode);

    // Initialize result
    const result: AnalysisResult = {
      valid: parsed.valid,
      sdk,
      summary: '',
      options: [],
      warnings: [],
      recommendations: [],
      score: 0,
      parseErrors: parsed.parseErrors,
    };

    if (!parsed.valid) {
      result.summary = 'Configuration contains parse errors';
      result.warnings.push({
        severity: 'error',
        message: 'Failed to parse configuration',
      });
      return result;
    }

    // Analyze each option
    const optionAnalyses: OptionAnalysis[] = [];
    const warnings: Warning[] = [];

    for (const [key, parsedOption] of parsed.options.entries()) {
      const analysis = this.analyzeOption(parsedOption, sdk);
      optionAnalyses.push(analysis);
      warnings.push(...analysis.warnings);
    }

    result.options = optionAnalyses;

    // Check for missing required options
    const missingRequired = this.checkMissingRequired(parsed, sdk);
    warnings.push(...missingRequired);

    result.warnings = warnings;

    // Generate recommendations
    result.recommendations = this.generateRecommendations(parsed, sdk);

    // Calculate health score
    result.score = this.calculateScore(parsed, warnings, result.recommendations);

    // Generate summary
    result.summary = this.generateSummary(result);

    return result;
  }

  /**
   * Analyze a single configuration option
   */
  private analyzeOption(parsedOption: ParsedOption, sdk: string): OptionAnalysis {
    const dictOption = configDictionary.getOption(parsedOption.key);

    const analysis: OptionAnalysis = {
      key: parsedOption.key,
      displayName: dictOption?.displayName || parsedOption.key,
      value: parsedOption.value,
      rawValue: parsedOption.rawValue,
      type: parsedOption.type,
      category: dictOption?.category || 'unknown',
      description: dictOption?.description || 'Unknown configuration option',
      seGuidance: dictOption?.seGuidance,
      docsUrl: dictOption?.docsUrl,
      recognized: !!dictOption,
      warnings: [],
    };

    // Check if option is recognized
    if (!dictOption) {
      analysis.warnings.push({
        severity: 'warning',
        message: `Unknown option "${parsedOption.key}" - may be deprecated or SDK-specific`,
        optionKey: parsedOption.key,
      });
      return analysis;
    }

    // Check SDK compatibility
    if (dictOption.supportedSDKs && !dictOption.supportedSDKs.includes(sdk)) {
      analysis.warnings.push({
        severity: 'warning',
        message: `Option "${parsedOption.key}" may not be supported in ${sdk} SDK`,
        optionKey: parsedOption.key,
      });
    }

    // Add option-specific warnings from dictionary
    if (dictOption.warnings) {
      dictOption.warnings.forEach(warningMsg => {
        analysis.warnings.push({
          severity: 'info',
          message: warningMsg,
          optionKey: parsedOption.key,
        });
      });
    }

    // Value-specific validation
    const valueWarnings = this.validateOptionValue(parsedOption, dictOption);
    analysis.warnings.push(...valueWarnings);

    return analysis;
  }

  /**
   * Validate option value
   */
  private validateOptionValue(parsedOption: ParsedOption, dictOption: any): Warning[] {
    const warnings: Warning[] = [];

    // Check DSN format
    if (parsedOption.key === 'dsn') {
      if (typeof parsedOption.value === 'string') {
        if (!parsedOption.value.startsWith('https://')) {
          warnings.push({
            severity: 'error',
            message: 'DSN should use HTTPS protocol',
            optionKey: 'dsn',
            fix: 'Use a DSN starting with https://',
          });
        }
        if (!parsedOption.value.includes('@') || !parsedOption.value.includes('.ingest')) {
          warnings.push({
            severity: 'warning',
            message: 'DSN format may be invalid - expected format: https://key@org.ingest.sentry.io/project',
            optionKey: 'dsn',
          });
        }
      }
    }

    // Check sample rates
    if (parsedOption.key === 'sampleRate' || parsedOption.key === 'tracesSampleRate' || parsedOption.key === 'profilesSampleRate') {
      if (parsedOption.type === 'number') {
        const rate = parsedOption.value;
        if (rate < 0 || rate > 1) {
          warnings.push({
            severity: 'error',
            message: `${parsedOption.key} must be between 0.0 and 1.0`,
            optionKey: parsedOption.key,
            fix: 'Set a value between 0.0 and 1.0',
          });
        }

        // Warn about 100% sampling in production
        if (parsedOption.key === 'tracesSampleRate' && rate === 1.0) {
          warnings.push({
            severity: 'warning',
            message: '100% transaction sampling may quickly exhaust quota in production',
            optionKey: parsedOption.key,
            fix: 'Consider reducing to 0.1 (10%) or lower for production',
          });
        }
      }
    }

    // Check debug mode
    if (parsedOption.key === 'debug' && parsedOption.value === true) {
      warnings.push({
        severity: 'warning',
        message: 'Debug mode should be disabled in production',
        optionKey: 'debug',
        fix: 'Set debug: false for production environments',
      });
    }

    // Check sendDefaultPii
    if (parsedOption.key === 'sendDefaultPii' && parsedOption.value === true) {
      warnings.push({
        severity: 'warning',
        message: 'Sending default PII may violate privacy regulations',
        optionKey: 'sendDefaultPii',
        fix: 'Consider using beforeSend for fine-grained PII control',
      });
    }

    // Check environment
    if (parsedOption.key === 'environment') {
      if (typeof parsedOption.value === 'string' && parsedOption.value === 'production') {
        // This is fine, but note it
      }
    }

    return warnings;
  }

  /**
   * Check for missing required options
   */
  private checkMissingRequired(parsed: ParsedConfig, sdk: string): Warning[] {
    const warnings: Warning[] = [];
    const requiredOptions = configDictionary.getRequiredOptions();

    for (const required of requiredOptions) {
      if (!parsed.options.has(required.key)) {
        warnings.push({
          severity: 'error',
          message: `Missing required option: ${required.key}`,
          optionKey: required.key,
          fix: `Add ${required.key} to your configuration`,
        });
      }
    }

    return warnings;
  }

  /**
   * Generate recommendations based on configuration
   */
  private generateRecommendations(parsed: ParsedConfig, sdk: string): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // Check if environment is set
    if (!parsed.options.has('environment')) {
      recommendations.push({
        title: 'Set environment',
        description: 'Setting the environment helps separate events from different deployment stages',
        optionKey: 'environment',
        priority: 'high',
        example: 'environment: "production"',
      });
    }

    // Check if release is set
    if (!parsed.options.has('release')) {
      recommendations.push({
        title: 'Set release version',
        description: 'Setting release enables features like suspect commits and release health tracking',
        optionKey: 'release',
        priority: 'high',
        example: 'release: "my-app@1.0.0"',
      });
    }

    // Check for tracesSampleRate if not set
    if (!parsed.options.has('tracesSampleRate') && !parsed.options.has('enableTracing')) {
      recommendations.push({
        title: 'Enable performance monitoring',
        description: 'Add tracesSampleRate to enable performance monitoring and track application performance',
        optionKey: 'tracesSampleRate',
        priority: 'medium',
        example: 'tracesSampleRate: 0.1  // Sample 10% of transactions',
      });
    }

    // Recommend beforeSend for PII scrubbing
    if (!parsed.options.has('beforeSend')) {
      recommendations.push({
        title: 'Add beforeSend for PII scrubbing',
        description: 'Use beforeSend to remove sensitive data before events are sent to Sentry',
        optionKey: 'beforeSend',
        priority: 'medium',
        example: 'beforeSend: (event) => { delete event.user; return event; }',
      });
    }

    // Check for ignoreErrors
    if (!parsed.options.has('ignoreErrors')) {
      recommendations.push({
        title: 'Filter known errors with ignoreErrors',
        description: 'Use ignoreErrors to filter out browser quirks and third-party errors',
        optionKey: 'ignoreErrors',
        priority: 'low',
        example: 'ignoreErrors: ["Script error", /ResizeObserver/]',
      });
    }

    return recommendations;
  }

  /**
   * Calculate health score (0-100)
   */
  private calculateScore(parsed: ParsedConfig, warnings: Warning[], recommendations: Recommendation[]): number {
    let score = 100;

    // Deduct for errors
    const errors = warnings.filter(w => w.severity === 'error');
    score -= errors.length * 15;

    // Deduct for warnings
    const warningCount = warnings.filter(w => w.severity === 'warning');
    score -= warningCount.length * 5;

    // Deduct for missing best practices
    const highPriorityRecs = recommendations.filter(r => r.priority === 'high');
    score -= highPriorityRecs.length * 10;

    const mediumPriorityRecs = recommendations.filter(r => r.priority === 'medium');
    score -= mediumPriorityRecs.length * 5;

    // Bonus for having good options
    if (parsed.options.has('environment')) score += 5;
    if (parsed.options.has('release')) score += 5;
    if (parsed.options.has('beforeSend')) score += 5;

    // Ensure score is within bounds
    return Math.max(0, Math.min(100, score));
  }

  /**
   * Generate summary text
   */
  private generateSummary(result: AnalysisResult): string {
    const errors = result.warnings.filter(w => w.severity === 'error').length;
    const warnings = result.warnings.filter(w => w.severity === 'warning').length;
    const optionsCount = result.options.length;

    if (errors > 0) {
      return `Found ${errors} error(s) and ${warnings} warning(s) in ${optionsCount} configuration options`;
    }

    if (warnings > 0) {
      return `Found ${warnings} warning(s) in ${optionsCount} configuration options`;
    }

    if (result.score >= 90) {
      return `Excellent configuration with ${optionsCount} options`;
    }

    if (result.score >= 70) {
      return `Good configuration with ${optionsCount} options, some improvements recommended`;
    }

    return `Configuration needs improvement - ${optionsCount} options analyzed`;
  }
}
