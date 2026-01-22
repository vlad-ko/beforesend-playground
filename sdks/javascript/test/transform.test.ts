import request from 'supertest';
import express from 'express';
import cors from 'cors';

// We'll test the actual server once it's built
// For now, these are TDD tests that describe the desired behavior

describe('JavaScript SDK Transform Service', () => {
  let app: express.Application;

  beforeAll(() => {
    // This will fail until we build the actual service
    // This is intentional - it's TDD!
    try {
      const server = require('../src/index');
      app = server.app || server.default;
    } catch (e) {
      // Service not yet refactored to export app
      // We'll fix this when implementing
      app = express();
      app.use(cors());
      app.use(express.json({ limit: '10mb' }));

      // Mock endpoint for testing
      app.post('/transform', (req, res) => {
        res.status(501).json({ success: false, error: 'Not implemented' });
      });
    }
  });

  describe('POST /transform', () => {
    it('should transform event with valid beforeSend code', async () => {
      const event = {
        exception: {
          values: [{
            type: 'Error',
            value: 'Original error',
          }],
        },
      };

      const beforeSendCode = `(event, hint) => {
        event.exception.values[0].value = 'Modified error';
        return event;
      }`;

      const response = await request(app)
        .post('/transform')
        .send({ event, beforeSendCode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transformedEvent).toBeDefined();
      expect(response.body.transformedEvent.exception.values[0].value).toBe('Modified error');
    });

    it('should handle beforeSend that returns null (drop event)', async () => {
      const event = {
        exception: {
          values: [{
            type: 'Error',
            value: 'Test error',
          }],
        },
      };

      const beforeSendCode = '(event, hint) => null';

      const response = await request(app)
        .post('/transform')
        .send({ event, beforeSendCode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transformedEvent).toBeNull();
    });

    it('should handle beforeSend with async operations', async () => {
      const event = {
        exception: {
          values: [{
            type: 'Error',
            value: 'Test error',
          }],
        },
      };

      const beforeSendCode = `async (event, hint) => {
        await new Promise(resolve => setTimeout(resolve, 10));
        event.async = true;
        return event;
      }`;

      const response = await request(app)
        .post('/transform')
        .send({ event, beforeSendCode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transformedEvent?.async).toBe(true);
    });

    it('should return 400 for missing event', async () => {
      const response = await request(app)
        .post('/transform')
        .send({ beforeSendCode: '(event) => event' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing');
    });

    it('should return 400 for missing beforeSendCode', async () => {
      const response = await request(app)
        .post('/transform')
        .send({ event: {} });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Missing');
    });

    it('should return 400 for invalid beforeSend code syntax', async () => {
      const event = {
        exception: {
          values: [{
            type: 'Error',
            value: 'Test error',
          }],
        },
      };

      const beforeSendCode = 'invalid javascript syntax {{{';

      const response = await request(app)
        .post('/transform')
        .send({ event, beforeSendCode });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('parse');
    });

    it('should return 500 for runtime errors in beforeSend', async () => {
      const event = {
        exception: {
          values: [{
            type: 'Error',
            value: 'Test error',
          }],
        },
      };

      const beforeSendCode = `(event, hint) => {
        throw new Error('Runtime error');
      }`;

      const response = await request(app)
        .post('/transform')
        .send({ event, beforeSendCode });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('Transformation error');
    });

    it('should preserve event structure when beforeSend returns event unchanged', async () => {
      const event = {
        event_id: '123',
        exception: {
          values: [{
            type: 'Error',
            value: 'Test error',
            stacktrace: {
              frames: [
                { filename: 'app.js', lineno: 10 },
              ],
            },
          }],
        },
        contexts: {
          browser: { name: 'Chrome', version: '120' },
        },
      };

      const beforeSendCode = '(event, hint) => event';

      const response = await request(app)
        .post('/transform')
        .send({ event, beforeSendCode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transformedEvent).toEqual(event);
    });

    it('should handle beforeSend that adds custom properties', async () => {
      const event = {
        exception: {
          values: [{
            type: 'Error',
            value: 'Test error',
          }],
        },
      };

      const beforeSendCode = `(event, hint) => {
        event.tags = { custom: 'tag' };
        event.extra = { info: 'data' };
        return event;
      }`;

      const response = await request(app)
        .post('/transform')
        .send({ event, beforeSendCode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.transformedEvent?.tags).toEqual({ custom: 'tag' });
      expect(response.body.transformedEvent?.extra).toEqual({ info: 'data' });
    });

    it('should handle beforeSend with complex logic', async () => {
      const event = {
        exception: {
          values: [{
            type: 'Error',
            value: 'FATAL EXCEPTION [Thread-94] Unity version : 6000.2.14f1 Device model : realme',
          }],
        },
      };

      const beforeSendCode = `(event, hint) => {
        if (event.exception && event.exception.values) {
          for (const exception of event.exception.values) {
            if (exception.value && exception.value.includes('Unity version')) {
              const match = exception.value.match(/([\\w\\.]+(?:Exception|Error))/);
              if (match) {
                exception.type = match[1];
                exception.value = match[1];
              } else {
                exception.type = 'NativeCrash';
                exception.value = 'Android Native Crash';
              }
            }
          }
        }
        return event;
      }`;

      const response = await request(app)
        .post('/transform')
        .send({ event, beforeSendCode });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      // Should transform to simpler title since no exception type found in this example
      expect(response.body.transformedEvent?.exception.values[0].type).toBe('NativeCrash');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.sdk).toBe('javascript');
    });
  });
});
