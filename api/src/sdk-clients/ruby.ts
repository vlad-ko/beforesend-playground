import axios from 'axios';

const RUBY_SDK_URL = process.env.RUBY_SDK_URL || 'http://sdk-ruby:5004';

export interface TransformRequest {
  event: Record<string, any>;
  beforeSendCode: string;
}

export interface TransformResponse {
  success: boolean;
  transformedEvent?: Record<string, any> | null;
  error?: string;
  traceback?: string;
}

export async function transformWithRuby(
  event: Record<string, any>,
  beforeSendCode: string
): Promise<TransformResponse> {
  try {
    const response = await axios.post<TransformResponse>(
      `${RUBY_SDK_URL}/transform`,
      {
        event,
        beforeSendCode,
      },
      {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      return error.response.data;
    }

    return {
      success: false,
      error: `Failed to connect to Ruby SDK service: ${error.message}`,
    };
  }
}
