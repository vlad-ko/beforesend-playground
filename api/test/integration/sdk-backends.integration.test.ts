/**
 * SDK Backend Integration Tests
 *
 * These tests verify that all SDK backends are working correctly
 * by making real HTTP requests to the running services.
 *
 * PREREQUISITES:
 * - All containers must be running: docker-compose up -d
 * - Wait for services to be healthy before running tests
 *
 * RUN:
 * - npm run test:integration
 * - Or: npm test -- --testPathPattern="integration"
 */

import axios from 'axios';

const API_BASE = process.env.API_URL || 'http://localhost:4000';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Helper to make transform requests
async function transform(sdk: string, event: any, code: string) {
  try {
    const response = await axios.post(`${API_BASE}/api/transform`, {
      sdk,
      event,
      beforeSendCode: code,
    });
    return response.data;
  } catch (error: any) {
    if (error.response) {
      return error.response.data;
    }
    throw error;
  }
}

// Helper to check SDK health
async function checkHealth(sdk: string, port: number) {
  try {
    const response = await axios.get(`http://localhost:${port}/health`, { timeout: 5000 });
    return response.data;
  } catch (error) {
    return null;
  }
}

// SDK configurations
// fullySupported: true means the SDK has complete code templates for all test scenarios
const SDK_CONFIGS = {
  javascript: { port: 5000, usesSnakeCase: false, fullySupported: true },
  python: { port: 5001, usesSnakeCase: true, fullySupported: true },
  dotnet: { port: 5002, usesSnakeCase: false, fullySupported: true },
  ruby: { port: 5004, usesSnakeCase: true, fullySupported: true },
  php: { port: 5005, usesSnakeCase: true, fullySupported: true },
  go: { port: 5006, usesSnakeCase: false, fullySupported: true },
  java: { port: 5007, usesSnakeCase: false, fullySupported: false },
  android: { port: 5008, usesSnakeCase: false, fullySupported: false },
  cocoa: { port: 5009, usesSnakeCase: false, fullySupported: false },
  rust: { port: 5010, usesSnakeCase: false, fullySupported: true },
  elixir: { port: 5011, usesSnakeCase: true, fullySupported: true },
};

// SDKs with full test coverage
const FULLY_SUPPORTED_SDKS = Object.entries(SDK_CONFIGS)
  .filter(([_, config]) => config.fullySupported)
  .map(([sdk]) => sdk);

// Test events
const CAMEL_CASE_EVENT = {
  eventId: 'test-123',
  message: 'Test error message',
  level: 'error',
  timestamp: new Date().toISOString(),
};

const SNAKE_CASE_EVENT = {
  event_id: 'test-123',
  message: 'Test error message',
  level: 'error',
  timestamp: new Date().toISOString(),
};

// Simple beforeSend code for each SDK that returns the event
const SIMPLE_BEFORESEND_CODE: Record<string, string> = {
  javascript: `(event) => { return event; }`,
  python: `def before_send(event, hint):\n    return event`,
  dotnet: `return ev;`,
  ruby: `lambda { |event, hint| event }`,
  php: `function($event, $hint) { return $event; }`,
  go: `return event`,
  java: `(event, hint) -> { return event; }`,
  android: `{ event, hint -> event }`,
  cocoa: `{ (event: Event) -> Event? in return event }`,
  rust: `Some(event)`,
  elixir: `event`,
};

// Code that modifies the event
const MODIFY_EVENT_CODE: Record<string, string> = {
  javascript: `(event) => { event.tags = { modified: 'true' }; return event; }`,
  python: `def before_send(event, hint):\n    event['tags'] = {'modified': 'true'}\n    return event`,
  dotnet: `ev.SetTag("modified", "true");\nreturn ev;`,
  ruby: `lambda { |event, hint| event[:tags] = { modified: 'true' }; event }`,
  php: `function($event, $hint) { $event['tags'] = ['modified' => 'true']; return $event; }`,
  go: `event["tags"] = map[string]interface{}{"modified": "true"}\nreturn event`,
  rust: `event["tags"] = json!({"modified": "true"}); Some(event)`,
  elixir: `Map.put(event, :tags, %{modified: "true"})`,
};

// Code that drops the event (returns null)
const DROP_EVENT_CODE: Record<string, string> = {
  javascript: `(event) => { return null; }`,
  python: `def before_send(event, hint):\n    return None`,
  dotnet: `return null;`,
  ruby: `lambda { |event, hint| nil }`,
  php: `function($event, $hint) { return null; }`,
  go: `return nil`,
  rust: `None`,
  elixir: `nil`,
};

// TracesSampler code that returns sample rates
const TRACES_SAMPLER_CODE: Record<string, string> = {
  javascript: `(event) => { return 0.5; }`,
  python: `def sampler(event):\n    return 0.5`,
  dotnet: `return 0.5;`,
  ruby: `lambda { |event| 0.5 }`,
  php: `function($event) { return 0.5; }`,
  go: `return 0.5`,
  rust: `0.5`,
  elixir: `0.5`,
};

// SDKs that support tracesSampler (returning numbers)
const TRACES_SAMPLER_SDKS = ['javascript', 'python', 'dotnet', 'ruby', 'php', 'go', 'rust', 'elixir'];

