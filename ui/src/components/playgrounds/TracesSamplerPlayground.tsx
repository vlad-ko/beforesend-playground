import { useState } from 'react';
import EventInput from '../EventInput';
import BeforeSendEditor from '../BeforeSendEditor';
import SdkSelector, { AVAILABLE_SDKS, getLanguageForSdk } from '../SdkSelector';
import SearchableExampleSelector from '../SearchableExampleSelector';
import { apiClient, TransformResponse, Example } from '../../api/client';

function getDefaultSamplingContext(sdk: string): string {
  const isPython = sdk === 'python';
  return JSON.stringify(
    isPython
      ? {
          transaction_context: {
            name: 'GET /api/payment/process',
            op: 'http.server',
          },
          parent_sampled: true,
          custom_sampling_context: {
            request_url: 'https://example.com/api/payment/process',
            request_method: 'GET',
          },
        }
      : {
          transactionContext: {
            name: 'GET /api/payment/process',
            op: 'http.server',
          },
          parentSampled: true,
          request: {
            url: 'https://example.com/api/payment/process',
            method: 'GET',
          },
        },
    null,
    2
  );
}

const DEFAULT_TRACES_SAMPLER_JS = `(samplingContext) => {
  const transactionName = samplingContext.transactionContext.name;

  // Always sample payment endpoints (critical)
  if (transactionName.includes('/payment')) {
    return 1.0; // 100%
  }

  // Never sample health checks
  if (transactionName === 'GET /health') {
    return 0.0; // 0%
  }

  // Lower sampling for static assets
  if (transactionName.includes('/static/')) {
    return 0.01; // 1%
  }

  // Default sampling
  return 0.1; // 10%
}`;

const DEFAULT_TRACES_SAMPLER_PY = `def traces_sampler(sampling_context):
    transaction_name = sampling_context.get('transaction_context', {}).get('name', '')

    # Always sample payment endpoints (critical)
    if '/payment' in transaction_name:
        return 1.0  # 100%

    # Never sample health checks
    if transaction_name == 'GET /health':
        return 0.0  # 0%

    # Lower sampling for static assets
    if '/static/' in transaction_name:
        return 0.01  # 1%

    # Default sampling
    return 0.1  # 10%`;

const DEFAULT_TRACES_SAMPLER_RUBY = `lambda do |sampling_context|
  transaction_name = sampling_context[:transaction_context][:name] || ''

  # Always sample payment endpoints (critical)
  if transaction_name.include?('/payment')
    return 1.0 # 100%
  end

  # Never sample health checks
  if transaction_name == 'GET /health'
    return 0.0 # 0%
  end

  # Lower sampling for static assets
  if transaction_name.include?('/static/')
    return 0.01 # 1%
  end

  # Default sampling
  0.1 # 10%
end`;

const DEFAULT_TRACES_SAMPLER_PHP = `function($samplingContext) {
    $transactionName = $samplingContext['transaction_context']['name'] ?? '';

    // Always sample payment endpoints (critical)
    if (str_contains($transactionName, '/payment')) {
        return 1.0; // 100%
    }

    // Never sample health checks
    if ($transactionName === 'GET /health') {
        return 0.0; // 0%
    }

    // Lower sampling for static assets
    if (str_contains($transactionName, '/static/')) {
        return 0.01; // 1%
    }

    // Default sampling
    return 0.1; // 10%
}`;

const DEFAULT_TRACES_SAMPLER_GO = `func(ctx sentry.SamplingContext) float64 {
    transactionName := ctx.Span.Name

    // Always sample payment endpoints (critical)
    if strings.Contains(transactionName, "/payment") {
        return 1.0 // 100%
    }

    // Never sample health checks
    if transactionName == "GET /health" {
        return 0.0 // 0%
    }

    // Lower sampling for static assets
    if strings.Contains(transactionName, "/static/") {
        return 0.01 // 1%
    }

    // Default sampling
    return 0.1 // 10%
}`;

const DEFAULT_TRACES_SAMPLER_DOTNET = `(context) => {
    var transactionName = context.TransactionContext.Name;

    // Always sample payment endpoints (critical)
    if (transactionName.Contains("/payment"))
    {
        return 1.0; // 100%
    }

    // Never sample health checks
    if (transactionName == "GET /health")
    {
        return 0.0; // 0%
    }

    // Lower sampling for static assets
    if (transactionName.Contains("/static/"))
    {
        return 0.01; // 1%
    }

    // Default sampling
    return 0.1; // 10%
}`;

