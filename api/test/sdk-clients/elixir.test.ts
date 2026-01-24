import { transformWithElixir } from '../../src/sdk-clients/elixir';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Elixir SDK Client', () => {
  beforeEach(() => {
    mockedAxios.post.mockClear();
  });

  it('should successfully transform event with Elixir SDK', async () => {
    const event = {
      exception: {
        values: [
          {
            type: 'Error',
            value: 'Test error',
          },
        ],
      },
    };
    const beforeSendCode = `
      fn event, _hint ->
        event
        |> Map.put(:transformed, true)
      end
    `;

    const expectedResponse = {
      success: true,
      transformedEvent: {
        exception: {
          values: [
            {
              type: 'Error',
              value: 'Test error',
            },
          ],
        },
        transformed: true,
      },
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithElixir(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent?.transformed).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://sdk-elixir:5011/transform',
      {
        event,
        beforeSendCode,
      },
      expect.objectContaining({
        timeout: 10000,
      })
    );
  });

  it('should handle transformation that returns nil (event dropped)', async () => {
    const event = { message: 'test' };
    const beforeSendCode = `
      fn _event, _hint -> nil end
    `;

    const expectedResponse = {
      success: true,
      transformedEvent: null,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithElixir(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toBeNull();
  });

  it('should handle SDK service errors', async () => {
    const event = { message: 'test' };
    const beforeSendCode = 'invalid elixir code';

    const expectedResponse = {
      success: false,
      error: 'Syntax error: unexpected token',
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithElixir(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Syntax error');
  });

  it('should handle connection errors to SDK service', async () => {
    const event = { message: 'test' };
    const beforeSendCode = 'fn event, _hint -> event end';

    mockedAxios.post.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const result = await transformWithElixir(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to connect to Elixir SDK service');
  });

  it('should handle HTTP error responses', async () => {
    const event = { message: 'test' };
    const beforeSendCode = 'fn event, _hint -> event end';

    const errorResponse = {
      success: false,
      error: 'Internal server error',
    };

    mockedAxios.post.mockRejectedValueOnce({
      response: {
        data: errorResponse,
      },
    });

    const result = await transformWithElixir(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Internal server error');
  });

  it('should pass through complex event structures', async () => {
    const event = {
      event_id: 'test-123',
      timestamp: '2024-01-01T00:00:00Z',
      exception: {
        values: [
          {
            type: 'RuntimeError',
            value: 'Invalid input',
            stacktrace: {
              frames: [{ filename: 'lib/app.ex', lineno: 10 }],
            },
          },
        ],
      },
      tags: { environment: 'test' },
      user: { id: '123' },
    };
    const beforeSendCode = 'fn event, _hint -> event end';

    const expectedResponse = {
      success: true,
      transformedEvent: event,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithElixir(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toEqual(event);
  });
});
