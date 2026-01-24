import { useState, useEffect, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { apiClient, Example } from '../api/client';

interface SearchableExampleSelectorProps {
  onSelect: (example: Example) => void;
}

/**
 * Highlights matching text in a string
 * @param text - The text to highlight
 * @param query - The search query
 * @returns React element with highlighted text
 */
function highlightText(text: string, query: string): JSX.Element {
  if (!query.trim()) {
    return <>{text}</>;
  }

  // Split query into terms for multi-term highlighting
  const terms = query.toLowerCase().trim().split(/\s+/);

  // Create regex pattern to match any of the terms
  const pattern = terms.map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const regex = new RegExp(`(${pattern})`, 'gi');

  const parts = text.split(regex);

  return (
    <>
      {parts.map((part, index) => {
        const isMatch = terms.some(term => part.toLowerCase() === term.toLowerCase());
        return isMatch ? (
          <mark key={index} className="bg-yellow-200 text-gray-900">
            {part}
          </mark>
        ) : (
          <span key={index}>{part}</span>
        );
      })}
    </>
  );
}

/**
 * Filters examples based on search query
 * Searches across name, SDK, and description fields
 * @param examples - List of examples to filter
 * @param query - Search query
 * @returns Filtered examples
 */
function filterExamples(examples: Example[], query: string): Example[] {
  if (!query.trim()) {
    return examples;
  }

  const terms = query.toLowerCase().trim().split(/\s+/);

  return examples.filter((example) => {
    // Create searchable text from all fields
    const searchText = [
      example.name,
      example.sdk,
      example.description,
    ].join(' ').toLowerCase();

    // All terms must match (AND logic)
    return terms.every(term => searchText.includes(term));
  });
}

function SearchableExampleSelector({ onSelect }: SearchableExampleSelectorProps) {
  const [examples, setExamples] = useState<Example[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<Example | null>(null);
  const [query, setQuery] = useState('');

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

  const filteredExamples = filterExamples(examples, query);

  const handleSelect = (example: Example) => {
    setSelectedExample(example);
    setQuery(''); // Clear search when selecting
    onSelect(example);
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
    <Combobox value={selectedExample} onChange={handleSelect}>
      {({ open }) => (
        <div className="relative">
          <Combobox.Button className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2 max-w-md">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <span className="truncate flex-1 text-left">
              {selectedExample ? selectedExample.name : 'Load Example'}
            </span>
            <svg
              className={`w-4 h-4 flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Combobox.Button>

          <Transition
            as={Fragment}
            leave="transition ease-in duration-100"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <Combobox.Options className="absolute z-10 mt-2 w-96 bg-white border border-gray-300 rounded-md shadow-lg max-h-96 overflow-hidden">
              <div className="p-2 border-b border-gray-200">
                <input
                  type="text"
                  role="combobox"
                  aria-expanded="true"
                  aria-autocomplete="list"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sentry-purple"
                  placeholder="Search examples..."
                  onChange={(event) => setQuery(event.target.value)}
                  value={query}
                  autoFocus
                />
              </div>

              <div className="overflow-y-auto max-h-80">
                {filteredExamples.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    No examples found matching "{query}"
                  </div>
                ) : (
                  filteredExamples.map((example) => (
                    <Combobox.Option
                      key={example.id}
                      value={example}
                      as={Fragment}
                    >
                      {({ active, selected }) => (
                        <li
                          className={`cursor-pointer px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                            active ? 'bg-gray-50' : ''
                          } ${selected ? 'bg-sentry-purple bg-opacity-10' : ''}`}
                        >
                          <div className="font-medium text-gray-900">
                            {highlightText(example.name, query)}
                          </div>
                          <div className="text-sm text-gray-600 mt-1">
                            {highlightText(example.description, query)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            SDK: {highlightText(example.sdk, query)}
                          </div>
                        </li>
                      )}
                    </Combobox.Option>
                  ))
                )}
              </div>
            </Combobox.Options>
          </Transition>
        </div>
      )}
    </Combobox>
  );
}

export default SearchableExampleSelector;
