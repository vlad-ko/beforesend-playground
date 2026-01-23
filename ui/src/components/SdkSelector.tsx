interface SdkSelectorProps {
  value: string;
  onChange: (sdk: string) => void;
}

const AVAILABLE_SDKS = [
  { key: 'javascript', name: 'JavaScript', language: 'javascript' },
  { key: 'python', name: 'Python', language: 'python' },
];

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
            {sdk.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export default SdkSelector;
