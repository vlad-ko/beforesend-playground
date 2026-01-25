import request from 'supertest';
import express from 'express';
import shareRouter from '../../src/routes/share';
import axios from 'axios';

// Mock axios to avoid actual API calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

const app = express();
app.use(express.json());
app.use('/api/share', shareRouter);

describe('Share Route', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/share', () => {
    it('should create a share link successfully', async () => {
      // Mock dpaste response
      mockedAxios.post.mockResolvedValue({
        data: 'https://dpaste.com/ABC123DEF.txt',
      });

      const response = await request(app)
        .post('/api/share')
        .send({
          sdk: 'javascript',
          sdkName: 'JavaScript',
          sdkPackage: '@sentry/node',
          sdkVersion: '8.55.0',
          event: {
            event_id: 'test-123',
            exception: {
              values: [{
                type: 'Error',
                value: 'Test error',
              }],
            },
          },
          beforeSendCode: '(event) => event',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('html_url');
      expect(response.body).toHaveProperty('id');
      expect(response.body.html_url).toBe('https://dpaste.com/ABC123DEF');
      expect(response.body.id).toBe('ABC123DEF');
    });

    it('should return 400 if sdk is missing', async () => {
      const response = await request(app)
        .post('/api/share')
        .send({
          event: { event_id: 'test' },
          beforeSendCode: '(event) => event',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 if event is missing', async () => {
      const response = await request(app)
        .post('/api/share')
        .send({
          sdk: 'javascript',
          sdkName: 'JavaScript',
          sdkPackage: '@sentry/node',
          sdkVersion: '8.55.0',
          beforeSendCode: '(event) => event',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should return 400 if beforeSendCode is missing', async () => {
      const response = await request(app)
        .post('/api/share')
        .send({
          sdk: 'javascript',
          sdkName: 'JavaScript',
          sdkPackage: '@sentry/node',
          sdkVersion: '8.55.0',
          event: { event_id: 'test' },
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Missing required fields');
    });

    it('should scrub sensitive data from event', async () => {
      mockedAxios.post.mockResolvedValue({
        data: 'https://dpaste.com/SCRUBTEST.txt',
      });

      const sensitiveEvent = {
        event_id: 'a1b2c3d4',
        user: {
          id: '12345',
          email: 'user@example.com',
          ip_address: '192.168.1.100',
        },
        exception: {
          values: [{
            type: 'ValueError',
            value: 'Credit card 4532-1234-5678-9010 is invalid',
          }],
        },
        extra: {
          api_key: 'sk_live_secret123',
          session_token: 'eyJhbGc...',
        },
      };

      await request(app)
        .post('/api/share')
        .send({
          sdk: 'javascript',
          sdkName: 'JavaScript',
          sdkPackage: '@sentry/node',
          sdkVersion: '8.55.0',
          event: sensitiveEvent,
          beforeSendCode: '(event) => event',
        })
        .set('Content-Type', 'application/json');

      // Verify axios was called with scrubbed content
      expect(mockedAxios.post).toHaveBeenCalled();
      const callArgs = mockedAxios.post.mock.calls[0];
      const formData = callArgs[1] as URLSearchParams;
      const content = formData.get('content');

      // Verify sensitive data is NOT in the content
      expect(content).not.toContain('user@example.com');
      expect(content).not.toContain('192.168.1.100');
      expect(content).not.toContain('4532-1234-5678-9010');
      expect(content).not.toContain('sk_live_secret123');
      expect(content).not.toContain('eyJhbGc...');

      // Verify structure indicators ARE in the content
      expect(content).toContain('<string>');
      expect(content).toContain('user');
      expect(content).toContain('email');
      expect(content).toContain('ip_address');
      expect(content).toContain('api_key');
    });

    it('should include SDK information in paste', async () => {
      mockedAxios.post.mockResolvedValue({
        data: 'https://dpaste.com/SDKTEST.txt',
      });

      await request(app)
        .post('/api/share')
        .send({
          sdk: 'python',
          sdkName: 'Python',
          sdkPackage: 'sentry-sdk',
          sdkVersion: '2.20.0',
          event: { event_id: 'test' },
          beforeSendCode: 'def before_send(event, hint):\n  return event',
        })
        .set('Content-Type', 'application/json');

      const callArgs = mockedAxios.post.mock.calls[0];
      const formData = callArgs[1] as URLSearchParams;
      const content = formData.get('content');

      expect(content).toContain('SDK: Python');
      expect(content).toContain('sentry-sdk 2.20.0');
    });

    it('should include beforeSend code unchanged', async () => {
      mockedAxios.post.mockResolvedValue({
        data: 'https://dpaste.com/CODETEST.txt',
      });

      const beforeSendCode = `(event, hint) => {
  // Custom transformation
  event.tags = { ...event.tags, custom: 'value' };
  return event;
}`;

      await request(app)
        .post('/api/share')
        .send({
          sdk: 'javascript',
          sdkName: 'JavaScript',
          sdkPackage: '@sentry/node',
          sdkVersion: '8.55.0',
          event: { event_id: 'test' },
          beforeSendCode,
        })
        .set('Content-Type', 'application/json');

      const callArgs = mockedAxios.post.mock.calls[0];
      const formData = callArgs[1] as URLSearchParams;
      const content = formData.get('content');

      expect(content).toContain(beforeSendCode);
      expect(content).toContain('Custom transformation');
    });

    it('should handle dpaste API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue({
        response: {
          data: { message: 'dpaste service unavailable' },
        },
      });

      const response = await request(app)
        .post('/api/share')
        .send({
          sdk: 'javascript',
          sdkName: 'JavaScript',
          sdkPackage: '@sentry/node',
          sdkVersion: '8.55.0',
          event: { event_id: 'test' },
          beforeSendCode: '(event) => event',
        })
        .set('Content-Type', 'application/json');

      expect(response.status).toBe(500);
      expect(response.body.error).toBe('Failed to create paste');
    });

    it('should scrub arrays correctly', async () => {
      mockedAxios.post.mockResolvedValue({
        data: 'https://dpaste.com/ARRAYTEST.txt',
      });

      const eventWithArrays = {
        exception: {
          values: [
            { type: 'Error1', value: 'Message 1' },
            { type: 'Error2', value: 'Message 2' },
          ],
        },
        breadcrumbs: [
          { message: 'Breadcrumb 1', timestamp: 123456 },
          { message: 'Breadcrumb 2', timestamp: 123457 },
        ],
      };

      await request(app)
        .post('/api/share')
        .send({
          sdk: 'javascript',
          sdkName: 'JavaScript',
          sdkPackage: '@sentry/node',
          sdkVersion: '8.55.0',
          event: eventWithArrays,
          beforeSendCode: '(event) => event',
        })
        .set('Content-Type', 'application/json');

      const callArgs = mockedAxios.post.mock.calls[0];
      const formData = callArgs[1] as URLSearchParams;
      const content = formData.get('content');

      // Arrays should show structure of first item + "..."
      expect(content).toContain('"..."');
      expect(content).not.toContain('Message 1');
      expect(content).not.toContain('Message 2');
      expect(content).not.toContain('Breadcrumb 1');
    });

    it('should scrub nested objects correctly', async () => {
      mockedAxios.post.mockResolvedValue({
        data: 'https://dpaste.com/NESTEDTEST.txt',
      });

      const eventWithNested = {
        contexts: {
          app: {
            app_name: 'MyApp',
            app_version: '1.0.0',
          },
          device: {
            model: 'iPhone 12',
            os: 'iOS 15.0',
          },
        },
      };

      await request(app)
        .post('/api/share')
        .send({
          sdk: 'javascript',
          sdkName: 'JavaScript',
          sdkPackage: '@sentry/node',
          sdkVersion: '8.55.0',
          event: eventWithNested,
          beforeSendCode: '(event) => event',
        })
        .set('Content-Type', 'application/json');

      const callArgs = mockedAxios.post.mock.calls[0];
      const formData = callArgs[1] as URLSearchParams;
      const content = formData.get('content');

      // Structure should be preserved
      expect(content).toContain('contexts');
      expect(content).toContain('app');
      expect(content).toContain('device');
      expect(content).toContain('app_name');
      expect(content).toContain('model');

      // Values should be scrubbed
      expect(content).not.toContain('MyApp');
      expect(content).not.toContain('1.0.0');
      expect(content).not.toContain('iPhone 12');
      expect(content).not.toContain('iOS 15.0');
      expect(content).toContain('<string>');
    });

    it('should include PII warning in paste content', async () => {
      mockedAxios.post.mockResolvedValue({
        data: 'https://dpaste.com/WARNING.txt',
      });

      await request(app)
        .post('/api/share')
        .send({
          sdk: 'javascript',
          sdkName: 'JavaScript',
          sdkPackage: '@sentry/node',
          sdkVersion: '8.55.0',
          event: { event_id: 'test' },
          beforeSendCode: '(event) => event',
        })
        .set('Content-Type', 'application/json');

      const callArgs = mockedAxios.post.mock.calls[0];
      const formData = callArgs[1] as URLSearchParams;
      const content = formData.get('content');

      expect(content).toContain('NOTE: Original values have been removed to prevent accidental PII sharing');
    });
  });
});
