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

const DEFAULT_EVENT = JSON.stringify(
  {
    event_id: 'example-event-id',
    exception: {
      values: [
        {
          type: 'Error',
          value: 'Example error message',
        },
      ],
    },
  },
  null,
  2
);

const DEFAULT_BEFORESEND_JS = `(event, hint) => {
  // Transform error message to Transformers theme 🤖
  if (event.exception && event.exception.values) {
    event.exception.values[0].value = 'Transformers by Sentry 🤖';
    event.exception.values[0].type = 'TransformerError';
  }

  // Add custom tag indicating which SDK transformed this
  event.tags = { ...event.tags, transformed_by: 'JavaScript SDK' };

  return event;
}`;

const DEFAULT_BEFORESEND_PY = `def before_send(event, hint):
    # Transform error message to Transformers theme 🤖
    if event.get('exception') and event['exception'].get('values'):
        event['exception']['values'][0]['value'] = 'Transformers by Sentry 🤖'
        event['exception']['values'][0]['type'] = 'TransformerError'

    # Add custom tag indicating which SDK transformed this
    if 'tags' not in event:
        event['tags'] = {}
    event['tags']['transformed_by'] = 'Python SDK'

    return event`;

const DEFAULT_BEFORESEND_RUBY = `lambda do |event, hint|
  # Transform error message to Transformers theme 🤖
  if event['exception'] && event['exception']['values']
    event['exception']['values'][0]['value'] = 'Transformers by Sentry 🤖'
    event['exception']['values'][0]['type'] = 'TransformerError'
  end

  # Add custom tag indicating which SDK transformed this
  event['tags'] = { 'transformed_by' => 'Ruby SDK' }

  event
end`;

const DEFAULT_BEFORESEND_PHP = `function($event, $hint) {
    // Transform error message to Transformers theme 🤖
    if (isset($event['exception']['values'])) {
        $event['exception']['values'][0]['value'] = 'Transformers by Sentry 🤖';
        $event['exception']['values'][0]['type'] = 'TransformerError';
    }

    // Add custom tag indicating which SDK transformed this
    $event['tags'] = ['transformed_by' => 'PHP SDK'];

    return $event;
}`;

const DEFAULT_BEFORESEND_GO = `// Transform error message to Transformers theme 🤖
if exception, ok := event["exception"].(map[string]interface{}); ok {
    if values, ok := exception["values"].([]interface{}); ok && len(values) > 0 {
        if firstValue, ok := values[0].(map[string]interface{}); ok {
            firstValue["value"] = "Transformers by Sentry 🤖"
            firstValue["type"] = "TransformerError"
        }
    }
}

// Add custom tag indicating which SDK transformed this
event["tags"] = map[string]string{"transformed_by": "Go SDK"}

return event`;

const DEFAULT_BEFORESEND_DOTNET = `// Transform error message to Transformers theme 🤖
// Note: ev.Message is a complex type in .NET SDK
ev.SetTag("transformed_by", ".NET SDK");

// Add extra data
ev.SetExtra("message", "Transformers by Sentry 🤖");
ev.SetExtra("robot", "🤖");

return ev;`;

const DEFAULT_BEFORESEND_JAVA = `// Transform error message to Transformers theme 🤖
event.setException("TransformerError", "Transformers by Sentry 🤖");

// Add custom tag indicating which SDK transformed this
event.setTag("transformed_by", "Java SDK");

return event;`;

const DEFAULT_BEFORESEND_ANDROID = `// Transform error message to Transformers theme 🤖
event.setException("TransformerError", "Transformers by Sentry 🤖")

// Add custom tag indicating which SDK transformed this
event.setTag("transformed_by", "Android SDK")

// Add Android-specific context
event.setExtra("platform", "android")

return event`;

const DEFAULT_BEFORESEND_RN = `(event, hint) => {
  // Transform error message to Transformers theme 🤖
  if (event.exception && event.exception.values) {
    event.exception.values[0].value = 'Transformers by Sentry 🤖';
    event.exception.values[0].type = 'TransformerError';
  }

  // Add custom tag indicating which SDK transformed this
  event.tags = { ...event.tags, transformed_by: 'React Native SDK' };

  return event;
}`;

const DEFAULT_BEFORESEND_COCOA = `// Transform error message to Transformers theme 🤖
if (event.exception && event.exception.values) {
  event.exception.values[0].value = 'Transformers by Sentry 🤖';
  event.exception.values[0].type = 'TransformerError';
}

// Add custom tag indicating which SDK transformed this
if (!event.tags) event.tags = {};
event.tags.transformed_by = 'Cocoa SDK';
event.tags.platform = 'iOS';

return event;`;

const DEFAULT_BEFORESEND_RUST = `// Transform error message to Transformers theme 🤖
if let Some(exception) = event.get_mut("exception") {
    if let Some(values) = exception.get_mut("values") {
        if let Some(arr) = values.as_array_mut() {
            if let Some(first) = arr.first_mut() {
                first["value"] = serde_json::json!("Transformers by Sentry 🤖");
                first["type"] = serde_json::json!("TransformerError");
            }
        }
    }
}

// Add custom tag indicating which SDK transformed this
if !event.as_object()?.contains_key("tags") {
    event["tags"] = serde_json::json!({});
}
event["tags"]["transformed_by"] = serde_json::json!("Rust SDK");

Some(event)`;

