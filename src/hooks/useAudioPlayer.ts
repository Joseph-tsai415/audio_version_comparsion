// This hook is deprecated - audio management is now handled entirely in AudioContext
// Keeping this file for backwards compatibility but it's no longer used

import { useAudio } from '../contexts/AudioContext';

export const useAudioPlayer = () => {
  const { getAudioElement, playbackState } = useAudio();
  
  if (playbackState.activeTrackId) {
    return getAudioElement(playbackState.activeTrackId);
  }
  
  return null;
};