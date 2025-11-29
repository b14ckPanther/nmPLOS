"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getExams, createExam, updateExam, deleteExam, getCourses } from "@/lib/firestore-helpers";
import type { Exam, Course } from "@/firebase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, BookOpen, Calendar, MapPin } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";

export default function ExamsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [exams, setExams] = useState<Exam[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "",
    courseId: "",
    date: "",
    time: "",
    location: "",
    notes: "",
  });

  const loadData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const [examsData, coursesData] = await Promise.all([
        getExams(userId),
        getCourses(userId),
      ]);
      setExams(examsData);
      setCourses(coursesData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load exams",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Handle date input (format: YYYY-MM-DD) and time input (format: HH:MM)
      const datePart = formData.date.includes("T") ? formData.date.split("T")[0] : formData.date;
      const timePart = formData.time || "00:00";
      const examDate = new Date(`${datePart}T${timePart}`);
      
      // Validate date
      if (isNaN(examDate.getTime())) {
        throw new Error("Invalid date or time");
      }
      
      const examData = {
        name: formData.name,
        courseId: formData.courseId || undefined,
        date: examDate,
        location: formData.location || undefined,
        notes: formData.notes || undefined,
      };

      if (editingExam) {
        await updateExam(user.uid, editingExam.id, examData);
        toast({ title: "Exam updated", description: "Your exam has been updated." });
      } else {
        await createExam(user.uid, examData);
        toast({ title: "Exam created", description: "Your new exam has been created." });
      }

      setOpen(false);
      resetForm();
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save exam",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (examId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this exam?")) return;

    try {
      await deleteExam(user.uid, examId);
      toast({ title: "Exam deleted", description: "The exam has been deleted." });
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete exam",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    const examDate = new Date(exam.date);
    setFormData({
      name: exam.name,
      courseId: exam.courseId || "",
      date: examDate.toISOString().split("T")[0],
      time: examDate.toTimeString().slice(0, 5),
      location: exam.location || "",
      notes: exam.notes || "",
    });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      courseId: "",
      date: "",
      time: "",
      location: "",
      notes: "",
    });
    setEditingExam(null);
  };

  const upcomingExams = exams.filter((exam) => new Date(exam.date) >= new Date());
  const pastExams = exams.filter((exam) => new Date(exam.date) < new Date());

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
          <h1 className="text-3xl font-bold">Exams</h1>
          <p className="text-muted-foreground">Track your upcoming exams and study plans</p>
        </div>
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingExam ? "Edit Exam" : "Create New Exam"}</DialogTitle>
              <DialogDescription>
                {editingExam ? "Update your exam details" : "Add a new exam to track"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Exam Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g., Final Exam"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courseId">Course</Label>
                  <Select
                    value={formData.courseId || undefined}
                    onValueChange={(value) => setFormData({ ...formData, courseId: value === "none" ? "" : value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a course (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No course</SelectItem>
                      {courses.map((course) => (
                        <SelectItem key={course.id} value={course.id}>
                          {course.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g., Room 101"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Study notes, topics to review, etc."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">{editingExam ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {exams.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Exams</CardTitle>
            <CardDescription>All your scheduled exams and their details</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">No exams scheduled yet. Add your first exam to get started!</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {upcomingExams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Exams ({upcomingExams.length})</CardTitle>
                <CardDescription>Your scheduled exams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingExams.map((exam) => {
                    const course = courses.find((c) => c.id === exam.courseId);
                    return (
                      <div
                        key={exam.id}
                        className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="h-5 w-5 text-primary" />
                              <h3 className="font-semibold">{exam.name}</h3>
                            </div>
                            {course && (
                              <p className="text-sm text-muted-foreground mb-2">{course.name}</p>
                            )}
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {format(new Date(exam.date), "MMM d, yyyy 'at' h:mm a")}
                              </span>
                              {exam.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-4 w-4" />
                                  {exam.location}
                                </span>
                              )}
                            </div>
                            {exam.notes && (
                              <p className="text-sm text-muted-foreground mt-2">{exam.notes}</p>
                            )}
                          </div>
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEdit(exam)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDelete(exam.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {pastExams.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Past Exams ({pastExams.length})</CardTitle>
                <CardDescription>Your completed exams</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pastExams.map((exam) => {
                    const course = courses.find((c) => c.id === exam.courseId);
                    return (
                      <div
                        key={exam.id}
                        className="p-4 border rounded-lg opacity-60 hover:opacity-100 transition-opacity"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <BookOpen className="h-5 w-5" />
                              <h3 className="font-semibold line-through">{exam.name}</h3>
                            </div>
                            {course && (
                              <p className="text-sm text-muted-foreground mb-2">{course.name}</p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {format(new Date(exam.date), "MMM d, yyyy")}
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(exam.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
