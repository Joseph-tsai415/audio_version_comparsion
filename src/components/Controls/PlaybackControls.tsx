import React, { useRef, useState, useEffect } from 'react';
import { useAudio } from '../../contexts/AudioContext';

export const PlaybackControls: React.FC = () => {
  const { playbackState, play, pause, seek, setVolume, tracks, nextTrack, previousTrack, setPlaybackRate, toggleLoop, toggleMute } = useAudio();
  const progressRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [showTrackOptions, setShowTrackOptions] = useState(false);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && playbackState.duration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percentage = x / rect.width;
      const time = percentage * playbackState.duration;
      seek(time);
    }
  };

  const handleProgressDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging && progressRef.current && playbackState.duration > 0) {
      const rect = progressRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
      const percentage = x / rect.width;
      const time = percentage * playbackState.duration;
      seek(time);
    }
  };

  const renderVolumeIcon = () => {
    if (playbackState.volume === 0) {
      // Muted
      return (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
        </>
      );
    } else if (playbackState.volume < 0.5) {
      // Low volume
      return (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072" />
        </>
      );
    } else {
      // High volume
      return (
        <>
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
        </>
      );
    }
  };

  const formatFileName = (name: string) => {
    const maxLength = 30;
    if (name.length > maxLength) {
      const extension = name.lastIndexOf('.') > -1 ? name.slice(name.lastIndexOf('.')) : '';
      const nameWithoutExt = name.slice(0, name.lastIndexOf('.') > -1 ? name.lastIndexOf('.') : name.length);
      return nameWithoutExt.slice(0, maxLength - extension.length - 3) + '...' + extension;
    }
    return name;
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in input fields
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      switch (e.key) {
        case ' ':
          e.preventDefault();
          playbackState.isPlaying ? pause() : play();
          break;
        case 'ArrowUp':
          e.preventDefault();
          setVolume(Math.min(1, playbackState.volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          setVolume(Math.max(0, playbackState.volume - 0.1));
          break;
        case 'ArrowLeft':
          e.preventDefault();
          previousTrack();
          break;
        case 'ArrowRight':
          e.preventDefault();
          nextTrack();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [playbackState.isPlaying, playbackState.volume, play, pause, setVolume, nextTrack, previousTrack]);

  const activeTrack = tracks.find(t => t.id === playbackState.activeTrackId);

  return (
    <div className="bg-surface-900/30 backdrop-blur-xl rounded-2xl p-6 border border-surface-800/50 shadow-xl">
      {/* Track Info */}
      {activeTrack ? (
        <div className="mb-6 p-4 bg-surface-800/20 rounded-xl flex items-center gap-4">
          <div className="relative">
            <div
              className="w-12 h-12 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: activeTrack.color + '20' }}
            >
              <div
                className="w-6 h-6 rounded-full"
                style={{ backgroundColor: activeTrack.color }}
              />
            </div>
            {playbackState.isPlaying && (
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white font-medium truncate" title={activeTrack.name}>
              {formatFileName(activeTrack.name)}
            </p>
            <p className="text-surface-400 text-xs mt-0.5">
              {playbackState.isPlaying ? 'Playing' : 'Paused'} • {formatTime(activeTrack.duration)} total
            </p>
          </div>
          <div className="relative">
            <button
              onClick={() => setShowTrackOptions(!showTrackOptions)}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-500 hover:text-surface-300 hover:bg-surface-800/50 transition-all"
              title="Track options"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            {showTrackOptions && (
              <div className="absolute right-0 top-full mt-2 bg-surface-800/90 backdrop-blur-xl rounded-lg p-2 min-w-[150px] shadow-2xl animate-fade-in z-50"
                onMouseLeave={() => setShowTrackOptions(false)}
              >
                <button className="w-full text-left px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 rounded transition-colors">
                  Export Track
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-surface-300 hover:text-white hover:bg-surface-700/50 rounded transition-colors">
                  Duplicate
                </button>
                <button className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-surface-700/50 rounded transition-colors">
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="mb-6 p-4 bg-surface-800/20 rounded-xl text-center">
          <p className="text-surface-500 text-sm">No track selected</p>
          <p className="text-surface-600 text-xs mt-1">Load audio files to begin</p>
        </div>
      )}

      {/* Main Controls */}
      <div className="flex items-center justify-center gap-4 mb-8">
        <button
          onClick={previousTrack}
          disabled={tracks.length <= 1}
          className="w-10 h-10 rounded-full flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-800/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Previous track"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0019 16V8a1 1 0 00-1.6-.8l-5.333 4zM4.066 11.2a1 1 0 000 1.6l5.334 4A1 1 0 0011 16V8a1 1 0 00-1.6-.8l-5.334 4z" />
          </svg>
        </button>

        <button
          onClick={playbackState.isPlaying ? pause : play}
          disabled={!playbackState.activeTrackId}
          className={`group w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${
            !playbackState.activeTrackId 
              ? 'bg-surface-800 cursor-not-allowed' 
              : 'bg-gradient-to-br from-primary-500 to-primary-600 hover:from-primary-400 hover:to-primary-500 shadow-glow hover:shadow-glow-lg transform hover:scale-105'
          }`}
        >
          {playbackState.isPlaying ? (
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 9v6m4-6v6" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
            </svg>
          )}
        </button>

        <button
          onClick={nextTrack}
          disabled={tracks.length <= 1}
          className="w-10 h-10 rounded-full flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-800/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          title="Next track"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.933 12.8a1 1 0 000-1.6L6.6 7.2A1 1 0 005 8v8a1 1 0 001.6.8l5.333-4zM19.933 12.8a1 1 0 000-1.6l-5.333-4A1 1 0 0013 8v8a1 1 0 001.6.8l5.333-4z" />
          </svg>
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="relative p-2 -m-2 group">
          <div
            ref={progressRef}
            className="relative w-full h-3 bg-surface-800/50 rounded-full cursor-pointer overflow-hidden"
            onClick={handleProgressClick}
            onMouseDown={() => setIsDragging(true)}
            onMouseUp={() => setIsDragging(false)}
            onMouseMove={handleProgressDrag}
            onMouseLeave={() => setIsDragging(false)}
          >
            {/* Background with gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-surface-800 to-surface-700 rounded-full" />
            
            {/* Buffer indicator */}
            <div 
              className="absolute inset-y-0 left-0 bg-surface-700/50 rounded-full"
              style={{ width: `${playbackState.buffered * 100}%` }}
            />
            
            {/* Progress fill with animated gradient */}
            <div
              className="absolute inset-y-0 left-0 bg-gradient-to-r from-primary-500 via-primary-400 to-primary-500 rounded-full transition-all duration-100 shadow-glow"
              style={{ 
                width: `${(playbackState.currentTime / playbackState.duration) * 100 || 0}%`,
                backgroundSize: '200% 100%',
                animation: playbackState.isPlaying ? 'gradient 3s ease infinite' : 'none'
              }}
            />
            
            {/* Scrubber handle */}
            <div
              className={`absolute top-1/2 transform -translate-y-1/2 transition-all duration-200 ${
                isDragging ? 'scale-110' : 'scale-0 group-hover:scale-100'
              }`}
              style={{ left: `${(playbackState.currentTime / playbackState.duration) * 100 || 0}%`, marginLeft: '-10px' }}
            >
              <div className="w-5 h-5 bg-white rounded-full shadow-lg relative">
                <div className="absolute inset-0 bg-white rounded-full animate-ping opacity-30" />
                <div className="absolute inset-1 bg-primary-500 rounded-full" />
              </div>
            </div>
          </div>
        </div>
        
        {/* Time display with progress percentage */}
        <div className="flex items-center justify-between mt-3 text-sm">
          <span className="text-surface-300 font-mono tabular-nums">
            {formatTime(playbackState.currentTime)}
          </span>
          <span className="text-surface-600 text-xs">
            {playbackState.duration > 0 
              ? `${Math.round((playbackState.currentTime / playbackState.duration) * 100)}%`
              : '0%'
            }
          </span>
          <span className="text-surface-400 font-mono tabular-nums">
            {formatTime(playbackState.duration)}
          </span>
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Loop button */}
          <button 
            onClick={toggleLoop}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200 ${
              playbackState.loop 
                ? 'text-primary-400 bg-primary-500/20 hover:bg-primary-500/30' 
                : 'text-surface-500 hover:text-white hover:bg-surface-800/50'
            }`}
            title={playbackState.loop ? 'Loop: ON' : 'Loop: OFF'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>

          {/* Speed control */}
          <div className="relative">
            <button
              onClick={() => {
                const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
                const currentIndex = speeds.indexOf(playbackState.playbackRate);
                const nextIndex = (currentIndex + 1) % speeds.length;
                setPlaybackRate(speeds[nextIndex]);
              }}
              className="px-2 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-800/50 transition-all duration-200 text-xs font-mono"
              title="Playback speed"
            >
              {playbackState.playbackRate}x
            </button>
          </div>
        </div>

        {/* Volume Control */}
        <div className="relative flex items-center">
          <button
            onClick={() => setShowVolumeSlider(!showVolumeSlider)}
            onMouseEnter={() => setShowVolumeSlider(true)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-800/50 transition-all duration-200"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {renderVolumeIcon()}
            </svg>
          </button>
          
          {showVolumeSlider && (
            <div 
              className="absolute right-0 bottom-full mb-2 bg-surface-800/90 backdrop-blur-xl rounded-lg p-3 animate-fade-in shadow-2xl"
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              <div className="flex items-center gap-3">
                <button
                  onClick={toggleMute}
                  className="text-surface-400 hover:text-white transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    {renderVolumeIcon()}
                  </svg>
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={playbackState.volume}
                  onChange={(e) => setVolume(parseFloat(e.target.value))}
                  className="w-32 h-1.5 bg-surface-700 rounded-lg appearance-none cursor-pointer slider"
                />
                <span className="text-xs text-surface-400 font-mono w-10 text-right">
                  {Math.round(playbackState.volume * 100)}%
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

    </div>
  );
};