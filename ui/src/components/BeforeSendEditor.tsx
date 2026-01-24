import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';

interface BeforeSendEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'javascript' | 'python' | 'ruby' | 'php' | 'go' | 'csharp' | 'java' | 'kotlin';
}

function BeforeSendEditor({ value, onChange, language }: BeforeSendEditorProps) {
  const handleEditorWillMount = (monaco: typeof Monaco) => {
    // Configure TypeScript/JavaScript compiler options
    monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      allowJs: true,
      checkJs: false, // Don't type-check JavaScript
    });

    // Disable semantic validation - we only want syntax checking for snippets
    // Users are writing code snippets, not full programs, so we don't need strict type checking
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true, // Disable semantic errors (undefined variables, type errors)
      noSyntaxValidation: false,  // Keep syntax error checking (missing brackets, etc.)
    });

    // Also configure TypeScript defaults (in case users write TS)
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      allowJs: true,
    });

    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: true,
      noSyntaxValidation: false,
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
