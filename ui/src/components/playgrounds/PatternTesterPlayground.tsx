import { useState, useCallback, useEffect } from 'react';

type FilterType = 'ignoreErrors' | 'denyUrls' | 'allowUrls';

interface Pattern {
  id: string;
  value: string;
  isRegex: boolean;
}

interface TestCase {
  id: string;
  value: string;
}

interface MatchResult {
  testCase: string;
  matched: boolean;
  matchedPattern?: string;
  matchedBy?: 'string' | 'regex';
}

const DEFAULT_PATTERNS: Record<FilterType, Pattern[]> = {
  ignoreErrors: [
    { id: '1', value: 'ResizeObserver loop limit exceeded', isRegex: false },
    { id: '2', value: '/ChunkLoadError/', isRegex: true },
    { id: '3', value: 'Non-Error promise rejection captured', isRegex: false },
  ],
  denyUrls: [
    { id: '1', value: '/extensions\\//i', isRegex: true },
    { id: '2', value: '/^chrome:\\/\\//i', isRegex: true },
    { id: '3', value: '/googletagmanager\\.com/', isRegex: true },
  ],
  allowUrls: [
    { id: '1', value: '/example\\.com/', isRegex: true },
    { id: '2', value: '/cdn\\.example\\.com/', isRegex: true },
  ],
};

const DEFAULT_TEST_CASES: Record<FilterType, TestCase[]> = {
  ignoreErrors: [
    { id: '1', value: 'ResizeObserver loop limit exceeded' },
    { id: '2', value: 'ChunkLoadError: Loading chunk 5 failed' },
    { id: '3', value: 'TypeError: Cannot read property \'x\' of null' },
    { id: '4', value: 'Non-Error promise rejection captured with value: undefined' },
  ],
  denyUrls: [
    { id: '1', value: 'https://cdn.example.com/app.js' },
    { id: '2', value: 'chrome-extension://abc123/content.js' },
    { id: '3', value: 'https://www.googletagmanager.com/gtm.js' },
    { id: '4', value: 'https://example.com/bundle.js' },
  ],
  allowUrls: [
    { id: '1', value: 'https://example.com/app.js' },
    { id: '2', value: 'https://cdn.example.com/vendor.js' },
    { id: '3', value: 'https://malicious-site.com/script.js' },
    { id: '4', value: 'https://third-party.com/analytics.js' },
  ],
};

const FILTER_DESCRIPTIONS: Record<FilterType, { title: string; description: string; matchBehavior: string }> = {
  ignoreErrors: {
    title: 'ignoreErrors',
    description: 'Patterns to match against error messages. Matching errors will NOT be sent to Sentry.',
    matchBehavior: 'If ANY pattern matches, the error is dropped.',
  },
  denyUrls: {
    title: 'denyUrls',
    description: 'Patterns to match against the URL of the script that caused the error. Matching URLs will NOT send errors to Sentry.',
    matchBehavior: 'If ANY pattern matches the script URL, the error is dropped.',
  },
  allowUrls: {
    title: 'allowUrls',
    description: 'Patterns to match against the URL of the script. ONLY matching URLs will send errors to Sentry.',
    matchBehavior: 'If NO pattern matches, the error is dropped. Only matching URLs are allowed.',
  },
};

function parsePattern(pattern: Pattern): RegExp | string {
  if (!pattern.isRegex) {
    return pattern.value;
  }

  // Parse regex from string like "/pattern/flags"
  const match = pattern.value.match(/^\/(.+)\/([gimsuy]*)$/);
  if (match) {
    try {
      return new RegExp(match[1], match[2]);
    } catch (e) {
      // Invalid regex, treat as string
      return pattern.value;
    }
  }

  // No delimiters, try to create regex directly
  try {
    return new RegExp(pattern.value);
  } catch (e) {
    return pattern.value;
  }
}

// Format regex pattern for code generation (ensures /pattern/flags format)
function formatRegexForCode(value: string): string {
  // Already has delimiters
  if (/^\/(.+)\/([gimsuy]*)$/.test(value)) {
    return value;
  }
  // Wrap in delimiters
  return `/${value}/`;
}

