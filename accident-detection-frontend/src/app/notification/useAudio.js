import { useRef, useEffect } from 'react';
import { AUDIO_CONFIG } from './constants';

export const useAudio = (soundEnabled) => {
  const audioRef = useRef(null);

  useEffect(() => {
    if (soundEnabled) {
      initializeAudio();
    }
  }, [soundEnabled]);

  const initializeAudio = () => {
    try {
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      
      const createAlarmSound = () => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(AUDIO_CONFIG.FREQUENCY_START, audioContext.currentTime);
        oscillator.frequency.exponentialRampToValueAtTime(AUDIO_CONFIG.FREQUENCY_END, audioContext.currentTime + 0.1);
        oscillator.frequency.exponentialRampToValueAtTime(AUDIO_CONFIG.FREQUENCY_START, audioContext.currentTime + 0.2);
        
        gainNode.gain.setValueAtTime(AUDIO_CONFIG.GAIN, audioContext.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + AUDIO_CONFIG.DURATION);
        
        oscillator.start(audioContext.currentTime);
        oscillator.stop(audioContext.currentTime + AUDIO_CONFIG.DURATION);
        
        return { oscillator, gainNode };
      };

      audioRef.current = createAlarmSound;
    } catch (error) {
      console.warn('Audio initialization failed:', error);
    }
  };

  const playAlarmSound = () => {
    if (soundEnabled && audioRef.current) {
      try {
        for (let i = 0; i < AUDIO_CONFIG.REPEAT_COUNT; i++) {
          setTimeout(() => {
            audioRef.current();
          }, i * AUDIO_CONFIG.REPEAT_INTERVAL);
        }
      } catch (error) {
        console.warn('Audio playback failed:', error);
      }
    }
  };

  return { playAlarmSound };
};
