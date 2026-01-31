interface SdkSelectorProps {
  value: string;
  onChange: (sdk: string) => void;
}

export const AVAILABLE_SDKS = [
  { key: 'javascript', name: 'JavaScript', language: 'javascript', package: '@sentry/node', version: '8.55.0' },
  { key: 'python', name: 'Python', language: 'python', package: 'sentry-sdk', version: '2.20.0' },
  { key: 'ruby', name: 'Ruby', language: 'ruby', package: 'sentry-ruby', version: '5.22.0' },
  { key: 'php', name: 'PHP', language: 'php', package: 'sentry/sentry', version: '4.12.0' },
  { key: 'go', name: 'Go', language: 'go', package: 'github.com/getsentry/sentry-go', version: '0.29.1' },
  { key: 'dotnet', name: '.NET', language: 'csharp', package: 'Sentry', version: '5.0.0' },
  { key: 'java', name: 'Java', language: 'java', package: 'io.sentry:sentry', version: '7.16.0' },
  { key: 'android', name: 'Android', language: 'kotlin', package: 'io.sentry:sentry-android', version: '7.16.0' },
  { key: 'cocoa', name: 'Cocoa (iOS/macOS)', language: 'swift', package: 'Sentry', version: '8.40.1' },
  { key: 'react-native', name: 'React Native', language: 'javascript', package: '@sentry/react-native', version: '6.3.0' },
  { key: 'rust', name: 'Rust', language: 'rust', package: 'sentry', version: '0.34.0' },
  { key: 'elixir', name: 'Elixir', language: 'elixir', package: 'sentry', version: '10.9.0' },
];

export function getLanguageForSdk(sdkKey: string): string {
  const sdk = AVAILABLE_SDKS.find(s => s.key === sdkKey);
  return sdk?.language || 'javascript';
}

function SdkSelector({ value, onChange }: SdkSelectorProps) {
  return (
    <div className="flex items-center gap-2">
      <label htmlFor="sdk-select" className="font-medium text-gray-700">
        SDK:
      </label>
      <select
        id="sdk-select"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-sentry-purple"
      >
        {AVAILABLE_SDKS.map((sdk) => (
          <option key={sdk.key} value={sdk.key}>
            {sdk.name} - {sdk.package} {sdk.version}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SdkSelector;
