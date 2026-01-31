import { useState, useEffect, useCallback } from 'react';
import {
  apiClient,
  SentryQueryResponse,
  QueryValidationResponse,
  QueryExample,
  SentryEndpoint,
} from '../../api/client';

const DEFAULT_ORG = 'demo';
const DEFAULT_QUERY = 'is:unresolved level:error';

export default function ApiQueryTesterPlayground() {
  // Form state
  const [org, setOrg] = useState<string>(DEFAULT_ORG);
  const [authToken, setAuthToken] = useState<string>('');
  const [query, setQuery] = useState<string>(DEFAULT_QUERY);
  const [endpoint, setEndpoint] = useState<SentryEndpoint>('issues');
  const [environment, setEnvironment] = useState<string>('production');
  const [project, setProject] = useState<string>('');
  const [statsPeriod, setStatsPeriod] = useState<string>('24h');

  // UI state
  const [validation, setValidation] = useState<QueryValidationResponse | null>(null);
  const [result, setResult] = useState<SentryQueryResponse | null>(null);
  const [examples, setExamples] = useState<QueryExample[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [validating, setValidating] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showToken, setShowToken] = useState<boolean>(false);
  const [urlInput, setUrlInput] = useState<string>('');
  const [showUrlParser, setShowUrlParser] = useState<boolean>(false);
  const [urlParseError, setUrlParseError] = useState<string | null>(null);
  const [urlParseWarning, setUrlParseWarning] = useState<string | null>(null);
  const [urlParsing, setUrlParsing] = useState<boolean>(false);
  const [copiedCurl, setCopiedCurl] = useState<boolean>(false);

  // Load examples on mount
  useEffect(() => {
    const loadExamples = async () => {
      try {
        const response = await apiClient.getSentryQueryExamples();
        setExamples(response.examples);
      } catch (err) {
        console.error('Failed to load examples:', err);
      }
    };
    loadExamples();
  }, []);

  // Debounced validation
  const validateQuery = useCallback(async (queryText: string) => {
    if (!queryText.trim()) {
      setValidation(null);
      return;
    }

    setValidating(true);
    try {
      const response = await apiClient.validateSentryQuery(queryText);
      setValidation(response);
    } catch (err) {
      console.error('Validation failed:', err);
    } finally {
      setValidating(false);
    }
  }, []);

  // Trigger validation on query change with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      validateQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, validateQuery]);

  const handleExecuteQuery = async () => {
    if (!org.trim()) {
      setError('Organization is required');
      return;
    }
    if (!authToken.trim()) {
      setError('Auth token is required');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiClient.testSentryQuery({
        org,
        authToken,
        endpoint,
        query: query.trim() || undefined,
        environment: environment.trim() || undefined,
        project: project.trim() || undefined,
        statsPeriod: statsPeriod || undefined,
      });
      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Query execution failed');
    } finally {
      setLoading(false);
    }
  };

  const handleParseUrl = async () => {
    if (!urlInput.trim()) {
      setUrlParseError('Please enter a Sentry URL');
      return;
    }

    setUrlParsing(true);
    setUrlParseError(null);

    try {
      const response = await apiClient.parseSentryUrl(urlInput);
      if (response.success) {
        if (response.org) setOrg(response.org);
        if (response.query) setQuery(response.query);
        if (response.environment) setEnvironment(response.environment);
        if (response.project) setProject(response.project);
        if (response.statsPeriod) setStatsPeriod(response.statsPeriod);
        if (response.endpoint === 'issues' || response.endpoint === 'events' || response.endpoint === 'projects') {
          setEndpoint(response.endpoint);
        }
        setUrlParseError(null);
        // Show warning if present (e.g., for Discover/Performance URLs)
        if (response.warning) {
          setUrlParseWarning(response.warning);
        } else {
          setUrlParseWarning(null);
          setShowUrlParser(false);
        }
        setUrlInput('');
      } else {
        setUrlParseError(response.error || 'Failed to parse URL');
        setUrlParseWarning(null);
      }
    } catch (err: any) {
      // Provide more helpful error messages
      const errorMessage = err.response?.data?.error
        || err.response?.data?.message
        || err.message
        || 'Failed to parse URL';
      setUrlParseError(`Error: ${errorMessage}. Make sure the API server is running.`);
    } finally {
      setUrlParsing(false);
    }
  };

  const handleExampleSelect = (example: QueryExample) => {
    setQuery(example.query);
    setResult(null);
  };

  const handleCopyCurl = () => {
    if (result?.generatedCurl) {
      navigator.clipboard.writeText(result.generatedCurl);
      setCopiedCurl(true);
      setTimeout(() => setCopiedCurl(false), 2000);
    }
  };

  const handleReset = () => {
    setOrg(DEFAULT_ORG);
    setQuery(DEFAULT_QUERY);
    setEndpoint('issues');
    setEnvironment('production');
    setProject('');
    setStatsPeriod('24h');
    setResult(null);
    setError(null);
    setValidation(null);
  };

  return (
    <div>
      {/* Query Input Section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Search Query</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUrlParser(!showUrlParser)}
              className="text-sm text-sentry-purple hover:text-purple-900 underline"
            >
              {showUrlParser ? 'Hide URL Parser' : 'Load from URL'}
            </button>
            <button
              onClick={handleReset}
              className="text-sm text-gray-600 hover:text-gray-800 underline"
            >
              Reset
            </button>
          </div>
        </div>

        {/* URL Parser */}
        {showUrlParser && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste Sentry URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={urlInput}
                onChange={(e) => {
                  setUrlInput(e.target.value);
                  setUrlParseError(null);
                }}
                placeholder="https://demo.sentry.io/issues/?query=level%3Aerror"
                className={`flex-1 px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sentry-purple ${
                  urlParseError ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              <button
                onClick={handleParseUrl}
                disabled={urlParsing}
                className={`px-4 py-2 rounded-md text-sm text-white ${
                  urlParsing
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-sentry-purple hover:bg-purple-900'
                }`}
              >
                {urlParsing ? 'Parsing...' : 'Parse'}
              </button>
            </div>
            {urlParseError && (
              <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-600">
                {urlParseError}
              </div>
            )}
            {urlParseWarning && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                ⚠️ {urlParseWarning}
              </div>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Paste a Sentry issues/discover URL to auto-fill the query parameters
            </p>
          </div>
        )}

        {/* Query Input */}
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Query
          </label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="is:unresolved level:error"
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sentry-purple"
          />
        </div>

        {/* Real-time Validation Feedback */}
        {validation && (
          <div className={`p-3 rounded-md text-sm ${validation.valid ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
            <div className="flex items-center gap-2 mb-2">
              {validating ? (
                <span className="text-gray-600">Validating...</span>
              ) : validation.valid ? (
                <span className="text-green-700 font-medium">Query is valid</span>
              ) : (
                <span className="text-yellow-700 font-medium">Query has issues</span>
              )}
            </div>

            {/* Show components */}
            {validation.components.length > 0 && (
              <div className="space-y-1">
                {validation.components.map((comp, idx) => (
                  <div key={idx} className={`flex items-center gap-2 ${comp.valid ? 'text-green-700' : 'text-yellow-700'}`}>
                    <span className={`w-2 h-2 rounded-full ${comp.valid ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <code className="text-xs bg-white px-1 py-0.5 rounded">{comp.component.raw}</code>
                    {!comp.valid && comp.error && (
                      <span className="text-xs text-yellow-600">{comp.error}</span>
                    )}
                    {comp.suggestion && (
                      <span className="text-xs text-blue-600">
                        Did you mean <code className="bg-blue-50 px-1 rounded">{comp.suggestion}</code>?
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Show free text */}
            {validation.parsed.freeText.length > 0 && (
              <div className="mt-2 text-xs text-gray-600">
                Free text search: {validation.parsed.freeText.join(', ')}
              </div>
            )}
          </div>
        )}

        {/* Example Queries */}
        {examples.length > 0 && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Example Queries
            </label>
            <div className="flex flex-wrap gap-2">
              {examples.slice(0, 8).map((example, idx) => (
                <button
                  key={idx}
                  onClick={() => handleExampleSelect(example)}
                  className="px-3 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded-full text-gray-700 transition-colors"
                  title={example.description}
                >
                  {example.name}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuration Section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Configuration</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Organization */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Organization <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="demo"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sentry-purple"
            />
          </div>

          {/* Auth Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Auth Token <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showToken ? 'text' : 'password'}
                value={authToken}
                onChange={(e) => setAuthToken(e.target.value)}
                placeholder="sntrys_..."
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sentry-purple"
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              >
                {showToken ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              <a
                href={`https://${org || 'sentry'}.sentry.io/settings/account/api/auth-tokens/`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sentry-purple hover:underline"
              >
                Create a Personal Auth Token
              </a>
              {' '}(org tokens won't work for API queries)
            </p>
          </div>

          {/* Endpoint */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Endpoint
            </label>
            <select
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value as SentryEndpoint)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sentry-purple"
            >
              <option value="issues">Issues</option>
              <option value="events">Events</option>
              <option value="projects">Projects</option>
            </select>
          </div>

          {/* Environment */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Environment
            </label>
            <input
              type="text"
              list="environment-options"
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              placeholder="production"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sentry-purple"
            />
            <datalist id="environment-options">
              <option value="production" />
              <option value="staging" />
              <option value="development" />
            </datalist>
          </div>

          {/* Project */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Project {endpoint === 'events' && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              value={project}
              onChange={(e) => setProject(e.target.value)}
              placeholder="4508968134377472"
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sentry-purple"
            />
            <p className="text-xs text-gray-500 mt-1">
              Project ID (found in Settings → Projects → [Project] → General Settings)
            </p>
          </div>

          {/* Stats Period */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stats Period
            </label>
            <select
              value={statsPeriod}
              onChange={(e) => setStatsPeriod(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-sentry-purple"
            >
              <option value="">None</option>
              <option value="24h">24 hours</option>
              <option value="7d">7 days</option>
              <option value="14d">14 days</option>
              <option value="30d">30 days</option>
              <option value="90d">90 days</option>
            </select>
          </div>

        </div>

        {/* Execute Button */}
        <div className="mt-4">
          <button
            onClick={handleExecuteQuery}
            disabled={loading || !org.trim() || !authToken.trim()}
            className={`px-6 py-2 rounded-md font-medium text-white ${
              loading || !org.trim() || !authToken.trim()
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-sentry-purple hover:bg-purple-900'
            }`}
          >
            {loading ? 'Executing...' : 'Execute Query'}
          </button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}

      {/* Results Section */}
      {result && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold">Results</h2>
            {result.responseTime && (
              <span className="text-sm text-gray-500">
                {result.responseTime}ms
              </span>
            )}
          </div>

          {/* Status */}
          <div className={`p-4 rounded-md mb-4 ${result.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <span className={`font-medium ${result.success ? 'text-green-700' : 'text-red-700'}`}>
                  {result.success ? 'Success' : 'Failed'}
                </span>
                {result.statusCode && (
                  <span className="ml-2 text-sm text-gray-600">
                    (HTTP {result.statusCode})
                  </span>
                )}
              </div>
              {result.success && result.count !== undefined && (
                <span className="text-sm text-gray-600">
                  {result.count} result{result.count !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            {result.error && (
              <p className="mt-2 text-sm text-red-600">{result.error}</p>
            )}
            {result.rateLimited && (
              <p className="mt-2 text-sm text-yellow-600">
                Rate limited. Please wait before making more requests.
              </p>
            )}
            {/* Troubleshooting tips for common errors */}
            {!result.success && result.statusCode === 404 && (
              <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-800">
                <strong>Troubleshooting:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Check that the organization slug "{org}" is correct</li>
                  <li>Verify you have access to this organization</li>
                  {endpoint === 'events' && project && (
                    <li>Check that the project "{project}" exists</li>
                  )}
                  <li>The URL being called is shown below</li>
                </ul>
              </div>
            )}
            {!result.success && result.statusCode === 401 && (
              <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-800">
                <strong>Troubleshooting:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Check that your auth token is valid and not expired</li>
                  <li>You need a <strong>Personal Auth Token</strong>, not an Organization Auth Token</li>
                  <li>
                    <a
                      href={`https://${org || 'sentry'}.sentry.io/settings/account/api/auth-tokens/`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-700 underline"
                    >
                      Create a Personal Auth Token
                    </a>
                  </li>
                </ul>
              </div>
            )}
            {!result.success && result.statusCode === 403 && (
              <div className="mt-3 p-2 bg-red-100 rounded text-sm text-red-800">
                <strong>Troubleshooting:</strong>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Your token doesn't have permission for this resource</li>
                  <li>Check the token scopes in your settings</li>
                  <li>You may need to be a member of the organization</li>
                </ul>
              </div>
            )}
          </div>

          {/* API URL - shown prominently, especially helpful for debugging errors */}
          <div className="mb-4">
            <label className="text-sm font-medium text-gray-700 mb-2 block">
              API URL {!result.success && <span className="text-red-600 font-normal">(this URL returned the error above)</span>}
            </label>
            <pre className="p-4 bg-gray-100 text-gray-800 rounded-lg text-sm font-mono leading-relaxed overflow-x-auto break-all">
              {result.generatedUrl}
            </pre>
          </div>

          {/* cURL Command */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm font-medium text-gray-700">cURL Command</label>
              <button
                onClick={handleCopyCurl}
                className="px-3 py-1 text-sm bg-sentry-purple text-white rounded hover:bg-purple-900"
              >
                {copiedCurl ? 'Copied!' : 'Copy to Clipboard'}
              </button>
            </div>
            <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-sm font-mono leading-relaxed overflow-x-auto whitespace-pre-wrap break-all">
              {result.generatedCurl}
            </pre>
          </div>

          {/* Rate Limit Info */}
          {result.rateLimit && (
            <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-md text-sm">
              <span className="font-medium">Rate Limit:</span>{' '}
              {result.rateLimit.remaining}/{result.rateLimit.limit} remaining
            </div>
          )}

          {/* Pagination Info */}
          {result.pagination && (result.pagination.hasNext || result.pagination.hasPrevious) && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-blue-700">
              <span className="font-medium">Pagination:</span>{' '}
              {result.pagination.hasNext && 'More results available'}
              {result.pagination.nextCursor && (
                <span className="ml-2 text-xs text-gray-500">
                  (cursor: {result.pagination.nextCursor})
                </span>
              )}
            </div>
          )}

          {/* Response Data */}
          {result.success && result.data && result.data.length > 0 && (
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Response Data ({result.data.length} items)
              </label>
              <pre className="p-3 bg-gray-50 border border-gray-200 rounded-md text-xs overflow-x-auto max-h-96">
                {JSON.stringify(result.data, null, 2)}
              </pre>
            </div>
          )}

          {/* No Results */}
          {result.success && (!result.data || result.data.length === 0) && (
            <div className="p-8 bg-gray-50 border border-gray-200 rounded-md text-center text-gray-500">
              No results found for this query
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!error && !result && !loading && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center text-gray-500">
            <p className="mb-2">Enter your organization and auth token, then click Execute Query to test your search query.</p>
            <p className="text-sm">
              Tip: Use the demo org <code className="bg-gray-200 px-1 rounded">demo</code> at demo.sentry.io for testing.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
