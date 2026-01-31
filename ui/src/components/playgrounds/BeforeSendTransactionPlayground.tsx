import { useState } from 'react';
import EventInput from '../EventInput';
import BeforeSendEditor from '../BeforeSendEditor';
import SdkSelector from '../SdkSelector';
import SearchableExampleSelector from '../SearchableExampleSelector';
import OutputViewer from '../OutputViewer';
import { apiClient, TransformResponse, Example } from '../../api/client';

const AVAILABLE_SDKS = [
  { key: 'javascript', name: 'JavaScript', language: 'javascript', package: '@sentry/node', version: '8.55.0' },
  { key: 'python', name: 'Python', language: 'python', package: 'sentry-sdk', version: '2.20.0' },
  { key: 'ruby', name: 'Ruby', language: 'ruby', package: 'sentry-ruby', version: '5.22.0' },
  { key: 'php', name: 'PHP', language: 'php', package: 'sentry/sentry', version: '4.12.0' },
  { key: 'go', name: 'Go', language: 'go', package: 'github.com/getsentry/sentry-go', version: '0.29.1' },
  { key: 'dotnet', name: '.NET', language: 'csharp', package: 'Sentry', version: '5.0.0' },
  { key: 'java', name: 'Java', language: 'java', package: 'io.sentry:sentry', version: '7.16.0' },
  { key: 'android', name: 'Android', language: 'kotlin', package: 'io.sentry:sentry-android', version: '7.16.0' },
  { key: 'cocoa', name: 'Cocoa (iOS/macOS)', language: 'javascript', package: 'Sentry', version: '8.40.1' },
  { key: 'react-native', name: 'React Native', language: 'javascript', package: '@sentry/react-native', version: '6.3.0' },
  { key: 'rust', name: 'Rust', language: 'rust', package: 'sentry', version: '0.34.0' },
  { key: 'elixir', name: 'Elixir', language: 'elixir', package: 'sentry', version: '10.9.0' },
];

const DEFAULT_TRANSACTION = JSON.stringify(
  {
    type: 'transaction',
    transaction: 'GET /api/users/:id',
    transaction_info: {
      source: 'route',
    },
    contexts: {
      trace: {
        trace_id: 'abc123def456',
        span_id: 'span123',
        op: 'http.server',
        status: 'ok',
      },
    },
    spans: [
      {
        span_id: 'db-span-1',
        parent_span_id: 'span123',
        op: 'db.query',
        description: 'SELECT * FROM users WHERE id = ?',
        start_timestamp: 1704067200.0,
        timestamp: 1704067200.150,
        status: 'ok',
      },
      {
        span_id: 'http-span-1',
        parent_span_id: 'span123',
        op: 'http.client',
        description: 'GET https://api.example.com/validate',
        start_timestamp: 1704067200.150,
        timestamp: 1704067200.300,
        status: 'ok',
      },
    ],
    measurements: {
      ttfb: { value: 50, unit: 'millisecond' },
      fcp: { value: 150, unit: 'millisecond' },
    },
    start_timestamp: 1704067200.0,
    timestamp: 1704067200.500,
    tags: {
      environment: 'production',
    },
  },
  null,
  2
);

const DEFAULT_BEFORESEND_JS = `(transaction, hint) => {
  // Drop health check and monitoring transactions
  const dropPatterns = ['/health', '/ready', '/metrics', '/ping'];
  if (dropPatterns.some(p => transaction.transaction?.includes(p))) {
    return null; // Drop the transaction
  }

  // Add custom tags based on transaction name
  transaction.tags = {
    ...transaction.tags,
    team: transaction.transaction?.startsWith('/api/users') ? 'user-team' : 'platform',
  };

  return transaction;
}`;

const DEFAULT_BEFORESEND_PY = `def before_send_transaction(transaction, hint):
    # Drop health check and monitoring transactions
    drop_patterns = ['/health', '/ready', '/metrics', '/ping']
    tx_name = transaction.get('transaction', '')

    if any(p in tx_name for p in drop_patterns):
        return None  # Drop the transaction

    # Add custom tags based on transaction name
    if 'tags' not in transaction:
        transaction['tags'] = {}

    if tx_name.startswith('/api/users'):
        transaction['tags']['team'] = 'user-team'
    else:
        transaction['tags']['team'] = 'platform'

    return transaction`;

