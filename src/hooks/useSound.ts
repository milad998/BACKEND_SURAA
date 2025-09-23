import { useEffect, useRef } from 'react';

export const useSound = (soundFile: string = '/sounds/notification.mp3') => {
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // إنشاء عنصر audio مرة واحدة
    audioRef.current = new Audio(soundFile);
    audioRef.current.preload = 'auto';
    
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, [soundFile]);

  const playSound = () => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0; // إعادة التشغيل من البداية
      audioRef.current.play().catch(error => {
        console.log('Failed to play sound:', error);
      });
    }
  };

  return { playSound };
};
