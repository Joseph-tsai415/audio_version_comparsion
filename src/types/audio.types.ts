export interface Marker {
  id: string;
  time: number;
  label: string;
  color: string;
}

export interface AudioTrack {
  id: string;
  name: string;
  file: File;
  url: string;
  duration: number;
  waveform?: Float32Array;
  color: string;
  markers: Marker[];
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  activeTrackId: string | null;
  playbackRate: number;
  loop: boolean;
  buffered: number;
  previousVolume: number;
}

export interface AudioContextState {
  tracks: AudioTrack[];
  playbackState: PlaybackState;
  audioElements: Map<string, HTMLAudioElement>;
  addTrack: (file: File) => Promise<void>;
  removeTrack: (id: string) => void;
  setActiveTrack: (id: string) => void;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  setVolume: (volume: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleLoop: () => void;
  toggleMute: () => void;
  addMarker: (trackId: string, time: number, label: string) => void;
  removeMarker: (trackId: string, markerId: string) => void;
  getAudioElement: (trackId: string) => HTMLAudioElement | undefined;
}