import { transformWithGo } from '../../src/sdk-clients/go';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Go SDK Client', () => {
  beforeEach(() => {
    mockedAxios.post.mockClear();
  });

  it('should successfully transform event with Go SDK', async () => {
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
      func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
        event.Tags["transformed"] = "true"
        return event
      }
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
        Tags: { transformed: 'true' },
      },
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithGo(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent?.Tags?.transformed).toBe('true');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://sdk-go:5006/transform',
      {
        event,
        beforeSendCode,
      },
      expect.objectContaining({
        timeout: 30000,
      })
    );
  });

  it('should handle transformation that returns nil (event dropped)', async () => {
    const event = { message: 'test' };
    const beforeSendCode = `
      func(event *sentry.Event, hint *sentry.EventHint) *sentry.Event {
        return nil
      }
    `;

    const expectedResponse = {
      success: true,
      transformedEvent: null,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithGo(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toBeNull();
  });

  it('should handle SDK service errors', async () => {
    const event = { message: 'test' };
    const beforeSendCode = 'invalid go code';

    const expectedResponse = {
      success: false,
      error: 'Syntax error',
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithGo(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle connection errors to SDK service', async () => {
    const event = { message: 'test' };
    const beforeSendCode = 'func(e *sentry.Event, h *sentry.EventHint) *sentry.Event { return e }';

    mockedAxios.post.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await transformWithGo(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to connect to Go SDK service');
  });

  it('should handle HTTP error responses', async () => {
    const event = { message: 'test' };
    const beforeSendCode = 'invalid';

    const errorResponse = {
      success: false,
      error: 'Syntax error',
    };

    mockedAxios.post.mockRejectedValueOnce({
      response: { data: errorResponse },
    });

    const result = await transformWithGo(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBe('Syntax error');
  });

  it('should pass through complex event structures', async () => {
    const event = {
      exception: { values: [{ type: 'Error', value: 'Test' }] },
      breadcrumbs: [{ message: 'Test breadcrumb' }],
      user: { id: '123', email: 'test@example.com' },
      tags: { environment: 'test' },
    };
    const beforeSendCode = 'func(e *sentry.Event, h *sentry.EventHint) *sentry.Event { return e }';

    const expectedResponse = {
      success: true,
      transformedEvent: event,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithGo(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toEqual(event);
  });
});
