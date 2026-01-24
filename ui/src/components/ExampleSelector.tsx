import { useState, useEffect } from 'react';
import { apiClient, Example } from '../api/client';

interface ExampleSelectorProps {
  onSelect: (example: Example) => void;
}

function ExampleSelector({ onSelect }: ExampleSelectorProps) {
  const [examples, setExamples] = useState<Example[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedExample, setSelectedExample] = useState<Example | null>(null);

  useEffect(() => {
    async function fetchExamples() {
      try {
        setIsLoading(true);
        const response = await apiClient.getExamples();
        setExamples(response.examples);
        setError(null);
      } catch (err: any) {
        setError('Failed to load examples');
        console.error('Error fetching examples:', err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchExamples();
  }, []);

  const handleSelect = (example: Example) => {
    setSelectedExample(example);
    onSelect(example);
    setIsOpen(false);
  };

  if (isLoading) {
    return (
      <div className="text-sm text-gray-600">
        Loading examples...
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-sm text-red-600">
        Error loading examples
      </div>
    );
  }

  if (examples.length === 0) {
    return (
      <div className="text-sm text-gray-600">
        No examples available
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2 max-w-md"
      >
        <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
        <span className="truncate">
          {selectedExample ? selectedExample.name : 'Load Example'}
        </span>
        <svg className={`w-4 h-4 flex-shrink-0 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 mt-2 w-96 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-y-auto">
          {examples.map((example) => (
            <button
              key={example.id}
              onClick={() => handleSelect(example)}
              className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
            >
              <div className="font-medium text-gray-900">{example.name}</div>
              <div className="text-sm text-gray-600 mt-1">{example.description}</div>
              <div className="text-xs text-gray-500 mt-1">SDK: {example.sdk}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default ExampleSelector;