const DEFAULT_TRACES_SAMPLER_JAVA = `(context) -> {
    String transactionName = context.getTransactionContext().getName();

    // Always sample payment endpoints (critical)
    if (transactionName.contains("/payment")) {
        return 1.0; // 100%
    }

    // Never sample health checks
    if (transactionName.equals("GET /health")) {
        return 0.0; // 0%
    }

    // Lower sampling for static assets
    if (transactionName.contains("/static/")) {
        return 0.01; // 1%
    }

    // Default sampling
    return 0.1; // 10%
}`;

const DEFAULT_TRACES_SAMPLER_ANDROID = `{ context ->
    val transactionName = context.transactionContext.name

    // Always sample payment endpoints (critical)
    if (transactionName.contains("/payment")) {
        return@SentryOptions 1.0 // 100%
    }

    // Never sample health checks
    if (transactionName == "GET /health") {
        return@SentryOptions 0.0 // 0%
    }

    // Lower sampling for static assets
    if (transactionName.contains("/static/")) {
        return@SentryOptions 0.01 // 1%
    }

    // Default sampling
    0.1 // 10%
}`;

const DEFAULT_TRACES_SAMPLER_RN = `(samplingContext) => {
  const transactionName = samplingContext.transactionContext.name;

  // Always sample critical screens
  if (transactionName.includes('Checkout') || transactionName.includes('Payment')) {
    return 1.0; // 100%
  }

  // Lower sampling for common screens
  if (transactionName.includes('Home') || transactionName.includes('List')) {
    return 0.1; // 10%
  }

  // Default sampling for other screens
  return 0.2; // 20%
}`;

const DEFAULT_TRACES_SAMPLER_COCOA = `{ (context: SamplingContext) -> NSNumber in
    let transactionName = context.transactionContext.name

    // Always sample payment endpoints (critical)
    if transactionName.contains("/payment") {
        return 1.0 // 100%
    }

    // Never sample health checks
    if transactionName == "GET /health" {
        return 0.0 // 0%
    }

    // Default sampling
    return 0.1 // 10%
}`;

const DEFAULT_TRACES_SAMPLER_RUST = `|ctx| {
    let transaction_name = ctx.operation();

    // Always sample payment endpoints (critical)
    if transaction_name.contains("/payment") {
        return 1.0; // 100%
    }

    // Never sample health checks
    if transaction_name == "GET /health" {
        return 0.0; // 0%
    }

    // Default sampling
    0.1 // 10%
}`;

const DEFAULT_TRACES_SAMPLER_ELIXIR = `fn %{transaction_context: transaction_context} ->
  transaction_name = Map.get(transaction_context, :name, "")

  cond do
    # Always sample payment endpoints (critical)
    String.contains?(transaction_name, "/payment") -> 1.0

    # Never sample health checks
    transaction_name == "GET /health" -> 0.0

    # Lower sampling for static assets
    String.contains?(transaction_name, "/static/") -> 0.01

    # Default sampling
    true -> 0.1
  end
end`;

function getDefaultCode(sdk: string): string {
  switch (sdk) {
    case 'python': return DEFAULT_TRACES_SAMPLER_PY;
    case 'ruby': return DEFAULT_TRACES_SAMPLER_RUBY;
    case 'php': return DEFAULT_TRACES_SAMPLER_PHP;
    case 'go': return DEFAULT_TRACES_SAMPLER_GO;
    case 'dotnet': return DEFAULT_TRACES_SAMPLER_DOTNET;
    case 'java': return DEFAULT_TRACES_SAMPLER_JAVA;
    case 'android': return DEFAULT_TRACES_SAMPLER_ANDROID;
    case 'react-native': return DEFAULT_TRACES_SAMPLER_RN;
    case 'cocoa': return DEFAULT_TRACES_SAMPLER_COCOA;
    case 'rust': return DEFAULT_TRACES_SAMPLER_RUST;
    case 'elixir': return DEFAULT_TRACES_SAMPLER_ELIXIR;
    default: return DEFAULT_TRACES_SAMPLER_JS;
  }
}

function getSamplingDecisionInfo(rate: number): { message: string; className: string; icon: string } {
  const percentage = Math.round(rate * 100);
  const droppedPercentage = 100 - percentage;

  if (rate === 1.0) {
    return {
      message: `100% - All transactions will be sent to Sentry`,
      className: 'text-green-600',
      icon: '✓',
    };
  } else if (rate === 0.0) {
    return {
      message: `0% - No transactions will be sent (all dropped)`,
      className: 'text-red-600',
      icon: '✗',
    };
  } else if (rate >= 0.5) {
    return {
      message: `${percentage}% sampled (${droppedPercentage}% dropped)`,
      className: 'text-green-600',
      icon: '✓',
    };
  } else if (rate >= 0.1) {
    return {
      message: `${percentage}% sampled (${droppedPercentage}% dropped)`,
      className: 'text-yellow-600',
      icon: '⚠',
    };
  } else {
    return {
      message: `${percentage}% sampled (${droppedPercentage}% dropped)`,
      className: 'text-orange-600',
      icon: '⚠',
    };
  }
}

