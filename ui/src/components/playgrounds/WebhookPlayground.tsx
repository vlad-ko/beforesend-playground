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
          <div className="flex-1 flex flex-col min-h-0">
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
              <input
                type="password"
                className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                placeholder="your-webhook-secret"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                disabled={!generateSignature}
              />
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
