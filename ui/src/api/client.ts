import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export interface TransformRequest {
  sdk: string;
  event: Record<string, any>;
  beforeSendCode: string;
}

export interface TransformResponse {
  success: boolean;
  originalEvent?: Record<string, any>;
  transformedEvent?: Record<string, any> | null;
  error?: string;
  traceback?: string;
  sdk?: string;
}

export interface SDK {
  key: string;
  name: string;
  language: string;
  default?: boolean;
  status: string;
}

export interface SDKsResponse {
  sdks: SDK[];
}

export interface Example {
  id: string;
  name: string;
  description: string;
  sdk: string;
  event: Record<string, any>;
  beforeSendCode: string;
}

export interface ExamplesResponse {
  examples: Example[];
}

export const apiClient = {
  async transform(request: TransformRequest): Promise<TransformResponse> {
    const response = await axios.post<TransformResponse>(
      `${API_URL}/api/transform`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      }
    );
    return response.data;
  },

  async getSDKs(): Promise<SDKsResponse> {
    const response = await axios.get<SDKsResponse>(`${API_URL}/api/transform/sdks`);
    return response.data;
  },

  async getExamples(): Promise<ExamplesResponse> {
    const response = await axios.get<ExamplesResponse>(`${API_URL}/api/examples`);
    return response.data;
  },
};
