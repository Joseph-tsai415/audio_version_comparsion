import React, { useRef, useState } from 'react';
import { useAudio } from '../../contexts/AudioContext';
import { AudioTrack } from '../../types/audio.types';

export const TrackList: React.FC = () => {
  const { tracks, addTrack, removeTrack, setActiveTrack, playbackState } = useAudio();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      for (let i = 0; i < files.length; i++) {
        await addTrack(files[i]);
      }
    }
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    for (let i = 0; i < files.length; i++) {
      if (files[i].type.startsWith('audio/')) {
        await addTrack(files[i]);
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.currentTarget === e.target) {
      setIsDragging(false);
    }
  };

  return (
    <div className="bg-surface-900/30 backdrop-blur-xl rounded-2xl p-6 border border-surface-800/50 shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Audio Tracks</h2>
        <span className="text-sm text-surface-400 bg-surface-800/50 px-3 py-1 rounded-full">
          {tracks.length} / 10
        </span>
      </div>
      
      <div
        className={`relative border-2 border-dashed rounded-xl p-8 mb-6 text-center cursor-pointer transition-all duration-300 ${
          isDragging 
            ? 'border-primary-400 bg-primary-500/10 shadow-glow' 
            : 'border-surface-700 hover:border-surface-600 hover:bg-surface-800/20'
        }`}
        onClick={() => fileInputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
      >
        <div className="pointer-events-none">
          <div className={`w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center transition-all duration-300 ${
            isDragging ? 'bg-primary-500/20' : 'bg-surface-800/50'
          }`}>
            <svg className={`w-8 h-8 transition-colors ${isDragging ? 'text-primary-400' : 'text-surface-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <p className={`font-medium mb-2 transition-colors ${isDragging ? 'text-primary-400' : 'text-surface-300'}`}>
            {isDragging ? 'Drop your files here' : 'Drop audio files or click to browse'}
          </p>
          <p className="text-surface-500 text-sm">
            MP3, WAV, FLAC, OGG • Max 512MB per file
          </p>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      <div className="space-y-2 max-h-96 overflow-y-auto custom-scrollbar">
        {tracks.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-surface-500">No tracks loaded yet</p>
            <p className="text-surface-600 text-sm mt-1">Add some audio files to get started</p>
          </div>
        ) : (
          tracks.map((track, index) => (
            <TrackItem
              key={track.id}
              track={track}
              index={index}
              isActive={playbackState.activeTrackId === track.id}
              isPlaying={playbackState.isPlaying && playbackState.activeTrackId === track.id}
              onSelect={() => setActiveTrack(track.id)}
              onRemove={() => removeTrack(track.id)}
            />
          ))
        )}
      </div>

    </div>
  );
};

interface TrackItemProps {
  track: AudioTrack;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

const TrackItem: React.FC<TrackItemProps> = ({ track, index, isActive, isPlaying, onSelect, onRemove }) => {
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileName = (name: string) => {
    const maxLength = 25;
    const extension = name.lastIndexOf('.') > -1 ? name.slice(name.lastIndexOf('.')) : '';
    const nameWithoutExt = name.slice(0, name.lastIndexOf('.') > -1 ? name.lastIndexOf('.') : name.length);
    
    if (nameWithoutExt.length > maxLength) {
      return nameWithoutExt.slice(0, maxLength - 3) + '...' + extension;
    }
    return name;
  };

  return (
    <div
      className={`group relative flex items-center p-4 rounded-xl cursor-pointer transition-all duration-200 ${
        isActive 
          ? 'bg-primary-500/10 border border-primary-500/30 shadow-glow' 
          : 'bg-surface-800/20 hover:bg-surface-800/40 border border-transparent'
      }`}
      onClick={onSelect}
    >
      {/* Track number and color indicator */}
      <div className="flex items-center mr-4">
        <span className="text-surface-600 text-xs font-medium mr-3 w-4">{index + 1}</span>
        <div className="relative">
          <div
            className={`w-3 h-3 rounded-full transition-all duration-300 ${isActive ? 'scale-125' : ''}`}
            style={{ backgroundColor: track.color }}
          />
          {isPlaying && (
            <div className="absolute inset-0 animate-ping">
              <div
                className="w-3 h-3 rounded-full opacity-75"
                style={{ backgroundColor: track.color }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Track info */}
      <div className="flex-1 min-w-0">
        <p className={`font-medium truncate transition-colors ${
          isActive ? 'text-white' : 'text-surface-300'
        }`}>
          {formatFileName(track.name)}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <span className="text-surface-500 text-xs">{formatDuration(track.duration)}</span>
          {isPlaying && (
            <span className="text-primary-400 text-xs flex items-center gap-1">
              <span className="w-1 h-1 bg-primary-400 rounded-full animate-pulse" />
              Playing
            </span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
        {isActive && (
          <div className="w-8 h-8 flex items-center justify-center">
            <svg className="w-4 h-4 text-primary-400" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
            </svg>
          </div>
        )}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-surface-700/50 transition-colors"
        >
          <svg className="w-4 h-4 text-surface-400 hover:text-red-400 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};