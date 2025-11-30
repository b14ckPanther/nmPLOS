"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Moon, Clock, BookOpen, Loader2, Play, Pause, Volume2, VolumeX, SkipBack, SkipForward, Check } from "lucide-react";
import { useQuranAudio } from "@/components/quran-audio-provider";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { format } from "date-fns";
import { getPrayerRecord, updatePrayerStatus, type PrayerRecord } from "@/lib/firestore-helpers";

interface PrayerTimes {
  fajr: string;
  dhuhr: string;
  asr: string;
  maghrib: string;
  isha: string;
  date: string;
}

interface Dua {
  dua: string;
  category: string;
  date: string;
}

interface QuranSurah {
  number: number;
  name: string;
  englishName: string;
  numberOfAyahs: number;
}

export default function PrayerPage() {
  const [user, setUser] = React.useState<User | null>(null);
  
  React.useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  const { toast } = useToast();
  const [prayerTimes, setPrayerTimes] = React.useState<PrayerTimes | null>(null);
  const [loadingTimes, setLoadingTimes] = React.useState(true);
  const [dua, setDua] = React.useState<Dua | null>(null);
  const [loadingDua, setLoadingDua] = React.useState(false);
  const [surahs, setSurahs] = React.useState<QuranSurah[]>([]);
  const [prayerRecord, setPrayerRecord] = React.useState<PrayerRecord | null>(null);
  const [updatingPrayer, setUpdatingPrayer] = React.useState<string | null>(null);
  
  // Use global audio context
  const {
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
  } = useQuranAudio();

  const loadPrayerTimes = React.useCallback(async () => {
    try {
      setLoadingTimes(true);
      // Haifa, Israel coordinates: 32.7940, 34.9896
      const response = await fetch("/api/prayer/times?lat=32.7940&lng=34.9896");
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setPrayerTimes(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load prayer times",
        variant: "destructive",
      });
    } finally {
      setLoadingTimes(false);
    }
  }, [toast]);

  // Auto-refresh prayer times every hour
  React.useEffect(() => {
    if (!prayerTimes) return;
    
    const refreshInterval = setInterval(() => {
      fetch("/api/prayer/times?lat=32.7940&lng=34.9896")
        .then(res => res.json())
        .then(data => {
          if (!data.error) setPrayerTimes(data);
        })
        .catch(err => console.error("Failed to refresh prayer times:", err));
    }, 60 * 60 * 1000); // Every hour

    return () => clearInterval(refreshInterval);
  }, [prayerTimes]);

  const loadSurahs = React.useCallback(async () => {
    try {
      // Load list of Quran surahs from free API
      const response = await fetch("https://api.alquran.cloud/v1/surah");
      const data = await response.json();
      if (data.code === 200 && data.data) {
        setSurahs(data.data);
      }
    } catch (error) {
      console.error("Failed to load surahs:", error);
    }
  }, []);

  // Load prayer record for today
  const loadPrayerRecord = React.useCallback(async () => {
    if (!user) return;
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const record = await getPrayerRecord(user.uid, today);
      setPrayerRecord(record);
    } catch (error) {
      console.error("Failed to load prayer record:", error);
    }
  }, [user]);

  // Load prayer times and surahs
  React.useEffect(() => {
    loadPrayerTimes();
    loadSurahs();
  }, [loadPrayerTimes, loadSurahs]);

  // Load prayer record when user is available
  React.useEffect(() => {
    if (user) {
      loadPrayerRecord();
    }
  }, [user, loadPrayerRecord]);

  const generateDua = async (category?: string) => {
    try {
      setLoadingDua(true);
      const response = await fetch("/api/prayer/dua", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category }),
      });
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      setDua(data);
      toast({
        title: "Dua Generated",
        description: "Your daily Dua has been generated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to generate Dua",
        variant: "destructive",
      });
    } finally {
      setLoadingDua(false);
    }
  };

  const handlePlayAyah = async (surahNumber: number, ayahNumber: number) => {
    try {
      const surah = surahs.find((s) => s.number === surahNumber);
      if (!surah) {
        throw new Error("Surah not found");
      }
      await playAyah(surahNumber, ayahNumber, surah.numberOfAyahs);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to play audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const formatPrayerTime = (time: string) => {
    return time.split(" ")[0]; // Remove timezone info if present
  };

  const togglePrayerStatus = async (prayerName: "fajr" | "dhuhr" | "asr" | "maghrib" | "isha") => {
    if (!user) {
      toast({
        title: "Error",
        description: "Please log in to track prayers",
        variant: "destructive",
      });
      return;
    }

    setUpdatingPrayer(prayerName);
    try {
      const today = format(new Date(), "yyyy-MM-dd");
      const currentStatus = prayerRecord?.[prayerName] || false;
      const newStatus = !currentStatus;

      await updatePrayerStatus(user.uid, today, prayerName, newStatus);
      
      // Update local state
      setPrayerRecord((prev) => {
        if (!prev) {
          return {
            date: today,
            fajr: prayerName === "fajr" ? newStatus : false,
            dhuhr: prayerName === "dhuhr" ? newStatus : false,
            asr: prayerName === "asr" ? newStatus : false,
            maghrib: prayerName === "maghrib" ? newStatus : false,
            isha: prayerName === "isha" ? newStatus : false,
            updatedAt: new Date(),
          };
        }
        return {
          ...prev,
          [prayerName]: newStatus,
          updatedAt: new Date(),
        };
      });

      toast({
        title: newStatus ? "Prayer Marked" : "Prayer Unmarked",
        description: `${prayerName.charAt(0).toUpperCase() + prayerName.slice(1)} ${newStatus ? "marked as completed" : "unmarked"}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update prayer status",
        variant: "destructive",
      });
    } finally {
      setUpdatingPrayer(null);
    }
  };

  const getCompletedPrayersCount = () => {
    if (!prayerRecord) return 0;
    return [prayerRecord.fajr, prayerRecord.dhuhr, prayerRecord.asr, prayerRecord.maghrib, prayerRecord.isha].filter(Boolean).length;
  };

  const getNextPrayer = () => {
    if (!prayerTimes) return null;
    
    const now = new Date();
    const prayers = [
      { name: "Fajr", time: prayerTimes.fajr },
      { name: "Dhuhr", time: prayerTimes.dhuhr },
      { name: "Asr", time: prayerTimes.asr },
      { name: "Maghrib", time: prayerTimes.maghrib },
      { name: "Isha", time: prayerTimes.isha },
    ];

    for (const prayer of prayers) {
      const [hours, minutes] = prayer.time.split(":").map(Number);
      const prayerTime = new Date(now);
      prayerTime.setHours(hours, minutes, 0, 0);
      
      if (prayerTime > now) {
        return { ...prayer, time: prayerTime };
      }
    }

    // If all prayers passed, return tomorrow's Fajr
    const tomorrowFajr = new Date(now);
    tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
    const [hours, minutes] = prayerTimes.fajr.split(":").map(Number);
    tomorrowFajr.setHours(hours, minutes, 0, 0);
    return { name: "Fajr", time: tomorrowFajr };
  };

  const nextPrayer = getNextPrayer();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          Prayer Center
        </h1>
        <p className="text-muted-foreground mt-2">
          Track your prayers, receive daily Dua, and listen to the Holy Quran
        </p>
      </div>

      {/* Prayer Times */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Prayer Times
          </CardTitle>
          <CardDescription>
            {prayerTimes?.date || format(new Date(), "EEEE, MMMM d, yyyy")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTimes ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : prayerTimes ? (
            <>
              {/* Prayer Progress Summary */}
              {prayerRecord && (
                <div className="mb-4 p-3 bg-gradient-to-r from-green-500/10 to-emerald-500/10 rounded-lg border border-green-500/20">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Today&apos;s Progress</span>
                    <span className="text-sm font-bold">
                      {getCompletedPrayersCount()} / 5 prayers completed
                    </span>
                  </div>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-green-500 to-emerald-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(getCompletedPrayersCount() / 5) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {[
                  { name: "Fajr", time: prayerTimes.fajr, icon: "🌙", key: "fajr" as const },
                  { name: "Dhuhr", time: prayerTimes.dhuhr, icon: "☀️", key: "dhuhr" as const },
                  { name: "Asr", time: prayerTimes.asr, icon: "🌤️", key: "asr" as const },
                  { name: "Maghrib", time: prayerTimes.maghrib, icon: "🌅", key: "maghrib" as const },
                  { name: "Isha", time: prayerTimes.isha, icon: "🌃", key: "isha" as const },
                ].map((prayer) => {
                  const isCompleted = prayerRecord?.[prayer.key] || false;
                  const isUpdating = updatingPrayer === prayer.key;
                  
                  return (
                    <button
                      key={prayer.name}
                      onClick={() => togglePrayerStatus(prayer.key)}
                      disabled={isUpdating || !user}
                      className={`p-4 rounded-lg border text-center transition-all duration-200 relative ${
                        isCompleted
                          ? "bg-gradient-to-br from-green-500/20 to-emerald-500/20 border-green-500/50 dark:from-green-500/10 dark:to-emerald-500/10 dark:border-green-500/30"
                          : "bg-card text-card-foreground hover:bg-accent hover:border-accent-foreground/20"
                      } ${isUpdating ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
                    >
                      {isUpdating && (
                        <div className="absolute top-2 right-2">
                          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                      {isCompleted && (
                        <div className="absolute top-2 right-2">
                          <Check className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                      )}
                      <div className="text-2xl mb-2">{prayer.icon}</div>
                      <div className="font-semibold">{prayer.name}</div>
                      <div className="text-2xl font-bold mt-2">{formatPrayerTime(prayer.time)}</div>
                      {isCompleted && (
                        <div className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">
                          Completed
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Failed to load prayer times
            </div>
          )}
          
          {nextPrayer && (
            <div className="mt-6 p-4 bg-gradient-to-r from-blue-500/10 to-purple-500/10 rounded-lg border">
              <div className="text-sm text-muted-foreground">Next Prayer</div>
              <div className="text-xl font-bold mt-1">
                {nextPrayer.name} - {format(nextPrayer.time, "h:mm a")}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily DUA */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Moon className="h-5 w-5" />
            Daily Dua
          </CardTitle>
          <CardDescription>Receive a personalized Dua generated with AI</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Button onClick={() => generateDua()} disabled={loadingDua}>
              {loadingDua ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                "Generate Today's Dua"
              )}
            </Button>

            {dua && (
              <div className="p-6 rounded-lg border bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20">
                <div 
                  className="prose dark:prose-invert max-w-none whitespace-pre-wrap"
                  dir="rtl"
                  style={{ textAlign: "right", fontFamily: "'Amiri', 'Arabic Typesetting', 'Traditional Arabic', serif" }}
                >
                  <div className="text-2xl mb-4" style={{ direction: "rtl", textAlign: "right" }}>
                    {dua.dua.split(/English:|Translation:/i)[0].trim()}
                  </div>
                  <div 
                    className="text-base mt-4 pt-4 border-t"
                    dir="ltr"
                    style={{ textAlign: "left", direction: "ltr" }}
                  >
                    {dua.dua.split(/English:|Translation:/i)[1]?.trim() || ""}
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quran Player */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Quran Player
          </CardTitle>
          <CardDescription>Listen to the Holy Quran</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Audio Controls */}
            {(isPlaying || currentAyah) && (
              <div className="space-y-4 p-4 bg-card border rounded-lg">
                {/* Now Playing Info */}
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {currentSurah && surahs.find((s) => s.number === currentSurah)?.englishName}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Ayah {currentAyah} {totalAyahs > 0 && `of ${totalAyahs}`}
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="absolute left-0 top-0 h-full bg-gradient-to-r from-blue-600 to-blue-500 transition-all duration-75 ease-linear"
                      style={{
                        width: duration > 0 ? `${((currentTime || 0) / duration) * 100}%` : '0%'
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
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={playPreviousAyah}
                    disabled={!currentSurah || !currentAyah || currentAyah <= 1}
                    title="Previous Ayah"
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={isPlaying ? pauseAudio : resumeAudio}
                    title={isPlaying ? "Pause" : "Play"}
                  >
                    {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={playNextAyah}
                    disabled={!currentSurah || !currentAyah || !totalAyahs || currentAyah >= totalAyahs}
                    title="Next Ayah"
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={stopAudio}
                    title="Stop"
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                  <div className="flex-1" />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={toggleMute}
                    title={isMuted ? "Unmute" : "Mute"}
                  >
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={volume}
                    onChange={(e) => setVolume(Number(e.target.value))}
                    className="w-20 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-blue-600"
                    title="Volume"
                  />
                </div>
              </div>
            )}

            {/* Surah List */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-2 max-h-[400px] overflow-y-auto">
              {surahs.slice(0, 20).map((surah) => (
                <Button
                  key={surah.number}
                  variant="outline"
                  className="justify-start h-auto py-3"
                  onClick={() => handlePlayAyah(surah.number, 1)}
                >
                  <div className="text-left">
                    <div className="font-semibold">{surah.englishName}</div>
                    <div className="text-xs text-muted-foreground">
                      {surah.numberOfAyahs} Ayahs
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

