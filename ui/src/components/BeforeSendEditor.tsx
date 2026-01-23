import Editor from '@monaco-editor/react';

interface BeforeSendEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'javascript' | 'python' | 'ruby';
}

function BeforeSendEditor({ value, onChange, language }: BeforeSendEditorProps) {
  return (
    <div className="border border-gray-300 rounded">
      <Editor
        height="400px"
        defaultLanguage={language}
        language={language}
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

export default BeforeSendEditor;
