"use client";

import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";

interface QuranAudioState {
  audio: HTMLAudioElement | null;
  isPlaying: boolean;
  currentSurah: number | null;
  currentAyah: number | null;
  totalAyahs: number;
  volume: number;
  isMuted: boolean;
  currentTime: number;
  duration: number;
}

interface QuranAudioContextType extends QuranAudioState {
  playAyah: (surahNumber: number, ayahNumber: number, totalAyahs: number) => Promise<void>;
  pauseAudio: () => void;
  resumeAudio: () => void;
  stopAudio: () => void;
  toggleMute: () => void;
  setVolume: (volume: number) => void;
  seekTo: (time: number) => void;
  playNextAyah: () => Promise<void>;
  playPreviousAyah: () => Promise<void>;
}

const QuranAudioContext = createContext<QuranAudioContextType | undefined>(undefined);

export function QuranAudioProvider({ children }: { children: React.ReactNode }) {
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSurah, setCurrentSurah] = useState<number | null>(null);
  const [currentAyah, setCurrentAyah] = useState<number | null>(null);
  const [totalAyahs, setTotalAyahs] = useState(0);
  const [volume, setVolumeState] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const currentStateRef = useRef({ surah: null as number | null, ayah: null as number | null, totalAyahs: 0 });
  const timeUpdateHandlerRef = useRef<(() => void) | null>(null);

  const playAyah = useCallback(async (surahNumber: number, ayahNumber: number, totalAyahsCount: number) => {
    try {
      // Stop and clean up current audio completely before starting new one
      const currentAudio = audioRef.current;
      if (currentAudio) {
        // Pause immediately
        currentAudio.pause();
        currentAudio.currentTime = 0;
        
        // Remove all event listeners to prevent any callbacks
        if (timeUpdateHandlerRef.current) {
          currentAudio.removeEventListener('timeupdate', timeUpdateHandlerRef.current);
          timeUpdateHandlerRef.current = null;
        }
        currentAudio.onended = null;
        currentAudio.onerror = null;
        currentAudio.onloadedmetadata = null;
        currentAudio.onplay = null;
        currentAudio.onpause = null;
        
        // Stop loading
        currentAudio.src = '';
        currentAudio.load();
        
        // Update state immediately
        setIsPlaying(false);
        setCurrentTime(0);
      }
      
      // Also clear the audio state
      setAudio(null);
      audioRef.current = null;
      
      // Small delay to ensure cleanup completes
      await new Promise(resolve => setTimeout(resolve, 50));

      // Use alquran.cloud API which provides reliable audio
      const audioUrl = `https://api.alquran.cloud/v1/ayah/${surahNumber}:${ayahNumber}/ar.alafasy`;
      
      // First fetch the audio URL from the API
      const audioResponse = await fetch(audioUrl);
      const audioData = await audioResponse.json();
      
      if (audioData.code !== 200 || !audioData.data?.audio) {
        throw new Error("Audio not found for this ayah");
      }
      
      const actualAudioUrl = audioData.data.audio;

      const newAudio = new Audio(actualAudioUrl);
      audioRef.current = newAudio;
      
      // Update refs for auto-play
      currentStateRef.current = { surah: surahNumber, ayah: ayahNumber, totalAyahs: totalAyahsCount };
      
      // Set up event handlers
      newAudio.onerror = (e) => {
        console.error("Audio error:", e);
        setIsPlaying(false);
        setCurrentAyah(null);
        setCurrentSurah(null);
        currentStateRef.current = { surah: null, ayah: null, totalAyahs: 0 };
      };
      
      newAudio.onended = () => {
        setIsPlaying(false);
        const state = currentStateRef.current;
        // Auto-play next ayah if available
        if (state.ayah && state.ayah < state.totalAyahs && state.surah) {
          // Use setTimeout to avoid recursion issues
          setTimeout(() => {
            playAyah(state.surah!, state.ayah! + 1, state.totalAyahs).catch(console.error);
          }, 100);
        } else {
          setCurrentAyah(null);
          setCurrentSurah(null);
          currentStateRef.current = { surah: null, ayah: null, totalAyahs: 0 };
        }
      };

      // Use timeupdate for additional updates (backup to requestAnimationFrame)
      // Use timeupdate event for smooth, real-time progress updates
      // This fires multiple times per second and is more reliable than RAF for audio
      timeUpdateHandlerRef.current = () => {
        if (newAudio) {
          const current = newAudio.currentTime;
          const total = newAudio.duration;
          
          // Only update if values are valid and changed significantly (avoid micro-updates)
          if (!isNaN(current) && isFinite(current)) {
            setCurrentTime(current);
          }
          if (!isNaN(total) && isFinite(total) && total > 0) {
            setDuration(total);
          }
        }
      };
      
      newAudio.addEventListener('timeupdate', timeUpdateHandlerRef.current);

      newAudio.onloadedmetadata = () => {
        if (newAudio.duration && !isNaN(newAudio.duration)) {
          setDuration(newAudio.duration);
        }
      };

      newAudio.volume = isMuted ? 0 : volume;
      newAudio.preload = "auto";
      
      await newAudio.play();
      
      setAudio(newAudio);
      setIsPlaying(true);
      setCurrentAyah(ayahNumber);
      setCurrentSurah(surahNumber);
      setTotalAyahs(totalAyahsCount);
    } catch (error: any) {
      console.error("Audio playback error:", error);
      setIsPlaying(false);
      setCurrentAyah(null);
      setCurrentSurah(null);
      currentStateRef.current = { surah: null, ayah: null, totalAyahs: 0 };
      throw error;
    }
  }, [isMuted, volume]);

  const pauseAudio = useCallback(() => {
    const currentAudio = audioRef.current;
    if (currentAudio) {
      currentAudio.pause();
      setIsPlaying(false);
    }
  }, []);

  const resumeAudio = useCallback(async () => {
    const currentAudio = audioRef.current;
    if (currentAudio) {
      try {
        await currentAudio.play();
        setIsPlaying(true);
      } catch (error) {
        console.error("Failed to resume audio:", error);
      }
    }
  }, []);

  const stopAudio = useCallback(() => {
    const currentAudio = audioRef.current;
    if (currentAudio) {
      currentAudio.pause();
      currentAudio.currentTime = 0;
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, []);

  const toggleMute = useCallback(() => {
    const currentAudio = audioRef.current;
    if (currentAudio) {
      currentAudio.volume = isMuted ? volume : 0;
    }
    setIsMuted(!isMuted);
  }, [isMuted, volume]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);
    const currentAudio = audioRef.current;
    if (currentAudio) {
      currentAudio.volume = isMuted ? 0 : clampedVolume;
    }
  }, [isMuted]);

  const seekTo = useCallback((time: number) => {
    const currentAudio = audioRef.current;
    if (currentAudio) {
      currentAudio.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const playNextAyah = useCallback(async () => {
    if (currentSurah && currentAyah && currentAyah < totalAyahs) {
      await playAyah(currentSurah, currentAyah + 1, totalAyahs);
    }
  }, [currentSurah, currentAyah, totalAyahs, playAyah]);

  const playPreviousAyah = useCallback(async () => {
    if (currentSurah && currentAyah && currentAyah > 1) {
      await playAyah(currentSurah, currentAyah - 1, totalAyahs);
    }
  }, [currentSurah, currentAyah, totalAyahs, playAyah]);

  // Update audio ref when audio state changes
  useEffect(() => {
    audioRef.current = audio;
  }, [audio]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const currentAudio = audioRef.current;
      if (currentAudio) {
        if (timeUpdateHandlerRef.current) {
          currentAudio.removeEventListener('timeupdate', timeUpdateHandlerRef.current);
        }
        currentAudio.pause();
        currentAudio.currentTime = 0;
        currentAudio.src = '';
        currentAudio.load();
      }
    };
  }, []);

  const value: QuranAudioContextType = {
    audio,
    isPlaying,
    currentSurah,
    currentAyah,
    totalAyahs,
    volume,
    isMuted,
    currentTime,
    duration,
    playAyah,
    pauseAudio,
    resumeAudio,
    stopAudio,
    toggleMute,
    setVolume,
    seekTo,
    playNextAyah,
    playPreviousAyah,
  };

  return (
    <QuranAudioContext.Provider value={value}>
      {children}
    </QuranAudioContext.Provider>
  );
}

export function useQuranAudio() {
  const context = useContext(QuranAudioContext);
  if (context === undefined) {
    throw new Error("useQuranAudio must be used within a QuranAudioProvider");
  }
  return context;
}

