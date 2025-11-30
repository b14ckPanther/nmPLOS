"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getCourses, updateCourse, deleteCourse, getTasks, getUserProfile, setUserProfile as updateUserProfile } from "@/lib/firestore-helpers";
import type { Course, Task, UserProfile } from "@/firebase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, BookOpen, TrendingUp, Award, Target, ChevronDown, ChevronUp, ChevronsUpDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PageHeader } from "@/components/page-header";
import { motion } from "framer-motion";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function CoursesPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [showEditPoints, setShowEditPoints] = useState(false);
  const [manualPoints, setManualPoints] = useState(0);
  const [expandedSemesters, setExpandedSemesters] = useState<Set<string>>(new Set());
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

  // Get current year and semester
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const currentSemester = currentMonth < 6 ? "A" : "B"; // Assuming A = first half, B = second half

  // Group courses by semester and separate future courses
  const { coursesBySemester, futureCourses } = useMemo(() => {
    const grouped: { [key: string]: Course[] } = {};
    const future: Course[] = [];
    
    courses.forEach((course) => {
      // Check if course is in the future
      const isFuture = course.year > currentYear || 
        (course.year === currentYear && course.semester === "B" && currentSemester === "A");
      
      if (isFuture) {
        future.push(course);
      } else {
        const key = `${course.year}-${course.semester}`;
        if (!grouped[key]) {
          grouped[key] = [];
        }
        grouped[key].push(course);
      }
    });
    
    // Sort semesters by year (descending) and semester (A before B)
    const sorted = Object.entries(grouped).sort(([a], [b]) => {
      const [yearA, semA] = a.split("-");
      const [yearB, semB] = b.split("-");
      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
      // Semester A should come before Semester B
      if (semA === "A" && semB === "B") return -1;
      if (semA === "B" && semB === "A") return 1;
      return 0;
    });
    
    // Sort future courses by year and semester
    const sortedFuture = future.sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      if (a.semester === "A" && b.semester === "B") return -1;
      if (a.semester === "B" && b.semester === "A") return 1;
      return 0;
    });
    
    return { coursesBySemester: sorted, futureCourses: sortedFuture };
  }, [courses, currentYear, currentSemester]);

  // Toggle semester expansion
  const toggleSemester = (semesterKey: string) => {
    setExpandedSemesters((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(semesterKey)) {
        newSet.delete(semesterKey);
      } else {
        newSet.add(semesterKey);
      }
      return newSet;
    });
  };

  // Collapse/expand all semesters
  const toggleAllSemesters = () => {
    if (expandedSemesters.size > 0) {
      setExpandedSemesters(new Set());
    } else {
      const allKeys = new Set([
        ...coursesBySemester.map(([key]) => key),
        ...(futureCourses.length > 0 ? ["future"] : []),
      ]);
      setExpandedSemesters(allKeys);
    }
  };

  // Calculate points statistics (future courses count as uncompleted)
  const pointsStats = useMemo(() => {
    const completedCourses = courses.filter((c) => c.completed);
    const pointsFromCourses = completedCourses.reduce((sum, c) => sum + (c.points ?? 0), 0);
    const manualPoints = userProfile?.manualEarnedPoints ?? 0;
    const totalPointsEarned = pointsFromCourses + manualPoints;
    const totalPoints = courses.reduce((sum, c) => sum + (c.points ?? 0), 0);
    const degreeTotalPoints = userProfile?.degreeTotalPoints ?? 0;
    const remainingPoints = degreeTotalPoints > 0 ? Math.max(0, degreeTotalPoints - totalPointsEarned) : 0;
    const progressPercentage =
      degreeTotalPoints > 0 ? Math.min(100, (totalPointsEarned / degreeTotalPoints) * 100) : 0;
    
    // Future courses are counted as uncompleted
    const uncompletedCount = courses.length - completedCourses.length;

    return {
      totalPointsEarned,
      pointsFromCourses,
      manualPoints,
      totalPoints,
      degreeTotalPoints,
      remainingPoints,
      progressPercentage,
      completedCount: completedCourses.length,
      totalCount: courses.length,
      uncompletedCount,
      futureCount: futureCourses.length,
    };
  }, [courses, userProfile, futureCourses.length]);

  const handleOpenEditPoints = () => {
    setManualPoints(userProfile?.manualEarnedPoints ?? 0);
    setShowEditPoints(true);
  };

  const handleSaveManualPoints = async () => {
    if (!user) return;
    try {
      await updateUserProfile(user.uid, { manualEarnedPoints: manualPoints });
      const updatedProfile = await getUserProfile(user.uid);
      setUserProfile(updatedProfile);
      toast({
        title: "Points updated",
        description: "Your manual points have been saved.",
      });
      setShowEditPoints(false);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update points",
        variant: "destructive",
      });
    }
  };

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
        title="Courses"
        description="Track degree progress"
      >
        <Button onClick={() => router.push("/courses/add")}>
          <Plus className="mr-2 h-4 w-4" />
        </Button>
      </PageHeader>

      {/* Points Progress Overview */}
      {userProfile?.degreeTotalPoints && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Degree Progress
                </CardTitle>
                <CardDescription>Track your progress towards completing your degree</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleOpenEditPoints}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit Points
              </Button>
            </div>
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
                  {pointsStats.manualPoints > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      ({pointsStats.pointsFromCourses} from courses + {pointsStats.manualPoints} manual)
                    </p>
                  )}
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
                  {pointsStats.futureCount > 0 && (
                    <p className="text-xs text-blue-600 mt-1">
                      {pointsStats.futureCount} future course{pointsStats.futureCount !== 1 ? "s" : ""}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Manual Points Dialog */}
      <Dialog open={showEditPoints} onOpenChange={setShowEditPoints}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Previously Earned Points</DialogTitle>
            <DialogDescription>
              Enter the total points you&apos;ve already earned from courses completed before adding them to this system.
              This will be added to your points from courses in the system.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="manualPoints">Manual Points</Label>
              <Input
                id="manualPoints"
                type="number"
                value={manualPoints}
                onChange={(e) => setManualPoints(Math.max(0, parseFloat(e.target.value) || 0))}
                min={0}
                step="0.5"
                placeholder="e.g., 45"
              />
              <p className="text-sm text-muted-foreground">
                Points from previously completed courses not in the system
              </p>
            </div>
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm font-medium mb-1">Total Points Breakdown:</p>
              <p className="text-sm text-muted-foreground">
                • From courses in system: {pointsStats.pointsFromCourses} points
              </p>
              <p className="text-sm text-muted-foreground">
                • Manual points: {manualPoints} points
              </p>
              <p className="text-sm font-semibold mt-2">
                Total: {pointsStats.pointsFromCourses + manualPoints} / {pointsStats.degreeTotalPoints} points
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditPoints(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveManualPoints}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
          {/* Collapse All Button */}
          {coursesBySemester.length > 0 && (
            <div className="flex justify-end">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleAllSemesters}
                className="flex items-center gap-2"
              >
                <ChevronsUpDown className="h-4 w-4" />
                {expandedSemesters.size > 0 ? "Collapse All" : "Expand All"}
              </Button>
            </div>
          )}

          {/* Current and Past Semesters */}
          {coursesBySemester.map(([semesterKey, semesterCourses]) => {
            const [year, semester] = semesterKey.split("-");
            const isExpanded = expandedSemesters.has(semesterKey);
            const semesterPoints = semesterCourses
              .filter((c) => c.completed)
              .reduce((sum, c) => sum + (c.points ?? 0), 0);
            const semesterTotalPoints = semesterCourses.reduce(
              (sum, c) => sum + (c.points ?? 0),
              0
            );

            return (
              <Card key={semesterKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleSemester(semesterKey)}
                        >
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                        <div>
                          <CardTitle className="text-2xl">
                            {semester === "A" ? "Semester A" : "Semester B"} {year}
                          </CardTitle>
                          <CardDescription>
                            {semesterCourses.length} course{semesterCourses.length !== 1 ? "s" : ""} •{" "}
                            {semesterPoints} / {semesterTotalPoints} points earned
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                {isExpanded && (
                  <CardContent>
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
                  </CardContent>
                )}
              </Card>
            );
          })}

          {/* Future Courses Section */}
          {futureCourses.length > 0 && (
            <Card className="border-blue-200 dark:border-blue-800">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => toggleSemester("future")}
                      >
                        {expandedSemesters.has("future") ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                      <div>
                        <CardTitle className="text-2xl text-blue-600 dark:text-blue-400">
                          Future Courses
                        </CardTitle>
                        <CardDescription>
                          {futureCourses.length} course{futureCourses.length !== 1 ? "s" : ""} planned •{" "}
                          {futureCourses.reduce((sum, c) => sum + (c.points ?? 0), 0)} total points
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>
              {expandedSemesters.has("future") && (
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {futureCourses.map((course) => (
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
                              <span className="text-sm font-semibold">{course.points ?? 0}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-blue-600">
                              <TrendingUp className="h-4 w-4" />
                              <span className="font-medium">Upcoming</span>
                            </div>
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">Progress</span>
                                <span className="text-sm text-muted-foreground">{course.progress}%</span>
                              </div>
                              <div className="w-full bg-muted rounded-full h-2">
                                <div
                                  className="bg-blue-500 h-2 rounded-full transition-all"
                                  style={{ width: `${course.progress}%` }}
                                />
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              )}
            </Card>
          )}
        </div>
      )}
    </motion.div>
  );
}
