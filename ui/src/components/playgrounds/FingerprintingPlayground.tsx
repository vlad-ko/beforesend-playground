import { useState } from 'react';
import EventInput from '../EventInput';
import BeforeSendEditor from '../BeforeSendEditor';
import SdkSelector, { getLanguageForSdk } from '../SdkSelector';
import SearchableExampleSelector from '../SearchableExampleSelector';
import { apiClient, TransformResponse, Example } from '../../api/client';

const DEFAULT_EVENT = JSON.stringify(
  {
    event_id: 'example-event-id',
    message: 'Database connection failed to db-prod-user-12345',
    exception: {
      values: [
        {
          type: 'DatabaseError',
          value: 'Connection timeout after 30000ms',
        },
      ],
    },
    tags: {
      environment: 'production',
    },
  },
  null,
  2
);

const DEFAULT_FINGERPRINT_JS = `(event, hint) => {
  // Normalize database errors - group all DB connection errors together
  // regardless of which specific database instance failed
  if (event.message && event.message.includes('Database connection failed')) {
    event.fingerprint = ['database-connection-error'];
  }

  // You can also use {{ default }} to include Sentry's default grouping
  // event.fingerprint = ['database-connection-error', '{{ default }}'];

  return event;
}`;

const DEFAULT_FINGERPRINT_PY = `def before_send(event, hint):
    # Normalize database errors - group all DB connection errors together
    # regardless of which specific database instance failed
    message = event.get('message', '')
    if 'Database connection failed' in message:
        event['fingerprint'] = ['database-connection-error']

    # You can also use {{ default }} to include Sentry's default grouping
    # event['fingerprint'] = ['database-connection-error', '{{ default }}']

    return event`;

const DEFAULT_FINGERPRINT_RUBY = `lambda do |event, hint|
  # Normalize database errors - group all DB connection errors together
  # regardless of which specific database instance failed
  message = event['message'] || ''
  if message.include?('Database connection failed')
    event['fingerprint'] = ['database-connection-error']
  end

  # You can also use {{ default }} to include Sentry's default grouping
  # event['fingerprint'] = ['database-connection-error', '{{ default }}']

  event
end`;

const DEFAULT_FINGERPRINT_PHP = `function($event, $hint) {
    // Normalize database errors - group all DB connection errors together
    // regardless of which specific database instance failed
    $message = $event['message'] ?? '';
    if (str_contains($message, 'Database connection failed')) {
        $event['fingerprint'] = ['database-connection-error'];
    }

    // You can also use {{ default }} to include Sentry's default grouping
    // $event['fingerprint'] = ['database-connection-error', '{{ default }}'];

    return $event;
}`;

const DEFAULT_FINGERPRINT_GO = `// Normalize database errors - group all DB connection errors together
// regardless of which specific database instance failed
message, _ := event["message"].(string)
if strings.Contains(message, "Database connection failed") {
    event["fingerprint"] = []string{"database-connection-error"}
}

// You can also use {{ default }} to include Sentry's default grouping
// event["fingerprint"] = []string{"database-connection-error", "{{ default }}"}

return event`;

function getDefaultCode(sdk: string): string {
  switch (sdk) {
    case 'python':
      return DEFAULT_FINGERPRINT_PY;
    case 'ruby':
      return DEFAULT_FINGERPRINT_RUBY;
    case 'php':
      return DEFAULT_FINGERPRINT_PHP;
    case 'go':
      return DEFAULT_FINGERPRINT_GO;
    default:
      return DEFAULT_FINGERPRINT_JS;
  }
}

