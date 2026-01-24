import { useState } from 'react';
import ReactDiffViewer from 'react-diff-viewer-continued';
import { TransformResponse } from '../api/client';

interface OutputViewerProps {
  result: TransformResponse | null;
  error: string | null;
}

type ViewMode = 'full' | 'diff';

function OutputViewer({ result, error }: OutputViewerProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('full');

  if (error) {
    return (
      <div className="bg-red-50 border border-red-300 rounded p-4">
        <h3 className="text-red-800 font-semibold mb-2">Error</h3>
        <pre className="text-sm text-red-700 whitespace-pre-wrap">{error}</pre>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="bg-gray-100 rounded p-4 text-gray-600">
        No result yet. Click "Transform" to see the output.
      </div>
    );
  }

  if (!result.success) {
    return (
      <div className="bg-red-50 border border-red-300 rounded p-4">
        <h3 className="text-red-800 font-semibold mb-2">Transformation Failed</h3>
        <pre className="text-sm text-red-700 whitespace-pre-wrap">
          {result.error}
        </pre>
        {result.traceback && (
          <details className="mt-3">
            <summary className="cursor-pointer text-red-800 font-medium">
              Show Traceback
            </summary>
            <pre className="mt-2 text-xs text-red-600 bg-red-100 p-2 rounded overflow-x-auto">
              {result.traceback}
            </pre>
          </details>
        )}
      </div>
    );
  }

  // Event was dropped (null)
  if (result.transformedEvent === null) {
    return (
      <div className="space-y-4">
        <div className="bg-green-50 border border-green-300 rounded p-4">
          <h3 className="text-green-800 font-semibold mb-2">
            ✓ Transformation Successful
          </h3>
        </div>
        <div className="bg-yellow-50 border border-yellow-300 rounded p-4">
          <h3 className="text-yellow-800 font-semibold mb-2">Event Dropped</h3>
          <p className="text-sm text-yellow-700">
            The beforeSend callback returned null/None, which means the event was dropped
            and will not be sent to Sentry.
          </p>
        </div>
      </div>
    );
  }

  // Check if we should show tabs (need both original and transformed events)
  const showTabs = result.originalEvent && result.transformedEvent;

  return (
    <div className="space-y-4">
      <div className="bg-green-50 border border-green-300 rounded p-4">
        <h3 className="text-green-800 font-semibold mb-2">
          ✓ Transformation Successful
        </h3>
      </div>

      {showTabs ? (
        <div className="bg-gray-50 border border-gray-300 rounded">
          {/* Tabs */}
          <div className="border-b border-gray-300 bg-white rounded-t" role="tablist">
            <button
              role="tab"
              aria-selected={viewMode === 'full'}
              onClick={() => setViewMode('full')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                viewMode === 'full'
                  ? 'border-sentry-purple text-sentry-purple'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Full Output
            </button>
            <button
              role="tab"
              aria-selected={viewMode === 'diff'}
              onClick={() => setViewMode('diff')}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                viewMode === 'diff'
                  ? 'border-sentry-purple text-sentry-purple'
                  : 'border-transparent text-gray-600 hover:text-gray-800'
              }`}
            >
              Diff View
            </button>
          </div>

          {/* Tab content */}
          <div className="p-4">
            {viewMode === 'full' ? (
              <div>
                <h3 className="font-semibold mb-2">Transformed Event</h3>
                <pre className="text-sm bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
                  {JSON.stringify(result.transformedEvent, null, 2)}
                </pre>
              </div>
            ) : (
              <div>
                <ReactDiffViewer
                  oldValue={JSON.stringify(result.originalEvent, null, 2)}
                  newValue={JSON.stringify(result.transformedEvent, null, 2)}
                  splitView={true}
                  leftTitle="Original Event"
                  rightTitle="Transformed Event"
                  useDarkTheme={false}
                  styles={{
                    diffContainer: {
                      fontSize: '13px',
                    },
                  }}
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-gray-300 rounded p-4">
          <h3 className="font-semibold mb-2">Transformed Event</h3>
          <pre className="text-sm bg-gray-900 text-green-400 p-4 rounded overflow-x-auto">
            {JSON.stringify(result.transformedEvent, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}

export default OutputViewer;
