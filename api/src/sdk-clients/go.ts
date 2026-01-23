import axios from 'axios';

const GO_SDK_URL = process.env.GO_SDK_URL || 'http://sdk-go:5006';

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

export async function transformWithGo(
  event: Record<string, any>,
  beforeSendCode: string
): Promise<TransformResponse> {
  try {
    const response = await axios.post<TransformResponse>(
      `${GO_SDK_URL}/transform`,
      {
        event,
        beforeSendCode,
      },
      {
        timeout: 30000, // 30 second timeout for compilation
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
      error: `Failed to connect to Go SDK service: ${error.message}`,
    };
  }
}
