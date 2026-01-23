import axios from 'axios';

const DOTNET_SDK_URL = process.env.DOTNET_SDK_URL || 'http://sdk-dotnet:5002';

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

export async function transformWithDotNet(
  event: Record<string, any>,
  beforeSendCode: string
): Promise<TransformResponse> {
  try {
    const response = await axios.post(
      `${DOTNET_SDK_URL}/transform`,
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

    // .NET SDK returns PascalCase, normalize to camelCase
    const data = response.data;
    return {
      success: data.Success ?? data.success,
      transformedEvent: data.TransformedEvent ?? data.transformedEvent,
      error: data.Error ?? data.error,
      traceback: data.Traceback ?? data.traceback,
    };
  } catch (error: any) {
    if (error.response) {
      const data = error.response.data;
      return {
        success: data.Success ?? data.success ?? false,
        transformedEvent: data.TransformedEvent ?? data.transformedEvent,
        error: data.Error ?? data.error,
        traceback: data.Traceback ?? data.traceback,
      };
    }

    return {
      success: false,
      error: `Failed to connect to .NET SDK service: ${error.message}`,
    };
  }
}
