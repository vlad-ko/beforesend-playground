import axios from 'axios';

const COCOA_SDK_URL = process.env.COCOA_SDK_URL || 'http://sdk-cocoa:5009';

export interface TransformResponse {
  success: boolean;
  transformedEvent?: Record<string, any> | null;
  error?: string;
  traceback?: string;
}

export async function transformWithCocoa(
  event: Record<string, any>,
  beforeSendCode: string
): Promise<TransformResponse> {
  try {
    const response = await axios.post(
      `${COCOA_SDK_URL}/transform`,
      {
        event,
        beforeSendCode,
      },
      {
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error: any) {
    if (error.response) {
      // SDK returned an error response
      return error.response.data;
    }

    // Network or timeout error
    return {
      success: false,
      error: `Failed to connect to Cocoa SDK service: ${error.message}`,
    };
  }
}
