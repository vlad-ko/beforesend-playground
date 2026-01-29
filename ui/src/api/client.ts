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

export interface ValidationError {
  line?: number;
  column?: number;
  message: string;
}

export interface ValidationRequest {
  sdk: string;
  beforeSendCode: string;
}

export interface ValidationResponse {
  valid: boolean;
  errors: ValidationError[];
}

export interface ShareRequest {
  sdk: string;
  sdkName: string;
  sdkPackage: string;
  sdkVersion: string;
  event: Record<string, any>;
  beforeSendCode: string;
}

export interface ShareResponse {
  html_url: string;
  id: string;
}

export interface WebhookTemplate {
  id: string;
  name: string;
  description: string;
  eventType: string;
  payload?: Record<string, any>;
}

export interface WebhookTemplatesResponse {
  templates: WebhookTemplate[];
}

export interface SendWebhookRequest {
  url: string;
  templateId: string;
  secret?: string;
}

export interface SendWebhookResponse {
  success: boolean;
  sentAt: string;
  signature?: string;
  webhookStatus?: number;
  webhookStatusText?: string;
  webhookError?: string;
  error?: string;
  details?: string;
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

  async validate(request: ValidationRequest): Promise<ValidationResponse> {
    const response = await axios.post<ValidationResponse>(
      `${API_URL}/api/validate`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 5000, // 5 second timeout for validation
      }
    );
    return response.data;
  },

  async createAnonymousGist(request: ShareRequest): Promise<ShareResponse> {
    const response = await axios.post<ShareResponse>(
      `${API_URL}/api/share`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 10000, // 10 second timeout
      }
    );

    return response.data;
  },

  async getWebhookTemplates(): Promise<WebhookTemplatesResponse> {
    const response = await axios.get<WebhookTemplatesResponse>(
      `${API_URL}/api/webhooks/templates`
    );
    return response.data;
  },

  async getWebhookTemplate(id: string): Promise<WebhookTemplate> {
    const response = await axios.get<WebhookTemplate>(
      `${API_URL}/api/webhooks/templates/${id}`
    );
    return response.data;
  },

  async sendWebhook(request: SendWebhookRequest): Promise<SendWebhookResponse> {
    const response = await axios.post<SendWebhookResponse>(
      `${API_URL}/api/webhooks/send`,
      request,
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 15000, // 15 second timeout
      }
    );
    return response.data;
  },
};
