import { useState, useEffect } from 'react';
import ModeSelector from './components/ModeSelector';
import ModeInfo from './components/ModeInfo';
import BeforeSendPlayground from './components/playgrounds/BeforeSendPlayground';
import WebhookPlayground from './components/playgrounds/WebhookPlayground';
import { PlaygroundMode } from './types/modes';
import sentryLogo from './assets/sentry-logo.png';

const STORAGE_KEY = 'sentry-playground-mode';

function App() {
  // Initialize mode from localStorage, fallback to 'beforeSend'
  const [currentMode, setCurrentMode] = useState<PlaygroundMode>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return (saved as PlaygroundMode) || 'beforeSend';
  });

  // Save mode to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, currentMode);
  }, [currentMode]);

  const renderPlayground = () => {
    switch (currentMode) {
      case 'beforeSend':
        return <BeforeSendPlayground />;
      case 'beforeSendTransaction':
        return (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Coming Soon</h3>
            <p className="text-gray-500">
              beforeSendTransaction playground will be available in a future update
            </p>
          </div>
        );
      case 'webhooks':
        return <WebhookPlayground />;
      default:
        return <BeforeSendPlayground />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white text-gray-900 py-4 px-6 shadow-md border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={sentryLogo} alt="Sentry Logo" className="w-10 h-10" />
            <div>
              <h1 className="text-2xl font-bold text-sentry-purple">Sentry SDK Playground</h1>
              <p className="text-sm text-gray-600 mt-1">
                Test Sentry SDK features across multiple languages
              </p>
            </div>
          </div>
          <a
            href="https://github.com/vlad-ko/sdk-playground"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-md transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
            </svg>
            <span className="font-medium">GitHub</span>
          </a>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-6">
        {/* Mode Selector */}
        <ModeSelector currentMode={currentMode} onModeChange={setCurrentMode} />

        {/* Mode Info */}
        <ModeInfo currentMode={currentMode} />

        {/* Playground Content */}
        {renderPlayground()}
      </div>
    </div>
  );
}

export default App;