export default function TracesSamplerPlayground() {
  const [samplingContextJson, setSamplingContextJson] = useState(getDefaultSamplingContext('javascript'));
  const [tracesSamplerCode, setTracesSamplerCode] = useState(DEFAULT_TRACES_SAMPLER_JS);
  const [selectedSdk, setSelectedSdk] = useState('javascript');
  const [result, setResult] = useState<TransformResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleSdkChange = (sdk: string) => {
    setSelectedSdk(sdk);
    setTracesSamplerCode(getDefaultCode(sdk));
    setSamplingContextJson(getDefaultSamplingContext(sdk));
  };

  const handleExampleSelect = (example: Example) => {
    setSelectedExample(example.name);

    // Load sampling context from example
    if (example.samplingContext) {
      setSamplingContextJson(JSON.stringify(example.samplingContext, null, 2));
    }

    // Load code from example, or use SDK-specific default
    if (example.tracesSamplerCode) {
      setTracesSamplerCode(example.tracesSamplerCode);
    } else {
      setTracesSamplerCode(getDefaultCode(example.sdk || selectedSdk));
    }

    // Switch to the example's SDK if specified
    if (example.sdk && example.sdk !== selectedSdk) {
      setSelectedSdk(example.sdk);
    }

    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setSamplingContextJson(getDefaultSamplingContext(selectedSdk));
    setTracesSamplerCode(getDefaultCode(selectedSdk));
    setSelectedExample(null);
    setResult(null);
    setError(null);
  };

  const handleEvaluate = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let samplingContext;
      try {
        samplingContext = JSON.parse(samplingContextJson);
      } catch (e) {
        throw new Error('Invalid JSON in sampling context input');
      }

      const response = await apiClient.transform({
        sdk: selectedSdk,
        event: samplingContext,
        beforeSendCode: tracesSamplerCode,
      });

      setResult(response);
    } catch (err: any) {
      const errorMessage =
        err.response?.data?.error ||
        err.message ||
        'An error occurred during evaluation';
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    setError(null);

    try {
      let samplingContext;
      try {
        samplingContext = JSON.parse(samplingContextJson);
      } catch (e) {
        throw new Error('Invalid JSON in sampling context input');
      }

      const selectedSdkInfo = AVAILABLE_SDKS.find((s) => s.key === selectedSdk);

      const response = await apiClient.createAnonymousGist({
        sdk: selectedSdk,
        sdkName: selectedSdkInfo?.name || 'Unknown SDK',
        sdkPackage: selectedSdkInfo?.package || '',
        sdkVersion: selectedSdkInfo?.version || '',
        event: samplingContext,
        beforeSendCode: tracesSamplerCode,
      });

      setGistUrl(response.html_url);
      setShowShareModal(true);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'Failed to share');
    } finally {
      setIsSharing(false);
    }
  };

  const editorLanguage = getLanguageForSdk(selectedSdk);

  // Get sampling rate from result
  const samplingRate = typeof result?.transformedEvent === 'number' ? result.transformedEvent : null;

  return (
    <div className="space-y-4">
      {/* SDK Selector and Examples Row */}
      <div className="flex gap-4 items-start">
        <div className="flex-shrink-0">
          <SdkSelector value={selectedSdk} onChange={handleSdkChange} />
        </div>
        <div className="flex-grow">
          <SearchableExampleSelector onSelect={handleExampleSelect} type="tracesSampler" />
        </div>
      </div>

      {/* Input/Editor Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Sampling Context Input */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex justify-between items-start mb-2">
            <div>
              <h3 className="text-lg font-semibold text-gray-800">Test Transaction</h3>
              <p className="text-sm text-gray-500">The transaction to evaluate (one at a time)</p>
            </div>
          </div>
          {/* Quick scenario buttons - SDK-aware key naming */}
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => {
                const isPython = selectedSdk === 'python';
                setSamplingContextJson(JSON.stringify(isPython ? {
                  transaction_context: { name: 'POST /api/checkout', op: 'http.server' },
                  parent_sampled: true
                } : {
                  transactionContext: { name: 'POST /api/checkout', op: 'http.server' },
                  parentSampled: true
                }, null, 2));
              }}
              className="px-2 py-1 text-xs bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors"
            >
              Checkout
            </button>
            <button
              onClick={() => {
                const isPython = selectedSdk === 'python';
                setSamplingContextJson(JSON.stringify(isPython ? {
                  transaction_context: { name: 'GET /health', op: 'http.server' },
                  parent_sampled: false
                } : {
                  transactionContext: { name: 'GET /health', op: 'http.server' },
                  parentSampled: false
                }, null, 2));
              }}
              className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
            >
              Health Check
            </button>
            <button
              onClick={() => {
                const isPython = selectedSdk === 'python';
                setSamplingContextJson(JSON.stringify(isPython ? {
                  transaction_context: { name: 'GET /api/users', op: 'http.server' },
                  parent_sampled: false
                } : {
                  transactionContext: { name: 'GET /api/users', op: 'http.server' },
                  parentSampled: false
                }, null, 2));
              }}
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
            >
              API Call
            </button>
            <button
              onClick={() => {
                const isPython = selectedSdk === 'python';
                setSamplingContextJson(JSON.stringify(isPython ? {
                  transaction_context: { name: 'GET /static/logo.png', op: 'http.server' },
                  parent_sampled: false
                } : {
                  transactionContext: { name: 'GET /static/logo.png', op: 'http.server' },
                  parentSampled: false
                }, null, 2));
              }}
              className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
            >
              Static Asset
            </button>
          </div>
          <EventInput
            value={samplingContextJson}
            onChange={setSamplingContextJson}
            placeholder="Enter sampling context JSON..."
          />
        </div>

        {/* Code Editor */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h3 className="text-lg font-semibold mb-3 text-gray-800">tracesSampler Code</h3>
          <BeforeSendEditor
            value={tracesSamplerCode}
            onChange={setTracesSamplerCode}
            language={editorLanguage}
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 justify-center">
        <button
          onClick={handleEvaluate}
          disabled={isLoading}
          className="px-6 py-2 bg-sentry-purple text-white rounded-md hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isLoading ? 'Evaluating...' : 'Evaluate'}
        </button>
        <button
          onClick={handleReset}
          className="px-6 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Reset
        </button>
        <button
          onClick={handleShare}
          disabled={isSharing}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
        >
          {isSharing ? 'Sharing...' : 'Share'}
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h4 className="text-red-800 font-semibold mb-2">Error</h4>
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Sampling Decision Output */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h3 className="text-lg font-semibold mb-3 text-gray-800">Sampling Decision</h3>

        {result && samplingRate !== null ? (
          <div className="space-y-4">
            {/* Main sampling rate display */}
            <div className="text-center py-6 bg-gray-50 rounded-lg">
              <div className="text-5xl font-bold text-sentry-purple mb-2">
                {Math.round(samplingRate * 100)}%
              </div>
              <div className="text-lg text-gray-600">
                Sample Rate: {samplingRate.toFixed(2)}
              </div>
            </div>

            {/* Decision details */}
            <div className={`flex items-center gap-3 p-4 rounded-lg ${
              samplingRate === 1.0 ? 'bg-green-50' :
              samplingRate === 0.0 ? 'bg-red-50' :
              samplingRate >= 0.1 ? 'bg-yellow-50' : 'bg-orange-50'
            }`}>
              <span className="text-2xl">
                {getSamplingDecisionInfo(samplingRate).icon}
              </span>
              <div>
                <p className={`font-medium ${getSamplingDecisionInfo(samplingRate).className}`}>
                  {getSamplingDecisionInfo(samplingRate).message}
                </p>
                {samplingRate > 0 && samplingRate < 1 && (
                  <p className="text-sm text-gray-600 mt-1">
                    For every 100 similar transactions, approximately {Math.round(samplingRate * 100)} will be sent to Sentry.
                  </p>
                )}
              </div>
            </div>

            {/* Visual progress bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-gray-600">
                <span>0%</span>
                <span>50%</span>
                <span>100%</span>
              </div>
              <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${
                    samplingRate >= 0.5 ? 'bg-green-500' :
                    samplingRate >= 0.1 ? 'bg-yellow-500' :
                    samplingRate > 0 ? 'bg-orange-500' : 'bg-red-500'
                  }`}
                  style={{ width: `${samplingRate * 100}%` }}
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No result yet</p>
            <p className="text-sm mt-2">
              The tracesSampler function returns a number between 0.0 and 1.0
            </p>
            <p className="text-sm">
              Return <span className="font-mono bg-gray-100 px-1">1.0</span> to sample all transactions,{' '}
              <span className="font-mono bg-gray-100 px-1">0.0</span> to drop all.
            </p>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && gistUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">
              Configuration Shared!
            </h3>
            <p className="text-gray-600 mb-4">
              Your tracesSampler configuration has been shared. Copy the link below:
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                readOnly
                value={gistUrl}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-sm"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(gistUrl);
                }}
                className="px-4 py-2 bg-sentry-purple text-white rounded-md hover:bg-purple-700 transition-colors"
              >
                Copy
              </button>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setGistUrl(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
