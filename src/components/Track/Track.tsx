import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { useAudio } from '../../contexts/AudioContext';
import { AudioTrack } from '../../types/audio.types';

interface TrackProps {
  track: AudioTrack;
  isHovered: boolean;
  onHover: (trackId: string | null) => void;
  zoomLevel: number;
  onZoom: (e: React.WheelEvent) => void;
  isDragging: boolean;
  onDragStart: (e: React.MouseEvent, trackId: string) => void;
  dragStart: { x: number; time: number } | null;
  selection: { start: number; end: number } | null;
  onMarkerAdd: (time: number) => void;
  syncScrollEnabled: boolean;
  scrollOffsetsRef: React.MutableRefObject<Map<string, number>>;
}

export const Track: React.FC<TrackProps> = React.memo(({
  track,
  isHovered,
  onHover,
  isDragging,
  onDragStart,
  dragStart,
  selection,
  onMarkerAdd,
}) => {
  const { playbackState, seek, setActiveTrack, removeTrack } = useAudio();
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoverTime, setHoverTime] = useState<number>(0);
  const [hoverPosition, setHoverPosition] = useState<number>(0);

  const isActive = playbackState.activeTrackId === track.id;

  const progress = useMemo(() => (
    isActive && playbackState.duration > 0
      ? playbackState.currentTime / playbackState.duration
      : 0
  ), [isActive, playbackState.currentTime, playbackState.duration]);

  // Initialize WaveSurfer
  useEffect(() => {
    if (!waveformRef.current || !track.url) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: `${track.color}90`,
      progressColor: track.color,
      cursorColor: 'transparent',
      barWidth: 2,
      barRadius: 2,
      cursorWidth: 0,
      height: 80,
      barGap: 1,
      normalize: true,
      interact: true,
      fillParent: true,
      minPxPerSec: 1,
      autoScroll: false,
      hideScrollbar: true,
    });
    wavesurferRef.current = wavesurfer;

    let isDestroyed = false;

    wavesurfer.on('ready', () => {
      if (!isDestroyed) {
        setIsLoading(false);
      }
    });

    wavesurfer.on('error', (error) => {
      console.error('WaveSurfer error:', error);
      setIsLoading(false);
    });

    wavesurfer.load(track.url);

    return () => {
      isDestroyed = true;
      if (wavesurfer) {
        try {
          wavesurfer.destroy();
        } catch (error) {
          // Silently ignore cleanup errors
        }
      }
    };
  }, [track.url, track.id, track.color]);

  // Handle waveform clicks
  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer) return;

    const handleInteraction = (newTime: number) => {
      if (!isDragging) {
        if (!isActive) {
          setActiveTrack(track.id);
        }
        seek(newTime);
      }
    };

    wavesurfer.on('interaction', handleInteraction);

    return () => {
      wavesurfer.un('interaction', handleInteraction);
    };
  }, [isDragging, isActive, track.id, setActiveTrack, seek]);

  // Update playback progress
  useEffect(() => {
    if (wavesurferRef.current && isActive) {
      wavesurferRef.current.seekTo(progress);
    }
  }, [progress, isActive]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Generate timeline marks
  const timelineMarks = useMemo(() => {
    if (!track.duration || track.duration === 0) return [];
    
    const marks: number[] = [];
    const duration = track.duration;
    
    // Determine step size based on duration
    let step = 30;
    if (duration <= 60) {
      step = 10;
    } else if (duration <= 180) {
      step = 20;
    } else if (duration <= 300) {
      step = 30;
    } else if (duration <= 600) {
      step = 60;
    } else {
      step = 120;
    }
    
    // Generate marks
    for (let time = 0; time <= duration; time += step) {
      marks.push(time);
    }
    
    // Always include the end time if not already included
    if (marks[marks.length - 1] < duration) {
      marks.push(duration);
    }
    
    return marks;
  }, [track.duration]);

  // Handle mouse move for hover position
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!contentRef.current || !track.duration) return;

    const rect = contentRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    const time = percentage * track.duration;
    
    setHoverPosition(percentage);
    setHoverTime(time);
  }, [track.duration]);

  const handleMouseLeave = useCallback(() => {
    onHover(null);
  }, [onHover]);

  const handleMarkerClick = useCallback((time: number) => {
    if (!isActive) {
      setActiveTrack(track.id);
    }
    seek(time);
  }, [isActive, setActiveTrack, seek, track.id]);

  const handleRemoveTrack = useCallback(() => {
    removeTrack(track.id);
  }, [removeTrack, track.id]);

  return (
    <div className="h-full flex flex-col group">
      {/* Track header */}
      <div className="flex items-center justify-between mb-2 px-4">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: track.color }}></div>
          <span className="text-surface-300 text-sm font-medium truncate">{track.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="text-primary-400 text-xs bg-primary-500/10 px-2 py-0.5 rounded-full">Active</span>
          )}
          <button
            onClick={handleRemoveTrack}
            className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface-800/50 transition-all"
            title="Remove track"
          >
            <svg className="w-4 h-4 text-surface-400 hover:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Main track container - Outside block with rounded border */}
      <div
        ref={containerRef}
        data-track-id={track.id}
        className="relative bg-gradient-to-br from-surface-800/5 via-surface-900/15 to-surface-950/25 rounded-2xl border border-surface-700/15 hover:border-surface-600/30 hover:shadow-xl transition-all duration-300 overflow-hidden flex-1"
        onMouseEnter={() => onHover(track.id)}
        onMouseLeave={handleMouseLeave}
        onMouseDown={(e) => onDragStart(e, track.id)}
      >
        {/* Inner content area with consistent left/right spacing */}
        <div 
          ref={contentRef}
          className="absolute inset-0 mx-4 flex flex-col"
          onMouseMove={handleMouseMove}
        >
          {/* Top Section: Timeline */}
          <div className="h-8 relative border-b border-surface-700/20">
            {timelineMarks.map((mark) => {
              const percentage = track.duration > 0 ? mark / track.duration : 0;
              return (
                <div
                  key={mark}
                  className="absolute top-0 h-full flex items-end"
                  style={{ left: `${percentage * 100}%` }}
                >
                  <div className="flex flex-col items-center transform -translate-x-1/2">
                    <div className="w-px h-2 bg-surface-600/70"></div>
                    <span className="text-[10px] text-surface-400 font-mono">
                      {formatTime(mark)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Middle Section: Waveform */}
          <div className="flex-1 py-2 relative">
            <div 
              ref={waveformRef} 
              className="w-full h-full"
            />
            
            {/* Loading overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center">
                <div className="flex items-center gap-3">
                  <div className="w-6 h-6 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                  <span className="text-surface-400 text-sm">Loading waveform...</span>
                </div>
              </div>
            )}
          </div>

          

          {/* Cursor - spanning from timeline bottom to bottom */}
          {isActive && !isLoading && (
            <div 
              className="absolute top-8 -bottom-0  pointer-events-none z-20"
              style={{ 
                left: `${progress * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {/* Cursor head - positioned at timeline bottom border */}
              <div className="absolute -top-2.5 w-3 h-3 bg-white rounded-full shadow-lg transform -translate-x-1/2">
                <div className="absolute inset-0.5 bg-primary-500 rounded-full"></div>
              </div>
              
              {/* Cursor body */}
              <div 
                className="absolute top-0 bottom-4 w-0.5 bg-white transform -translate-x-1/2"
                style={{
                  boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)',
                }}
              />
              
              {/* Current time display attached to cursor bottom */}
              <div 
                className="absolute bottom-0 bg-surface-900/90 px-2 py-0.5 rounded text-xs font-mono text-white transform -translate-x-1/2"
              >
                {formatTime(playbackState.currentTime)}
              </div>
            </div>
          )}

          {/* Hover time indicator */}
          {isHovered && !isLoading && (
            <div 
              className="absolute top-8 bg-surface-900/90 px-2 py-1 rounded text-xs font-mono text-white pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity z-40"
              style={{
                left: `${hoverPosition * 100}%`,
                transform: 'translateX(-50%)',
              }}
            >
              {formatTime(hoverTime)}
            </div>
          )}

          {/* Selection area */}
          {isDragging && dragStart && selection && isActive && (
            <div
              className="absolute top-8 bottom-6 bg-primary-400/20 border-x-2 border-primary-400/50 pointer-events-none"
              style={{
                left: `${(selection.start / track.duration) * 100}%`,
                width: `${((selection.end - selection.start) / track.duration) * 100}%`,
              }}
            />
          )}

          {/* Markers */}
          {track.markers.map((marker) => (
            <div
              key={marker.id}
              className="absolute top-8 bottom-0 w-0.5 cursor-pointer group/marker hover:w-1 transition-all z-20"
              style={{
                left: `${(marker.time / track.duration) * 100}%`,
                backgroundColor: marker.color,
                transform: 'translateX(-50%)',
              }}
              onClick={() => handleMarkerClick(marker.time)}
            >
              <div
                className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 rounded-full"
                style={{ backgroundColor: marker.color }}
              />
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-surface-900 px-2 py-0.5 rounded text-xs text-white whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-opacity">
                {marker.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});