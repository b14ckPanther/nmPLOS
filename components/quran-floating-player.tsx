"use client";

import { useQuranAudio } from "@/components/quran-audio-provider";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, X } from "lucide-react";
import { useState } from "react";

export function QuranFloatingPlayer() {
  const {
    isPlaying,
    currentSurah,
    currentAyah,
    totalAyahs,
    volume,
    isMuted,
    currentTime,
    duration,
    pauseAudio,
    resumeAudio,
    stopAudio,
    toggleMute,
    setVolume,
    seekTo,
    playNextAyah,
    playPreviousAyah,
  } = useQuranAudio();

  const [isMinimized, setIsMinimized] = useState(false);

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Don't render if no audio is loaded
  if (!currentAyah || !currentSurah) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full shadow-lg"
          size="lg"
        >
          <Play className="h-4 w-4 mr-2" />
          Quran Player
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-[420px] max-w-[calc(100vw-2rem)]">
      <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 border border-slate-700/50 rounded-2xl shadow-2xl backdrop-blur-xl p-5 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-base font-bold text-white truncate">
              {currentSurah ? `Surah ${currentSurah}` : "Quran Player"}
            </div>
            <div className="text-xs text-slate-400 mt-0.5">
              Ayah {currentAyah} {totalAyahs > 0 && `of ${totalAyahs}`}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(true)}
            className="h-7 w-7 text-slate-400 hover:text-white hover:bg-slate-700/50"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Progress Bar - Modern Design */}
        <div className="space-y-2">
          <div className="relative w-full h-1.5 bg-slate-700/50 rounded-full overflow-hidden">
            <div
              className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-500 via-blue-400 to-cyan-400 rounded-full transition-all ease-linear"
              style={{
                width: duration > 0 ? `${((currentTime || 0) / duration) * 100}%` : '0%',
                transition: 'width 0.1s linear'
              }}
            />
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime || 0}
              onChange={(e) => seekTo(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
          </div>
          <div className="flex justify-between text-xs text-slate-400">
            <span className="font-mono">{formatTime(currentTime)}</span>
            <span className="font-mono">{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls - Modern Design */}
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={playPreviousAyah}
            disabled={!currentSurah || !currentAyah || currentAyah <= 1}
            title="Previous Ayah"
            className="h-10 w-10 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SkipBack className="h-5 w-5" />
          </Button>
          <Button
            size="icon"
            onClick={isPlaying ? pauseAudio : resumeAudio}
            title={isPlaying ? "Pause" : "Play"}
            className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/50"
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 ml-0.5" />}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={playNextAyah}
            disabled={!currentSurah || !currentAyah || !totalAyahs || currentAyah >= totalAyahs}
            title="Next Ayah"
            className="h-10 w-10 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-white disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <SkipForward className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              className="h-9 w-9 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <div className="flex items-center gap-2 w-24">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                title="Volume"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

