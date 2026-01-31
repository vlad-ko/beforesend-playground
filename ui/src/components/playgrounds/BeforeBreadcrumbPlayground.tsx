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

const DEFAULT_BREADCRUMB = JSON.stringify(
  {
    type: 'default',
    category: 'navigation',
    level: 'info',
    timestamp: 1704067200.0,
    message: 'Navigation to /dashboard',
    data: {
      from: '/login',
      to: '/dashboard?token=secret123&user_id=456',
    },
  },
  null,
  2
);

const DEFAULT_BEFOREBREADCRUMB_JS = `(breadcrumb, hint) => {
  // Drop console breadcrumbs to reduce noise
  if (breadcrumb.category === 'console') {
    return null;
  }

  // Scrub tokens from navigation URLs
  if (breadcrumb.category === 'navigation' && breadcrumb.data?.to) {
    breadcrumb.data.to = breadcrumb.data.to.replace(/token=[^&]+/, 'token=[REDACTED]');
  }

  // Scrub user IDs from URLs
  if (breadcrumb.data?.to) {
    breadcrumb.data.to = breadcrumb.data.to.replace(/user_id=\\d+/, 'user_id=[REDACTED]');
  }

  return breadcrumb;
}`;

const DEFAULT_BEFOREBREADCRUMB_PY = `def before_breadcrumb(breadcrumb, hint):
    # Drop console breadcrumbs to reduce noise
    if breadcrumb.get('category') == 'console':
        return None

    # Scrub tokens from navigation URLs
    if breadcrumb.get('category') == 'navigation':
        data = breadcrumb.get('data', {})
        if 'to' in data:
            import re
            data['to'] = re.sub(r'token=[^&]+', 'token=[REDACTED]', data['to'])
            data['to'] = re.sub(r'user_id=\\d+', 'user_id=[REDACTED]', data['to'])

    return breadcrumb`;

const DEFAULT_BEFOREBREADCRUMB_RUBY = `lambda do |breadcrumb, hint|
  # Drop console breadcrumbs to reduce noise
  if breadcrumb['category'] == 'console'
    return nil
  end

  # Scrub tokens from navigation URLs
  if breadcrumb['category'] == 'navigation' && breadcrumb['data']
    if breadcrumb['data']['to']
      breadcrumb['data']['to'] = breadcrumb['data']['to'].gsub(/token=[^&]+/, 'token=[REDACTED]')
      breadcrumb['data']['to'] = breadcrumb['data']['to'].gsub(/user_id=\\d+/, 'user_id=[REDACTED]')
    end
  end

  breadcrumb
end`;

const DEFAULT_BEFOREBREADCRUMB_PHP = `function($breadcrumb, $hint) {
    // Drop console breadcrumbs to reduce noise
    if (($breadcrumb['category'] ?? '') === 'console') {
        return null;
    }

    // Scrub tokens from navigation URLs
    if (($breadcrumb['category'] ?? '') === 'navigation') {
        if (isset($breadcrumb['data']['to'])) {
            $breadcrumb['data']['to'] = preg_replace('/token=[^&]+/', 'token=[REDACTED]', $breadcrumb['data']['to']);
            $breadcrumb['data']['to'] = preg_replace('/user_id=\\d+/', 'user_id=[REDACTED]', $breadcrumb['data']['to']);
        }
    }

    return $breadcrumb;
}`;

const DEFAULT_BEFOREBREADCRUMB_GO = `// Drop console breadcrumbs to reduce noise
if category, ok := event["category"].(string); ok && category == "console" {
    return nil
}

// Scrub tokens from navigation URLs
if category, ok := event["category"].(string); ok && category == "navigation" {
    if data, ok := event["data"].(map[string]interface{}); ok {
        if to, ok := data["to"].(string); ok {
            re := regexp.MustCompile("token=[^&]+")
            data["to"] = re.ReplaceAllString(to, "token=[REDACTED]")
            re2 := regexp.MustCompile("user_id=\\\\d+")
            data["to"] = re2.ReplaceAllString(data["to"].(string), "user_id=[REDACTED]")
        }
    }
}

return event`;