const DEFAULT_BEFORESEND_RUBY = `lambda do |transaction, hint|
  # Drop health check and monitoring transactions
  drop_patterns = ['/health', '/ready', '/metrics', '/ping']
  tx_name = transaction['transaction'] || ''

  if drop_patterns.any? { |p| tx_name.include?(p) }
    return nil  # Drop the transaction
  end

  # Add custom tags based on transaction name
  transaction['tags'] ||= {}
  transaction['tags']['team'] = tx_name.start_with?('/api/users') ? 'user-team' : 'platform'

  transaction
end`;

const DEFAULT_BEFORESEND_PHP = `function($transaction, $hint) {
    // Drop health check and monitoring transactions
    $dropPatterns = ['/health', '/ready', '/metrics', '/ping'];
    $txName = $transaction['transaction'] ?? '';

    foreach ($dropPatterns as $pattern) {
        if (strpos($txName, $pattern) !== false) {
            return null; // Drop the transaction
        }
    }

    // Add custom tags based on transaction name
    if (!isset($transaction['tags'])) {
        $transaction['tags'] = [];
    }

    $transaction['tags']['team'] = strpos($txName, '/api/users') === 0 ? 'user-team' : 'platform';

    return $transaction;
}`;

const DEFAULT_BEFORESEND_GO = `// Drop health check and monitoring transactions
txName, _ := event["transaction"].(string)
dropPatterns := []string{"/health", "/ready", "/metrics", "/ping"}

for _, pattern := range dropPatterns {
    if strings.Contains(txName, pattern) {
        return nil // Drop the transaction
    }
}

// Add custom tags based on transaction name
if event["tags"] == nil {
    event["tags"] = make(map[string]string)
}
tags := event["tags"].(map[string]string)

if strings.HasPrefix(txName, "/api/users") {
    tags["team"] = "user-team"
} else {
    tags["team"] = "platform"
}

return event`;

const DEFAULT_BEFORESEND_DOTNET = `// Drop health check and monitoring transactions
var txName = ev.Transaction ?? "";
var dropPatterns = new[] { "/health", "/ready", "/metrics", "/ping" };

if (dropPatterns.Any(p => txName.Contains(p)))
{
    return null; // Drop the transaction
}

// Add custom tags based on transaction name
ev.SetTag("team", txName.StartsWith("/api/users") ? "user-team" : "platform");

return ev;`;

const DEFAULT_BEFORESEND_JAVA = `// Drop health check and monitoring transactions
String txName = event.getTransaction();
String[] dropPatterns = {"/health", "/ready", "/metrics", "/ping"};

for (String pattern : dropPatterns) {
    if (txName != null && txName.contains(pattern)) {
        return null; // Drop the transaction
    }
}

// Add custom tags based on transaction name
if (txName != null && txName.startsWith("/api/users")) {
    event.setTag("team", "user-team");
} else {
    event.setTag("team", "platform");
}

return event;`;

const DEFAULT_BEFORESEND_ANDROID = `// Drop health check and monitoring transactions
val txName = event.transaction ?: ""
val dropPatterns = listOf("/health", "/ready", "/metrics", "/ping")

if (dropPatterns.any { txName.contains(it) }) {
    return null // Drop the transaction
}

// Add custom tags based on transaction name
event.setTag("team", if (txName.startsWith("/api/users")) "user-team" else "platform")

return event`;

const DEFAULT_BEFORESEND_RN = `(transaction, hint) => {
  // Drop health check and monitoring transactions
  const dropPatterns = ['/health', '/ready', '/metrics', '/ping'];
  if (dropPatterns.some(p => transaction.transaction?.includes(p))) {
    return null; // Drop the transaction
  }

  // Add custom tags for React Native
  transaction.tags = {
    ...transaction.tags,
    platform: 'react-native',
    team: transaction.transaction?.startsWith('/api/users') ? 'user-team' : 'platform',
  };

  return transaction;
}`;

const DEFAULT_BEFORESEND_COCOA = `// Drop health check and monitoring transactions
const txName = event.transaction || '';
const dropPatterns = ['/health', '/ready', '/metrics', '/ping'];

if (dropPatterns.some(p => txName.includes(p))) {
  return null; // Drop the transaction
}

// Add custom tags based on transaction name
if (!event.tags) event.tags = {};
event.tags.team = txName.startsWith('/api/users') ? 'user-team' : 'platform';
event.tags.platform = 'ios';

return event;`;

