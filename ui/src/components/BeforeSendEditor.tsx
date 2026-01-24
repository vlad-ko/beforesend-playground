import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

interface BeforeSendEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'javascript' | 'python' | 'ruby' | 'php' | 'go' | 'csharp' | 'java' | 'kotlin';
}

function BeforeSendEditor({ value, onChange, language }: BeforeSendEditorProps) {
  const handleEditorWillMount = (monaco: typeof Monaco) => {
    // Configure TypeScript/JavaScript compiler options to suppress deprecation warnings
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      lib: ['es2020'], // Don't include 'dom' lib which has deprecated Window.event
    });

    // Disable diagnostics for deprecation warnings
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
      diagnosticCodesToIgnore: [6385], // Suppress deprecation warnings (code 6385)
    });
  };

  return (
    <div className="border border-gray-300 rounded">
      <Editor
        height="400px"
        defaultLanguage={language}
        language={language}
        value={value}
        onChange={(newValue) => onChange(newValue || '')}
        theme="vs-dark"
        beforeMount={handleEditorWillMount}
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
