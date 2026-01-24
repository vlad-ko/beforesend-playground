import axios from 'axios';

const RUST_SDK_URL = process.env.RUST_SDK_URL || 'http://sdk-rust:5010';

export interface TransformRequest {
  event: Record<string, any>;
  beforeSendCode: string;
}

export interface TransformResponse {
  success: boolean;
  transformedEvent?: Record<string, any> | null;
  error?: string;
}

export async function transformWithRust(
  event: Record<string, any>,
  beforeSendCode: string
): Promise<TransformResponse> {
  try {
    const response = await axios.post<TransformResponse>(
      `${RUST_SDK_URL}/transform`,
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
      error: `Failed to connect to Rust SDK service: ${error.message}`,
    };
  }
}
