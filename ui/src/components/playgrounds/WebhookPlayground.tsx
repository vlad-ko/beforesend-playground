import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { apiClient, WebhookTemplate, SendWebhookResponse } from '../../api/client';

const DEFAULT_RECEIVER_URL = 'http://localhost:4000/api/webhooks/receive';

export default function WebhookPlayground() {
  const [templates, setTemplates] = useState<WebhookTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('');
  const [payload, setPayload] = useState<string>('{}');
  const [targetUrl, setTargetUrl] = useState<string>(DEFAULT_RECEIVER_URL);
  const [secret, setSecret] = useState<string>('test-secret');
  const [showSecret, setShowSecret] = useState<boolean>(false);
  const [generateSignature, setGenerateSignature] = useState<boolean>(true);
  const [result, setResult] = useState<SendWebhookResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(true);

  // Load templates on mount
  useEffect(() => {
    const loadTemplates = async () => {
      try {
        setLoadingTemplates(true);
        const response = await apiClient.getWebhookTemplates();
        setTemplates(response.templates);

        // Auto-select first template if available
        if (response.templates.length > 0) {
          setSelectedTemplateId(response.templates[0].id);
          await loadTemplate(response.templates[0].id);
        }
      } catch (err: any) {
        setError(err.message || 'Failed to load templates');
      } finally {
        setLoadingTemplates(false);
      }
    };

    loadTemplates();
  }, []);

  const loadTemplate = async (templateId: string) => {
    try {
      const template = await apiClient.getWebhookTemplate(templateId);
      if (template.payload) {
        setPayload(JSON.stringify(template.payload, null, 2));
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load template');
    }
  };

  const handleTemplateChange = async (templateId: string) => {
    setSelectedTemplateId(templateId);
    setResult(null);
    setError(null);
    await loadTemplate(templateId);
  };

  const handleSendWebhook = async () => {
    if (!targetUrl) {
      setError('Please enter a target URL');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const requestData: any = {
        url: targetUrl,
        templateId: selectedTemplateId,
      };

      // Only include secret if signature generation is enabled
      if (generateSignature && secret) {
        requestData.secret = secret;
      }

      const response = await apiClient.sendWebhook(requestData);
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to send webhook');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex-none p-4 border-b border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800">Webhook Playground</h2>
        <p className="text-sm text-gray-600 mt-1">
          Test Sentry webhook payloads with signature generation
        </p>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Left Panel - Payload Editor (wider) */}
        <div className="flex-1 lg:flex-[2] flex flex-col border-r border-gray-200">
          {/* Template Selector */}
          <div className="flex-none p-4 border-b border-gray-200">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook Type
            </label>
            {loadingTemplates ? (
              <div className="text-sm text-gray-500">Loading templates...</div>
            ) : (
              <select
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                value={selectedTemplateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
              >
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {templates.find(t => t.id === selectedTemplateId)?.description}
            </p>
          </div>

          {/* Payload Editor */}
          <div className="flex-1 flex flex-col min-h-0" style={{ minHeight: '600px' }}>
            <div className="flex-none p-4 border-b border-gray-200">
              <label className="block text-sm font-medium text-gray-700">
                Webhook Payload
              </label>
            </div>
            <div className="flex-1 overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="json"
                value={payload}
                onChange={(value) => setPayload(value || '{}')}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  wrappingIndent: 'indent',
                }}
              />
            </div>
          </div>
        </div>

        {/* Right Panel - Configuration */}
        <div className="w-full lg:flex-1 flex flex-col">
          {/* Configuration Form */}
          <div className="flex-none p-4 space-y-4 border-b border-gray-200">
            {/* Target URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target URL
              </label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder={DEFAULT_RECEIVER_URL}
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
              <p className="text-xs text-gray-500 mt-1">
                Defaults to built-in receiver. Try webhook.site for external testing.
              </p>
            </div>

            {/* Webhook Secret */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Webhook Secret (optional)
              </label>
              <div className="relative">
                <input
                  type={showSecret ? "text" : "password"}
                  className="w-full p-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="your-webhook-secret"
                  value={secret}
                  onChange={(e) => setSecret(e.target.value)}
                  disabled={!generateSignature}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                  onClick={() => setShowSecret(!showSecret)}
                  disabled={!generateSignature}
                >
                  {showSecret ? (
                    // Eye slash icon (hide)
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                    </svg>
                  ) : (
                    // Eye icon (show)
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Used to generate HMAC signature
              </p>
            </div>

            {/* Generate Signature Checkbox */}
            <div>
              <label className="flex items-center space-x-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  checked={generateSignature}
                  onChange={(e) => setGenerateSignature(e.target.checked)}
                />
                <span className="text-sm font-medium text-gray-700">
                  Generate HMAC Signature
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1 ml-6">
                Add X-Sentry-Signature header
              </p>
            </div>

            {/* Send Button */}
            <button
              className="w-full py-2 px-4 bg-purple-600 text-white font-medium rounded-md hover:bg-purple-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              onClick={handleSendWebhook}
              disabled={!targetUrl || loading}
            >
              {loading ? 'Sending...' : 'Send Webhook'}
            </button>

            {/* Error Display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            )}
          </div>

          {/* Response Viewer */}
          {result && (
            <div className="flex-1 p-4 overflow-auto">
              <h3 className="text-sm font-medium text-gray-700 mb-3">Response</h3>

              {/* Success/Error Status */}
              <div className={`p-3 rounded-md mb-3 ${
                result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
              }`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium ${
                    result.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {result.success ? '✓ Webhook Sent' : '✗ Send Failed'}
                  </span>
                  {result.webhookStatus && (
                    <span className={`text-sm font-mono ${
                      result.webhookStatus >= 200 && result.webhookStatus < 300
                        ? 'text-green-700'
                        : 'text-red-700'
                    }`}>
                      {result.webhookStatus} {result.webhookStatusText}
                    </span>
                  )}
                </div>
              </div>

              {/* Response Details */}
              <div className="space-y-2 text-sm">
                {result.sentAt && (
                  <div>
                    <span className="font-medium text-gray-700">Sent At:</span>
                    <p className="text-gray-600 font-mono text-xs mt-1">
                      {new Date(result.sentAt).toLocaleString()}
                    </p>
                  </div>
                )}

                {result.signature && (
                  <div>
                    <span className="font-medium text-gray-700">Signature:</span>
                    <p className="text-gray-600 font-mono text-xs mt-1 break-all">
                      {result.signature}
                    </p>
                  </div>
                )}

                {result.webhookError && (
                  <div>
                    <span className="font-medium text-red-700">Error:</span>
                    <p className="text-red-600 text-xs mt-1">
                      {result.webhookError}
                    </p>
                  </div>
                )}

                {result.error && (
                  <div>
                    <span className="font-medium text-red-700">Error:</span>
                    <p className="text-red-600 text-xs mt-1">
                      {result.error}
                    </p>
                  </div>
                )}

                {result.details && (
                  <div>
                    <span className="font-medium text-gray-700">Details:</span>
                    <p className="text-gray-600 text-xs mt-1">
                      {result.details}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