export default function FingerprintingPlayground() {
  const [eventJson, setEventJson] = useState(DEFAULT_EVENT);
  const [fingerprintCode, setFingerprintCode] = useState(DEFAULT_FINGERPRINT_JS);
  const [selectedSdk, setSelectedSdk] = useState('javascript');
  const [result, setResult] = useState<TransformResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExampleName, setSelectedExampleName] = useState<string | null>(null);

  const handleSdkChange = (sdk: string) => {
    setSelectedSdk(sdk);
    setFingerprintCode(getDefaultCode(sdk));
  };

  const handleExampleSelect = (example: Example) => {
    if (example.event) {
      setEventJson(JSON.stringify(example.event, null, 2));
    }
    if (example.beforeSendCode) {
      setFingerprintCode(example.beforeSendCode);
    }
    if (example.sdk) {
      setSelectedSdk(example.sdk);
    }
    setSelectedExampleName(example.name);
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setEventJson(DEFAULT_EVENT);
    setFingerprintCode(getDefaultCode(selectedSdk));
    setSelectedExampleName(null);
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
        beforeSendCode: fingerprintCode,
      });

      setResult(response);
    } catch (err: any) {
      setError(err.response?.data?.error || err.message || 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const editorLanguage = getLanguageForSdk(selectedSdk);

  // Extract fingerprint from result
  const originalFingerprint = result?.originalEvent?.fingerprint;
  const customFingerprint = result?.transformedEvent?.fingerprint;
  const hasCustomFingerprint = customFingerprint && Array.isArray(customFingerprint) && customFingerprint.length > 0;

  return (
    <div>
      {/* Convenience Mode Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-blue-500 text-xl">ℹ️</span>
          <div>
            <h3 className="font-semibold text-blue-800">Convenience Mode</h3>
            <p className="text-sm text-blue-700">
              Custom fingerprinting is done via the <code className="bg-blue-100 px-1 rounded">beforeSend</code> callback
              by setting <code className="bg-blue-100 px-1 rounded">event.fingerprint</code>. This mode provides a focused
              environment for testing fingerprinting strategies with visual feedback on how errors will be grouped.
            </p>
          </div>
        </div>
      </div>

      {/* Editors Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        {/* Event Input */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-1">Event JSON</h2>
          <p className="text-sm text-gray-600 mb-2">
            {selectedExampleName ? (
              <>
                Loaded example: <span className="font-medium text-sentry-purple">{selectedExampleName}</span>
              </>
            ) : (
              'Test event with dynamic data that needs normalized grouping'
            )}
          </p>
          <div className="h-7 mb-1">
            {selectedExampleName && (
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

        {/* Fingerprinting Code Editor */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-1">Fingerprinting Code</h2>
          <p className="text-sm text-gray-600 mb-2">
            Set <code className="bg-gray-100 px-1 rounded">event.fingerprint</code> to control grouping
          </p>
          <div className="h-7 mb-1"></div>
          <BeforeSendEditor
            value={fingerprintCode}
            onChange={setFingerprintCode}
            language={editorLanguage}
            sdk={selectedSdk}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <SearchableExampleSelector
            key={selectedExampleName || 'default'}
            onSelect={handleExampleSelect}
            type="fingerprinting"
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
        </div>
      </div>

      {/* Fingerprint Comparison Output */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <h2 className="text-lg font-semibold mb-4">Fingerprint Result</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <h4 className="text-red-800 font-semibold mb-2">Error</h4>
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {result ? (
          <div className="space-y-4">
            {/* Fingerprint Comparison */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Default Fingerprint */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <h3 className="font-semibold text-gray-700 mb-2">Default Fingerprint</h3>
                <code className="block bg-gray-100 p-2 rounded text-sm mb-2">
                  {JSON.stringify(['{{ default }}'])}
                </code>
                <p className="text-sm text-gray-600">
                  Sentry groups by: exception type + value + stack trace
                </p>
                <p className="text-xs text-gray-500 mt-2">
                  Each unique DB instance would create a separate issue
                </p>
              </div>

              {/* Custom Fingerprint */}
              <div className={`rounded-lg p-4 border ${
                hasCustomFingerprint
                  ? 'bg-green-50 border-green-200'
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <h3 className={`font-semibold mb-2 ${
                  hasCustomFingerprint ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {hasCustomFingerprint ? 'Custom Fingerprint' : 'No Custom Fingerprint Set'}
                </h3>
                <code className={`block p-2 rounded text-sm mb-2 ${
                  hasCustomFingerprint ? 'bg-green-100' : 'bg-yellow-100'
                }`}>
                  {hasCustomFingerprint
                    ? JSON.stringify(customFingerprint)
                    : 'Using default fingerprint'}
                </code>
                <p className={`text-sm ${hasCustomFingerprint ? 'text-green-600' : 'text-yellow-600'}`}>
                  {hasCustomFingerprint
                    ? 'All matching events will be grouped into ONE issue'
                    : 'Events will be grouped using Sentry\'s default algorithm'}
                </p>
                {hasCustomFingerprint && (
                  <p className="text-xs text-green-500 mt-2">
                    ✓ Reduces noise by consolidating similar errors
                  </p>
                )}
              </div>
            </div>

            {/* Impact Explanation */}
            {hasCustomFingerprint && (
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-800 mb-2">Grouping Impact</h3>
                <p className="text-sm text-purple-700">
                  With fingerprint <code className="bg-purple-100 px-1 rounded">{JSON.stringify(customFingerprint)}</code>,
                  all events matching your criteria will be grouped into a single issue in Sentry,
                  regardless of differences in dynamic values (like database instance names, user IDs, etc.).
                </p>
              </div>
            )}

            {/* Full Transformed Event */}
            <details className="bg-gray-50 rounded-lg border border-gray-200">
              <summary className="p-4 cursor-pointer font-semibold text-gray-700 hover:bg-gray-100">
                View Full Transformed Event
              </summary>
              <div className="p-4 border-t border-gray-200">
                <pre className="bg-gray-800 text-gray-100 p-4 rounded overflow-auto text-sm max-h-96">
                  {JSON.stringify(result.transformedEvent, null, 2)}
                </pre>
              </div>
            </details>
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center text-gray-500">
            <p className="mb-2">No result yet</p>
            <p className="text-sm">
              Configure your event and fingerprinting code, then click Transform to see how the event will be grouped.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