const DEFAULT_BEFOREBREADCRUMB_DOTNET = `// Drop console breadcrumbs to reduce noise
if (breadcrumb.Category == "console")
{
    return null;
}

// Scrub tokens from navigation URLs
if (breadcrumb.Category == "navigation" && breadcrumb.Data.ContainsKey("to"))
{
    var to = breadcrumb.Data["to"]?.ToString() ?? "";
    to = Regex.Replace(to, @"token=[^&]+", "token=[REDACTED]");
    to = Regex.Replace(to, @"user_id=\\d+", "user_id=[REDACTED]");
    breadcrumb.Data["to"] = to;
}

return breadcrumb;`;

const DEFAULT_BEFOREBREADCRUMB_JAVA = `// Drop console breadcrumbs to reduce noise
if ("console".equals(breadcrumb.getCategory())) {
    return null;
}

// Scrub tokens from navigation URLs
if ("navigation".equals(breadcrumb.getCategory())) {
    Map<String, Object> data = breadcrumb.getData();
    if (data != null && data.containsKey("to")) {
        String to = data.get("to").toString();
        to = to.replaceAll("token=[^&]+", "token=[REDACTED]");
        to = to.replaceAll("user_id=\\\\d+", "user_id=[REDACTED]");
        data.put("to", to);
    }
}

return breadcrumb;`;

const DEFAULT_BEFOREBREADCRUMB_ANDROID = `// Drop console breadcrumbs to reduce noise
if (breadcrumb.category == "console") {
    return null
}

// Scrub tokens from navigation URLs
if (breadcrumb.category == "navigation") {
    breadcrumb.data?.get("to")?.let { to ->
        val scrubbed = to.toString()
            .replace(Regex("token=[^&]+"), "token=[REDACTED]")
            .replace(Regex("user_id=\\\\d+"), "user_id=[REDACTED]")
        breadcrumb.data?.put("to", scrubbed)
    }
}

return breadcrumb`;

const DEFAULT_BEFOREBREADCRUMB_RN = `(breadcrumb, hint) => {
  // Drop console breadcrumbs to reduce noise
  if (breadcrumb.category === 'console') {
    return null;
  }

  // Scrub tokens from navigation URLs (common in React Navigation)
  if (breadcrumb.category === 'navigation' && breadcrumb.data?.to) {
    breadcrumb.data.to = breadcrumb.data.to.replace(/token=[^&]+/, 'token=[REDACTED]');
    breadcrumb.data.to = breadcrumb.data.to.replace(/user_id=\\d+/, 'user_id=[REDACTED]');
  }

  return breadcrumb;
}`;

const DEFAULT_BEFOREBREADCRUMB_COCOA = `// Drop console breadcrumbs to reduce noise
if (breadcrumb.category === 'console') {
  return null;
}

// Scrub tokens from navigation URLs
if (breadcrumb.category === 'navigation' && breadcrumb.data?.to) {
  breadcrumb.data.to = breadcrumb.data.to.replace(/token=[^&]+/, 'token=[REDACTED]');
  breadcrumb.data.to = breadcrumb.data.to.replace(/user_id=\\d+/, 'user_id=[REDACTED]');
}

return breadcrumb;`;

const DEFAULT_BEFOREBREADCRUMB_RUST = `// Drop console breadcrumbs to reduce noise
if let Some(category) = event.get("category").and_then(|v| v.as_str()) {
    if category == "console" {
        return None;
    }
}

// Scrub tokens from navigation URLs
if let Some(category) = event.get("category").and_then(|v| v.as_str()) {
    if category == "navigation" {
        if let Some(data) = event.get_mut("data").and_then(|v| v.as_object_mut()) {
            if let Some(to) = data.get("to").and_then(|v| v.as_str()) {
                let re = Regex::new(r"token=[^&]+").unwrap();
                let scrubbed = re.replace_all(to, "token=[REDACTED]");
                let re2 = Regex::new(r"user_id=\\d+").unwrap();
                let scrubbed = re2.replace_all(&scrubbed, "user_id=[REDACTED]");
                data["to"] = serde_json::json!(scrubbed.to_string());
            }
        }
    }
}

Some(event)`;

