"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getTasks, getExams, getCourses } from "@/lib/firestore-helpers";
import type { Task, Exam, Course } from "@/firebase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DayPicker } from "react-day-picker";
import "react-day-picker/dist/style.css";
import { format, isSameDay, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { Calendar as CalendarIcon, CheckSquare, BookOpen, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { motion } from "framer-motion";

export default function SchedulePage() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const loadData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const [tasksData, examsData, coursesData] = await Promise.all([
        getTasks(userId),
        getExams(userId),
        getCourses(userId),
      ]);
      setTasks(tasksData);
      setExams(examsData);
      setCourses(coursesData);
    } catch (error) {
      console.error("Failed to load schedule data:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadData(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [loadData]);

  // Get events for a specific date
  const getEventsForDate = (date: Date) => {
    const dayTasks = tasks.filter(
      (task) => task.dueDate && isSameDay(new Date(task.dueDate), date) && !task.completed
    );
    const dayExams = exams.filter((exam) => isSameDay(new Date(exam.date), date));
    return { tasks: dayTasks, exams: dayExams };
  };

  // Get all dates with events for the current month view
  const getDatesWithEvents = () => {
    const start = startOfMonth(selectedDate);
    const end = endOfMonth(selectedDate);
    const days = eachDayOfInterval({ start, end });
    const datesWithEvents: Date[] = [];

    days.forEach((day) => {
      const events = getEventsForDate(day);
      if (events.tasks.length > 0 || events.exams.length > 0) {
        datesWithEvents.push(day);
      }
    });

    return datesWithEvents;
  };

  const selectedDateEvents = getEventsForDate(selectedDate);
  const datesWithEvents = getDatesWithEvents();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <PageHeader
        title="Schedule"
        description="Manage your class and work schedule"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Calendar */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CalendarIcon className="h-5 w-5" />
              Calendar
            </CardTitle>
            <CardDescription>Select a date to view events</CardDescription>
          </CardHeader>
          <CardContent>
            <DayPicker
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{
                hasEvents: datesWithEvents,
              }}
              modifiersClassNames={{
                hasEvents: "bg-primary/10 text-primary font-semibold",
              }}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        {/* Selected Date Events */}
        <Card>
          <CardHeader>
            <CardTitle>
              {format(selectedDate, "EEEE, MMMM d, yyyy")}
            </CardTitle>
            <CardDescription>
              {selectedDateEvents.tasks.length + selectedDateEvents.exams.length} event(s) scheduled
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {selectedDateEvents.tasks.length === 0 && selectedDateEvents.exams.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No events scheduled for this date
              </p>
            ) : (
              <>
                {/* Tasks */}
                {selectedDateEvents.tasks.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <CheckSquare className="h-4 w-4" />
                      Tasks ({selectedDateEvents.tasks.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedDateEvents.tasks.map((task) => (
                        <div
                          key={task.id}
                          className="p-3 border rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{task.title}</p>
                              {task.description && (
                                <p className="text-sm text-muted-foreground mt-1">
                                  {task.description}
                                </p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <span
                                  className={cn(
                                    "text-xs px-2 py-0.5 rounded",
                                    task.priority === "high"
                                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                      : task.priority === "medium"
                                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                  )}
                                >
                                  {task.priority} priority
                                </span>
                                {task.courseId && (
                                  <span className="text-xs text-muted-foreground">
                                    {courses.find((c) => c.id === task.courseId)?.name || "Course"}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Exams */}
                {selectedDateEvents.exams.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      Exams ({selectedDateEvents.exams.length})
                    </h3>
                    <div className="space-y-2">
                      {selectedDateEvents.exams.map((exam) => {
                        const course = courses.find((c) => c.id === exam.courseId);
                        return (
                          <div
                            key={exam.id}
                            className="p-3 border rounded-lg bg-blue-50 dark:bg-blue-950/20 hover:bg-blue-100 dark:hover:bg-blue-950/30 transition-colors"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="font-medium">{exam.name}</p>
                                {course && (
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {course.name}
                                  </p>
                                )}
                                <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                  {exam.location && (
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {exam.location}
                                    </span>
                                  )}
                                  <span>{format(new Date(exam.date), "h:mm a")}</span>
                                </div>
                                {exam.notes && (
                                  <p className="text-sm text-muted-foreground mt-2">
                                    {exam.notes}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Upcoming Events Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Events</CardTitle>
          <CardDescription>Your schedule for the next 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {tasks.length === 0 && exams.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No upcoming events. Add tasks or exams to see them here!
            </p>
          ) : (
            <div className="space-y-3">
              {[...tasks.filter((t) => t.dueDate && !t.completed), ...exams]
                .sort((a, b) => {
                  const dateA = "dueDate" in a ? (a as Task).dueDate! : (a as Exam).date;
                  const dateB = "dueDate" in b ? (b as Task).dueDate! : (b as Exam).date;
                  return new Date(dateA).getTime() - new Date(dateB).getTime();
                })
                .slice(0, 7)
                .map((item) => {
                  const isTask = "dueDate" in item;
                  const date = isTask ? (item as Task).dueDate! : (item as Exam).date;
                  const course = !isTask
                    ? courses.find((c) => c.id === (item as Exam).courseId)
                    : null;

                  return (
                    <div
                      key={item.id}
                      className="flex items-center gap-4 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex-shrink-0 w-16 text-center">
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(date), "MMM d")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(date), "EEE")}
                        </p>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          {isTask ? (
                            <CheckSquare className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <BookOpen className="h-4 w-4 text-blue-500" />
                          )}
                          <p className="font-medium">
                            {isTask ? (item as Task).title : (item as Exam).name}
                          </p>
                        </div>
                        {!isTask && course && (
                          <p className="text-sm text-muted-foreground mt-1">{course.name}</p>
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {format(new Date(date), "h:mm a")}
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
