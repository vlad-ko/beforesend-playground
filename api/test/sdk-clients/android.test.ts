import { transformWithAndroid } from '../../src/sdk-clients/android';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Android SDK Client', () => {
  beforeEach(() => {
    mockedAxios.post.mockClear();
  });

  it('should successfully transform event with Android SDK', async () => {
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
      { event, hint ->
        event.setTag("transformed", "true")
        event
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
        tags: { transformed: 'true' },
      },
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithAndroid(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent?.tags?.transformed).toBe('true');
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://sdk-android:5008/transform',
      {
        event,
        beforeSendCode,
      },
      expect.objectContaining({
        timeout: 10000,
      })
    );
  });

  it('should handle transformation that returns null (event dropped)', async () => {
    const event = { message: 'test' };
    const beforeSendCode = `
      { event, hint ->
        null
      }
    `;

    const expectedResponse = {
      success: true,
      transformedEvent: null,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithAndroid(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toBeNull();
  });

  it('should handle SDK service errors', async () => {
    const event = { message: 'test' };
    const beforeSendCode = 'invalid kotlin code';

    const expectedResponse = {
      success: false,
      error: 'Syntax error',
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithAndroid(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle connection errors to SDK service', async () => {
    const event = { message: 'test' };
    const beforeSendCode = '{ e, h -> e }';

    mockedAxios.post.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await transformWithAndroid(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to connect to Android SDK service');
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

    const result = await transformWithAndroid(event, beforeSendCode);

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
    const beforeSendCode = '{ e, h -> e }';

    const expectedResponse = {
      success: true,
      transformedEvent: event,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithAndroid(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toEqual(event);
  });
});