const DEFAULT_BEFOREBREADCRUMB_ELIXIR = `fn breadcrumb, _hint ->
  # Drop console breadcrumbs to reduce noise
  if Map.get(breadcrumb, "category") == "console" do
    nil
  else
    # Scrub tokens from navigation URLs
    if Map.get(breadcrumb, "category") == "navigation" do
      data = Map.get(breadcrumb, "data", %{})
      if to = Map.get(data, "to") do
        scrubbed = to
          |> String.replace(~r/token=[^&]+/, "token=[REDACTED]")
          |> String.replace(~r/user_id=\\d+/, "user_id=[REDACTED]")
        data = Map.put(data, "to", scrubbed)
        Map.put(breadcrumb, "data", data)
      else
        breadcrumb
      end
    else
      breadcrumb
    end
  end
end`;

function getDefaultCode(sdk: string): string {
  switch (sdk) {
    case 'python': return DEFAULT_BEFOREBREADCRUMB_PY;
    case 'ruby': return DEFAULT_BEFOREBREADCRUMB_RUBY;
    case 'php': return DEFAULT_BEFOREBREADCRUMB_PHP;
    case 'go': return DEFAULT_BEFOREBREADCRUMB_GO;
    case 'dotnet': return DEFAULT_BEFOREBREADCRUMB_DOTNET;
    case 'java': return DEFAULT_BEFOREBREADCRUMB_JAVA;
    case 'android': return DEFAULT_BEFOREBREADCRUMB_ANDROID;
    case 'react-native': return DEFAULT_BEFOREBREADCRUMB_RN;
    case 'cocoa': return DEFAULT_BEFOREBREADCRUMB_COCOA;
    case 'rust': return DEFAULT_BEFOREBREADCRUMB_RUST;
    case 'elixir': return DEFAULT_BEFOREBREADCRUMB_ELIXIR;
    default: return DEFAULT_BEFOREBREADCRUMB_JS;
  }
}

