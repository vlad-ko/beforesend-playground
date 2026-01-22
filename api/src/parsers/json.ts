export interface ValidationResult {
  valid: boolean;
  error?: string;
  data?: any;
}

export function validateJSON(input: string): ValidationResult {
  try {
    const parsed = JSON.parse(input);
    return {
      valid: true,
      data: parsed,
    };
  } catch (error: any) {
    return {
      valid: false,
      error: `Invalid JSON: ${error.message}`,
    };
  }
}

export function validateSentryEvent(event: any): ValidationResult {
  if (!event || typeof event !== 'object') {
    return {
      valid: false,
      error: 'Event must be an object',
    };
  }

  // Basic Sentry event structure check
  // Not exhaustive, just ensures it's somewhat event-like
  if (!event.event_id && !event.exception && !event.message) {
    return {
      valid: false,
      error: 'Event must have at least one of: event_id, exception, or message',
    };
  }

  return {
    valid: true,
    data: event,
  };
}
