"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Moon, Clock, BookOpen, Loader2, Play, Pause, Volume2, VolumeX } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { format } from "date-fns";

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
  const [selectedSurah, setSelectedSurah] = React.useState<number | null>(null);
  const [playingAyah, setPlayingAyah] = React.useState<number | null>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  const [audio, setAudio] = React.useState<HTMLAudioElement | null>(null);
  const [volume, setVolume] = React.useState(1);
  const [isMuted, setIsMuted] = React.useState(false);

  const loadPrayerTimes = React.useCallback(async () => {
    try {
      setLoadingTimes(true);
      // In production, get user's location from settings or browser geolocation
      const response = await fetch("/api/prayer/times");
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

  // Load prayer times
  React.useEffect(() => {
    loadPrayerTimes();
    loadSurahs();
  }, [loadPrayerTimes, loadSurahs]);

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

  const playAyah = async (surahNumber: number, ayahNumber: number) => {
    try {
      // Stop current audio if playing
      if (audio) {
        audio.pause();
        audio.currentTime = 0;
      }

      // Play from Quran.com API
      const audioUrl = `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${surahNumber}/${ayahNumber}.mp3`;
      const newAudio = new Audio(audioUrl);
      
      newAudio.volume = isMuted ? 0 : volume;
      
      newAudio.onended = () => {
        setIsPlaying(false);
        setPlayingAyah(null);
      };

      newAudio.onplay = () => {
        setIsPlaying(true);
        setPlayingAyah(ayahNumber);
      };

      await newAudio.play();
      setAudio(newAudio);
      setSelectedSurah(surahNumber);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to play audio",
        variant: "destructive",
      });
    }
  };

  const stopAudio = () => {
    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      setIsPlaying(false);
      setPlayingAyah(null);
    }
  };

  const toggleMute = () => {
    if (audio) {
      audio.volume = isMuted ? volume : 0;
    }
    setIsMuted(!isMuted);
  };

  const formatTime = (time: string) => {
    return time.split(" ")[0]; // Remove timezone info if present
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {[
                { name: "Fajr", time: prayerTimes.fajr, icon: "🌙" },
                { name: "Dhuhr", time: prayerTimes.dhuhr, icon: "☀️" },
                { name: "Asr", time: prayerTimes.asr, icon: "🌤️" },
                { name: "Maghrib", time: prayerTimes.maghrib, icon: "🌅" },
                { name: "Isha", time: prayerTimes.isha, icon: "🌃" },
              ].map((prayer) => (
                <div
                  key={prayer.name}
                  className="p-4 rounded-lg border bg-card text-card-foreground text-center"
                >
                  <div className="text-2xl mb-2">{prayer.icon}</div>
                  <div className="font-semibold">{prayer.name}</div>
                  <div className="text-2xl font-bold mt-2">{formatTime(prayer.time)}</div>
                </div>
              ))}
            </div>
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
                <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">
                  {dua.dua}
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
            {isPlaying && (
              <div className="flex items-center gap-4 p-4 bg-card border rounded-lg">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={stopAudio}
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={toggleMute}
                >
                  {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </Button>
                <div className="flex-1">
                  <div className="text-sm font-medium">
                    {selectedSurah && surahs.find((s) => s.number === selectedSurah)?.englishName}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Ayah {playingAyah}
                  </div>
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
                  onClick={() => playAyah(surah.number, 1)}
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

