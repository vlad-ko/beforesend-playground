import { useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor';
import { apiClient } from '../api/client';

interface BeforeSendEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'javascript' | 'python' | 'ruby' | 'php' | 'go' | 'csharp' | 'java' | 'kotlin';
  sdk: string;
}

// SDKs with validation support
const VALIDATION_SUPPORTED_SDKS = [
  'javascript',
  'python',
  'ruby',
  'php',
  'go',
  'dotnet',
  'react-native', // uses JavaScript validation
];

function BeforeSendEditor({ value, onChange, language, sdk }: BeforeSendEditorProps) {
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);
  const validationTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Validate code with debouncing
  useEffect(() => {
    // Only validate if SDK supports it
    if (!VALIDATION_SUPPORTED_SDKS.includes(sdk)) {
      return;
    }

    // Clear previous timer
    if (validationTimerRef.current) {
      clearTimeout(validationTimerRef.current);
    }

    // Debounce validation (500ms)
    validationTimerRef.current = setTimeout(async () => {
      if (!editorRef.current || !monacoRef.current || !value) {
        return;
      }

      try {
        // Call validation API
        const result = await apiClient.validate({
          sdk,
          beforeSendCode: value,
        });

        // Get Monaco model
        const model = editorRef.current.getModel();
        if (!model) return;

        // Clear previous markers
        monacoRef.current.editor.setModelMarkers(model, 'validation', []);

        // Add error markers if validation failed
        if (!result.valid && result.errors.length > 0) {
          const markers = result.errors.map((error) => ({
            severity: monacoRef.current!.MarkerSeverity.Error,
            startLineNumber: error.line || 1,
            startColumn: error.column || 1,
            endLineNumber: error.line || 1,
            endColumn: error.column ? error.column + 1 : 1000,
            message: error.message,
          }));
          monacoRef.current.editor.setModelMarkers(model, 'validation', markers);
        }
      } catch (error) {
        // Silently fail validation - don't block user input
        console.error('Validation error:', error);
      }
    }, 500);

    // Cleanup
    return () => {
      if (validationTimerRef.current) {
        clearTimeout(validationTimerRef.current);
      }
    };
  }, [value, sdk]);

  const handleEditorWillMount = (monaco: typeof Monaco) => {
    monacoRef.current = monaco;
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

  const handleEditorDidMount = (editor: Monaco.editor.IStandaloneCodeEditor) => {
    editorRef.current = editor;
  };

  const hasValidation = VALIDATION_SUPPORTED_SDKS.includes(sdk);

  return (
    <div>
      {!hasValidation && (
        <div className="mb-2 px-3 py-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          ⚠️ Real-time syntax validation is not yet available for this SDK
        </div>
      )}
      <div className="border border-gray-300 rounded">
        <Editor
          height="400px"
          defaultLanguage={language}
          language={language}
          value={value}
          onChange={(newValue) => onChange(newValue || '')}
          theme="vs-dark"
          beforeMount={handleEditorWillMount}
          onMount={handleEditorDidMount}
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
    </div>
  );
}

export default BeforeSendEditor;
