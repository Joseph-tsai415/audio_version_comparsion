import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { AudioTrack, PlaybackState, AudioContextState } from '../types/audio.types';

const AudioContext = createContext<AudioContextState | null>(null);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within AudioProvider');
  }
  return context;
};

const TRACK_COLORS = [
  '#3B82F6', // blue
  '#10B981', // emerald  
  '#F59E0B', // amber
  '#EF4444', // red
  '#8B5CF6', // violet
  '#EC4899', // pink
  '#06B6D4', // cyan
  '#84CC16', // lime
  '#F97316', // orange
  '#8B5A87', // purple
  '#14B8A6', // teal
  '#F43F5E', // rose
];

export const AudioProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [tracks, setTracks] = useState<AudioTrack[]>([]);
  const [playbackState, setPlaybackState] = useState<PlaybackState>({
    isPlaying: false,
    currentTime: 0,
    duration: 0,
    volume: 0.7,
    activeTrackId: null,
    playbackRate: 1,
    loop: false,
    buffered: 0,
    previousVolume: 0.7,
  });

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const animationFrameRef = useRef<number | null>(null);
  const currentPlayingRef = useRef<string | null>(null);

  const addTrack = useCallback(async (file: File) => {
    // Validate file size (512MB limit for lossless audio)
    const maxSize = 512 * 1024 * 1024; // 512MB in bytes
    if (file.size > maxSize) {
      alert(`File "${file.name}" is too large. Maximum size is 512MB.`);
      return;
    }

    // Enforce track limit
    const trackLimit = 10;
    if (tracks.length >= trackLimit) {
      alert(`Maximum ${trackLimit} tracks allowed. Remove some tracks to add more.`);
      return;
    }

    const id = Date.now().toString();
    const url = URL.createObjectURL(file);
    // Use a unique color index based on current timestamp to avoid duplicates when loading simultaneously
    const colorIndex = (Date.now() + tracks.length) % TRACK_COLORS.length;
    const color = TRACK_COLORS[colorIndex];

    const audio = new Audio(url);
    audio.volume = playbackState.volume;
    audio.playbackRate = playbackState.playbackRate;
    audio.muted = false; // Ensure audio is not muted
    
    // Set up audio event listeners
    audio.addEventListener('ended', () => {
      // Check if this track is still the active one
      setPlaybackState(prev => {
        if (prev.activeTrackId === id) {
          if (prev.loop) {
            audio.currentTime = 0;
            audio.play();
            return prev;
          } else {
            currentPlayingRef.current = null;
            return { ...prev, isPlaying: false };
          }
        }
        return prev;
      });
    });

    // Track buffering progress
    audio.addEventListener('progress', () => {
      if (audio.buffered.length > 0) {
        const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
        const bufferedAmount = bufferedEnd / audio.duration;
        setPlaybackState(prev => {
          if (prev.activeTrackId === id) {
            return { ...prev, buffered: bufferedAmount };
          }
          return prev;
        });
      }
    });

    await new Promise((resolve) => {
      audio.addEventListener('loadedmetadata', resolve, { once: true });
    });

    const track: AudioTrack = {
      id,
      name: file.name,
      file,
      url,
      duration: audio.duration,
      color,
      markers: [],
    };

    audioRefs.current.set(id, audio);
    setTracks((prev) => [...prev, track]);

    if (!playbackState.activeTrackId) {
      setPlaybackState((prev) => ({
        ...prev,
        activeTrackId: id,
        duration: audio.duration,
      }));
    }
  }, [tracks.length, playbackState.activeTrackId, playbackState.volume, playbackState.playbackRate]);

  const removeTrack = useCallback((id: string) => {
    const audio = audioRefs.current.get(id);
    if (audio) {
      audio.pause();
      URL.revokeObjectURL(audio.src);
      audioRefs.current.delete(id);
    }

    setTracks((prev) => prev.filter((track) => track.id !== id));

    if (playbackState.activeTrackId === id) {
      const remainingTracks = tracks.filter((track) => track.id !== id);
      setPlaybackState((prev) => ({
        ...prev,
        activeTrackId: remainingTracks[0]?.id || null,
        duration: remainingTracks[0]?.duration || 0,
      }));
    }
  }, [playbackState.activeTrackId, tracks]);

  const setActiveTrack = useCallback((id: string) => {
    console.log(`setActiveTrack called for: ${id}, current: ${playbackState.activeTrackId}, playing: ${playbackState.isPlaying}`);
    
    // Get current time before switching
    const currentAudio = audioRefs.current.get(playbackState.activeTrackId || '');
    const currentTime = currentAudio?.currentTime || 0;
    const wasPlaying = playbackState.isPlaying;
    
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Debug: Check all audio elements
    console.log('Current audio elements:', Array.from(audioRefs.current.entries()).map(([id, audio]) => ({
      id,
      paused: audio.paused,
      currentTime: audio.currentTime,
      src: audio.src.substring(audio.src.lastIndexOf('/') + 1)
    })));
    
    // Pause all audio elements
    audioRefs.current.forEach((audio, trackId) => {
      if (!audio.paused) {
        console.log(`Pausing track ${trackId}`);
        audio.pause();
      }
    });
    
    // Clear current playing ref
    currentPlayingRef.current = null;
    
    // Get new audio and track
    const newAudio = audioRefs.current.get(id);
    const track = tracks.find((t) => t.id === id);
    
    if (!track || !newAudio) {
      console.warn(`Track ${id} not found`);
      return;
    }
    
    // Set audio properties
    newAudio.currentTime = currentTime;
    newAudio.playbackRate = playbackState.playbackRate;
    newAudio.volume = playbackState.volume;
    
    // Update state
    setPlaybackState((prev) => ({
      ...prev,
      activeTrackId: id,
      duration: track.duration,
      currentTime: currentTime,
      isPlaying: false // Always set to false first
    }));
    
    // If we were playing, resume playback
    if (wasPlaying) {
      // Longer delay to ensure everything is ready
      setTimeout(() => {
        // Re-check if we should still play this track
        const currentAudioCheck = audioRefs.current.get(id);
        if (!currentAudioCheck) {
          console.error(`Audio element for track ${id} not found`);
          return;
        }
        
        // Verify audio is ready before attempting play
        if (currentAudioCheck.readyState < 2) {
          console.warn(`Audio not ready for track ${id}, skipping play`);
          return;
        }
        
        console.log(`Attempting to play track ${id}`);
        currentPlayingRef.current = id;
        
        // Force a fresh play attempt
        currentAudioCheck.currentTime = currentTime; // Re-set the time
        currentAudioCheck.volume = playbackState.volume;
        currentAudioCheck.playbackRate = playbackState.playbackRate;
        
        const playPromise = currentAudioCheck.play();
        
        if (playPromise !== undefined) {
          playPromise.then(() => {
            console.log(`Successfully playing track ${id}, paused: ${currentAudioCheck.paused}, currentTime: ${currentAudioCheck.currentTime}, readyState: ${currentAudioCheck.readyState}`);
            
            // Only set playing state after successful play
            setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
            
            // Start time tracking
            const updateTime = () => {
              // Re-verify track ID to prevent stale updates
              const currentTrackId = currentPlayingRef.current;
              const audioToCheck = audioRefs.current.get(currentTrackId || '');
              if (currentTrackId === id && audioToCheck && !audioToCheck.paused) {
                setPlaybackState((prev) => {
                  if (prev.activeTrackId === currentTrackId) {
                    return { ...prev, currentTime: audioToCheck.currentTime };
                  }
                  return prev;
                });
                animationFrameRef.current = requestAnimationFrame(updateTime);
              }
            };
            updateTime();
          }).catch((error) => {
            console.error(`Failed to play track ${id}:`, error);
            currentPlayingRef.current = null;
            setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
          });
        }
      }, 50); // Minimal delay for smooth switching
    }
  }, [playbackState.activeTrackId, playbackState.isPlaying, playbackState.playbackRate, playbackState.volume, tracks]);

  const play = useCallback(() => {
    const trackId = playbackState.activeTrackId;
    const audio = audioRefs.current.get(trackId || '');
    
    if (!audio || !trackId) {
      console.warn('No audio or track to play');
      return;
    }
    
    // Cancel any existing animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    console.log(`Playing track ${trackId}`);
    currentPlayingRef.current = trackId;
    
    // Debug audio state
    console.log(`Audio debug for track ${trackId}:`, {
      src: audio.src.substring(audio.src.lastIndexOf('/') + 1),
      readyState: audio.readyState,
      networkState: audio.networkState,
      volume: audio.volume,
      muted: audio.muted,
      playbackRate: audio.playbackRate
    });
    
    // First set playing state
    setPlaybackState((prev) => ({ ...prev, isPlaying: true }));
    
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
      playPromise.then(() => {
        console.log(`Play started for track ${trackId}, paused: ${audio.paused}`);
        
        // Start time tracking
        const updateTime = () => {
          // Re-verify track ID to prevent stale updates
          const currentTrackId = currentPlayingRef.current;
          const audioToCheck = audioRefs.current.get(currentTrackId || '');
          if (currentTrackId === trackId && audioToCheck && !audioToCheck.paused) {
            setPlaybackState((prev) => {
              if (prev.activeTrackId === currentTrackId) {
                return { ...prev, currentTime: audioToCheck.currentTime };
              }
              return prev;
            });
            animationFrameRef.current = requestAnimationFrame(updateTime);
          }
        };
        updateTime();
      }).catch((error) => {
        console.error(`Failed to play track ${trackId}:`, error);
        console.error('Error details:', error.name, error.message);
        currentPlayingRef.current = null;
        setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
      });
    }
  }, [playbackState.activeTrackId]);

  const pause = useCallback(() => {
    const trackId = playbackState.activeTrackId;
    const audio = audioRefs.current.get(trackId || '');
    
    if (audio) {
      console.log(`Pausing track ${trackId}`);
      audio.pause();
      currentPlayingRef.current = null;
      setPlaybackState((prev) => ({ ...prev, isPlaying: false }));
      
      // Cancel animation frame
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
    }
  }, [playbackState.activeTrackId]);

  const seek = useCallback((time: number) => {
    const audio = audioRefs.current.get(playbackState.activeTrackId || '');
    if (audio) {
      audio.currentTime = time;
      setPlaybackState((prev) => ({ ...prev, currentTime: time }));
    }
  }, [playbackState.activeTrackId]);

  const setVolume = useCallback((volume: number) => {
    audioRefs.current.forEach((audio) => {
      audio.volume = volume;
    });
    setPlaybackState((prev) => ({ ...prev, volume }));
  }, []);

  const nextTrack = useCallback(() => {
    if (tracks.length === 0) return;
    
    const currentIndex = tracks.findIndex(t => t.id === playbackState.activeTrackId);
    const nextIndex = (currentIndex + 1) % tracks.length;
    const nextTrackId = tracks[nextIndex].id;
    
    console.log(`Switching to next track: ${nextTrackId}`);
    setActiveTrack(nextTrackId);
  }, [tracks, playbackState.activeTrackId, setActiveTrack]);

  const previousTrack = useCallback(() => {
    if (tracks.length === 0) return;
    
    const currentIndex = tracks.findIndex(t => t.id === playbackState.activeTrackId);
    const prevIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;
    const prevTrackId = tracks[prevIndex].id;
    
    console.log(`Switching to previous track: ${prevTrackId}`);
    setActiveTrack(prevTrackId);
  }, [tracks, playbackState.activeTrackId, setActiveTrack]);

  const setPlaybackRate = useCallback((rate: number) => {
    audioRefs.current.forEach((audio) => {
      audio.playbackRate = rate;
    });
    setPlaybackState((prev) => ({ ...prev, playbackRate: rate }));
  }, []);

  const toggleLoop = useCallback(() => {
    setPlaybackState((prev) => ({ ...prev, loop: !prev.loop }));
  }, []);

  const toggleMute = useCallback(() => {
    if (playbackState.volume > 0) {
      // Mute
      setPlaybackState((prev) => ({ 
        ...prev, 
        previousVolume: prev.volume,
        volume: 0 
      }));
      audioRefs.current.forEach((audio) => {
        audio.volume = 0;
      });
    } else {
      // Unmute
      const volumeToRestore = playbackState.previousVolume || 0.7;
      setPlaybackState((prev) => ({ 
        ...prev, 
        volume: volumeToRestore 
      }));
      audioRefs.current.forEach((audio) => {
        audio.volume = volumeToRestore;
      });
    }
  }, [playbackState.volume, playbackState.previousVolume]);

  const addMarker = useCallback((trackId: string, time: number, label: string) => {
    const marker = {
      id: Date.now().toString(),
      time,
      label,
      color: '#' + Math.floor(Math.random()*16777215).toString(16),
    };
    
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId
          ? { ...track, markers: [...track.markers, marker] }
          : track
      )
    );
  }, []);

  const removeMarker = useCallback((trackId: string, markerId: string) => {
    setTracks((prev) =>
      prev.map((track) =>
        track.id === trackId
          ? { ...track, markers: track.markers.filter((m) => m.id !== markerId) }
          : track
      )
    );
  }, []);

  const getAudioElement = useCallback((trackId: string) => {
    return audioRefs.current.get(trackId);
  }, []);

  const value: AudioContextState = {
    tracks,
    playbackState,
    audioElements: audioRefs.current,
    addTrack,
    removeTrack,
    setActiveTrack,
    play,
    pause,
    seek,
    setVolume,
    nextTrack,
    previousTrack,
    setPlaybackRate,
    toggleLoop,
    toggleMute,
    addMarker,
    removeMarker,
    getAudioElement,
  };

  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
};