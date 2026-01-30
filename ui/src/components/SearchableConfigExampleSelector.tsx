import { useState, useEffect, Fragment } from 'react';
import { Combobox, Transition } from '@headlessui/react';
import { apiClient, ConfigExample } from '../api/client';

interface SearchableConfigExampleSelectorProps {
  onSelect: (example: ConfigExample) => void;
}

function highlightText(text: string, query: string): JSX.Element {
  if (!query.trim()) {
    return <>{text}</>;
  }

  const terms = query.toLowerCase().trim().split(/\s+/);
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

function filterExamples(examples: ConfigExample[], query: string): ConfigExample[] {
  if (!query.trim()) {
    return examples;
  }

  const terms = query.toLowerCase().trim().split(/\s+/);

  return examples.filter((example) => {
    const searchText = [
      example.name,
      example.sdk,
      example.description,
      example.useCase || '',
    ].join(' ').toLowerCase();

    return terms.every(term => searchText.includes(term));
  });
}

function getComplexityBadge(complexity?: string): { color: string; label: string } {
  switch (complexity) {
    case 'basic':
      return { color: 'bg-green-100 text-green-800', label: 'Basic' };
    case 'intermediate':
      return { color: 'bg-blue-100 text-blue-800', label: 'Intermediate' };
    case 'advanced':
      return { color: 'bg-purple-100 text-purple-800', label: 'Advanced' };
    default:
      return { color: 'bg-gray-100 text-gray-800', label: 'General' };
  }
}

function SearchableConfigExampleSelector({ onSelect }: SearchableConfigExampleSelectorProps) {
  const [examples, setExamples] = useState<ConfigExample[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<ConfigExample | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    async function fetchExamples() {
      try {
        setIsLoading(true);
        const response = await apiClient.getConfigExamples();
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

  const handleSelect = (example: ConfigExample) => {
    setSelectedExample(example);
    setQuery('');
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
            <Combobox.Options className="absolute z-50 mt-2 w-96 bg-white border border-gray-300 rounded-md shadow-lg overflow-hidden">
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

              <div className="max-h-80 overflow-y-auto">
                {filteredExamples.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-500">
                    {query ? `No examples found for "${query}"` : 'No examples available'}
                  </div>
                ) : (
                  filteredExamples.map((example) => {
                    const complexityBadge = getComplexityBadge(example.complexity);
                    return (
                      <Combobox.Option
                        key={example.id}
                        value={example}
                        className={({ active }) =>
                          `cursor-pointer px-4 py-3 border-b border-gray-100 last:border-b-0 ${
                            active ? 'bg-purple-50' : 'bg-white hover:bg-gray-50'
                          }`
                        }
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-gray-900">
                              {highlightText(example.name, query)}
                            </span>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${complexityBadge.color}`}>
                              {complexityBadge.label}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 mb-1">
                            {highlightText(example.useCase || example.description, query)}
                          </div>
                          <div className="text-xs text-gray-500 uppercase font-medium">
                            {example.sdk}
                          </div>
                        </div>
                      </Combobox.Option>
                    );
                  })
                )}
              </div>
            </Combobox.Options>
          </Transition>
        </div>
      )}
    </Combobox>
  );
}

export default SearchableConfigExampleSelector;
