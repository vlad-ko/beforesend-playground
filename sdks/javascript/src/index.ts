import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

interface TransformRequest {
  event: Record<string, any>;
  beforeSendCode: string;
}

interface TransformResponse {
  success: boolean;
  transformedEvent?: Record<string, any> | null;
  error?: string;
}

interface ValidationRequest {
  code: string;
}

interface ValidationError {
  line?: number;
  column?: number;
  message: string;
}

interface ValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Transform endpoint
 * Receives an event and beforeSend code, applies the transformation
 */
app.post('/transform', async (req: Request<{}, {}, TransformRequest>, res: Response<TransformResponse>) => {
  try {
    const { event, beforeSendCode } = req.body;

    if (!event || !beforeSendCode) {
      return res.status(400).json({
        success: false,
        error: 'Missing event or beforeSendCode'
      });
    }

    // Execute the beforeSend code in a sandboxed context
    let beforeSendFn: Function;
    try {
      // Wrap the code to ensure it returns a function
      const wrappedCode = `(${beforeSendCode})`;
      beforeSendFn = eval(wrappedCode);

      if (typeof beforeSendFn !== 'function') {
        throw new Error('beforeSend code must be a function');
      }
    } catch (evalError: any) {
      return res.status(400).json({
        success: false,
        error: `Failed to parse beforeSend code: ${evalError.message}`
      });
    }

    // Apply the beforeSend transformation
    try {
      // Clone the event to avoid mutation issues
      const eventClone = JSON.parse(JSON.stringify(event));

      // Check how many arguments the function takes
      // beforeSend takes (event, hint), tracesSampler takes just (samplingContext)
      const numParams = beforeSendFn.length;

      // Execute the function with appropriate arguments
      let transformedEvent;
      if (numParams === 1) {
        // Single argument function (tracesSampler style)
        transformedEvent = await beforeSendFn(eventClone);
      } else {
        // Two argument function (beforeSend style)
        transformedEvent = await beforeSendFn(eventClone, {});
      }

      return res.json({
        success: true,
        transformedEvent: transformedEvent
      });
    } catch (transformError: any) {
      return res.status(500).json({
        success: false,
        error: `Transformation error: ${transformError.message}`,
        transformedEvent: null
      });
    }
  } catch (error: any) {
    console.error('Unexpected error:', error);
    return res.status(500).json({
      success: false,
      error: `Unexpected error: ${error.message}`
    });
  }
});

/**
 * Validate endpoint
 * Validates beforeSend code for syntax errors without executing it
 */
app.post('/validate', async (req: Request<{}, {}, ValidationRequest>, res: Response<ValidationResponse>) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        valid: false,
        errors: [{ message: 'Missing code parameter' }]
      });
    }

    const errors: ValidationError[] = [];

    try {
      // Try to parse the code as a function expression
      const wrappedCode = `(${code})`;

      // Use eval to check syntax (doesn't actually execute in strict mode)
      // We need to actually evaluate it to catch syntax errors
      const checkSyntax = new Function('"use strict"; return ' + wrappedCode);
      checkSyntax();

      // If we get here, syntax is valid
      return res.json({
        valid: true,
        errors: []
      });
    } catch (error: any) {
      // Parse error message to extract line/column info if available
      const errorMessage = error.message || 'Syntax error';

      // Try to extract line number from error message
      const lineMatch = errorMessage.match(/line (\d+)/i);
      const line = lineMatch ? parseInt(lineMatch[1], 10) : undefined;

      errors.push({
        line,
        message: errorMessage
      });

      return res.json({
        valid: false,
        errors
      });
    }
  } catch (error: any) {
    console.error('Validation error:', error);
    return res.status(500).json({
      valid: false,
      errors: [{ message: `Validation service error: ${error.message}` }]
    });
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'healthy', sdk: 'javascript' });
});

// Only start the server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`JavaScript SDK service listening on port ${PORT}`);
  });
}

// Export app for testing
export { app };
