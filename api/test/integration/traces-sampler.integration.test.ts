import request from 'supertest';
import express from 'express';
import transformRouter from '../../src/routes/transform';

const app = express();
app.use(express.json());
app.use('/api/transform', transformRouter);

/**
 * Integration tests for tracesSampler functionality across SDKs.
 *
 * These tests verify that the default code templates actually execute
 * correctly on the backend SDKs and return valid sample rates.
 *
 * IMPORTANT: These tests require SDK containers to be running.
 * Run with: docker-compose up -d && npm run test:integration
 */

// Default sampling context - camelCase for JS-based SDKs
const SAMPLING_CONTEXT_CAMEL = {
  transactionContext: {
    name: 'GET /api/payment/process',
    op: 'http.server',
  },
  parentSampled: true,
  request: {
    url: 'https://example.com/api/payment/process',
    method: 'GET',
  },
};

// Default sampling context - snake_case for Python/Ruby/PHP/Elixir
const SAMPLING_CONTEXT_SNAKE = {
  transaction_context: {
    name: 'GET /api/payment/process',
    op: 'http.server',
  },
  parent_sampled: true,
  request: {
    url: 'https://example.com/api/payment/process',
    method: 'GET',
  },
};

// Simple test code that returns a fixed sample rate
const SIMPLE_RETURN_CODE: Record<string, string> = {
  javascript: `(event) => {
    return 0.5;
  }`,
  python: `def sampler(event):
    return 0.5`,
  ruby: `lambda { |event| 0.5 }`,
  php: `function($event) { return 0.5; }`,
  elixir: `0.5`,  // Elixir can return value directly
  go: `return 0.5`,
  dotnet: `return 0.5;`,
};

// Test code that accesses transaction name
const TRANSACTION_NAME_CODE: Record<string, string> = {
  javascript: `(event) => {
    const txName = event.transactionContext?.name || '';
    if (txName.includes('/payment')) {
      return 1.0;
    }
    return 0.1;
  }`,
  python: `def sampler(event):
    tx_name = event.get('transaction_context', {}).get('name', '')
    if '/payment' in tx_name:
        return 1.0
    return 0.1`,
  ruby: `lambda do |event|
    tx_name = event.dig(:transaction_context, :name) || ''
    if tx_name.include?('/payment')
      return 1.0
    end
    0.1
  end`,
  php: `function($event) {
    $txName = $event['transaction_context']['name'] ?? '';
    if (str_contains($txName, '/payment')) {
      return 1.0;
    }
    return 0.1;
  }`,
  elixir: `tx_name = get_in(event, [:transaction_context, :name]) || ""
  if String.contains?(tx_name, "/payment") do
    1.0
  else
    0.1
  end`,
  go: `txContext, _ := event["transactionContext"].(map[string]interface{})
  txName := ""
  if txContext != nil {
    txName, _ = txContext["name"].(string)
  }
  if strings.Contains(txName, "/payment") {
    return 1.0
  }
  return 0.1`,
  dotnet: `var txName = "";
  if (ev.Contexts.TryGetValue("transactionContext", out var txContext))
  {
    txName = txContext["name"]?.ToString() ?? "";
  }
  if (txName.Contains("/payment"))
  {
    return 1.0;
  }
  return 0.1;`,
};

// SDKs that support tracesSampler execution
const EXECUTABLE_SDKS = ['javascript', 'python', 'ruby', 'php', 'elixir', 'go', 'dotnet'];

// SDKs that use snake_case JSON keys
const SNAKE_CASE_SDKS = ['python', 'ruby', 'php', 'elixir'];

function getSamplingContext(sdk: string) {
  return SNAKE_CASE_SDKS.includes(sdk) ? SAMPLING_CONTEXT_SNAKE : SAMPLING_CONTEXT_CAMEL;
}

describe('TracesSampler Integration Tests', () => {
  // Increase timeout for integration tests (SDK containers may be slow)
  jest.setTimeout(30000);

  describe('Simple return value tests', () => {
    EXECUTABLE_SDKS.forEach((sdk) => {
      it(`${sdk}: should return 0.5 sample rate`, async () => {
        const code = SIMPLE_RETURN_CODE[sdk];
        if (!code) {
          console.log(`Skipping ${sdk} - no simple return code defined`);
          return;
        }

        const response = await request(app)
          .post('/api/transform')
          .send({
            sdk,
            event: getSamplingContext(sdk),
            beforeSendCode: code,
          })
          .set('Content-Type', 'application/json');

        // Log error details if failed
        if (!response.body.success) {
          console.error(`\n[${sdk}] Transformation failed:`);
          console.error('Error:', response.body.error);
          console.error('Traceback:', response.body.traceback);
        }

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.transformedEvent).toBe(0.5);
      });
    });
  });

  describe('Transaction name conditional tests', () => {
    EXECUTABLE_SDKS.forEach((sdk) => {
      it(`${sdk}: should return 1.0 for /payment endpoint`, async () => {
        const code = TRANSACTION_NAME_CODE[sdk];
        if (!code) {
          console.log(`Skipping ${sdk} - no transaction name code defined`);
          return;
        }

        const context = getSamplingContext(sdk);
        const response = await request(app)
          .post('/api/transform')
          .send({
            sdk,
            event: context,
            beforeSendCode: code,
          })
          .set('Content-Type', 'application/json');

        // Log error details if failed
        if (!response.body.success) {
          console.error(`\n[${sdk}] Transformation failed:`);
          console.error('Error:', response.body.error);
          console.error('Traceback:', response.body.traceback);
          console.error('Code:', code);
        }

        expect(response.status).toBe(200);
        expect(response.body.success).toBe(true);
        expect(response.body.transformedEvent).toBe(1.0);
      });
    });
  });

  describe('Edge cases', () => {
    it('javascript: should handle 0.0 sample rate (drop all)', async () => {
      const response = await request(app)
        .post('/api/transform')
        .send({
          sdk: 'javascript',
          event: SAMPLING_CONTEXT_CAMEL,
          beforeSendCode: `(event) => { return 0.0; }`,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transformedEvent).toBe(0.0);
    });

    it('javascript: should handle 1.0 sample rate (keep all)', async () => {
      const response = await request(app)
        .post('/api/transform')
        .send({
          sdk: 'javascript',
          event: SAMPLING_CONTEXT_CAMEL,
          beforeSendCode: `(event) => { return 1.0; }`,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transformedEvent).toBe(1.0);
    });

    it('python: should handle integer return as sample rate', async () => {
      const response = await request(app)
        .post('/api/transform')
        .send({
          sdk: 'python',
          event: SAMPLING_CONTEXT_SNAKE,
          beforeSendCode: `def sampler(event):
    return 1`,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should be 1 or 1.0
      expect(response.body.transformedEvent).toBe(1);
    });

    it('go: should handle integer return as sample rate', async () => {
      const response = await request(app)
        .post('/api/transform')
        .send({
          sdk: 'go',
          event: SAMPLING_CONTEXT_CAMEL,
          beforeSendCode: `return 1`,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transformedEvent).toBe(1);
    });

    it('dotnet: should handle integer return as sample rate', async () => {
      const response = await request(app)
        .post('/api/transform')
        .send({
          sdk: 'dotnet',
          event: SAMPLING_CONTEXT_CAMEL,
          beforeSendCode: `return 1;`,
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transformedEvent).toBe(1);
    });
  });
});
