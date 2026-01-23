import { useState } from 'react';
import EventInput from './components/EventInput';
import BeforeSendEditor from './components/BeforeSendEditor';
import SdkSelector from './components/SdkSelector';
import OutputViewer from './components/OutputViewer';
import { apiClient, TransformResponse } from './api/client';
import sentryLogo from './assets/sentry-logo.png';

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

  // Add custom tag
  event.tags = { ...event.tags, transformed: true };

  return event;
}`;

const DEFAULT_BEFORESEND_PY = `def before_send(event, hint):
    # Transform error message to Transformers theme 🤖
    if event.get('exception') and event['exception'].get('values'):
        event['exception']['values'][0]['value'] = 'Transformers by Sentry 🤖'
        event['exception']['values'][0]['type'] = 'TransformerError'

    # Add custom tag
    if 'tags' not in event:
        event['tags'] = {}
    event['tags']['transformed'] = True

    return event`;

const DEFAULT_BEFORESEND_RUBY = `lambda do |event, hint|
  # Transform error message to Transformers theme 🤖
  if event['exception'] && event['exception']['values']
    event['exception']['values'][0]['value'] = 'Transformers by Sentry 🤖'
    event['exception']['values'][0]['type'] = 'TransformerError'
  end

  # Add custom tag
  event['tags'] = { 'transformed' => true }

  event
end`;

const DEFAULT_BEFORESEND_PHP = `function($event, $hint) {
    // Transform error message to Transformers theme 🤖
    if (isset($event['exception']['values'])) {
        $event['exception']['values'][0]['value'] = 'Transformers by Sentry 🤖';
        $event['exception']['values'][0]['type'] = 'TransformerError';
    }

    // Add custom tag
    $event['tags'] = ['transformed' => true];

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

// Add custom tag
event["tags"] = map[string]bool{"transformed": true}

return event`;

const DEFAULT_BEFORESEND_DOTNET = `// Transform error message to Transformers theme 🤖
// Note: ev.Message is a complex type in .NET SDK
ev.SetTag("theme", "transformers");
ev.SetTag("transformed", "true");

// Add extra data
ev.SetExtra("message", "Transformers by Sentry 🤖");
ev.SetExtra("robot", "🤖");

return ev;`;

const DEFAULT_BEFORESEND_RN = `(event, hint) => {
  // Transform error message to Transformers theme 🤖
  if (event.exception && event.exception.values) {
    event.exception.values[0].value = 'Transformers by Sentry 🤖';
    event.exception.values[0].type = 'TransformerError';
  }

  // Add custom tag
  event.tags = { ...event.tags, transformed: true };

  return event;
}`;

function App() {
  const [eventJson, setEventJson] = useState(DEFAULT_EVENT);
  const [beforeSendCode, setBeforeSendCode] = useState(DEFAULT_BEFORESEND_JS);
  const [selectedSdk, setSelectedSdk] = useState('javascript');
  const [result, setResult] = useState<TransformResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
    } else if (sdk === 'react-native') {
      setBeforeSendCode(DEFAULT_BEFORESEND_RN);
    } else {
      setBeforeSendCode(DEFAULT_BEFORESEND_JS);
    }
  };

  const handleTransform = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      // Parse event JSON
      let event;
      try {
        event = JSON.parse(eventJson);
      } catch (e) {
        throw new Error('Invalid JSON in event input');
      }

      // Call API
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white text-gray-900 py-4 px-6 shadow-md border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={sentryLogo} alt="Sentry Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold text-sentry-purple">beforeSend Testing Playground</h1>
              <p className="text-sm text-gray-600 mt-1">
                Test Sentry beforeSend transformations across multiple SDKs
              </p>
            </div>
          </div>
          <a
            href="https://github.com/vlad-ko/beforesend-playground"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">GitHub</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Editors Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Event Input */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-1">Event JSON</h2>
            <p className="text-sm text-gray-600 mb-3">
              Paste your Sentry event JSON or use the default example
            </p>
            <EventInput value={eventJson} onChange={setEventJson} />
          </div>

          {/* beforeSend Editor */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-1">beforeSend Code</h2>
            <p className="text-sm text-gray-600 mb-3">
              Write your beforeSend callback to transform the event
            </p>
            <BeforeSendEditor
              value={beforeSendCode}
              onChange={setBeforeSendCode}
              language={(selectedSdk === 'dotnet' ? 'csharp' : selectedSdk === 'react-native' ? 'javascript' : selectedSdk) as 'javascript' | 'python' | 'ruby' | 'php' | 'go' | 'csharp'}
            />
          </div>
        </div>

        {/* Controls */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-6">
          <div className="flex items-center gap-4">
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

        {/* Output */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-1">Result</h2>
          <p className="text-sm text-gray-600 mb-3">
            Click Transform to see the result of your beforeSend transformation
          </p>
          {(result || error) ? (
            <OutputViewer result={result} error={error} />
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center text-gray-500">
              No result yet. Configure your event and beforeSend code, then click Transform.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
