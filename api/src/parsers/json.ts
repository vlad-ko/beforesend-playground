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

  // Basic Sentry event/breadcrumb/sampling context structure check
  // Accepts events (event_id, exception, message) or breadcrumbs (category, type)
  // or transactions (type=transaction, transaction) or sampling contexts (transactionContext, transaction_context)
  const isEvent = event.event_id || event.exception || event.message;
  const isBreadcrumb = event.category || (event.type && event.type !== 'transaction');
  const isTransaction = event.type === 'transaction' || event.transaction;
  const isSamplingContext = event.transactionContext || event.transaction_context;

  if (!isEvent && !isBreadcrumb && !isTransaction && !isSamplingContext) {
    return {
      valid: false,
      error: 'Input must be a valid Sentry event, transaction, breadcrumb, or sampling context object',
    };
  }

  return {
    valid: true,
    data: event,
  };
}
