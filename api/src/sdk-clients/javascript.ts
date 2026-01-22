import axios from 'axios';

const JAVASCRIPT_SDK_URL = process.env.JAVASCRIPT_SDK_URL || 'http://sdk-javascript:5000';

export interface TransformRequest {
  event: Record<string, any>;
  beforeSendCode: string;
}

export interface TransformResponse {
  success: boolean;
  transformedEvent?: Record<string, any> | null;
  error?: string;
}

export async function transformWithJavaScript(
  event: Record<string, any>,
  beforeSendCode: string
): Promise<TransformResponse> {
  try {
    const response = await axios.post<TransformResponse>(
      `${JAVASCRIPT_SDK_URL}/transform`,
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
      error: `Failed to connect to JavaScript SDK service: ${error.message}`,
    };
  }
}
