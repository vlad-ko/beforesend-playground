import { useState } from 'react';
import EventInput from './components/EventInput';
import BeforeSendEditor from './components/BeforeSendEditor';
import SdkSelector from './components/SdkSelector';
import OutputViewer from './components/OutputViewer';
import { apiClient, TransformResponse } from './api/client';

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
  // Modify the event here
  // Return null to drop the event
  // Return event to send it

  return event;
}`;

const DEFAULT_BEFORESEND_PY = `def before_send(event, hint):
    # Modify the event here
    # Return None to drop the event
    # Return event to send it

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
        <h1 className="text-2xl font-bold">beforeSend Testing Playground</h1>
        <p className="text-sm text-gray-300 mt-1">
          Test Sentry beforeSend transformations across multiple SDKs
        </p>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Editors Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Event Input */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">Event JSON</h2>
            <EventInput value={eventJson} onChange={setEventJson} />
          </div>

          {/* beforeSend Editor */}
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">beforeSend Code</h2>
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
        {(result || error) && (
          <div className="bg-white rounded-lg shadow-md p-4">
            <h2 className="text-lg font-semibold mb-3">Result</h2>
            <OutputViewer result={result} error={error} />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
