"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { createCourse, updateCourse, getCourses, getUserProfile, setUserProfile } from "@/lib/firestore-helpers";
import type { Course, UserProfile } from "@/firebase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AddCoursePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("id");
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userProfile, setUserProfileState] = useState<UserProfile | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    semester: "A" as "A" | "B",
    year: new Date().getFullYear(),
    points: 0,
    grade: "",
    completed: false,
    progress: 0,
  });

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const [profile, courses] = await Promise.all([
            getUserProfile(currentUser.uid),
            courseId ? getCourses(currentUser.uid) : Promise.resolve([]),
          ]);
          setUserProfileState(profile);
          
          if (courseId && courses.length > 0) {
            const course = courses.find((c) => c.id === courseId);
            if (course) {
              setEditingCourse(course);
              setFormData({
                name: course.name,
                semester: course.semester,
                year: course.year,
                points: course.points ?? 0,
                grade: course.grade?.toString() ?? "",
                completed: course.completed ?? false,
                progress: course.progress ?? 0,
              });
            }
          }
        } catch (error: any) {
          console.error("Failed to load data:", error);
        }
        setLoading(false);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, [courseId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    try {
      const courseData: Partial<Course> = {
        name: formData.name,
        semester: formData.semester,
        year: formData.year,
        points: formData.points,
        grade: formData.grade ? parseFloat(formData.grade) : null,
        completed: formData.completed,
        progress: formData.completed ? 100 : formData.progress,
      };

      if (editingCourse) {
        await updateCourse(user.uid, editingCourse.id, courseData);
        toast({
          title: "Course updated",
          description: "Your course has been updated successfully.",
        });
      } else {
        await createCourse(user.uid, {
          ...courseData,
          assignments: [],
          exams: [],
        } as Omit<Course, "id" | "createdAt" | "updatedAt">);
        toast({
          title: "Course created",
          description: "Your new course has been added successfully.",
        });
      }
      router.push("/courses");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || `Failed to ${editingCourse ? "update" : "create"} course`,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDegreePointsChange = async (value: string) => {
    if (!user) return;
    const points = parseInt(value) || 0;
    try {
      await setUserProfile(user.uid, { degreeTotalPoints: points });
      setUserProfileState((prev) => (prev ? { ...prev, degreeTotalPoints: points } : null));
      toast({
        title: "Degree points updated",
        description: "Your degree total points have been saved.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update degree points",
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
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold">{editingCourse ? "Edit Course" : "Add New Course"}</h1>
          <p className="text-muted-foreground">
            {editingCourse
              ? "Update your course details"
              : "Add a course with points, grade, and semester information"}
          </p>
        </div>
      </div>

      {/* Degree Points Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Degree Configuration</CardTitle>
          <CardDescription>Set your total degree points (e.g., 120 for BSc)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="degreePoints">Total Degree Points</Label>
            <Input
              id="degreePoints"
              type="number"
              value={userProfile?.degreeTotalPoints || ""}
              onChange={(e) => handleDegreePointsChange(e.target.value)}
              placeholder="e.g., 120"
              min={0}
            />
            {userProfile?.degreeTotalPoints && (
              <p className="text-sm text-muted-foreground">
                You need {userProfile.degreeTotalPoints} points to complete your degree.
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Course Form */}
      <Card>
        <CardHeader>
          <CardTitle>Course Details</CardTitle>
          <CardDescription>Enter all information about your course</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="name">Course Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g., Introduction to Computer Science"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="semester">Semester *</Label>
                <Select
                  value={formData.semester}
                  onValueChange={(value: "A" | "B") =>
                    setFormData({ ...formData, semester: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A">Semester A</SelectItem>
                    <SelectItem value="B">Semester B</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="year">Year *</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      year: parseInt(e.target.value) || new Date().getFullYear(),
                    })
                  }
                  min={2020}
                  max={2030}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="points">Course Points (Credit Hours) *</Label>
              <Input
                id="points"
                type="number"
                value={formData.points}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    points: Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                min={0}
                step="0.5"
                required
                placeholder="e.g., 3, 4, 5"
              />
              <p className="text-sm text-muted-foreground">
                Enter the credit points this course is worth
              </p>
            </div>

            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="completed"
                  checked={formData.completed}
                  onChange={(e) => {
                    const isCompleted = e.target.checked;
                    setFormData({
                      ...formData,
                      completed: isCompleted,
                      progress: isCompleted ? 100 : formData.progress,
                    });
                  }}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="completed" className="cursor-pointer font-medium">
                  This course is already completed
                </Label>
              </div>
              <p className="text-sm text-muted-foreground ml-6">
                Check this if you&apos;ve already finished this course. Perfect for adding past courses!
              </p>
              {formData.completed && (
                <div className="mt-3 ml-6 p-3 bg-green-50 dark:bg-green-950/20 rounded border border-green-200 dark:border-green-800">
                  <p className="text-sm font-medium text-green-800 dark:text-green-200">
                    ✓ Completed course - Progress set to 100%
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                    You can enter your grade below to track your performance.
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="grade">
                  Grade {formData.completed ? "(Recommended)" : "(Optional)"}
                </Label>
                <Input
                  id="grade"
                  type="number"
                  value={formData.grade}
                  onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                  min={0}
                  max={100}
                  step="0.1"
                  placeholder="e.g., 85"
                  className={formData.completed ? "border-green-500" : ""}
                />
                <p className="text-sm text-muted-foreground">
                  Enter your grade (0-100) {formData.completed ? "for this completed course" : "if completed"}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="progress">Progress (%)</Label>
                <Input
                  id="progress"
                  type="number"
                  value={formData.completed ? 100 : formData.progress}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      progress: Math.min(100, Math.max(0, parseInt(e.target.value) || 0)),
                    })
                  }
                  min={0}
                  max={100}
                  disabled={formData.completed}
                />
                {formData.completed && (
                  <p className="text-sm text-muted-foreground">
                    Automatically set to 100% for completed courses
                  </p>
                )}
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                <Save className="mr-2 h-4 w-4" />
                {saving ? "Saving..." : "Save Course"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

