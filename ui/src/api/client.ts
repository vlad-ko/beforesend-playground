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

export type ExampleType = 'beforeSend' | 'beforeSendTransaction';

export interface Example {
  id: string;
  name: string;
  description: string;
  sdk: string;
  type?: ExampleType;
  // beforeSend examples
  event?: Record<string, any>;
  beforeSendCode?: string;
  // beforeSendTransaction examples
  transaction?: Record<string, any>;
  beforeSendTransactionCode?: string;
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
  webhookResponseBody?: any;
  error?: string;
  details?: string;
}

// Config Analyzer Types
export type WarningSeverity = 'error' | 'warning' | 'info';

export interface ConfigWarning {
  severity: WarningSeverity;
  message: string;
  optionKey?: string;
  fix?: string;
}

export interface ConfigRecommendation {
  title: string;
  description: string;
  optionKey?: string;
  priority: 'high' | 'medium' | 'low';
  example?: string;
}

export interface OptionAnalysis {
  key: string;
  displayName: string;
  value: any;
  rawValue: string;
  type: string;
  category: string;
  description: string;
  seGuidance?: string;
  docsUrl?: string;
  recognized: boolean;
  warnings: ConfigWarning[];
}

export interface AnalysisResult {
  valid: boolean;
  sdk: string;
  summary: string;
  options: OptionAnalysis[];
  warnings: ConfigWarning[];
  recommendations: ConfigRecommendation[];
  score: number;
  parseErrors: Array<{ message: string; line?: number; column?: number }>;
}

export interface AnalyzeConfigRequest {
  configCode: string;
  sdk: string;
}

export interface AnalyzeConfigResponse {
  success: boolean;
  data?: AnalysisResult;
  error?: string;
  message?: string;
}

export interface ConfigOption {
  key: string;
  displayName: string;
  description: string;
  type: string;
  category: string;
  required: boolean;
  defaultValue?: any;
  examples?: string[];
  docsUrl?: string;
  seGuidance?: string;
  warnings?: string[];
  relatedOptions?: string[];
  supportedSDKs?: string[];
}

export interface ConfigOptionsResponse {
  success: boolean;
  data?: {
    options: ConfigOption[];
    categories: Record<string, { name: string; description: string }>;
    totalCount: number;
  };
  error?: string;
}

export interface ConfigExample {
  id: string;
  name: string;
  description: string;
  sdk: string;
  configCode: string;
  complexity?: 'basic' | 'intermediate' | 'advanced';
  useCase?: string;
  seGuidance?: string;
}

export interface ConfigExamplesResponse {
  success: boolean;
  examples: ConfigExample[];
}

// Sentry Query Tester Types
export type SentryEndpoint = 'issues' | 'events' | 'projects';

export interface SentryQueryRequest {
  org: string;
  authToken: string;
  endpoint?: SentryEndpoint;
  query?: string;
  environment?: string;
  project?: string;
  statsPeriod?: string;
}

export interface PaginationInfo {
  hasNext: boolean;
  hasPrevious: boolean;
  nextCursor?: string;
  previousCursor?: string;
}

export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset?: number;
}

export interface SentryQueryResponse {
  success: boolean;
  data?: any[];
  count?: number;
  error?: string;
  statusCode?: number;
  rateLimited?: boolean;
  generatedUrl: string;
  generatedCurl: string;
  pagination?: PaginationInfo;
  rateLimit?: RateLimitInfo;
  responseTime?: number;
}

export interface QueryComponent {
  property: string;
  operator: string;
  value: string;
  raw: string;
}

export interface ValidatedComponent {
  component: QueryComponent;
  valid: boolean;
  error?: string;
  suggestion?: string;
}

export interface QuerySuggestion {
  original: string;
  suggested: string;
  reason: string;
}

export interface QueryValidationResponse {
  valid: boolean;
  components: ValidatedComponent[];
  suggestions: QuerySuggestion[];
  parsed: {
    raw: string;
    freeText: string[];
    hasOr?: boolean;
    hasParentheses?: boolean;
  };
}

export interface ParseUrlResponse {
  success: boolean;
  org?: string;
  endpoint?: string;
  query?: string;
  environment?: string;
  project?: string;
  statsPeriod?: string;
  error?: string;
  warning?: string;
}

export interface QueryProperty {
  name: string;
  type: string;
  values?: string[];
  description?: string;
  supportsComparison?: boolean;
  supportsWildcard?: boolean;
  aliases?: string[];
}

export interface QueryPropertiesResponse {
  properties: QueryProperty[];
}

export interface QueryExample {
  name: string;
  description: string;
  query: string;
  category: string;
}

export interface QueryExamplesResponse {
  examples: QueryExample[];
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

  async getExamples(type?: ExampleType): Promise<ExamplesResponse> {
    const params = type ? { type } : {};
    const response = await axios.get<ExamplesResponse>(`${API_URL}/api/examples`, { params });
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

  async analyzeConfig(request: AnalyzeConfigRequest): Promise<AnalyzeConfigResponse> {
    const response = await axios.post<AnalyzeConfigResponse>(
      `${API_URL}/api/config/analyze`,
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

  async getConfigOptions(category?: string, search?: string): Promise<ConfigOptionsResponse> {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);

    const response = await axios.get<ConfigOptionsResponse>(
      `${API_URL}/api/config/options?${params.toString()}`
    );
    return response.data;
  },

  async getConfigOption(key: string): Promise<{ success: boolean; data?: ConfigOption; error?: string }> {
    const response = await axios.get<{ success: boolean; data?: ConfigOption; error?: string }>(
      `${API_URL}/api/config/options/${key}`
    );
    return response.data;
  },

  async getConfigExamples(): Promise<ConfigExamplesResponse> {
    const response = await axios.get<ConfigExamplesResponse>(
      `${API_URL}/api/config/examples`
    );
    return response.data;
  },

  // Sentry Query Tester methods
  async validateSentryQuery(query: string): Promise<QueryValidationResponse> {
    const response = await axios.post<QueryValidationResponse>(
      `${API_URL}/api/sentry-query/validate`,
      { query },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      }
    );
    return response.data;
  },

  async testSentryQuery(request: SentryQueryRequest): Promise<SentryQueryResponse> {
    const response = await axios.post<SentryQueryResponse>(
      `${API_URL}/api/sentry-query/test`,
      request,
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 30000,
      }
    );
    return response.data;
  },

  async parseSentryUrl(url: string): Promise<ParseUrlResponse> {
    const response = await axios.post<ParseUrlResponse>(
      `${API_URL}/api/sentry-query/parse-url`,
      { url },
      {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      }
    );
    return response.data;
  },

  async getSentryQueryProperties(): Promise<QueryPropertiesResponse> {
    const response = await axios.get<QueryPropertiesResponse>(
      `${API_URL}/api/sentry-query/properties`
    );
    return response.data;
  },

  async getSentryQueryExamples(): Promise<QueryExamplesResponse> {
    const response = await axios.get<QueryExamplesResponse>(
      `${API_URL}/api/sentry-query/examples`
    );
    return response.data;
  },
};
