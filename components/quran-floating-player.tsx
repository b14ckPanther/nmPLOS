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
    <div className="fixed bottom-4 right-4 z-50 w-96 max-w-[calc(100vw-2rem)]">
      <div className="bg-card border rounded-lg shadow-xl p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold truncate">
              {currentSurah ? `Surah ${currentSurah}` : "Quran Player"}
            </div>
            <div className="text-xs text-muted-foreground">
              Ayah {currentAyah} {totalAyahs > 0 && `of ${totalAyahs}`}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(true)}
            className="h-6 w-6"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime || 0}
            onChange={(e) => seekTo(Number(e.target.value))}
            className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
            style={{
              background: `linear-gradient(to right, rgb(37, 99, 235) 0%, rgb(37, 99, 235) ${((currentTime || 0) / (duration || 1)) * 100}%, rgb(229, 231, 235) ${((currentTime || 0) / (duration || 1)) * 100}%, rgb(229, 231, 235) 100%)`
            }}
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={playPreviousAyah}
            disabled={!currentSurah || !currentAyah || currentAyah <= 1}
            title="Previous Ayah"
            className="h-8 w-8"
          >
            <SkipBack className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="default"
            size="icon"
            onClick={isPlaying ? pauseAudio : resumeAudio}
            title={isPlaying ? "Pause" : "Play"}
            className="h-8 w-8"
          >
            {isPlaying ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={playNextAyah}
            disabled={!currentSurah || !currentAyah || !totalAyahs || currentAyah >= totalAyahs}
            title="Next Ayah"
            className="h-8 w-8"
          >
            <SkipForward className="h-3.5 w-3.5" />
          </Button>
          <div className="flex-1" />
          <Button
            variant="outline"
            size="icon"
            onClick={toggleMute}
            title={isMuted ? "Unmute" : "Mute"}
            className="h-8 w-8"
          >
            {isMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Volume2 className="h-3.5 w-3.5" />}
          </Button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="w-16 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
            title="Volume"
          />
        </div>
      </div>
    </div>
  );
}