const DEFAULT_BEFORESEND_RUST = `// Drop health check and monitoring transactions
let tx_name = event.get("transaction")
    .and_then(|v| v.as_str())
    .unwrap_or("");

let drop_patterns = ["/health", "/ready", "/metrics", "/ping"];
if drop_patterns.iter().any(|p| tx_name.contains(p)) {
    return None; // Drop the transaction
}

// Add custom tags based on transaction name
if !event.as_object()?.contains_key("tags") {
    event["tags"] = serde_json::json!({});
}

let team = if tx_name.starts_with("/api/users") {
    "user-team"
} else {
    "platform"
};
event["tags"]["team"] = serde_json::json!(team);

Some(event)`;

const DEFAULT_BEFORESEND_ELIXIR = `fn transaction, _hint ->
  # Drop health check and monitoring transactions
  tx_name = Map.get(transaction, "transaction", "")
  drop_patterns = ["/health", "/ready", "/metrics", "/ping"]

  if Enum.any?(drop_patterns, &String.contains?(tx_name, &1)) do
    nil  # Drop the transaction
  else
    # Add custom tags based on transaction name
    team = if String.starts_with?(tx_name, "/api/users"), do: "user-team", else: "platform"

    transaction
    |> Map.update("tags", %{"team" => team}, &Map.put(&1, "team", team))
  end
end`;

function getDefaultCode(sdk: string): string {
  switch (sdk) {
    case 'python': return DEFAULT_BEFORESEND_PY;
    case 'ruby': return DEFAULT_BEFORESEND_RUBY;
    case 'php': return DEFAULT_BEFORESEND_PHP;
    case 'go': return DEFAULT_BEFORESEND_GO;
    case 'dotnet': return DEFAULT_BEFORESEND_DOTNET;
    case 'java': return DEFAULT_BEFORESEND_JAVA;
    case 'android': return DEFAULT_BEFORESEND_ANDROID;
    case 'react-native': return DEFAULT_BEFORESEND_RN;
    case 'cocoa': return DEFAULT_BEFORESEND_COCOA;
    case 'rust': return DEFAULT_BEFORESEND_RUST;
    case 'elixir': return DEFAULT_BEFORESEND_ELIXIR;
    default: return DEFAULT_BEFORESEND_JS;
  }
}