function testMatch(testCase: string, patterns: Pattern[]): MatchResult {
  for (const pattern of patterns) {
    const parsed = parsePattern(pattern);

    if (typeof parsed === 'string') {
      // String matching - substring match
      if (testCase.includes(parsed)) {
        return {
          testCase,
          matched: true,
          matchedPattern: pattern.value,
          matchedBy: 'string',
        };
      }
    } else {
      // Regex matching
      if (parsed.test(testCase)) {
        return {
          testCase,
          matched: true,
          matchedPattern: pattern.value,
          matchedBy: 'regex',
        };
      }
    }
  }

  return {
    testCase,
    matched: false,
  };
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export default function PatternTesterPlayground() {
  const [filterType, setFilterType] = useState<FilterType>('ignoreErrors');
  const [patterns, setPatterns] = useState<Pattern[]>(DEFAULT_PATTERNS.ignoreErrors);
  const [testCases, setTestCases] = useState<TestCase[]>(DEFAULT_TEST_CASES.ignoreErrors);
  const [results, setResults] = useState<MatchResult[]>([]);
  const [newPattern, setNewPattern] = useState('');
  const [newPatternIsRegex, setNewPatternIsRegex] = useState(false);
  const [newTestCase, setNewTestCase] = useState('');

  // Run tests whenever patterns or test cases change
  const runTests = useCallback(() => {
    const newResults = testCases.map(tc => testMatch(tc.value, patterns));
    setResults(newResults);
  }, [patterns, testCases]);

  useEffect(() => {
    runTests();
  }, [runTests]);

  const handleFilterTypeChange = (type: FilterType) => {
    setFilterType(type);
    setPatterns(DEFAULT_PATTERNS[type]);
    setTestCases(DEFAULT_TEST_CASES[type]);
  };

  const addPattern = () => {
    if (!newPattern.trim()) return;
    setPatterns([...patterns, { id: generateId(), value: newPattern, isRegex: newPatternIsRegex }]);
    setNewPattern('');
    setNewPatternIsRegex(false);
  };

  const removePattern = (id: string) => {
    setPatterns(patterns.filter(p => p.id !== id));
  };

  const addTestCase = () => {
    if (!newTestCase.trim()) return;
    setTestCases([...testCases, { id: generateId(), value: newTestCase }]);
    setNewTestCase('');
  };

  const removeTestCase = (id: string) => {
    setTestCases(testCases.filter(tc => tc.id !== id));
  };

  const resetToDefaults = () => {
    setPatterns(DEFAULT_PATTERNS[filterType]);
    setTestCases(DEFAULT_TEST_CASES[filterType]);
  };

  const filterInfo = FILTER_DESCRIPTIONS[filterType];
  const matchedCount = results.filter(r => r.matched).length;
  const unmatchedCount = results.filter(r => !r.matched).length;

  return (
    <div>
      {/* Filter Type Selector */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-3">Filter Type</h2>
        <div className="flex gap-4">
          {(['ignoreErrors', 'denyUrls', 'allowUrls'] as FilterType[]).map((type) => (
            <button
              key={type}
              onClick={() => handleFilterTypeChange(type)}
              className={`px-4 py-2 rounded-md font-medium transition-colors ${
                filterType === type
                  ? 'bg-sentry-purple text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Filter Description */}
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
          <h3 className="font-medium text-blue-900">{filterInfo.title}</h3>
          <p className="text-sm text-blue-700 mt-1">{filterInfo.description}</p>
          <p className="text-sm text-blue-600 mt-1 font-medium">{filterInfo.matchBehavior}</p>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Patterns Column */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">Patterns ({patterns.length})</h2>
            <button
              onClick={resetToDefaults}
              className="text-sm text-gray-600 hover:text-sentry-purple underline"
            >
              Reset to defaults
            </button>
          </div>

          {/* Pattern List */}
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {patterns.map((pattern) => (
              <div
                key={pattern.id}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
              >
                <span className={`text-xs px-2 py-0.5 rounded ${
                  pattern.isRegex ? 'bg-purple-100 text-purple-700' : 'bg-gray-200 text-gray-600'
                }`}>
                  {pattern.isRegex ? 'regex' : 'string'}
                </span>
                <code className="flex-1 text-sm font-mono break-all">{pattern.value}</code>
                <button
                  onClick={() => removePattern(pattern.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {patterns.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No patterns. Add one below.</p>
            )}
          </div>

          {/* Add Pattern */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newPattern}
                onChange={(e) => setNewPattern(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addPattern()}
                placeholder={newPatternIsRegex ? '/pattern/flags' : 'substring to match'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sentry-purple"
              />
              <label className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-md cursor-pointer">
                <input
                  type="checkbox"
                  checked={newPatternIsRegex}
                  onChange={(e) => setNewPatternIsRegex(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm">Regex</span>
              </label>
              <button
                onClick={addPattern}
                className="px-4 py-2 bg-sentry-purple text-white rounded-md hover:bg-purple-900"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        {/* Test Cases Column */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-3">
            Test Cases ({testCases.length})
          </h2>

          {/* Test Case List */}
          <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
            {testCases.map((testCase) => (
              <div
                key={testCase.id}
                className="flex items-center gap-2 p-2 bg-gray-50 rounded border border-gray-200"
              >
                <code className="flex-1 text-sm font-mono break-all">{testCase.value}</code>
                <button
                  onClick={() => removeTestCase(testCase.id)}
                  className="text-red-500 hover:text-red-700"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            {testCases.length === 0 && (
              <p className="text-gray-500 text-sm text-center py-4">No test cases. Add one below.</p>
            )}
          </div>

          {/* Add Test Case */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex gap-2">
              <input
                type="text"
                value={newTestCase}
                onChange={(e) => setNewTestCase(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTestCase()}
                placeholder={filterType === 'ignoreErrors' ? 'Error message to test' : 'URL to test'}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-sentry-purple"
              />
              <button
                onClick={addTestCase}
                className="px-4 py-2 bg-sentry-purple text-white rounded-md hover:bg-purple-900"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Results</h2>
          <div className="flex gap-4 text-sm">
            <span className="text-green-600 font-medium">
              {matchedCount} matched
            </span>
            <span className="text-gray-600 font-medium">
              {unmatchedCount} not matched
            </span>
          </div>
        </div>

        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((result, idx) => {
              // Determine what happens based on filter type and match
              let willBeSent: boolean;
              let statusText: string;
              let statusColor: string;

              if (filterType === 'allowUrls') {
                // For allowUrls: matched = sent, not matched = dropped
                willBeSent = result.matched;
                statusText = result.matched ? 'ALLOWED' : 'BLOCKED';
                statusColor = result.matched ? 'text-green-600 bg-green-50 border-green-200' : 'text-red-600 bg-red-50 border-red-200';
              } else {
                // For ignoreErrors/denyUrls: matched = dropped, not matched = sent
                willBeSent = !result.matched;
                statusText = result.matched ? 'FILTERED' : 'SENT';
                statusColor = result.matched ? 'text-yellow-600 bg-yellow-50 border-yellow-200' : 'text-green-600 bg-green-50 border-green-200';
              }

              return (
                <div
                  key={idx}
                  className={`p-3 rounded-md border ${statusColor}`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <code className="text-sm font-mono break-all block">
                        {result.testCase}
                      </code>
                      {result.matched && result.matchedPattern && (
                        <p className="text-xs mt-1 opacity-75">
                          Matched by {result.matchedBy}: <code>{result.matchedPattern}</code>
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        willBeSent ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {statusText}
                      </span>
                      <span className="text-xs text-gray-500">
                        {willBeSent ? 'Will be sent to Sentry' : 'Will NOT be sent'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center text-gray-500">
            Add patterns and test cases to see results
          </div>
        )}
      </div>

      {/* Code Generation */}
      <div className="bg-white rounded-lg shadow-md p-4 mt-6">
        <h2 className="text-lg font-semibold mb-3">Generated Code</h2>
        <p className="text-sm text-gray-600 mb-3">
          Copy this configuration into your Sentry.init():
        </p>
        <pre className="p-4 bg-gray-900 text-green-400 rounded-lg text-sm font-mono overflow-x-auto">
{`Sentry.init({
  // ... other options
  ${filterType}: [
${patterns.map(p => `    ${p.isRegex ? formatRegexForCode(p.value) : JSON.stringify(p.value)},`).join('\n')}
  ],
});`}
        </pre>
        <button
          onClick={() => {
            const code = `${filterType}: [
${patterns.map(p => `  ${p.isRegex ? formatRegexForCode(p.value) : JSON.stringify(p.value)},`).join('\n')}
]`;
            navigator.clipboard.writeText(code);
          }}
          className="mt-3 px-4 py-2 bg-gray-700 text-white rounded-md hover:bg-gray-800 text-sm"
        >
          Copy to Clipboard
        </button>
      </div>
    </div>
  );
}
