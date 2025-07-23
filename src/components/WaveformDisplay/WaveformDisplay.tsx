import React, { useState, useRef, useEffect } from 'react';
import { useAudio } from '../../contexts/AudioContext';
import { Track } from '../Track/Track';
import '../Track/Track.css';

export const WaveformDisplay: React.FC = () => {
  const { tracks, playbackState, toggleLoop, addMarker } = useAudio();
  const [hoveredTrack, setHoveredTrack] = useState<string | null>(null);
  const [zoomLevel, setZoomLevel] = useState(0);
  const [showZoomIndicator, setShowZoomIndicator] = useState(false);
  const zoomIndicatorTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [syncScrollEnabled, setSyncScrollEnabled] = useState(true);
  const scrollOffsetsRef = useRef<Map<string, number>>(new Map());
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; time: number } | null>(null);
  const [selection, setSelection] = useState<{ start: number; end: number } | null>(null);
  const [showMarkerDialog, setShowMarkerDialog] = useState<{ trackId: string; time: number } | null>(null);
  const [markerLabel, setMarkerLabel] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle zoom with mouse wheel
  const handleZoom = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      e.stopPropagation();

      const zoomSensitivity = 0.002;
      const zoomDelta = -e.deltaY * zoomSensitivity;
      let newZoom = zoomLevel;

      if (zoomLevel === 0) {
        if (zoomDelta > 0) {
          newZoom = 1;
        }
      } else {
        newZoom = zoomLevel * Math.exp(zoomDelta);
        newZoom = Math.max(0.5, Math.min(10, newZoom));
        if (newZoom < 0.8) {
          newZoom = 0;
        }
      }

      if (newZoom !== zoomLevel) {
        setZoomLevel(newZoom);
        
        setShowZoomIndicator(true);
        if (zoomIndicatorTimeoutRef.current) {
          clearTimeout(zoomIndicatorTimeoutRef.current);
        }
        zoomIndicatorTimeoutRef.current = setTimeout(() => {
          setShowZoomIndicator(false);
        }, 1000);
      }
    }
  };

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
        if (activeTrack && containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
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

  // Zoom controls
  const handleZoomIn = () => {
    if (zoomLevel === 0) {
      setZoomLevel(1);
    } else {
      setZoomLevel(Math.min(zoomLevel * 1.5, 10));
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel > 0.8) {
      const newZoom = zoomLevel / 1.5;
      setZoomLevel(newZoom < 0.8 ? 0 : newZoom);
    }
  };

  const handleResetZoom = () => setZoomLevel(1);
  const handleFitToWidth = () => setZoomLevel(0);

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
        
        {/* Zoom controls */}
        {tracks.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={handleFitToWidth}
              className={`px-3 h-8 rounded-lg text-sm transition-colors ${
                zoomLevel === 0 
                  ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30' 
                  : 'text-surface-400 hover:text-white hover:bg-surface-800/50'
              }`}
              title="Fit to width"
            >
              Fit
            </button>
            <div className="flex items-center gap-1 bg-surface-800/30 rounded-lg p-1">
              <button
                onClick={handleZoomOut}
                className="w-8 h-8 rounded flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom out"
                disabled={zoomLevel === 0}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM13 10H7" />
                </svg>
              </button>
              <button
                onClick={handleResetZoom}
                className="px-3 h-8 rounded text-sm text-surface-400 hover:text-white hover:bg-surface-700/50 transition-colors min-w-[60px]"
                title="Reset zoom"
              >
                {zoomLevel === 0 ? 'Fit' : zoomLevel >= 1 ? `${Math.round(zoomLevel * 100)}%` : `1:${Math.round(1/zoomLevel)}`}
              </button>
              <button
                onClick={handleZoomIn}
                className="w-8 h-8 rounded flex items-center justify-center text-surface-400 hover:text-white hover:bg-surface-700/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Zoom in"
                disabled={zoomLevel >= 10}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                </svg>
              </button>
            </div>
            
            {/* Sync scroll toggle */}
            {tracks.length > 1 && zoomLevel > 0 && (
              <button
                onClick={() => setSyncScrollEnabled(!syncScrollEnabled)}
                className={`px-3 h-8 rounded-lg text-sm flex items-center gap-2 transition-colors ${
                  syncScrollEnabled
                    ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                    : 'text-surface-400 hover:text-white hover:bg-surface-800/50'
                }`}
                title={syncScrollEnabled ? 'Sync scrolling enabled' : 'Sync scrolling disabled'}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {syncScrollEnabled ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  )}
                </svg>
                {syncScrollEnabled ? 'Sync' : 'Free'}
              </button>
            )}
          </div>
        )}
      </div>

      <div ref={containerRef} className="flex-1 overflow-y-auto custom-scrollbar pr-2">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 mb-6 rounded-full bg-surface-800/30 flex items-center justify-center animate-pulse-slow">
              <svg className="w-12 h-12 text-surface-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </div>
            <p className="text-surface-400 text-lg mb-2">No audio tracks loaded</p>
            <p className="text-surface-500 text-sm">Upload some audio files to see their waveforms</p>
          </div>
        ) : (
          <div className="space-y-4">
            {tracks.map((track) => (
              <Track
                key={track.id}
                track={track}
                isHovered={hoveredTrack === track.id}
                onHover={setHoveredTrack}
                zoomLevel={zoomLevel}
                onZoom={handleZoom}
                isDragging={isDragging}
                onDragStart={handleDragStart}
                dragStart={dragStart}
                selection={selection}
                onMarkerAdd={handleAddMarker}
                syncScrollEnabled={syncScrollEnabled}
                scrollOffsetsRef={scrollOffsetsRef}
              />
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      {tracks.length > 0 && zoomLevel > 0 && (
        <div className="mt-4 p-3 bg-surface-800/30 rounded-lg text-xs text-surface-400">
          <div className="flex items-center gap-4">
            <span>💡 Tip:</span>
            <span>Shift + Drag to select region</span>
            <span>•</span>
            <span>Ctrl/Cmd + Scroll to zoom</span>
            <span>•</span>
            <span>Click to seek</span>
          </div>
        </div>
      )}
      
      {/* Quick actions */}
      {tracks.length > 0 && (
        <div className="mt-6 pt-6 border-t border-surface-800/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleLoop}
                className={`px-3 py-1.5 text-sm rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  playbackState.loop
                    ? 'bg-primary-500/20 text-primary-400 hover:bg-primary-500/30'
                    : 'bg-surface-800/50 hover:bg-surface-700/50 text-surface-300 hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Loop {playbackState.loop ? 'ON' : 'OFF'}
              </button>
              <button 
                onClick={() => handleAddMarker(playbackState.currentTime)}
                disabled={!playbackState.activeTrackId}
                className="px-3 py-1.5 text-sm bg-surface-800/50 hover:bg-surface-700/50 rounded-lg text-surface-300 hover:text-white transition-all duration-200 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Marker
              </button>
              
              {selection && (
                <div className="text-xs text-surface-400">
                  Selection: {formatTime(selection.start)} - {formatTime(selection.end)} 
                  ({formatTime(selection.end - selection.start)})
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Zoom indicator */}
      {showZoomIndicator && (
        <div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-surface-900/90 backdrop-blur-xl rounded-lg px-4 py-2 shadow-2xl z-50 animate-fade-in pointer-events-none">
          <div className="text-white text-lg font-mono">
            {zoomLevel === 0 ? 'Fit to Width' : zoomLevel >= 1 ? `${Math.round(zoomLevel * 100)}%` : `1:${Math.round(1/zoomLevel)}`}
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