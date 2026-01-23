import { useState } from 'react';
import EventInput from './components/EventInput';
import BeforeSendEditor from './components/BeforeSendEditor';
import SdkSelector from './components/SdkSelector';
import OutputViewer from './components/OutputViewer';
import { apiClient, TransformResponse } from './api/client';
import { SentryLogo } from './assets/SentryLogo';

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
      <header className="bg-sentry-purple text-white py-4 px-6 shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="data:image/svg+xml,%3Csvg viewBox='0 0 200 200' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='100' cy='100' r='90' fill='white' opacity='0.1'/%3E%3Cpath d='M100 40C77.909 40 60 57.909 60 80C60 84.971 61.013 89.709 62.863 94.026L75.625 80.625C78.458 77.708 82.5 76 86.875 76H100V40Z' fill='white'/%3E%3Cpath d='M100 124V160C122.091 160 140 142.091 140 120C140 115.029 138.987 110.291 137.137 105.974L124.375 119.375C121.542 122.292 117.5 124 113.125 124H100Z' fill='white'/%3E%3Cpath d='M80 100C80 94.477 84.477 90 90 90H110C115.523 90 120 94.477 120 100C120 105.523 115.523 110 110 110H90C84.477 110 80 105.523 80 100Z' fill='white'/%3E%3C/svg%3E" alt="Sentry Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold">beforeSend Testing Playground</h1>
              <p className="text-sm text-gray-300 mt-1">
                Test Sentry beforeSend transformations across multiple SDKs
              </p>
            </div>
          </div>
          <a
            href="https://github.com/vlad-ko/beforesend-playground"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-white bg-opacity-10 hover:bg-opacity-20 rounded-md transition-colors"
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
              language={selectedSdk === 'python' ? 'python' : 'javascript'}
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
