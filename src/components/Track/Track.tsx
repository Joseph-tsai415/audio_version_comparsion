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
  zoomLevel,
  onZoom,
  isDragging,
  onDragStart,
  dragStart,
  selection,
  onMarkerAdd,
  syncScrollEnabled,
  scrollOffsetsRef,
}) => {
  const { playbackState, seek, setActiveTrack, removeTrack } = useAudio();
  const containerRef = useRef<HTMLDivElement>(null);
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isActive = playbackState.activeTrackId === track.id;

  const progress = useMemo(() => (
    isActive && playbackState.duration > 0
      ? playbackState.currentTime / playbackState.duration
      : 0
  ), [isActive, playbackState.currentTime, playbackState.duration]);

  // Initialize WaveSurfer only when essential props change
  useEffect(() => {
    if (!waveformRef.current || !track.url) return;

    const wavesurfer = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: `${track.color}90`,
      progressColor: track.color,
      cursorColor: 'transparent',
      barWidth: 2,
      barRadius: 2,
      cursorWidth: 0.1,
      height: 100,
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
        console.log('WaveSurfer ready for track:', track.id);
        // Apply initial zoom settings after ready
        if (zoomLevel === 0 && containerRef.current) {
          const width = containerRef.current.clientWidth - 20;
          const newPxPerSec = width / wavesurfer.getDuration();
          wavesurfer.setOptions({ minPxPerSec: newPxPerSec, fillParent: true });
        } else if (zoomLevel > 0) {
          wavesurfer.setOptions({ minPxPerSec: zoomLevel * 100, fillParent: false });
        }
      }
    });

    wavesurfer.on('error', (error) => {
      console.error('WaveSurfer error for track:', track.id, error);
      setIsLoading(false);
    });

    console.log('Loading WaveSurfer for track:', track.id, track.url);
    wavesurfer.load(track.url);

    return () => {
      isDestroyed = true;
      console.log('Destroying WaveSurfer for track:', track.id);
      if (wavesurfer) {
        try {
          wavesurfer.destroy();
        } catch (error) {
          // Silently ignore cleanup errors
        }
      }
    };
  }, [track.url, track.id, track.color]);

  // Handle interaction events separately
  useEffect(() => {
    const wavesurfer = wavesurferRef.current;
    if (!wavesurfer) return;

    const handleInteraction = (newTime: number) => {
      if (!isDragging) {
        const currentActive = playbackState.activeTrackId === track.id;
        if (!currentActive) {
          setActiveTrack(track.id);
        }
        seek(newTime);
      }
    };

    wavesurfer.on('interaction', handleInteraction);

    return () => {
      wavesurfer.un('interaction', handleInteraction);
    };
  }, [isDragging, playbackState.activeTrackId, track.id, setActiveTrack, seek]);

  // Update zoom
  useEffect(() => {
    if (wavesurferRef.current) {
      if (zoomLevel === 0) {
        const width = containerRef.current?.clientWidth ? containerRef.current.clientWidth - 20 : 0;
        const newPxPerSec = width / wavesurferRef.current.getDuration();
        wavesurferRef.current.setOptions({ minPxPerSec: newPxPerSec, fillParent: true });
      } else {
        wavesurferRef.current.setOptions({ minPxPerSec: zoomLevel * 100, fillParent: false });
      }
    }
  }, [zoomLevel]);

  // Update playback progress on WaveSurfer
  useEffect(() => {
    if (wavesurferRef.current && isActive) {
      wavesurferRef.current.seekTo(progress);
    }
  }, [progress, isActive]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${String(secs).padStart(2, '0')}`;
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    
    // Account for the 1rem (16px) padding on each side
    const padding = 16; // 1rem = 16px
    const effectiveWidth = rect.width - (padding * 2);
    const adjustedX = Math.max(0, Math.min(effectiveWidth, x - padding));
    const percentage = adjustedX / effectiveWidth;
    const time = percentage * track.duration;

    const indicator = containerRef.current.querySelector('.time-indicator') as HTMLElement;
    if (indicator) {
      indicator.style.left = `${x}px`;
      indicator.textContent = formatTime(time);
    }
  }, [track.duration, formatTime]);
  
  const handleMarkerClick = useCallback((time: number) => {
    if (!isActive) {
      setActiveTrack(track.id);
    }
    seek(time);
  }, [isActive, setActiveTrack, seek, track.id]);

  const handleRemoveTrack = useCallback(() => {
    removeTrack(track.id);
  }, [removeTrack, track.id]);

  const timelineMarks = useMemo(() => {
    if (!track.duration || track.duration === 0) return [];
    
    const marks: number[] = [];
    const duration = Math.floor(track.duration);
    
    // Simple approach: create marks every 30 seconds for most tracks
    let step = 30;
    
    // Adjust step based on duration
    if (duration <= 120) { // 2 minutes or less
      step = 15; // Every 15 seconds
    } else if (duration <= 300) { // 5 minutes or less  
      step = 30; // Every 30 seconds
    } else if (duration <= 600) { // 10 minutes or less
      step = 60; // Every minute
    } else {
      step = 120; // Every 2 minutes for long tracks
    }
    
    // Always start with 0
    marks.push(0);
    
    // Add intermediate marks
    for (let time = step; time < duration; time += step) {
      marks.push(time);
    }
    
    // Always end with total duration
    marks.push(duration);
    
    return marks;
  }, [track.duration]);

  return (
    <div className="mb-8 animate-slide-up relative group">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full shadow-lg" style={{ backgroundColor: track.color }}></div>
          <span className="text-surface-300 text-sm font-medium">{track.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {isActive && (
            <span className="text-primary-400 text-xs bg-primary-500/10 px-3 py-1 rounded-full">Active</span>
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

      <div
        ref={containerRef}
        className="relative bg-gradient-to-br from-surface-800/10 via-surface-900/20 to-surface-950/30 rounded-2xl border border-surface-700/20 hover:border-surface-600/40 hover:shadow-xl hover:shadow-primary-500/5 transition-all duration-500 backdrop-blur-xl"
        onMouseEnter={() => onHover(track.id)}
        onMouseLeave={() => onHover(null)}
        onMouseMove={handleMouseMove}
        onWheel={onZoom}
        onMouseDown={(e) => onDragStart(e, track.id)}
        style={{ overflow: 'hidden' }}
      >
        <div className="relative pt-6 pb-4 px-4" style={{ overflowX: zoomLevel > 0 ? 'auto' : 'hidden' }}>
          <div ref={waveformRef} className="relative">
            {/* Timeline markers directly above waveform */}
            <div 
              className="absolute -top-6 left-0 right-0 h-6 pointer-events-none z-100"
            >
              {timelineMarks.map((mark) => {
                const position = (mark / track.duration) * 100;
                
                return (
                  <div
                    key={mark}
                    className="absolute top-0 flex flex-col items-center"
                    style={{ 
                      left: `${position}%`,
                      transform: 'translateX(-50%)'
                    }}
                  >
                    {/* Tick mark */}
                    <div className="w-px h-2 bg-surface-400 mb-1"></div>
                    
                    {/* Time label */}
                    <span className="text-[10px] font-mono text-surface-300 select-none">
                      {formatTime(mark)}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
          
          {isLoading && (
            <div className="absolute inset-0 bg-surface-900/50 backdrop-blur-sm flex items-center justify-center z-20">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-surface-400 text-sm">Loading waveform...</span>
              </div>
            </div>
          )}
        </div>

        {isActive && (
          <div 
            className="absolute top-6 bottom-4 pointer-events-none z-30"
            style={{ 
              left: '1rem',
              right: '1rem',
              overflowX: zoomLevel > 0 ? 'visible' : 'hidden'
            }}
          >
            <div 
              style={{ 
                width: zoomLevel > 0 ? `${zoomLevel * 100}%` : '100%',
                minWidth: '100%',
                position: 'relative',
                height: '100%'
              }}
            >
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg transition-opacity duration-300 rounded-full"
                style={{
                  left: `${progress * 100}%`,
                  opacity: playbackState.isPlaying ? 1 : 0.5,
                }}
              >
                <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-white rounded-full shadow-lg ring-2 ring-white/20"></div>
              </div>
            </div>
          </div>
        )}

        {/* Modern cursor time display */}
        {isActive && (
          <div 
            className="absolute bottom-0 pointer-events-none z-50"
            style={{ 
              left: '1rem',
              right: '1rem',
              overflowX: zoomLevel > 0 ? 'visible' : 'hidden'
            }}
          >
            <div 
              style={{ 
                width: zoomLevel > 0 ? `${zoomLevel * 100}%` : '100%',
                minWidth: '100%',
                position: 'relative'
              }}
            >
              <div
                className="absolute bottom-0 transform -translate-x-1/2 bg-gradient-to-br from-surface-900/95 to-surface-950/95 backdrop-blur-xl px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-white whitespace-nowrap shadow-2xl border border-surface-700/50"
                style={{
                  left: `${progress * 100}%`,
                }}
              >
                {formatTime(playbackState.currentTime)}
              </div>
            </div>
          </div>
        )}

        <div className="time-indicator absolute top-10 bg-gradient-to-br from-surface-900/90 to-surface-950/90 backdrop-blur-xl px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-surface-200 opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none z-40 shadow-lg border border-surface-700/40">
          0:00
        </div>

        {isDragging && dragStart && selection && isActive && (
          <div 
            className="absolute top-6 bottom-4 pointer-events-none z-25"
            style={{ 
              left: '1rem',
              right: '1rem',
              overflowX: zoomLevel > 0 ? 'visible' : 'hidden'
            }}
          >
            <div 
              style={{ 
                width: zoomLevel > 0 ? `${zoomLevel * 100}%` : '100%',
                minWidth: '100%',
                position: 'relative',
                height: '100%'
              }}
            >
              {/* Modern selection area */}
              <div
                className="absolute top-0 bottom-0 bg-gradient-to-r from-primary-400/30 via-primary-400/20 to-primary-400/30 border-x-2 border-primary-400/60 rounded-sm backdrop-blur-sm"
                style={{
                  left: `${(selection.start / track.duration) * 100}%`,
                  width: `${((selection.end - selection.start) / track.duration) * 100}%`,
                }}
              />
              {/* Modern drag cursor */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-gradient-to-b from-primary-300 to-primary-400 shadow-lg z-10 transition-all duration-75 rounded-full"
                style={{
                  left: `${(selection.end / track.duration) * 100}%`,
                }}
              >
                <div className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-gradient-to-br from-primary-300 to-primary-500 rounded-full shadow-lg ring-2 ring-white/30"></div>
                <div className="absolute bottom-full mb-2 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-primary-600/95 to-primary-700/95 backdrop-blur-xl px-3 py-1.5 rounded-xl text-xs font-mono font-medium text-white whitespace-nowrap shadow-2xl border border-primary-500/40">
                  {formatTime(selection.end)}
                </div>
              </div>
            </div>
          </div>
        )}

        <div 
          className="absolute top-6 bottom-4 pointer-events-none z-20"
          style={{ 
            left: '1rem',
            right: '1rem',
            overflowX: zoomLevel > 0 ? 'visible' : 'hidden'
          }}
        >
          <div 
            style={{ 
              width: zoomLevel > 0 ? `${zoomLevel * 100}%` : '100%',
              minWidth: '100%',
              position: 'relative',
              height: '100%'
            }}
          >
            {track.markers.map((marker) => (
              <div
                key={marker.id}
                className="absolute top-0 bottom-0 w-0.5 cursor-pointer group/marker pointer-events-auto transition-all duration-200 hover:w-1 rounded-full shadow-md"
                style={{
                  left: `${(marker.time / track.duration) * 100}%`,
                  background: `linear-gradient(to bottom, ${marker.color}E6, ${marker.color})`,
                }}
                onClick={() => handleMarkerClick(marker.time)}
              >
                <div
                  className="absolute -top-1.5 left-1/2 transform -translate-x-1/2 w-3 h-3 rounded-full shadow-lg ring-2 ring-white/20 transition-all duration-200 group-hover/marker:w-4 group-hover/marker:h-4 group-hover/marker:ring-4"
                  style={{ 
                    background: `radial-gradient(circle, ${marker.color}, ${marker.color}CC)`,
                  }}
                />
                <div className="absolute bottom-full mb-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-br from-surface-900/95 to-surface-950/95 backdrop-blur-xl px-3 py-2 rounded-xl text-xs font-mono font-medium text-white whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-all duration-300 shadow-2xl border border-surface-700/50">
                  <div 
                    className="absolute top-full left-1/2 transform -translate-x-1/2 w-2 h-2 rotate-45 -mt-1 border-r border-b border-surface-700/50"
                    style={{ 
                      background: `linear-gradient(135deg, ${marker.color}40, transparent)` 
                    }}
                  ></div>
                  {marker.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
});