export default function BeforeBreadcrumbPlayground() {
  const [breadcrumbJson, setBreadcrumbJson] = useState(DEFAULT_BREADCRUMB);
  const [beforeBreadcrumbCode, setBeforeBreadcrumbCode] = useState(DEFAULT_BEFOREBREADCRUMB_JS);
  const [selectedSdk, setSelectedSdk] = useState('javascript');
  const [result, setResult] = useState<TransformResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [gistUrl, setGistUrl] = useState<string | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);

  const handleSdkChange = (sdk: string) => {
    setSelectedSdk(sdk);
    setBeforeBreadcrumbCode(getDefaultCode(sdk));
  };

  const handleExampleSelect = (example: Example) => {
    setSelectedExample(example.name);

    // Load breadcrumb JSON from example
    if (example.breadcrumb) {
      setBreadcrumbJson(JSON.stringify(example.breadcrumb, null, 2));
    }

    // Load code from example, or use SDK-specific default if not available
    if (example.beforeBreadcrumbCode) {
      setBeforeBreadcrumbCode(example.beforeBreadcrumbCode);
    } else {
      setBeforeBreadcrumbCode(getDefaultCode(example.sdk || selectedSdk));
    }

    // Switch to the example's SDK if specified
    if (example.sdk && example.sdk !== selectedSdk) {
      setSelectedSdk(example.sdk);
    }

    setResult(null);
    setError(null);
  };

  const handleReset = () => {
    setBreadcrumbJson(DEFAULT_BREADCRUMB);
    setBeforeBreadcrumbCode(getDefaultCode(selectedSdk));
    setSelectedExample(null);
    setResult(null);
    setError(null);
  };

  const handleTransform = async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      let breadcrumb;
      try {
        breadcrumb = JSON.parse(breadcrumbJson);
      } catch (e) {
        throw new Error('Invalid JSON in breadcrumb input');
      }

      const response = await apiClient.transform({
        sdk: selectedSdk,
        event: breadcrumb,
        beforeSendCode: beforeBreadcrumbCode,
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
      let breadcrumbObj;
      try {
        breadcrumbObj = JSON.parse(breadcrumbJson);
      } catch (e) {
        throw new Error('Invalid JSON in breadcrumb input');
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
        event: breadcrumbObj,
        beforeSendCode: beforeBreadcrumbCode,
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
        {/* Breadcrumb Input */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-1">Breadcrumb JSON</h2>
          <p className="text-sm text-gray-600 mb-2">
            {selectedExample ? (
              <>
                Loaded example: <span className="font-medium text-sentry-purple">{selectedExample}</span>
              </>
            ) : (
              'Paste your Sentry breadcrumb JSON or use the default example'
            )}
          </p>
          <div className="h-7 mb-1">
            {selectedExample && (
              <button
                onClick={handleReset}
                className="text-sm text-gray-600 hover:text-sentry-purple underline"
              >
                Reset
              </button>
            )}
          </div>
          <EventInput value={breadcrumbJson} onChange={setBreadcrumbJson} />
        </div>

        {/* beforeBreadcrumb Editor */}
        <div className="bg-white rounded-lg shadow-md p-4">
          <h2 className="text-lg font-semibold mb-1">beforeBreadcrumb Code</h2>
          <p className="text-sm text-gray-600 mb-2">
            Write your beforeBreadcrumb callback to filter or modify breadcrumbs
          </p>
          <div className="h-7 mb-1">
            {!['javascript', 'python', 'ruby', 'php', 'go', 'dotnet', 'react-native', 'rust'].includes(selectedSdk) && (
              <div className="text-xs text-yellow-700 bg-yellow-50 px-2 py-1 rounded border border-yellow-200 inline-block">
                Real-time syntax validation not yet available for this SDK
              </div>
            )}
          </div>
          <BeforeSendEditor
            value={beforeBreadcrumbCode}
            onChange={setBeforeBreadcrumbCode}
            language={(selectedSdk === 'dotnet' ? 'csharp' : selectedSdk === 'android' ? 'kotlin' : selectedSdk === 'react-native' ? 'javascript' : selectedSdk === 'cocoa' ? 'javascript' : selectedSdk) as 'javascript' | 'python' | 'ruby' | 'php' | 'go' | 'csharp' | 'java' | 'kotlin' | 'rust' | 'elixir'}
            sdk={selectedSdk}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <div className="flex items-center gap-4">
          <SearchableExampleSelector
            key={selectedExample || 'default'}
            onSelect={handleExampleSelect}
            type="beforeBreadcrumb"
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

          <button
            onClick={handleReset}
            className="px-4 py-2 rounded-md font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
          >
            Reset
          </button>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Share button */}
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
          Click Transform to see the result of your beforeBreadcrumb callback
        </p>
        {(result || error) ? (
          <OutputViewer result={result} error={error} />
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded p-8 text-center text-gray-500 min-h-96 flex items-center justify-center">
            <div>
              <p className="mb-2">No result yet. Configure your breadcrumb and beforeBreadcrumb code, then click Transform.</p>
              <p className="text-sm">
                Tip: Return <code className="bg-gray-200 px-1 rounded">null</code> to drop a breadcrumb entirely.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showShareModal && gistUrl && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-lg w-full mx-4">
            <h3 className="text-xl font-bold mb-4">Configuration Shared!</h3>

            <p className="text-gray-600 mb-4">
              Your beforeBreadcrumb code and breadcrumb structure have been shared.
              <strong> Original breadcrumb values have been removed</strong> to prevent accidental PII sharing.
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