export default function BeforeSendTransactionPlayground() {
  const [eventJson, setEventJson] = useState(DEFAULT_TRANSACTION);
  const [beforeSendCode, setBeforeSendCode] = useState(DEFAULT_BEFORESEND_JS);
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
    setBeforeSendCode(getDefaultCode(sdk));
  };

  const handleExampleSelect = (example: Example) => {
    setSelectedExample(example.name);

    // Load transaction JSON from example
    if (example.transaction) {
      setEventJson(JSON.stringify(example.transaction, null, 2));
    }

    // Load code from example, or use SDK-specific default if not available
    if (example.beforeSendTransactionCode) {
      setBeforeSendCode(example.beforeSendTransactionCode);
    } else {
      setBeforeSendCode(getDefaultCode(example.sdk || selectedSdk));
    }

    // Switch to the example's SDK if specified
    if (example.sdk && example.sdk !== selectedSdk) {
      setSelectedSdk(example.sdk);
    }

    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setEventJson(DEFAULT_TRANSACTION);
    setBeforeSendCode(getDefaultCode(selectedSdk));
    setSelectedExample(null);
    setResult(null);
    setError(null);
  };

  const handleTransform = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let event;
      try {
        event = JSON.parse(eventJson);
      } catch (e) {
        throw new Error('Invalid JSON in event input');
      }

      const response = await apiClient.transform({
        sdk: selectedSdk,
        event,
        beforeSendCode,
      });

      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleShare = async () => {
    setIsSharing(true);
    setError(null);

    try {
      let eventObj;
      try {
        eventObj = JSON.parse(eventJson);
      } catch (e) {
        throw new Error('Invalid JSON in event input');
      }

      const sdkInfo = AVAILABLE_SDKS.find(s => s.key === selectedSdk);
      if (!sdkInfo) {
        throw new Error('SDK not found');
      }

      const response = await apiClient.createAnonymousGist({
        sdk: selectedSdk,
        sdkName: sdkInfo.name,
        sdkPackage: sdkInfo.package,
        sdkVersion: sdkInfo.version,
        event: eventObj,
        beforeSendCode: beforeSendCode,
      });

      setGistUrl(response.html_url);
      setShowShareModal(true);
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to create paste. Try again.';
      setError(errorMessage);
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <div>
      {/* Editors Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Event Input */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-1">Transaction JSON</h2>
          <p className="text-sm text-gray-600 mb-2">
            {selectedExample ? (
              <>
                Loaded example: <span className="font-medium text-sentry-purple">{selectedExample}</span>
              </>
            ) : (
              'Paste your Sentry transaction JSON or use the default example'
            )}
          </p>
          <div className="h-7 mb-1">
            {selectedExample && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-600 hover:text-sentry-purple underline"
              >
                Reset to default example
              </button>
            )}
          </div>
          <EventInput value={eventJson} onChange={setEventJson} />
        </div>

        {/* beforeSendTransaction Editor */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-1">beforeSendTransaction Code</h2>
          <p className="text-sm text-gray-600 mb-2">
            Write your beforeSendTransaction callback to filter or modify transactions
          </p>
          <div className="h-7 mb-1">
            {!['javascript', 'python', 'ruby', 'php', 'go', 'dotnet', 'react-native', 'rust'].includes(selectedSdk) && (
              <div className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200 inline-block">
                Real-time syntax validation not yet available for this SDK
              </div>
            )}
          </div>
          <BeforeSendEditor
            value={beforeSendCode}
            onChange={setBeforeSendCode}
            language={(selectedSdk === 'dotnet' ? 'csharp' : selectedSdk === 'android' ? 'kotlin' : selectedSdk === 'react-native' ? 'javascript' : selectedSdk === 'cocoa' ? 'javascript' : selectedSdk) as 'javascript' | 'python' | 'ruby' | 'php' | 'go' | 'csharp' | 'java' | 'kotlin' | 'rust' | 'elixir'}
            sdk={selectedSdk}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <SearchableExampleSelector
            key={selectedExample || 'default'}
            onSelect={handleExampleSelect}
            type="beforeSendTransaction"
          />
          <SdkSelector value={selectedSdk} onChange={handleSdkChange} />

          <button
            onClick={handleTransform}
            disabled={isLoading}
            className={`px-6 py-2 rounded-md font-medium text-white ${
              isLoading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-sentry-purple hover:bg-purple-900'
            }`}
          >
            {isLoading ? 'Transforming...' : 'Transform'}
          </button>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Share button */}
          <button
            onClick={handleShare}
            disabled={isSharing}
            className={`px-6 py-2 rounded-md font-medium text-white ${
              isSharing ? 'bg-gray-400 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-800'
            }`}
          >
            {isSharing ? 'Creating...' : 'Share'}
          </button>
        </div>
      </div>

      {/* Output */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-1">Result</h2>
        <p className="text-sm text-gray-600 mb-3">
          Click Transform to see the result of your beforeSendTransaction callback
        </p>
        {(result || error) ? (
          <OutputViewer result={result} error={error} />
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center text-gray-500 min-h-96 flex items-center justify-center">
            <div>
              <p className="mb-2">No result yet. Configure your transaction and beforeSendTransaction code, then click Transform.</p>
              <p className="text-sm">
                Tip: Return <code className="bg-gray-200 px-1 rounded">null</code> to drop a transaction entirely.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && gistUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Configuration Shared!</h3>

            <p className="text-gray-600 mb-4">
              Your beforeSendTransaction code and transaction structure have been shared.
              <strong> Original event values have been removed</strong> to prevent accidental PII sharing.
              (Link expires in 30 days)
            </p>

            <div className="bg-gray-100 p-3 rounded mb-4 break-all">
              <a
                href={gistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sentry-purple hover:underline"
              >
                {gistUrl}
              </a>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(gistUrl);
                }}
                className="flex-1 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800"
              >
                Copy URL
              </button>

              <a
                href={gistUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-4 py-2 bg-sentry-purple text-white rounded-md hover:bg-purple-900 text-center"
              >
                Open Link
              </a>

              <button
                onClick={() => {
                  setShowShareModal(false);
                  setGistUrl(null);
                }}
                className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
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
