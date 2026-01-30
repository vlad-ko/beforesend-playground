import { useState } from 'react';
import Editor from '@monaco-editor/react';
import SdkSelector from '../SdkSelector';
import SearchableConfigExampleSelector from '../SearchableConfigExampleSelector';
import { apiClient, AnalysisResult, OptionAnalysis, ConfigWarning, ConfigRecommendation, ConfigExample } from '../../api/client';

const DEFAULT_CONFIG = `Sentry.init({
  dsn: "https://examplePublicKey@o0.ingest.sentry.io/0",
  environment: "production",
  release: "my-app@1.0.0",
  tracesSampleRate: 0.1,
});`;

export default function ConfigAnalyzerPlayground() {
  const [configCode, setConfigCode] = useState<string>(DEFAULT_CONFIG);
  const [sdk, setSdk] = useState<string>('javascript');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [expandedOptions, setExpandedOptions] = useState<Set<string>>(new Set());
  const [selectedExampleName, setSelectedExampleName] = useState<string | null>(null);

  const handleExampleSelect = (example: ConfigExample) => {
    setConfigCode(example.configCode);
    setSdk(example.sdk);
    setSelectedExampleName(example.name);
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setConfigCode(DEFAULT_CONFIG);
    setSdk('javascript');
    setSelectedExampleName(null);
    setResult(null);
    setError(null);
  };

  const handleSdkChange = (newSdk: string) => {
    setSdk(newSdk);
  };

  const handleAnalyze = async () => {
    if (!configCode.trim()) {
      setError('Please enter configuration code');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await apiClient.analyzeConfig({
        configCode,
        sdk,
      });

      if (response.success && response.data) {
        setResult(response.data);
      } else {
        setError(response.error || 'Analysis failed');
      }
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to analyze configuration');
    } finally {
      setLoading(false);
    }
  };

  const toggleOption = (key: string) => {
    const newExpanded = new Set(expandedOptions);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedOptions(newExpanded);
  };

  const getScoreColor = (score: number): string => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBgColor = (score: number): string => {
    if (score >= 90) return 'bg-green-100';
    if (score >= 70) return 'bg-yellow-100';
    return 'bg-red-100';
  };

  return (
    <div>
      {/* Editor Section */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-1">Configuration Code</h2>
        <p className="text-sm text-gray-600 mb-2">
          {selectedExampleName ? (
            <>
              Loaded example: <span className="font-medium text-sentry-purple">{selectedExampleName}</span>
            </>
          ) : (
            'Paste your Sentry.init() configuration or load an example'
          )}
        </p>
        <div className="h-7 mb-1">
          {selectedExampleName && (
            <button
              onClick={handleReset}
              className="text-sm text-gray-600 hover:text-sentry-purple underline"
            >
              Reset to default
            </button>
          )}
        </div>
        <div className="border border-gray-300 rounded-md overflow-hidden">
          <Editor
            height="300px"
            language={sdk === 'python' ? 'python' : 'javascript'}
            value={configCode}
            onChange={(value) => setConfigCode(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4 relative z-10">
          <SearchableConfigExampleSelector key={selectedExampleName || 'default'} onSelect={handleExampleSelect} />
          <SdkSelector value={sdk} onChange={handleSdkChange} />

          <button
            onClick={handleAnalyze}
            disabled={loading}
            className={`px-6 py-2 rounded-md font-medium text-white ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-sentry-purple hover:bg-purple-900'
            }`}
          >
            {loading ? 'Analyzing...' : 'Analyze Configuration'}
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
          <h2 className="text-lg font-semibold mb-3">Analysis Results</h2>

          {/* Health Score */}
          <div className={`mb-4 p-4 rounded-md ${getScoreBgColor(result.score)}`}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">Health Score</h3>
                <p className="text-sm text-gray-600 mt-1">{result.summary}</p>
              </div>
              <div className={`text-4xl font-bold ${getScoreColor(result.score)}`}>
                {result.score}
              </div>
            </div>
          </div>

          {/* Parse Errors */}
          {result.parseErrors.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Parse Errors</h3>
              {result.parseErrors.map((err, idx) => (
                <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-md mb-2">
                  <p className="text-sm text-red-600">{err.message}</p>
                </div>
              ))}
            </div>
          )}

          {/* Issues (errors and warnings only) */}
          {result.warnings.filter(w => w.severity === 'error' || w.severity === 'warning').length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Issues ({result.warnings.filter(w => w.severity === 'error' || w.severity === 'warning').length})
              </h3>
              <div className="space-y-2">
                {result.warnings
                  .filter(w => w.severity === 'error' || w.severity === 'warning')
                  .map((warning, idx) => (
                    <WarningCard key={idx} warning={warning} />
                  ))}
              </div>
            </div>
          )}

          {/* Notes (info severity - setting details) */}
          {result.warnings.filter(w => w.severity === 'info').length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Notes ({result.warnings.filter(w => w.severity === 'info').length})
              </h3>
              <div className="space-y-2">
                {result.warnings
                  .filter(w => w.severity === 'info')
                  .map((warning, idx) => (
                    <WarningCard key={idx} warning={warning} />
                  ))}
              </div>
            </div>
          )}

          {/* Options */}
          {result.options.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Configuration Options ({result.options.length})
              </h3>
              <div className="space-y-2">
                {result.options.map((option) => (
                  <OptionCard
                    key={option.key}
                    option={option}
                    expanded={expandedOptions.has(option.key)}
                    onToggle={() => toggleOption(option.key)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {result.recommendations.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">
                Recommendations ({result.recommendations.length})
              </h3>
              <div className="space-y-2">
                {result.recommendations.map((rec, idx) => (
                  <RecommendationCard key={idx} recommendation={rec} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty State */}
      {!error && !result && !loading && (
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center text-gray-500 min-h-96 flex items-center justify-center">
            Paste your Sentry.init() configuration above and click Analyze Configuration to see results.
          </div>
        </div>
      )}
    </div>
  );
}

// Warning Card Component
function WarningCard({ warning }: { warning: ConfigWarning }) {
  return (
    <div className={`p-3 border rounded-md ${getSeverityColor(warning.severity)}`}>
      <div className="flex items-start gap-3">
        <span className="text-xs font-semibold uppercase mt-0.5 flex-shrink-0">
          {warning.severity}
        </span>
        <div className="flex-1">
          {warning.optionKey && (
            <div className="mb-1">
              <span className="text-xs font-medium px-2 py-0.5 bg-gray-200 text-gray-700 rounded">
                {warning.optionKey}
              </span>
            </div>
          )}
          <p className="text-sm">{warning.message}</p>
          {warning.fix && (
            <p className="text-xs mt-1 opacity-75">
              <strong>Fix:</strong> {warning.fix}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// Option Card Component
function OptionCard({
  option,
  expanded,
  onToggle,
}: {
  option: OptionAnalysis;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="border border-gray-200 rounded-md overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left flex items-center justify-between gap-4"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-semibold text-gray-800">{option.displayName}</span>
            <span className="text-xs text-gray-500">({option.type})</span>
            {!option.recognized && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                Unknown
              </span>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1">{option.description}</p>
        </div>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform flex-shrink-0 ${expanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {expanded && (
        <div className="p-4 bg-white border-t border-gray-200">
          <div className="space-y-3">
            <div>
              <span className="text-sm font-medium text-gray-700">Value:</span>
              <pre className="mt-1 p-2 bg-gray-50 rounded text-sm overflow-x-auto">
                {option.rawValue}
              </pre>
            </div>

            {option.seGuidance && (
              <div>
                <span className="text-sm font-medium text-gray-700">SE Guidance:</span>
                <p className="text-sm text-gray-600 mt-1">{option.seGuidance}</p>
              </div>
            )}

            {option.docsUrl && (
              <div>
                <a
                  href={option.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-purple-600 hover:text-purple-700 underline"
                >
                  View Documentation →
                </a>
              </div>
            )}

            {option.warnings.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-700">Warnings:</span>
                <div className="mt-1 space-y-1">
                  {option.warnings.map((warning, idx) => (
                    <div key={idx} className={`p-2 rounded text-sm ${getSeverityColor(warning.severity)}`}>
                      {warning.message}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Recommendation Card Component
function RecommendationCard({ recommendation }: { recommendation: ConfigRecommendation }) {
  return (
    <div className="p-4 border border-gray-200 rounded-md bg-white">
      <div className="flex items-start gap-3">
        <span className={`text-xs font-semibold uppercase px-2 py-1 rounded ${getPriorityColor(recommendation.priority)}`}>
          {recommendation.priority}
        </span>
        <div className="flex-1">
          <h4 className="font-semibold text-gray-800">{recommendation.title}</h4>
          <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
          {recommendation.example && (
            <pre className="mt-2 p-2 bg-gray-50 rounded text-sm overflow-x-auto">
              {recommendation.example}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}

function getSeverityColor(severity: string): string {
  switch (severity) {
    case 'error': return 'text-red-600 bg-red-50 border-red-200';
    case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
    default: return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'high': return 'text-red-600 bg-red-50';
    case 'medium': return 'text-yellow-600 bg-yellow-50';
    case 'low': return 'text-blue-600 bg-blue-50';
    default: return 'text-gray-600 bg-gray-50';
  }
}
