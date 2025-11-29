import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw } from "lucide-react";

export default function GmailPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gmail Center</h1>
          <p className="text-muted-foreground">View and manage your emails</p>
        </div>
        <Button>
          <RefreshCw className="mr-2 h-4 w-4" />
          Sync Emails
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Email Categories</CardTitle>
          <CardDescription>Your emails organized by category</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Gmail integration not connected yet. Connect your Gmail account to start syncing emails.
            </div>
            <Button variant="outline">
              <Mail className="mr-2 h-4 w-4" />
              Connect Gmail
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

