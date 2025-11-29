"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getCourses, getUserProfile } from "@/lib/firestore-helpers";
import type { Course, UserProfile } from "@/firebase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Award, TrendingUp, BookOpen, Calculator } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function GradesPage() {
  const [user, setUser] = useState<User | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const loadData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const [coursesData, profile] = await Promise.all([
        getCourses(userId),
        getUserProfile(userId),
      ]);
      setCourses(coursesData);
      setUserProfile(profile);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load grades",
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
        loadData(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [loadData]);

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
    // Sort semesters by year (descending) and semester (A before B)
    return Object.entries(grouped).sort(([a], [b]) => {
      const [yearA, semA] = a.split("-");
      const [yearB, semB] = b.split("-");
      if (yearA !== yearB) return parseInt(yearB) - parseInt(yearA);
      // Semester A should come before Semester B
      if (semA === "A" && semB === "B") return -1;
      if (semA === "B" && semB === "A") return 1;
      return 0;
    });
  }, [courses]);

  // Calculate GPA statistics
  const gpaStats = useMemo(() => {
    const completedCoursesWithGrades = courses.filter(
      (c) => c.completed && c.grade !== undefined && c.grade !== null
    );

    if (completedCoursesWithGrades.length === 0) {
      return {
        gpa: 0,
        totalPoints: 0,
        weightedSum: 0,
        courseCount: 0,
      };
    }

    // Calculate weighted GPA (grade * points) / total points
    const weightedSum = completedCoursesWithGrades.reduce(
      (sum, c) => sum + (c.grade! * (c.points ?? 0)),
      0
    );
    const totalPoints = completedCoursesWithGrades.reduce(
      (sum, c) => sum + (c.points ?? 0),
      0
    );
    const gpa = totalPoints > 0 ? weightedSum / totalPoints : 0;

    return {
      gpa,
      totalPoints,
      weightedSum,
      courseCount: completedCoursesWithGrades.length,
    };
  }, [courses]);

  // Get grade letter and color
  const getGradeInfo = (grade: number) => {
    if (grade >= 90) return { letter: "A", color: "text-green-600", bg: "bg-green-50 dark:bg-green-950/20" };
    if (grade >= 80) return { letter: "B", color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950/20" };
    if (grade >= 70) return { letter: "C", color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950/20" };
    if (grade >= 60) return { letter: "D", color: "text-orange-600", bg: "bg-orange-50 dark:bg-orange-950/20" };
    return { letter: "F", color: "text-red-600", bg: "bg-red-50 dark:bg-red-950/20" };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const completedCourses = courses.filter((c) => c.completed && c.grade !== undefined);
  const coursesWithoutGrades = courses.filter((c) => c.completed && (c.grade === undefined || c.grade === null));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Grades</h1>
        <p className="text-muted-foreground">View your academic performance and GPA</p>
      </div>

      {/* GPA Overview */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">GPA</CardTitle>
            <Calculator className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gpaStats.gpa.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              Based on {gpaStats.courseCount} course{gpaStats.courseCount !== 1 ? "s" : ""}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Courses Completed</CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCourses.length}</div>
            <p className="text-xs text-muted-foreground">
              {coursesWithoutGrades.length > 0 && (
                <span className="text-orange-600">
                  {coursesWithoutGrades.length} without grades
                </span>
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Points</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{gpaStats.totalPoints}</div>
            <p className="text-xs text-muted-foreground">Points with grades</p>
          </CardContent>
        </Card>
      </div>

      {/* Courses by Semester */}
      {coursesBySemester.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Your Grades</CardTitle>
            <CardDescription>Track your academic performance</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              No courses yet. Add courses and mark them as completed with grades to see them here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {coursesBySemester.map(([semesterKey, semesterCourses]) => {
            const [year, semester] = semesterKey.split("-");
            const semesterCompleted = semesterCourses.filter(
              (c) => c.completed && c.grade !== undefined
            );
            // Calculate semester GPA
            let semesterGPA = 0;
            if (semesterCompleted.length > 0) {
              const weightedSum = semesterCompleted.reduce(
                (sum, c) => sum + (c.grade! * (c.points ?? 0)),
                0
              );
              const totalPoints = semesterCompleted.reduce(
                (sum, c) => sum + (c.points ?? 0),
                0
              );
              semesterGPA = totalPoints > 0 ? weightedSum / totalPoints : 0;
            }

            return (
              <Card key={semesterKey}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>
                        {semester === "A" ? "Semester A" : "Semester B"} {year}
                      </CardTitle>
                      <CardDescription>
                        {semesterCourses.length} course{semesterCourses.length !== 1 ? "s" : ""}
                        {semesterCompleted.length > 0 && (
                          <span className="ml-2">
                            • GPA: {semesterGPA.toFixed(2)}
                          </span>
                        )}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {semesterCourses.map((course) => {
                      const hasGrade = course.completed && course.grade !== undefined;
                      const gradeInfo = hasGrade ? getGradeInfo(course.grade!) : null;

                      return (
                        <div
                          key={course.id}
                          className="flex items-center justify-between p-3 rounded-lg border"
                        >
                          <div className="flex items-center gap-3 flex-1">
                            <BookOpen className="h-5 w-5 text-muted-foreground" />
                            <div className="flex-1">
                              <p className="font-medium">{course.name}</p>
                              <p className="text-sm text-muted-foreground">
                                {course.points ?? 0} points
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            {hasGrade ? (
                              <>
                                <div
                                  className={`px-3 py-1 rounded-full ${gradeInfo!.bg} ${gradeInfo!.color} font-semibold`}
                                >
                                  {gradeInfo!.letter}
                                </div>
                                <div className="text-right">
                                  <p className="font-bold text-lg">{course.grade}</p>
                                  <p className="text-xs text-muted-foreground">Grade</p>
                                </div>
                              </>
                            ) : course.completed ? (
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">No grade</p>
                              </div>
                            ) : (
                              <div className="text-right">
                                <p className="text-sm text-muted-foreground">In progress</p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Courses without grades reminder */}
      {coursesWithoutGrades.length > 0 && (
        <Card className="border-orange-200 dark:border-orange-800">
          <CardHeader>
            <CardTitle className="text-orange-600 dark:text-orange-400">
              Courses Without Grades
            </CardTitle>
            <CardDescription>
              You have {coursesWithoutGrades.length} completed course{coursesWithoutGrades.length !== 1 ? "s" : ""} without grades.
              Add grades to improve your GPA calculation.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {coursesWithoutGrades.map((course) => (
                <div key={course.id} className="flex items-center justify-between text-sm">
                  <span>{course.name}</span>
                  <span className="text-muted-foreground">
                    {course.points ?? 0} points
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

