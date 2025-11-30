"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Dumbbell, Calendar, TrendingUp, AlertTriangle, Plus, X, Check } from "lucide-react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay } from "date-fns";
import {
  createWorkout,
  getWorkouts,
  createLesson,
  getLessons,
  updateLessonAttendance,
  getAttendance,
  createProgress,
  getProgress,
  createAlert,
  getAlerts,
  resolveAlert,
} from "@/lib/gym-helpers";
import type { GymWorkout, GymLesson, GymProgress, GymAlert } from "@/firebase/types";

export default function GymPage() {
  const [user, setUser] = React.useState<User | null>(null);
  
  React.useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);
  const { toast } = useToast();
  const [activeTab, setActiveTab] = React.useState<"workouts" | "lessons" | "progress" | "alerts">("workouts");
  const [workouts, setWorkouts] = React.useState<GymWorkout[]>([]);
  const [lessons, setLessons] = React.useState<GymLesson[]>([]);
  const [attendance, setAttendance] = React.useState<any[]>([]);
  const [progress, setProgress] = React.useState<GymProgress[]>([]);
  const [alerts, setAlerts] = React.useState<GymAlert[]>([]);
  const [loading, setLoading] = React.useState(true);

  const loadData = React.useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const [workoutsData, lessonsData, attendanceData, progressData, alertsData] = await Promise.all([
        getWorkouts(user.uid),
        getLessons(user.uid),
        getAttendance(user.uid),
        getProgress(user.uid),
        getAlerts(user.uid),
      ]);
      setWorkouts(workoutsData);
      setLessons(lessonsData);
      setAttendance(attendanceData);
      setProgress(progressData);
      setAlerts(alertsData);
      
      // Check health alerts after loading data
      if (attendanceData.length > 0) {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const recentAttendance = attendanceData.filter((a) => a.date >= sevenDaysAgo);
        
        // Check for missed sessions (no attendance in last 3 days)
        const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
        const recentThreeDays = attendanceData.filter((a) => a.date >= threeDaysAgo);
        
        if (recentThreeDays.length === 0) {
          const existingAlert = alertsData.find(
            (a) => a.type === "missed_session" && !a.resolved && a.date >= threeDaysAgo
          );
          
          if (!existingAlert) {
            await createAlert(user.uid, {
              type: "missed_session",
              message: "You haven&apos;t attended the gym in the last 3 days. Time to get back on track!",
              date: now,
              resolved: false,
            });
          }
        }

        // Check for low attendance (less than 2 times per week)
        if (recentAttendance.length < 2) {
          const existingAlert = alertsData.find(
            (a) => a.type === "low_attendance" && !a.resolved
          );
          
          if (!existingAlert) {
            await createAlert(user.uid, {
              type: "low_attendance",
              message: `You&apos;ve only been to the gym ${recentAttendance.length} time(s) this week. Aim for at least 3 times per week!`,
              date: now,
              resolved: false,
            });
          }
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load gym data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  React.useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user, loadData]);

  const getWeekDates = () => {
    const now = new Date();
    const weekStart = startOfWeek(now, { weekStartsOn: 0 });
    const weekEnd = endOfWeek(now, { weekStartsOn: 0 });
    return eachDayOfInterval({ start: weekStart, end: weekEnd });
  };

  const weekDates = getWeekDates();
  const weekAttendance = weekDates.map((date) => ({
    date,
    attended: attendance.some((a) => isSameDay(a.date, date)),
  }));

  const stats = {
    totalWorkouts: workouts.length,
    totalLessons: lessons.length,
    thisWeekAttendance: weekAttendance.filter((d) => d.attended).length,
    currentStreak: calculateStreak(attendance),
  };

  function calculateStreak(att: any[]): number {
    if (att.length === 0) return 0;
    
    const sorted = [...att].sort((a, b) => b.date.getTime() - a.date.getTime());
    let streak = 0;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let i = 0; i < sorted.length; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      checkDate.setHours(0, 0, 0, 0);
      
      const found = sorted.find((a) => {
        const aDate = new Date(a.date);
        aDate.setHours(0, 0, 0, 0);
        return aDate.getTime() === checkDate.getTime();
      });
      
      if (found) {
        streak++;
      } else if (i === 0) {
        // If today is not attended, check yesterday
        continue;
      } else {
        break;
      }
    }
    
    return streak;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 dark:from-blue-400 dark:to-purple-400 bg-clip-text text-transparent">
          Gym & Fitness
        </h1>
        <p className="text-muted-foreground mt-2">
          Track your workouts, progress, and maintain your fitness goals
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Workouts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalWorkouts}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>This Week</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeekAttendance}/7</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current Streak</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentStreak} days</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Lessons</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLessons}</div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Attendance Calendar */}
      <Card>
        <CardHeader>
          <CardTitle>This Week&apos;s Attendance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-7 gap-2">
            {weekAttendance.map((day, index) => (
              <div
                key={index}
                className={`p-3 rounded-lg border text-center ${
                  day.attended
                    ? "bg-green-500/20 border-green-500"
                    : "bg-muted"
                }`}
              >
                <div className="text-xs text-muted-foreground">
                  {format(day.date, "EEE")}
                </div>
                <div className="text-lg font-bold mt-1">
                  {format(day.date, "d")}
                </div>
                {day.attended && (
                  <Check className="h-4 w-4 mx-auto mt-1 text-green-500" />
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2 border-b">
        <Button
          variant={activeTab === "workouts" ? "default" : "ghost"}
          onClick={() => setActiveTab("workouts")}
        >
          <Dumbbell className="h-4 w-4 mr-2" />
          Workouts
        </Button>
        <Button
          variant={activeTab === "lessons" ? "default" : "ghost"}
          onClick={() => setActiveTab("lessons")}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Lessons
        </Button>
        <Button
          variant={activeTab === "progress" ? "default" : "ghost"}
          onClick={() => setActiveTab("progress")}
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Progress
        </Button>
        <Button
          variant={activeTab === "alerts" ? "default" : "ghost"}
          onClick={() => setActiveTab("alerts")}
        >
          <AlertTriangle className="h-4 w-4 mr-2" />
          Alerts ({alerts.filter((a) => !a.resolved).length})
        </Button>
      </div>

      {/* Workouts Tab */}
      {activeTab === "workouts" && (
        <WorkoutsTab
          workouts={workouts}
          onRefresh={loadData}
          userId={user?.uid || ""}
        />
      )}

      {/* Lessons Tab */}
      {activeTab === "lessons" && (
        <LessonsTab
          lessons={lessons}
          onRefresh={loadData}
          userId={user?.uid || ""}
        />
      )}

      {/* Progress Tab */}
      {activeTab === "progress" && (
        <ProgressTab
          progress={progress}
          onRefresh={loadData}
          userId={user?.uid || ""}
        />
      )}

      {/* Alerts Tab */}
      {activeTab === "alerts" && (
        <AlertsTab
          alerts={alerts}
          onRefresh={loadData}
          userId={user?.uid || ""}
        />
      )}
    </div>
  );
}

// Workouts Tab Component
function WorkoutsTab({
  workouts,
  onRefresh,
  userId,
}: {
  workouts: GymWorkout[];
  onRefresh: () => void;
  userId: string;
}) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleCreateWorkout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createWorkout(userId, {
        date: new Date(formData.get("date") as string),
        workoutType: formData.get("workoutType") as string,
        exercises: JSON.parse(formData.get("exercises") as string || "[]"),
        duration: parseInt(formData.get("duration") as string),
        notes: formData.get("notes") as string || undefined,
      });
      
      toast({
        title: "Success",
        description: "Workout created successfully",
      });
      setIsDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create workout",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Workout
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Workout</DialogTitle>
              <DialogDescription>Record a new gym workout</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateWorkout} className="space-y-4">
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
              </div>
              <div>
                <Label htmlFor="workoutType">Workout Type</Label>
                <Input id="workoutType" name="workoutType" placeholder="e.g., Upper Body, Cardio" required />
              </div>
              <div>
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" name="duration" type="number" min="1" required />
              </div>
              <div>
                <Label htmlFor="exercises">Exercises (JSON format)</Label>
                <Textarea
                  id="exercises"
                  name="exercises"
                  placeholder='[{"name": "Bench Press", "sets": 3, "reps": 10, "weight": 80}]'
                  rows={4}
                />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <Button type="submit">Create Workout</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {workouts.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No workouts recorded yet. Add your first workout!
            </CardContent>
          </Card>
        ) : (
          workouts.map((workout) => (
            <Card key={workout.id}>
              <CardHeader>
                <CardTitle>{workout.workoutType}</CardTitle>
                <CardDescription>
                  {format(workout.date, "EEEE, MMMM d, yyyy")} • {workout.duration} minutes
                </CardDescription>
              </CardHeader>
              <CardContent>
                {workout.exercises.length > 0 && (
                  <div className="space-y-2">
                    {workout.exercises.map((exercise, index) => (
                      <div key={index} className="text-sm">
                        <strong>{exercise.name}</strong>: {exercise.sets} sets × {exercise.reps} reps
                        {exercise.weight && ` @ ${exercise.weight}kg`}
                      </div>
                    ))}
                  </div>
                )}
                {workout.notes && (
                  <p className="mt-4 text-sm text-muted-foreground">{workout.notes}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Lessons Tab Component
function LessonsTab({
  lessons,
  onRefresh,
  userId,
}: {
  lessons: GymLesson[];
  onRefresh: () => void;
  userId: string;
}) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleCreateLesson = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createLesson(userId, {
        title: formData.get("title") as string,
        date: new Date(formData.get("date") as string),
        startTime: formData.get("startTime") as string,
        endTime: formData.get("endTime") as string,
        instructor: formData.get("instructor") as string || undefined,
        type: formData.get("type") as any,
        attended: false,
        notes: formData.get("notes") as string || undefined,
      });
      
      toast({
        title: "Success",
        description: "Lesson created successfully",
      });
      setIsDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create lesson",
        variant: "destructive",
      });
    }
  };

  const handleAttendance = async (lessonId: string, attended: boolean) => {
    try {
      await updateLessonAttendance(userId, lessonId, attended);
      toast({
        title: "Success",
        description: attended ? "Marked as attended" : "Marked as not attended",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update attendance",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Lesson
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Lesson</DialogTitle>
              <DialogDescription>Schedule a gym lesson</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateLesson} className="space-y-4">
              <div>
                <Label htmlFor="title">Title</Label>
                <Input id="title" name="title" required />
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startTime">Start Time</Label>
                  <Input id="startTime" name="startTime" type="time" required />
                </div>
                <div>
                  <Label htmlFor="endTime">End Time</Label>
                  <Input id="endTime" name="endTime" type="time" required />
                </div>
              </div>
              <div>
                <Label htmlFor="type">Type</Label>
                <Select name="type" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="yoga">Yoga</SelectItem>
                    <SelectItem value="pilates">Pilates</SelectItem>
                    <SelectItem value="boxing">Boxing</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="instructor">Instructor (optional)</Label>
                <Input id="instructor" name="instructor" />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <Button type="submit">Create Lesson</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {lessons.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No lessons scheduled yet.
            </CardContent>
          </Card>
        ) : (
          lessons.map((lesson) => (
            <Card key={lesson.id}>
              <CardHeader>
                <CardTitle>{lesson.title}</CardTitle>
                <CardDescription>
                  {format(lesson.date, "EEEE, MMMM d, yyyy")} • {lesson.startTime} - {lesson.endTime}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm">
                      <strong>Type:</strong> {lesson.type}
                      {lesson.instructor && (
                        <>
                          <br />
                          <strong>Instructor:</strong> {lesson.instructor}
                        </>
                      )}
                    </p>
                    {lesson.notes && (
                      <p className="mt-2 text-sm text-muted-foreground">{lesson.notes}</p>
                    )}
                  </div>
                  <Button
                    variant={lesson.attended ? "default" : "outline"}
                    onClick={() => handleAttendance(lesson.id, !lesson.attended)}
                  >
                    {lesson.attended ? <Check className="h-4 w-4 mr-2" /> : null}
                    {lesson.attended ? "Attended" : "Mark Attended"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Progress Tab Component
function ProgressTab({
  progress,
  onRefresh,
  userId,
}: {
  progress: GymProgress[];
  onRefresh: () => void;
  userId: string;
}) {
  const { toast } = useToast();
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const handleCreateProgress = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    try {
      await createProgress(userId, {
        metric: formData.get("metric") as any,
        value: parseFloat(formData.get("value") as string),
        unit: formData.get("unit") as string,
        date: new Date(formData.get("date") as string),
        notes: formData.get("notes") as string || undefined,
      });
      
      toast({
        title: "Success",
        description: "Progress recorded successfully",
      });
      setIsDialogOpen(false);
      onRefresh();
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to record progress",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Record Progress
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Progress</DialogTitle>
              <DialogDescription>Track your fitness metrics</DialogDescription>
            </DialogHeader>
            <form onSubmit={handleCreateProgress} className="space-y-4">
              <div>
                <Label htmlFor="metric">Metric</Label>
                <Select name="metric" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select metric" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weight">Weight</SelectItem>
                    <SelectItem value="muscle_mass">Muscle Mass</SelectItem>
                    <SelectItem value="body_fat">Body Fat</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="endurance">Endurance</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="value">Value</Label>
                  <Input id="value" name="value" type="number" step="0.1" required />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Input id="unit" name="unit" placeholder="kg, %, etc." required />
                </div>
              </div>
              <div>
                <Label htmlFor="date">Date</Label>
                <Input id="date" name="date" type="date" defaultValue={format(new Date(), "yyyy-MM-dd")} required />
              </div>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" name="notes" rows={3} />
              </div>
              <Button type="submit">Record Progress</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {progress.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No progress recorded yet.
            </CardContent>
          </Card>
        ) : (
          progress.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <CardTitle className="capitalize">{p.metric.replace("_", " ")}</CardTitle>
                <CardDescription>{format(p.date, "EEEE, MMMM d, yyyy")}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {p.value} {p.unit}
                </div>
                {p.notes && (
                  <p className="mt-2 text-sm text-muted-foreground">{p.notes}</p>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}

// Alerts Tab Component
function AlertsTab({
  alerts,
  onRefresh,
  userId,
}: {
  alerts: GymAlert[];
  onRefresh: () => void;
  userId: string;
}) {
  const { toast } = useToast();

  const handleResolve = async (alertId: string) => {
    try {
      await resolveAlert(userId, alertId);
      toast({
        title: "Success",
        description: "Alert resolved",
      });
      onRefresh();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resolve alert",
        variant: "destructive",
      });
    }
  };

  const unresolvedAlerts = alerts.filter((a) => !a.resolved);

  return (
    <div className="space-y-4">
      {unresolvedAlerts.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No active alerts. Keep up the great work! 💪
          </CardContent>
        </Card>
      ) : (
        unresolvedAlerts.map((alert) => (
          <Card key={alert.id} className={alert.type === "missed_session" ? "border-orange-500" : "border-yellow-500"}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                {alert.type === "missed_session" && "Missed Session"}
                {alert.type === "low_attendance" && "Low Attendance"}
                {alert.type === "health_reminder" && "Health Reminder"}
              </CardTitle>
              <CardDescription>{format(alert.date, "EEEE, MMMM d, yyyy")}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{alert.message}</p>
              <Button onClick={() => handleResolve(alert.id)} variant="outline">
                Mark as Resolved
              </Button>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}


