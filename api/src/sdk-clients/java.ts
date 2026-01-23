import axios from 'axios';

const JAVA_SDK_URL = process.env.JAVA_SDK_URL || 'http://sdk-java:5007';

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

export async function transformWithJava(
  event: Record<string, any>,
  beforeSendCode: string
): Promise<TransformResponse> {
  try {
    const response = await axios.post(
      `${JAVA_SDK_URL}/transform`,
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
      error: `Failed to connect to Java SDK service: ${error.message}`,
    };
  }
}
