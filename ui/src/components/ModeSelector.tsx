import { PlaygroundMode, MODES } from '../types/modes';

interface ModeSelectorProps {
  currentMode: PlaygroundMode;
  onModeChange: (mode: PlaygroundMode) => void;
}

export default function ModeSelector({ currentMode, onModeChange }: ModeSelectorProps) {
  return (
    <div className="flex space-x-2 border-b border-gray-700 mb-6">
      {MODES.map((mode) => (
        <button
          key={mode.id}
          onClick={() => onModeChange(mode.id)}
          title={mode.description}
          className={`
            px-6 py-3 font-medium text-sm transition-colors relative
            ${
              currentMode === mode.id
                ? 'bg-blue-600 text-white'
                : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
            }
            ${
              currentMode === mode.id
                ? 'border-b-2 border-blue-600'
                : 'border-b-2 border-transparent'
            }
          `}
        >
          {mode.name}
        </button>
      ))}
    </div>
  );
}
