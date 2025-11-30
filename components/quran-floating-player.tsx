"use client";

import { useQuranAudio } from "@/components/quran-audio-provider";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack, SkipForward, Volume2, VolumeX, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";

export function QuranFloatingPlayer() {
  const {
    isPlaying,
    currentSurah,
    currentAyah,
    totalAyahs,
    volume,
    isMuted,
    pauseAudio,
    resumeAudio,
    toggleMute,
    setVolume,
    playNextAyah,
    playPreviousAyah,
  } = useQuranAudio();

  const [isMinimized, setIsMinimized] = useState(false);

  // Don't render if no audio is loaded
  if (!currentAyah || !currentSurah) {
    return null;
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="rounded-full shadow-lg h-10 px-4"
          size="sm"
        >
          <Play className="h-4 w-4 mr-2" />
          Quran
        </Button>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-gradient-to-br from-slate-900/95 via-slate-800/95 to-slate-900/95 dark:from-slate-950/95 dark:via-slate-900/95 dark:to-slate-950/95 border border-slate-700/50 rounded-xl shadow-2xl backdrop-blur-xl px-4 py-2.5">
        <div className="flex items-center gap-2">
          {/* Previous Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={playPreviousAyah}
            disabled={!currentSurah || !currentAyah || currentAyah <= 1}
            title="Previous Ayah"
            className="h-8 w-8 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-white disabled:opacity-30"
          >
            <SkipBack className="h-4 w-4" />
          </Button>

          {/* Play/Pause Button */}
          <Button
            size="icon"
            onClick={isPlaying ? pauseAudio : resumeAudio}
            title={isPlaying ? "Pause" : "Play"}
            className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 hover:from-blue-400 hover:to-cyan-400 text-white shadow-lg shadow-blue-500/50"
          >
            {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 ml-0.5" />}
          </Button>

          {/* Next Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={playNextAyah}
            disabled={!currentSurah || !currentAyah || !totalAyahs || currentAyah >= totalAyahs}
            title="Next Ayah"
            className="h-8 w-8 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-white disabled:opacity-30"
          >
            <SkipForward className="h-4 w-4" />
          </Button>

          {/* Divider */}
          <div className="w-px h-6 bg-slate-700/50 mx-1" />

          {/* Volume Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleMute}
              title={isMuted ? "Unmute" : "Mute"}
              className="h-8 w-8 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-white"
            >
              {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            <div className="flex flex-col gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVolume(Math.min(1, volume + 0.1))}
                disabled={volume >= 1}
                title="Volume Up"
                className="h-4 w-4 p-0 rounded bg-slate-700/50 hover:bg-slate-600/50 text-white disabled:opacity-30"
              >
                <ChevronUp className="h-3 w-3" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setVolume(Math.max(0, volume - 0.1))}
                disabled={volume <= 0}
                title="Volume Down"
                className="h-4 w-4 p-0 rounded bg-slate-700/50 hover:bg-slate-600/50 text-white disabled:opacity-30"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>
          </div>

          {/* Minimize Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMinimized(true)}
            title="Minimize"
            className="h-8 w-8 rounded-full bg-slate-700/50 hover:bg-slate-600/50 text-slate-400 hover:text-white ml-1"
          >
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