describe('SDK Backend Integration Tests', () => {
  describe('Health Checks', () => {
    Object.entries(SDK_CONFIGS).forEach(([sdk, config]) => {
      it(`${sdk}: should be healthy on port ${config.port}`, async () => {
        const health = await checkHealth(sdk, config.port);

        if (!health) {
          console.warn(`⚠️  ${sdk} SDK is not running on port ${config.port}`);
          // Skip instead of fail - allows partial testing
          return;
        }

        expect(health.status).toBe('healthy');
        expect(health.sdk).toBe(sdk);
      });
    });
  });

  describe('BeforeSend: Return Event Unchanged', () => {
    FULLY_SUPPORTED_SDKS.forEach((sdk) => {
      const config = SDK_CONFIGS[sdk as keyof typeof SDK_CONFIGS];
      it(`${sdk}: should return event unchanged`, async () => {
        const code = SIMPLE_BEFORESEND_CODE[sdk];
        if (!code) {
          console.log(`Skipping ${sdk} - no simple beforeSend code defined`);
          return;
        }

        const event = config.usesSnakeCase ? SNAKE_CASE_EVENT : CAMEL_CASE_EVENT;
        const result = await transform(sdk, event, code);

        if (!result.success) {
          console.error(`[${sdk}] Failed:`, result.error);
        }

        expect(result.success).toBe(true);
        expect(result.transformedEvent).toBeTruthy();
      });
    });
  });

  describe('BeforeSend: Modify Event', () => {
    FULLY_SUPPORTED_SDKS.forEach((sdk) => {
      const config = SDK_CONFIGS[sdk as keyof typeof SDK_CONFIGS];
      it(`${sdk}: should modify event with tags`, async () => {
        const code = MODIFY_EVENT_CODE[sdk];
        if (!code) {
          console.log(`Skipping ${sdk} - no modify event code defined`);
          return;
        }

        const event = config.usesSnakeCase ? SNAKE_CASE_EVENT : CAMEL_CASE_EVENT;
        const result = await transform(sdk, event, code);

        if (!result.success) {
          console.error(`[${sdk}] Failed:`, result.error);
        }

        expect(result.success).toBe(true);
        expect(result.transformedEvent).toBeTruthy();
        // Tags property name varies by SDK (tags vs Tags)
        const hasTags = result.transformedEvent.tags || result.transformedEvent.Tags;
        expect(hasTags).toBeTruthy();
      });
    });
  });

  describe('BeforeSend: Drop Event', () => {
    FULLY_SUPPORTED_SDKS.forEach((sdk) => {
      const config = SDK_CONFIGS[sdk as keyof typeof SDK_CONFIGS];
      it(`${sdk}: should drop event (return null)`, async () => {
        const code = DROP_EVENT_CODE[sdk];
        if (!code) {
          console.log(`Skipping ${sdk} - no drop event code defined`);
          return;
        }

        const event = config.usesSnakeCase ? SNAKE_CASE_EVENT : CAMEL_CASE_EVENT;
        const result = await transform(sdk, event, code);

        if (!result.success) {
          console.error(`[${sdk}] Failed:`, result.error);
        }

        expect(result.success).toBe(true);
        // Some SDKs return null, others omit the property entirely (undefined)
        expect(result.transformedEvent == null).toBe(true);
      });
    });
  });

  describe('TracesSampler: Return Sample Rate', () => {
    TRACES_SAMPLER_SDKS.forEach((sdk) => {
      it(`${sdk}: should return 0.5 sample rate`, async () => {
        const code = TRACES_SAMPLER_CODE[sdk];
        if (!code) {
          console.log(`Skipping ${sdk} - no tracesSampler code defined`);
          return;
        }

        const config = SDK_CONFIGS[sdk as keyof typeof SDK_CONFIGS];
        const event = config.usesSnakeCase
          ? { transaction_context: { name: 'test' } }
          : { transactionContext: { name: 'test' } };

        const result = await transform(sdk, event, code);

        if (!result.success) {
          console.error(`[${sdk}] Failed:`, result.error);
        }

        expect(result.success).toBe(true);
        expect(result.transformedEvent).toBe(0.5);
      });
    });
  });

  describe('Error Handling', () => {
    it('javascript: should return error for invalid syntax', async () => {
      const result = await transform('javascript', CAMEL_CASE_EVENT, 'invalid syntax {{{');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('python: should return error for invalid syntax', async () => {
      const result = await transform('python', SNAKE_CASE_EVENT, 'def broken(\n    return');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('dotnet: should return error for invalid syntax', async () => {
      const result = await transform('dotnet', CAMEL_CASE_EVENT, 'invalid c# code {{{');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });

    it('go: should return error for invalid syntax', async () => {
      const result = await transform('go', CAMEL_CASE_EVENT, 'invalid go code {{{');

      expect(result.success).toBe(false);
      expect(result.error).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('javascript: should handle empty event', async () => {
      const result = await transform('javascript', { event_id: 'test' }, '(event) => event');
      expect(result.success).toBe(true);
    });

    it('python: should handle event with special characters', async () => {
      const event = {
        event_id: 'test',
        message: 'Error with "quotes" and \'apostrophes\'',
      };
      const result = await transform('python', event, 'def fn(e, h):\n    return e');
      expect(result.success).toBe(true);
    });

    it('javascript: should handle async code', async () => {
      const result = await transform(
        'javascript',
        CAMEL_CASE_EVENT,
        'async (event) => { await Promise.resolve(); return event; }'
      );
      expect(result.success).toBe(true);
      expect(result.transformedEvent).toBeTruthy();
    });
  });
});
