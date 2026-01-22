import { transformWithJavaScript } from '../../src/sdk-clients/javascript';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('JavaScript SDK Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully transform event with JavaScript SDK', async () => {
    const event = {
      exception: {
        values: [{
          type: 'Error',
          value: 'Test error',
        }],
      },
    };

    const beforeSendCode = '(event) => { event.transformed = true; return event; }';

    const expectedResponse = {
      success: true,
      transformedEvent: {
        exception: {
          values: [{
            type: 'Error',
            value: 'Test error',
          }],
        },
        transformed: true,
      },
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithJavaScript(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toBeDefined();
    expect(result.transformedEvent?.transformed).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      expect.stringContaining('/transform'),
      {
        event,
        beforeSendCode,
      },
      expect.objectContaining({
        timeout: 10000,
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('should handle transformation that returns null (event dropped)', async () => {
    const event = {
      exception: {
        values: [{
          type: 'Error',
          value: 'Test error',
        }],
      },
    };

    const beforeSendCode = '(event) => null';

    const expectedResponse = {
      success: true,
      transformedEvent: null,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithJavaScript(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toBeNull();
  });

  it('should handle SDK service errors', async () => {
    const event = { exception: { values: [{ type: 'Error', value: 'Test' }] } };
    const beforeSendCode = 'invalid code';

    const errorResponse = {
      success: false,
      error: 'Failed to parse beforeSend code: SyntaxError',
    };

    mockedAxios.post.mockResolvedValueOnce({ data: errorResponse });

    const result = await transformWithJavaScript(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to parse');
  });

  it('should handle connection errors to SDK service', async () => {
    const event = { exception: { values: [{ type: 'Error', value: 'Test' }] } };
    const beforeSendCode = '(event) => event';

    mockedAxios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await transformWithJavaScript(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to connect');
  });

  it('should handle HTTP error responses', async () => {
    const event = { exception: { values: [{ type: 'Error', value: 'Test' }] } };
    const beforeSendCode = '(event) => event';

    const errorResponse = {
      response: {
        data: {
          success: false,
          error: 'Timeout error',
        },
      },
    };

    mockedAxios.post.mockRejectedValueOnce(errorResponse);

    const result = await transformWithJavaScript(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Timeout error');
  });

  it('should pass through complex event structures', async () => {
    const event = {
      event_id: '123',
      exception: {
        values: [{
          type: 'Error',
          value: 'Complex error',
          stacktrace: {
            frames: [
              { filename: 'test.js', lineno: 10, colno: 5 },
            ],
          },
        }],
      },
      contexts: {
        device: { model: 'iPhone' },
      },
      tags: { environment: 'production' },
    };

    const beforeSendCode = '(event) => event';

    const expectedResponse = {
      success: true,
      transformedEvent: event,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithJavaScript(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toEqual(event);
  });
});
