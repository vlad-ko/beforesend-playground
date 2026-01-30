/**
 * Configuration example interface
 */

export type ComplexityLevel = 'basic' | 'intermediate' | 'advanced';

export interface ConfigExample {
  /** Unique identifier for the example */
  id: string;

  /** Display name (e.g., "JavaScript - Production Setup") */
  name: string;

  /** Brief description of what this example demonstrates */
  description: string;

  /** SDK this example is for (javascript, python, go, etc.) */
  sdk: string;

  /** The actual configuration code */
  configCode: string;

  /** Complexity level of this example */
  complexity: ComplexityLevel;

  /** Specific use case for this configuration */
  useCase: string;

  /** Solutions Engineering guidance on when to use this config */
  seGuidance: string;
}
