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

  // Basic Sentry event/breadcrumb structure check
  // Accepts events (event_id, exception, message) or breadcrumbs (category, type)
  const isEvent = event.event_id || event.exception || event.message;
  const isBreadcrumb = event.category || (event.type && event.type !== 'transaction');
  const isTransaction = event.type === 'transaction' || event.transaction;

  if (!isEvent && !isBreadcrumb && !isTransaction) {
    return {
      valid: false,
      error: 'Input must be a valid Sentry event, transaction, or breadcrumb object',
    };
  }

  return {
    valid: true,
    data: event,
  };
}
