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

      // Execute the beforeSend function
      const transformedEvent = await beforeSendFn(eventClone, {});

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
