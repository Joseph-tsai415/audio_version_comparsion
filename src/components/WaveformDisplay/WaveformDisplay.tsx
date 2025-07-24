import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../contexts/AudioContext';
import { Track } from '../Track/Track';
import '../Track/Track.css';

export const WaveformDisplay: React.FC = () => {
  const { tracks, playbackState, toggleLoop, addMarker } = useAudio();
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const scrollOffsetsRef = useRef<Map<string, number>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; time: number } | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [showMarkerDialog, setShowMarkerDialog] = useState<{ trackId: string; time: number } | null>(null);
  const [markerLabel, setMarkerLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);


  // Handle drag start
  const handleDragStart = (e: React.MouseEvent, trackId: string) => {
    if (e.shiftKey && playbackState.activeTrackId === trackId) {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const track = tracks.find(t => t.id === trackId);
      if (track) {
        // Account for the 1rem (16px) padding on each side to match waveform alignment
        const padding = 16; // 1rem = 16px
        const effectiveWidth = rect.width - (padding * 2);
        const adjustedX = Math.max(0, Math.min(effectiveWidth, x - padding));
        const percentage = adjustedX / effectiveWidth;
        const time = percentage * track.duration;
        setIsDragging(true);
        setDragStart({ x, time });
        e.preventDefault();
      }
    }
  };

  // Handle global mouse up and mouse move for drag
  useEffect(() => {
    const handleMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
        setDragStart(null);
        setSelection(null);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && dragStart && playbackState.activeTrackId) {
        const activeTrack = tracks.find(t => t.id === playbackState.activeTrackId);
        if (activeTrack) {
          // Find the specific track container that was clicked
          const trackElement = document.querySelector(`[data-track-id="${playbackState.activeTrackId}"]`);
          if (trackElement) {
            const rect = trackElement.getBoundingClientRect();
            const x = e.clientX - rect.left;
            
            // Account for the 1rem (16px) padding on each side to match waveform alignment
            const padding = 16; // 1rem = 16px
            const effectiveWidth = rect.width - (padding * 2);
            const adjustedX = Math.max(0, Math.min(effectiveWidth, x - padding));
            const percentage = adjustedX / effectiveWidth;
            const currentTime = percentage * activeTrack.duration;
            
            // Update selection
            const start = Math.min(dragStart.time, currentTime);
            const end = Math.max(dragStart.time, currentTime);
            setSelection({ start, end });
          }
        }
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [isDragging, dragStart, playbackState.activeTrackId, tracks]);

  // Handle marker dialog
  const handleAddMarker = (time: number) => {
    if (playbackState.activeTrackId) {
      setShowMarkerDialog({ 
        trackId: playbackState.activeTrackId, 
        time 
      });
      setMarkerLabel('');
    }
  };


  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-surface-900/30 backdrop-blur-xl rounded-2xl p-6 border border-surface-800/50 shadow-xl h-full flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-white">Waveform Display</h2>
          <p className="text-surface-400 text-sm mt-1">
            {tracks.length > 0 ? `${tracks.length} track${tracks.length > 1 ? 's' : ''} loaded` : 'No tracks loaded'}
            {hoveredTrack && ` • Hovering track`}
          </p>
        </div>
        
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-24 h-24 mb-6 rounded-full bg-surface-800/30 flex items-center justify-center animate-pulse-slow">
              <svg className="w-12 h-12 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-surface-400 text-lg mb-2">No audio tracks loaded</p>
            <p className="text-surface-500 text-sm">Upload some audio files to see their waveforms</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tracks.map((track) => (
              <div key={track.id} className="h-40">
                <Track
                  track={track}
                  isHovered={hoveredTrack === track.id}
                  onHover={setHoveredTrack}
                  zoomLevel={0}
                  onZoom={() => {}}
                  isDragging={isDragging}
                  onDragStart={handleDragStart}
                  dragStart={dragStart}
                  selection={selection}
                  onMarkerAdd={handleAddMarker}
                  syncScrollEnabled={false}
                  scrollOffsetsRef={scrollOffsetsRef}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick actions bar */}
      {tracks.length > 0 && (
        <div className="mt-4 pt-4 border-t border-surface-800/50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleLoop}
                className={`px-2 py-1 text-xs rounded-lg transition-all duration-200 flex items-center gap-1 ${
                  playbackState.loop
                    ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                    : 'bg-surface-800/50 hover:bg-surface-700/50 text-surface-300 hover:text-white'
                }`}
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Loop
              </button>
              <button 
                onClick={() => handleAddMarker(playbackState.currentTime)}
                disabled={!playbackState.activeTrackId}
                className="px-2 py-1 text-xs bg-surface-800/50 hover:bg-surface-700/50 rounded-lg text-surface-300 hover:text-white transition-all duration-200 flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Marker
              </button>
              
              {selection && (
                <div className="text-xs text-surface-400">
                  {formatTime(selection.start)} - {formatTime(selection.end)}
                </div>
              )}
            </div>
            
            <div className="text-xs text-surface-400">
              <span>Click to seek</span>
              <span className="mx-2">•</span>
              <span>Shift+Drag to select</span>
            </div>
          </div>
        </div>
      )}


      {/* Marker Dialog */}
      {showMarkerDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-surface-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface-900/90 backdrop-blur-xl rounded-2xl p-6 max-w-md w-full border border-surface-800/50 shadow-2xl animate-scale-in">
            <h3 className="text-xl font-semibold mb-4 text-primary-400">Add Marker</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-surface-400 mb-2">Time</label>
                <p className="text-white font-mono">{formatTime(showMarkerDialog.time)}</p>
              </div>
              <div>
                <label className="block text-sm text-surface-400 mb-2">Label</label>
                <input
                  type="text"
                  value={markerLabel}
                  onChange={(e) => setMarkerLabel(e.target.value)}
                  placeholder="Enter marker name..."
                  className="w-full px-3 py-2 bg-surface-800/50 border border-surface-700 rounded-lg text-white placeholder-surface-500 focus:border-primary-500 focus:outline-none"
                  autoFocus
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  if (markerLabel.trim()) {
                    addMarker(showMarkerDialog.trackId, showMarkerDialog.time, markerLabel.trim());
                    setShowMarkerDialog(null);
                    setMarkerLabel('');
                  }
                }}
                disabled={!markerLabel.trim()}
                className="flex-1 py-2 bg-primary-600 hover:bg-primary-700 disabled:bg-surface-700 disabled:cursor-not-allowed rounded-lg transition-colors duration-200"
              >
                Add
              </button>
              <button
                onClick={() => {
                  setShowMarkerDialog(null);
                  setMarkerLabel('');
                }}
                className="flex-1 py-2 bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};