import axios from 'axios';

const PYTHON_SDK_URL = process.env.PYTHON_SDK_URL || 'http://sdk-python:5001';

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

export async function transformWithPython(
  event: Record<string, any>,
  beforeSendCode: string
): Promise<TransformResponse> {
  try {
    const response = await axios.post<TransformResponse>(
      `${PYTHON_SDK_URL}/transform`,
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
      error: `Failed to connect to Python SDK service: ${error.message}`,
    };
  }
}
