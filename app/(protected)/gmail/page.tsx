"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getGmailTokens, getEmailCountsByCategory, deleteGmailTokens } from "@/lib/gmail-helpers";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, RefreshCw, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function GmailPage() {
  const [user, setUser] = useState<User | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [emailCounts, setEmailCounts] = useState<Record<string, number>>({
    bills: 0,
    assignments: 0,
    projects: 0,
    receipts: 0,
    banking: 0,
    university: 0,
    other: 0,
  });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Check for OAuth callback results
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("connected");
    const error = params.get("error");

    if (connected === "true") {
      toast({
        title: "Gmail connected successfully",
        description: "Your Gmail account has been connected. You can now sync emails.",
      });
      setIsConnected(true);
      // Clean URL
      window.history.replaceState({}, "", "/gmail");
    }

    if (error) {
      toast({
        title: "Connection failed",
        description: error === "access_denied" 
          ? "You denied access to Gmail. Please try again if you'd like to connect."
          : "Failed to connect Gmail account. Please try again.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Check connection status and load email counts
  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          // Check if Gmail is connected by checking for tokens
          const tokens = await getGmailTokens(currentUser.uid);
          setIsConnected(!!tokens);
          
          // Load email counts if connected
          if (tokens) {
            await loadEmailCounts(currentUser.uid);
          }
        } catch (error) {
          console.error("Error checking Gmail connection:", error);
        } finally {
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const loadEmailCounts = async (userId: string) => {
    try {
      const counts = await getEmailCountsByCategory(userId);
      setEmailCounts(counts);
    } catch (error) {
      console.error("Error loading email counts:", error);
    }
  };

  const handleConnectGmail = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to connect Gmail",
        variant: "destructive",
      });
      return;
    }

    setIsConnecting(true);
    try {
      // Get OAuth URL from API
      const response = await fetch(`/api/gmail/auth?userId=${user.uid}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize Gmail authentication");
      }

      // Redirect to Google OAuth consent screen
      window.location.href = data.authUrl;
    } catch (error: any) {
      setIsConnecting(false);
      toast({
        title: "Connection failed",
        description: error.message || "Failed to connect Gmail account",
        variant: "destructive",
      });
    }
  };

  const handleDisconnectGmail = async () => {
    if (!user) return;
    if (!confirm("Are you sure you want to disconnect your Gmail account?")) return;
    
    try {
      await deleteGmailTokens(user.uid);
      setIsConnected(false);
      setEmailCounts({
        bills: 0,
        assignments: 0,
        projects: 0,
        receipts: 0,
        banking: 0,
        university: 0,
        other: 0,
      });
      
      toast({
        title: "Gmail disconnected",
        description: "Your Gmail account has been disconnected.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to disconnect Gmail account",
        variant: "destructive",
      });
    }
  };

  const handleSyncEmails = async () => {
    if (!isConnected || !user) {
      setShowConnectDialog(true);
      return;
    }

    setIsSyncing(true);
    try {
      const response = await fetch("/api/gmail/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId: user.uid }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to sync emails");
      }

      // Reload email counts
      await loadEmailCounts(user.uid);

      toast({
        title: "Emails synced",
        description: `Successfully synced ${data.syncedCount} email${data.syncedCount !== 1 ? 's' : ''} and categorized them.`,
      });
    } catch (error: any) {
      toast({
        title: "Sync failed",
        description: error.message || "Failed to sync emails",
        variant: "destructive",
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const emailCategories = [
    { name: "Bills", key: "bills", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" },
    { name: "Assignments", key: "assignments", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" },
    { name: "Projects", key: "projects", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400" },
    { name: "Receipts", key: "receipts", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" },
    { name: "Banking", key: "banking", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400" },
    { name: "University", key: "university", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400" },
    { name: "Other", key: "other", color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Gmail Center</h1>
          <p className="text-muted-foreground">View and manage your emails</p>
        </div>
        <Button onClick={handleSyncEmails} disabled={isSyncing || !isConnected}>
          {isSyncing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="mr-2 h-4 w-4" />
              Sync Emails
            </>
          )}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Email Categories</CardTitle>
              <CardDescription>Your emails organized by category</CardDescription>
            </div>
            {isConnected && (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm text-green-600 dark:text-green-400">Connected</span>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {!isConnected ? (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                Gmail integration not connected yet. Connect your Gmail account to start syncing emails.
              </div>
              <Button variant="outline" onClick={() => setShowConnectDialog(true)}>
                <Mail className="mr-2 h-4 w-4" />
                Connect Gmail
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                {emailCategories.map((category) => {
                  const count = emailCounts[category.key] || 0;
                  return (
                    <div
                      key={category.key}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{category.name}</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {count} {count === 1 ? "email" : "emails"}
                          </p>
                        </div>
                        <div className={`px-2 py-1 rounded text-xs ${category.color}`}>
                          {count}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="pt-4 border-t">
                <Button variant="outline" onClick={handleDisconnectGmail}>
                  <XCircle className="mr-2 h-4 w-4" />
                  Disconnect Gmail
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connect Gmail Account</DialogTitle>
            <DialogDescription>
              Connect your Gmail account to sync and categorize your emails automatically.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              By connecting your Gmail account, you allow nmPLOS to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-sm text-muted-foreground mb-4">
              <li>Read your emails to categorize them</li>
              <li>Sync emails for bills, assignments, and receipts</li>
              <li>Help organize your inbox automatically</li>
            </ul>
            <p className="text-xs text-muted-foreground">
              Your credentials are stored securely and never shared.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleConnectGmail} disabled={isConnecting}>
              {isConnecting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Connecting...
                </>
              ) : (
                "Connect Gmail"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
