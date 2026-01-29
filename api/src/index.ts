import express from 'express';
import cors from 'cors';
import transformRouter from './routes/transform';
import examplesRouter from './routes/examples';
import validateRouter from './routes/validate';
import shareRouter from './routes/share';
import webhooksRouter from './routes/webhooks';

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Capture raw body for webhook signature verification
app.use(express.json({
  limit: '10mb',
  verify: (req: any, res, buf, encoding) => {
    // Store raw body for routes that need it (e.g., webhook signature verification)
    // encoding parameter is optional and may not be a valid BufferEncoding
    req.rawBody = buf.toString((encoding as BufferEncoding) || 'utf8');
  }
}));

// Request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    service: 'api-gateway',
    timestamp: new Date().toISOString(),
  });
});

// Routes
app.use('/api/transform', transformRouter);
app.use('/api/examples', examplesRouter);
app.use('/api/validate', validateRouter);
app.use('/api/share', shareRouter);
app.use('/api/webhooks', webhooksRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API Gateway listening on port ${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Transform API: http://localhost:${PORT}/api/transform`);
  console.log(`   Examples API: http://localhost:${PORT}/api/examples`);
  console.log(`   Webhooks API: http://localhost:${PORT}/api/webhooks`);
});
