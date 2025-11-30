"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getTasks, createTask, updateTask, deleteTask, getCourses, updateCourse } from "@/lib/firestore-helpers";
import type { Task, Course } from "@/firebase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Check, X, Edit2, Trash2, Calendar, Flag } from "lucide-react";
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
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function TasksPage() {
  const [user, setUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    dueDate: "",
    priority: "medium" as "low" | "medium" | "high",
    courseId: "",
  });

  const loadTasks = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const [tasksData, coursesData] = await Promise.all([
        getTasks(userId),
        getCourses(userId),
      ]);
      setTasks(tasksData);
      setCourses(coursesData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load tasks",
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
        loadTasks(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [loadTasks]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const taskData = {
        title: formData.title,
        description: formData.description || undefined,
        dueDate: formData.dueDate ? new Date(formData.dueDate) : undefined,
        priority: formData.priority,
        courseId: formData.courseId || undefined,
        completed: false,
      };

      let taskId: string;
      if (editingTask) {
        taskId = editingTask.id;
        
        // Handle course assignment changes when editing
        const oldCourseId = editingTask.courseId;
        const newCourseId = taskData.courseId;
        
        // Remove from old course if course changed
        if (oldCourseId && oldCourseId !== newCourseId) {
          const oldCourse = courses.find((c) => c.id === oldCourseId);
          if (oldCourse) {
            const assignments = oldCourse.assignments.filter((id) => id !== taskId);
            await updateCourse(user.uid, oldCourseId, { assignments });
          }
        }
        
        await updateTask(user.uid, editingTask.id, taskData);
        toast({ title: "Task updated", description: "Your task has been updated." });
      } else {
        taskId = await createTask(user.uid, taskData);
        toast({ title: "Task created", description: "Your new task has been created." });
      }

      // Add to new course if task is linked to a course
      if (taskData.courseId) {
        const course = courses.find((c) => c.id === taskData.courseId);
        if (course && !course.assignments.includes(taskId)) {
          const assignments = [...course.assignments, taskId];
          await updateCourse(user.uid, taskData.courseId, { assignments });
        }
      }

      setOpen(false);
      resetForm();
      if (user) loadTasks(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save task",
        variant: "destructive",
      });
    }
  };

  const handleToggleComplete = async (task: Task) => {
    if (!user) return;
    try {
      await updateTask(user.uid, task.id, { completed: !task.completed });
      toast({
        title: task.completed ? "Task reopened" : "Task completed",
        description: task.completed ? "Task marked as incomplete" : "Task marked as complete",
      });
      loadTasks(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update task",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (taskId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
      const task = tasks.find((t) => t.id === taskId);
      
      await deleteTask(user.uid, taskId);
      
      // Remove task from course assignments if it was linked to a course
      if (task?.courseId) {
        const course = courses.find((c) => c.id === task.courseId);
        if (course) {
          const assignments = course.assignments.filter((id) => id !== taskId);
          await updateCourse(user.uid, task.courseId, { assignments });
        }
      }
      
      toast({ title: "Task deleted", description: "The task has been deleted." });
      loadTasks(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete task",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || "",
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split("T")[0] : "",
      priority: task.priority,
      courseId: task.courseId || "",
    });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      dueDate: "",
      priority: "medium",
      courseId: "",
    });
    setEditingTask(null);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "text-red-500";
      case "medium":
        return "text-yellow-500";
      case "low":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };

  const incompleteTasks = tasks.filter((t) => !t.completed);
  const completedTasks = tasks.filter((t) => t.completed);

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
        title="Tasks"
        description="Manage your tasks and assignments"
      >
        <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Task
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingTask ? "Edit Task" : "Create New Task"}</DialogTitle>
              <DialogDescription>
                {editingTask ? "Update your task details" : "Add a new task to your list"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    placeholder="Task title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Task description"
                    rows={3}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="courseId">Course (Optional)</Label>
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
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="priority">Priority</Label>
                    <Select
                      value={formData.priority}
                      onValueChange={(value: "low" | "medium" | "high") =>
                        setFormData({ ...formData, priority: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                  Cancel
                </Button>
                <Button type="submit">{editingTask ? "Update" : "Create"}</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <div className="grid gap-4">
        {incompleteTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Active Tasks ({incompleteTasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {incompleteTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                  >
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className="mt-1 p-1 hover:bg-accent rounded"
                    >
                      <div className="w-5 h-5 border-2 border-primary rounded" />
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold">{task.title}</h3>
                        <Flag className={`h-4 w-4 ${getPriorityColor(task.priority)}`} />
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mb-2">{task.description}</p>
                      )}
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {task.dueDate && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(task.dueDate).toLocaleDateString()}
                          </span>
                        )}
                        <span className="capitalize">{task.priority} priority</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(task)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {completedTasks.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Completed ({completedTasks.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {completedTasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-start gap-4 p-4 border rounded-lg opacity-60"
                  >
                    <button
                      onClick={() => handleToggleComplete(task)}
                      className="mt-1 p-1 hover:bg-accent rounded"
                    >
                      <Check className="w-5 h-5 text-green-500" />
                    </button>
                    <div className="flex-1">
                      <h3 className="font-semibold line-through">{task.title}</h3>
                      {task.description && (
                        <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(task.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {tasks.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <p className="text-muted-foreground mb-4">No tasks yet</p>
              <Button onClick={() => setOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Task
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </motion.div>
  );
}
