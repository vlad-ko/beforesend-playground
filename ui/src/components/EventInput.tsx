import Editor from '@monaco-editor/react';

interface EventInputProps {
  value: string;
  onChange: (value: string) => void;
}

function EventInput({ value, onChange }: EventInputProps) {
  return (
    <div className="border border-gray-300 rounded">
      <Editor
        height="400px"
        defaultLanguage="json"
        value={value}
        onChange={(newValue) => onChange(newValue || '')}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
    </div>
  );
}

export default EventInput;
