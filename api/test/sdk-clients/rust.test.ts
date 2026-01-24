import { transformWithRust } from '../../src/sdk-clients/rust';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Rust SDK Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully transform event with Rust SDK', async () => {
    const event = {
      exception: {
        values: [{
          type: 'Error',
          value: 'Test error',
        }],
      },
    };

    const beforeSendCode = 'event.insert("transformed".to_string(), serde_json::json!(true)); event';

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

    const result = await transformWithRust(event, beforeSendCode);

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

  it('should handle transformation that returns None (event dropped)', async () => {
    const event = {
      exception: {
        values: [{
          type: 'Error',
          value: 'Test error',
        }],
      },
    };

    const beforeSendCode = 'None';

    const expectedResponse = {
      success: true,
      transformedEvent: null,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithRust(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toBeNull();
  });

  it('should handle SDK service errors', async () => {
    const event = { exception: { values: [{ type: 'Error', value: 'Test' }] } };
    const beforeSendCode = 'invalid rust code';

    const errorResponse = {
      success: false,
      error: 'Failed to compile beforeSend code: expected expression, found keyword `fn`',
    };

    mockedAxios.post.mockResolvedValueOnce({ data: errorResponse });

    const result = await transformWithRust(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to compile');
  });

  it('should handle connection errors to SDK service', async () => {
    const event = { exception: { values: [{ type: 'Error', value: 'Test' }] } };
    const beforeSendCode = 'event';

    mockedAxios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await transformWithRust(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to connect');
  });

  it('should handle HTTP error responses', async () => {
    const event = { exception: { values: [{ type: 'Error', value: 'Test' }] } };
    const beforeSendCode = 'event';

    const errorResponse = {
      response: {
        data: {
          success: false,
          error: 'Compilation timeout',
        },
      },
    };

    mockedAxios.post.mockRejectedValueOnce(errorResponse);

    const result = await transformWithRust(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Compilation timeout');
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
              { filename: 'main.rs', lineno: 42, colno: 5 },
            ],
          },
        }],
      },
      contexts: {
        device: { model: 'Linux' },
      },
      tags: { environment: 'production' },
    };

    const beforeSendCode = 'event';

    const expectedResponse = {
      success: true,
      transformedEvent: event,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithRust(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toEqual(event);
  });
});
