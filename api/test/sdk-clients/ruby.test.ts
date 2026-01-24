import { transformWithRuby } from '../../src/sdk-clients/ruby';
import axios from 'axios';

jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('Ruby SDK Client', () => {
  beforeEach(() => {
    mockedAxios.post.mockClear();
  });

  it('should successfully transform event with Ruby SDK', async () => {
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
      lambda do |event, hint|
        event[:transformed] = true
        event
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

    const result = await transformWithRuby(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent?.transformed).toBe(true);
    expect(mockedAxios.post).toHaveBeenCalledWith(
      'http://sdk-ruby:5004/transform',
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
      lambda do |event, hint|
        nil
      end
    `;

    const expectedResponse = {
      success: true,
      transformedEvent: null,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithRuby(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toBeNull();
  });

  it('should handle SDK service errors', async () => {
    const event = { message: 'test' };
    const beforeSendCode = 'invalid ruby code';

    const expectedResponse = {
      success: false,
      error: 'Syntax error',
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithRuby(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it('should handle connection errors to SDK service', async () => {
    const event = { message: 'test' };
    const beforeSendCode = 'lambda { |e, h| e }';

    mockedAxios.post.mockRejectedValueOnce(new Error('Connection refused'));

    const result = await transformWithRuby(event, beforeSendCode);

    expect(result.success).toBe(false);
    expect(result.error).toContain('Failed to connect to Ruby SDK service');
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

    const result = await transformWithRuby(event, beforeSendCode);

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
    const beforeSendCode = 'lambda { |e, h| e }';

    const expectedResponse = {
      success: true,
      transformedEvent: event,
    };

    mockedAxios.post.mockResolvedValueOnce({ data: expectedResponse });

    const result = await transformWithRuby(event, beforeSendCode);

    expect(result.success).toBe(true);
    expect(result.transformedEvent).toEqual(event);
  });
});
