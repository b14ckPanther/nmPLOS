"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getCourses, updateCourse, deleteCourse, getTasks, getUserProfile } from "@/lib/firestore-helpers";
import type { Course, Task, UserProfile } from "@/firebase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, Trash2, BookOpen, TrendingUp, Award, Target } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadCourses = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const [coursesData, tasksData, profile] = await Promise.all([
        getCourses(userId),
        getTasks(userId),
        getUserProfile(userId),
      ]);
      setCourses(coursesData);
      setTasks(tasksData);
      setUserProfile(profile);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load courses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadCourses(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [loadCourses]);

  const handleDelete = async (courseId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this course?")) return;

    try {
      await deleteCourse(user.uid, courseId);
      toast({ title: "Course deleted", description: "The course has been deleted." });
      loadCourses(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete course",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (course: Course) => {
    router.push(`/courses/add?id=${course.id}`);
  };

  // Group courses by semester
  const coursesBySemester = useMemo(() => {
    const grouped: { [key: string]: Course[] } = {};
    courses.forEach((course) => {
      const key = `${course.year}-${course.semester}`;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(course);
    });
    // Sort semesters by year and semester
    return Object.entries(grouped).sort(([a], [b]) => {
      const [yearA, semA] = a.split("-");
      const [yearB, semB] = b.split("-");
      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
      return semB.localeCompare(semA);
    });
  }, [courses]);

  // Calculate points statistics
  const pointsStats = useMemo(() => {
    const completedCourses = courses.filter((c) => c.completed);
    const totalPointsEarned = completedCourses.reduce((sum, c) => sum + (c.points ?? 0), 0);
    const totalPoints = courses.reduce((sum, c) => sum + (c.points ?? 0), 0);
    const degreeTotalPoints = userProfile?.degreeTotalPoints ?? 0;
    const remainingPoints = degreeTotalPoints > 0 ? Math.max(0, degreeTotalPoints - totalPointsEarned) : 0;
    const progressPercentage =
      degreeTotalPoints > 0 ? Math.min(100, (totalPointsEarned / degreeTotalPoints) * 100) : 0;

    return {
      totalPointsEarned,
      totalPoints,
      degreeTotalPoints,
      remainingPoints,
      progressPercentage,
      completedCount: completedCourses.length,
      totalCount: courses.length,
    };
  }, [courses, userProfile]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Courses</h1>
          <p className="text-muted-foreground">Track your courses, assignments, and progress</p>
        </div>
        <Button onClick={() => router.push("/courses/add")}>
          <Plus className="mr-2 h-4 w-4" />
          Add Course
        </Button>
      </div>

      {/* Points Progress Overview */}
      {userProfile?.degreeTotalPoints && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5" />
              Degree Progress
            </CardTitle>
            <CardDescription>Track your progress towards completing your degree</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Points Progress</span>
                  <span className="text-sm text-muted-foreground">
                    {pointsStats.totalPointsEarned} / {pointsStats.degreeTotalPoints} points
                  </span>
                </div>
                <div className="w-full bg-muted rounded-full h-3">
                  <div
                    className="bg-primary h-3 rounded-full transition-all flex items-center justify-end pr-2"
                    style={{ width: `${Math.min(100, pointsStats.progressPercentage)}%` }}
                  >
                    <span className="text-xs text-primary-foreground font-medium">
                      {pointsStats.progressPercentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <p className="text-sm text-muted-foreground">Points Earned</p>
                  <p className="text-2xl font-bold">{pointsStats.totalPointsEarned}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Remaining</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {Math.max(0, pointsStats.remainingPoints)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Courses Completed</p>
                  <p className="text-2xl font-bold">
                    {pointsStats.completedCount} / {pointsStats.totalCount}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {courses.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Courses</CardTitle>
            <CardDescription>Manage your academic courses and track progress</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              No courses yet. Add your first course to get started!
            </p>
            <Button onClick={() => router.push("/courses/add")}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Course
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {coursesBySemester.map(([semesterKey, semesterCourses]) => {
            const [year, semester] = semesterKey.split("-");
            const semesterPoints = semesterCourses
              .filter((c) => c.completed)
              .reduce((sum, c) => sum + (c.points ?? 0), 0);
            const semesterTotalPoints = semesterCourses.reduce(
              (sum, c) => sum + (c.points ?? 0),
              0
            );

            return (
              <div key={semesterKey} className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-semibold">
                      {semester === "A" ? "Semester A" : "Semester B"} {year}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {semesterCourses.length} course{semesterCourses.length !== 1 ? "s" : ""} •{" "}
                      {semesterPoints} / {semesterTotalPoints} points earned
                    </p>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {semesterCourses.map((course) => (
                    <Card key={course.id} className="hover:shadow-md transition-shadow">
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="flex items-center gap-2">
                              <BookOpen className="h-5 w-5" />
                              {course.name}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              {course.semester} Semester {course.year}
                            </CardDescription>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(course)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(course.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Points</span>
                            <span className="text-sm font-semibold">
                              {course.points ?? 0} {course.completed && course.grade !== undefined && (
                                <span className="text-muted-foreground ml-2">
                                  • Grade: {course.grade}
                                </span>
                              )}
                            </span>
                          </div>
                          {course.completed && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                              <Award className="h-4 w-4" />
                              <span className="font-medium">Completed</span>
                            </div>
                          )}
                          <div>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium">Progress</span>
                              <span className="text-sm text-muted-foreground">{course.progress}%</span>
                            </div>
                            <div className="w-full bg-muted rounded-full h-2">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  course.completed ? "bg-green-600" : "bg-primary"
                                }`}
                                style={{ width: `${course.progress}%` }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <span>{course.assignments.length} assignments</span>
                            <span>{course.exams.length} exams</span>
                          </div>
                          {course.assignments.length > 0 && (
                            <div className="mt-3 pt-3 border-t">
                              <p className="text-xs font-medium mb-2">Assignments:</p>
                              <div className="space-y-1">
                                {tasks
                                  .filter((task) => course.assignments.includes(task.id))
                                  .slice(0, 3)
                                  .map((task) => (
                                    <div
                                      key={task.id}
                                      className="text-xs text-muted-foreground flex items-center gap-2"
                                    >
                                      <span
                                        className={task.completed ? "line-through opacity-60" : ""}
                                      >
                                        {task.title}
                                      </span>
                                      {task.dueDate && (
                                        <span className="text-xs opacity-60">
                                          ({new Date(task.dueDate).toLocaleDateString()})
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                {tasks.filter((task) => course.assignments.includes(task.id)).length >
                                  3 && (
                                  <p className="text-xs text-muted-foreground">
                                    +
                                    {tasks.filter((task) => course.assignments.includes(task.id))
                                      .length - 3}{" "}
                                    more
                                  </p>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
