import { transformWithPython } from '../../src/sdk-clients/python';
import axios from 'axios';

// Mock axios
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Python SDK Client', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should successfully transform event with Python SDK', async () => {
    const event = {
      exception: {
        values: [{
          type: 'ValueError',
          value: 'Test error',
        }],
      },
    };

    const beforeSendCode = `
def before_send(event, hint):
    event['transformed'] = True
    return event
`;

    const expectedResponse = {
      success: true,
      transformedEvent: {
        exception: {
          values: [{
            type: 'ValueError',
            value: 'Test error',
          }],
        },
        transformed: true,
      },
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithPython(event, beforeSendCode);

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
          type: 'ValueError',
          value: 'Test error',
        }],
      },
    };

    const beforeSendCode = `
def before_send(event, hint):
    return None
`;

    const expectedResponse = {
      success: true,
      transformedEvent: null,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithPython(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toBeNull();
  });

  it('should handle Python syntax errors', async () => {
    const event = { exception: { values: [{ type: 'ValueError', value: 'Test' }] } };
    const beforeSendCode = 'invalid python syntax';

    const errorResponse = {
      success: false,
      error: 'Failed to parse beforeSend code: SyntaxError',
      traceback: 'Traceback (most recent call last)...',
    };

    mockedAxios.post.mockResolvedValueOnce({ data: errorResponse });

    const result = await transformWithPython(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to parse');
  });

  it('should handle runtime errors in beforeSend code', async () => {
    const event = { exception: { values: [{ type: 'ValueError', value: 'Test' }] } };
    const beforeSendCode = `
def before_send(event, hint):
    raise Exception("Runtime error")
    return event
`;

    const errorResponse = {
      success: false,
      error: 'Transformation error: Runtime error',
      traceback: 'Traceback (most recent call last)...',
      transformedEvent: null,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: errorResponse });

    const result = await transformWithPython(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Transformation error');
    expect(result.traceback).toBeDefined();
  });

  it('should handle connection errors to Python SDK service', async () => {
    const event = { exception: { values: [{ type: 'ValueError', value: 'Test' }] } };
    const beforeSendCode = 'def before_send(event, hint): return event';

    mockedAxios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await transformWithPython(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.error).toContain('Failed to connect');
  });

  it('should pass through complex event structures with Python', async () => {
    const event = {
      event_id: '456',
      exception: {
        values: [{
          type: 'ValueError',
          value: 'Complex error',
          stacktrace: {
            frames: [
              { filename: 'test.py', lineno: 20, function: 'test_func' },
            ],
          },
        }],
      },
      contexts: {
        os: { name: 'Linux', version: '5.10' },
      },
      tags: { environment: 'staging' },
    };

    const beforeSendCode = 'def before_send(event, hint): return event';

    const expectedResponse = {
      success: true,
      transformedEvent: event,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithPython(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toEqual(event);
  });
});