const DEFAULT_BEFORESEND_ELIXIR = `fn event, _hint ->
  # Transform error message to Transformers theme 🤖
  event
  |> Map.update("exception", %{}, fn exception ->
    Map.update(exception, "values", [], fn values ->
      case values do
        [first | rest] ->
          [
            first
            |> Map.put("value", "Transformers by Sentry 🤖")
            |> Map.put("type", "TransformerError")
            | rest
          ]
        _ -> values
      end
    end)
  end)
  |> Map.put("tags", %{"transformed_by" => "Elixir SDK"})
end`;

export default function BeforeSendPlayground() {
  const [eventJson, setEventJson] = useState(DEFAULT_EVENT);
  const [beforeSendCode, setBeforeSendCode] = useState(DEFAULT_BEFORESEND_JS);
  const [selectedSdk, setSelectedSdk] = useState('javascript');
  const [result, setResult] = useState<TransformResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExampleName, setSelectedExampleName] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleSdkChange = (sdk: string) => {
    setSelectedSdk(sdk);
    // Update default beforeSend code based on SDK
    if (sdk === 'python') {
      setBeforeSendCode(DEFAULT_BEFORESEND_PY);
    } else if (sdk === 'ruby') {
      setBeforeSendCode(DEFAULT_BEFORESEND_RUBY);
    } else if (sdk === 'php') {
      setBeforeSendCode(DEFAULT_BEFORESEND_PHP);
    } else if (sdk === 'go') {
      setBeforeSendCode(DEFAULT_BEFORESEND_GO);
    } else if (sdk === 'dotnet') {
      setBeforeSendCode(DEFAULT_BEFORESEND_DOTNET);
    } else if (sdk === 'java') {
      setBeforeSendCode(DEFAULT_BEFORESEND_JAVA);
    } else if (sdk === 'android') {
      setBeforeSendCode(DEFAULT_BEFORESEND_ANDROID);
    } else if (sdk === 'react-native') {
      setBeforeSendCode(DEFAULT_BEFORESEND_RN);
    } else if (sdk === 'cocoa') {
      setBeforeSendCode(DEFAULT_BEFORESEND_COCOA);
    } else if (sdk === 'rust') {
      setBeforeSendCode(DEFAULT_BEFORESEND_RUST);
    } else if (sdk === 'elixir') {
      setBeforeSendCode(DEFAULT_BEFORESEND_ELIXIR);
    } else {
      setBeforeSendCode(DEFAULT_BEFORESEND_JS);
    }
  };

  const handleExampleSelect = (example: Example) => {
    setEventJson(JSON.stringify(example.event, null, 2));
    setBeforeSendCode(example.beforeSendCode);
    setSelectedSdk(example.sdk);
    setSelectedExampleName(example.name);
    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setEventJson(DEFAULT_EVENT);

    if (selectedSdk === 'python') {
      setBeforeSendCode(DEFAULT_BEFORESEND_PY);
    } else if (selectedSdk === 'ruby') {
      setBeforeSendCode(DEFAULT_BEFORESEND_RUBY);
    } else if (selectedSdk === 'php') {
      setBeforeSendCode(DEFAULT_BEFORESEND_PHP);
    } else if (selectedSdk === 'go') {
      setBeforeSendCode(DEFAULT_BEFORESEND_GO);
    } else if (selectedSdk === 'dotnet') {
      setBeforeSendCode(DEFAULT_BEFORESEND_DOTNET);
    } else if (selectedSdk === 'java') {
      setBeforeSendCode(DEFAULT_BEFORESEND_JAVA);
    } else if (selectedSdk === 'android') {
      setBeforeSendCode(DEFAULT_BEFORESEND_ANDROID);
    } else if (selectedSdk === 'react-native') {
      setBeforeSendCode(DEFAULT_BEFORESEND_RN);
    } else if (selectedSdk === 'cocoa') {
      setBeforeSendCode(DEFAULT_BEFORESEND_COCOA);
    } else if (selectedSdk === 'rust') {
      setBeforeSendCode(DEFAULT_BEFORESEND_RUST);
    } else if (selectedSdk === 'elixir') {
      setBeforeSendCode(DEFAULT_BEFORESEND_ELIXIR);
    } else {
      setBeforeSendCode(DEFAULT_BEFORESEND_JS);
    }

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
          <h2 className="text-lg font-semibold mb-1">Event JSON</h2>
          <p className="text-sm text-gray-600 mb-2">
            {selectedExampleName ? (
              <>
                Loaded example: <span className="font-medium text-sentry-purple">{selectedExampleName}</span>
              </>
            ) : (
              'Paste your Sentry event JSON or use the default example'
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

        {/* beforeSend Editor */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-1">beforeSend Code</h2>
          <p className="text-sm text-gray-600 mb-2">
            Write your beforeSend callback to transform the event
          </p>
          <div className="h-7 mb-1">
            {!['javascript', 'python', 'ruby', 'php', 'go', 'dotnet', 'react-native', 'rust'].includes(selectedSdk) && (
              <div className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200 inline-block">
                ⚠️ Real-time syntax validation not yet available for this SDK
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
          <SearchableExampleSelector key={selectedExampleName || 'default'} onSelect={handleExampleSelect} type="beforeSend" />
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

          {/* Spacer - push Share button all the way right */}
          <div className="flex-1"></div>

          {/* Share button - ALL THE WAY RIGHT */}
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
          Click Transform to see the result of your beforeSend transformation
        </p>
        {(result || error) ? (
          <OutputViewer result={result} error={error} />
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center text-gray-500 min-h-96 flex items-center justify-center">
            No result yet. Configure your event and beforeSend code, then click Transform.
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && gistUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Configuration Shared!</h3>

            <p className="text-gray-600 mb-4">
              Your beforeSend code and event structure have been shared.
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
