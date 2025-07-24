import React, { useState } from 'react';
import { AudioProvider } from './contexts/AudioContext';
import { TrackList } from './components/TrackList/TrackList';
import { PlaybackControls } from './components/Controls/PlaybackControls';
import { WaveformDisplay } from './components/WaveformDisplay/WaveformDisplay';

function App() {
  const [showShortcuts, setShowShortcuts] = useState(false);
  
  // Handle initial user interaction to enable audio
  React.useEffect(() => {
    const handleFirstInteraction = () => {
      console.log('First user interaction detected');
      // Remove listener after first interaction
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
    
    document.addEventListener('click', handleFirstInteraction);
    document.addEventListener('touchstart', handleFirstInteraction);
    document.addEventListener('keydown', handleFirstInteraction);
    
    return () => {
      document.removeEventListener('click', handleFirstInteraction);
      document.removeEventListener('touchstart', handleFirstInteraction);
      document.removeEventListener('keydown', handleFirstInteraction);
    };
  }, []);

  return (
    <AudioProvider>
      <div className="min-h-screen bg-gradient-to-br from-surface-950 via-surface-900 to-primary-950 text-white overflow-hidden">
        {/* Background decoration */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl animate-pulse-slow" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl animate-pulse-slow delay-1000" />
        </div>

        {/* Header */}
        <header className="relative z-10 bg-surface-900/30 backdrop-blur-xl border-b border-surface-800/50 px-6 py-5">
          <div className="container mx-auto flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
                Audio Compare
              </h1>
              <p className="text-surface-400 text-sm mt-1">
                Professional audio version comparison tool
              </p>
            </div>
            <button
              onClick={() => setShowShortcuts(!showShortcuts)}
              className="p-2 rounded-lg bg-surface-800/50 hover:bg-surface-700/50 transition-all duration-200 group"
              title="Keyboard shortcuts"
            >
              <svg className="w-5 h-5 text-surface-400 group-hover:text-primary-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </header>

        {/* Main content */}
        <main className="relative z-10 container mx-auto px-6 py-8">
          <div className="grid grid-cols-10 gap-6 h-full">
            {/* Left sidebar - 30% */}
            <div className="col-span-3 flex flex-col gap-6">
              <TrackList />
              <PlaybackControls />
            </div>

            {/* Main content area - 70% */}
            <div className="col-span-7 h-full">
              <WaveformDisplay />
            </div>
          </div>
        </main>

        {/* Keyboard shortcuts modal */}
        {showShortcuts && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
            <div className="bg-surface-900/90 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full border border-surface-800/50 shadow-2xl animate-scale-in">
              <h3 className="text-xl font-semibold mb-4 text-primary-400">Keyboard Shortcuts</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-surface-400">Play/Pause</span>
                  <kbd className="px-2 py-1 bg-surface-800 rounded text-surface-300">Space</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Next Track</span>
                  <kbd className="px-2 py-1 bg-surface-800 rounded text-surface-300">→</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Previous Track</span>
                  <kbd className="px-2 py-1 bg-surface-800 rounded text-surface-300">←</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Volume Up</span>
                  <kbd className="px-2 py-1 bg-surface-800 rounded text-surface-300">↑</kbd>
                </div>
                <div className="flex justify-between">
                  <span className="text-surface-400">Volume Down</span>
                  <kbd className="px-2 py-1 bg-surface-800 rounded text-surface-300">↓</kbd>
                </div>
              </div>
              <button
                onClick={() => setShowShortcuts(false)}
                className="mt-6 w-full py-2 bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors duration-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </AudioProvider>
  );
}

export default App;