import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function ExamsPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Exams</h1>
          <p className="text-muted-foreground">Track your upcoming exams and study plans</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Add Exam
        </Button>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Upcoming Exams</CardTitle>
          <CardDescription>All your scheduled exams and their details</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No exams scheduled yet. Add your first exam to get started!</p>
        </CardContent>
      </Card>
    </div>
  );
}

