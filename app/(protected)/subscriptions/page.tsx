"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getSubscriptions, createSubscription, updateSubscription, deleteSubscription } from "@/lib/firestore-helpers";
import type { Subscription } from "@/firebase/types";
import { Plus, Edit2, Trash2, Loader2, CreditCard } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";

export default function SubscriptionsPage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [subscriptions, setSubscriptions] = React.useState<Subscription[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showDialog, setShowDialog] = React.useState(false);
  const [editingSubscription, setEditingSubscription] = React.useState<Subscription | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = React.useState({
    name: "",
    amount: "",
    billingDate: "",
    category: "",
    notes: "",
    active: true,
  });

  const loadSubscriptions = React.useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const data = await getSubscriptions(userId);
      setSubscriptions(data);
    } catch (error) {
      console.error("Error loading subscriptions:", error);
      toast({
        title: "Error",
        description: "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  React.useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        loadSubscriptions(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [loadSubscriptions]);


  const handleOpenDialog = (subscription?: Subscription) => {
    if (subscription) {
      setEditingSubscription(subscription);
      setFormData({
        name: subscription.name,
        amount: subscription.amount.toString(),
        billingDate: subscription.billingDate.toString(),
        category: subscription.category || "",
        notes: subscription.notes || "",
        active: subscription.active,
      });
    } else {
      setEditingSubscription(null);
      setFormData({
        name: "",
        amount: "",
        billingDate: "",
        category: "",
        notes: "",
        active: true,
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingSubscription(null);
    setFormData({
      name: "",
      amount: "",
      billingDate: "",
      category: "",
      notes: "",
      active: true,
    });
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.name.trim() || !formData.amount || !formData.billingDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const billingDate = parseInt(formData.billingDate);
    if (isNaN(billingDate) || billingDate < 1 || billingDate > 31) {
      toast({
        title: "Error",
        description: "Billing date must be between 1 and 31",
        variant: "destructive",
      });
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Error",
        description: "Amount must be a positive number",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      if (editingSubscription) {
        await updateSubscription(user.uid, editingSubscription.id, {
          name: formData.name.trim(),
          amount,
          billingDate,
          category: formData.category.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          active: formData.active,
        });
        toast({
          title: "Success",
          description: "Subscription updated successfully",
        });
      } else {
        await createSubscription(user.uid, {
          name: formData.name.trim(),
          amount,
          billingDate,
          category: formData.category.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          active: formData.active,
        });
        toast({
          title: "Success",
          description: "Subscription created successfully",
        });
      }
      await loadSubscriptions(user.uid);
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save subscription",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (subscription: Subscription) => {
    if (!user) return;
      if (!confirm(`Are you sure you want to delete &quot;${subscription.name}&quot;?`)) return;

    try {
      await deleteSubscription(user.uid, subscription.id);
      toast({
        title: "Success",
        description: "Subscription deleted successfully",
      });
      await loadSubscriptions(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete subscription",
        variant: "destructive",
      });
    }
  };

  const totalMonthly = subscriptions
    .filter(sub => sub.active)
    .reduce((sum, sub) => sum + sub.amount, 0);

  const totalYearly = totalMonthly * 12;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        description="Manage your monthly subscriptions and recurring payments"
      />

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Monthly Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border">
              <div className="text-sm text-muted-foreground">Total Monthly</div>
              <div className="text-3xl font-bold mt-2">₪{totalMonthly.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border">
              <div className="text-sm text-muted-foreground">Total Yearly</div>
              <div className="text-3xl font-bold mt-2">₪{totalYearly.toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Subscriptions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Subscriptions</CardTitle>
              <CardDescription>
                {subscriptions.length} subscription{subscriptions.length !== 1 ? "s" : ""} total
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Subscription
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No subscriptions yet. Click &quot;Add Subscription&quot; to get started.
            </div>
          ) : (
            <div className="space-y-2">
              {subscriptions.map((subscription) => (
                <div
                  key={subscription.id}
                  className={`p-4 border rounded-lg flex items-center justify-between ${
                    !subscription.active ? "opacity-50" : ""
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold">{subscription.name}</h3>
                      {!subscription.active && (
                        <span className="text-xs px-2 py-0.5 bg-muted rounded">Inactive</span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      ₪{subscription.amount.toFixed(2)}/month • Billing on day {subscription.billingDate}
                      {subscription.category && ` • ${subscription.category}`}
                    </div>
                    {subscription.notes && (
                      <div className="text-xs text-muted-foreground mt-1">{subscription.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleOpenDialog(subscription)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(subscription)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingSubscription ? "Edit Subscription" : "Add Subscription"}
            </DialogTitle>
            <DialogDescription>
              {editingSubscription
                ? "Update your subscription details"
                : "Add a new monthly subscription or recurring payment"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Netflix, Spotify"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Monthly Amount (₪) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="billingDate">Billing Date (Day) *</Label>
                <Input
                  id="billingDate"
                  type="number"
                  min="1"
                  max="31"
                  value={formData.billingDate}
                  onChange={(e) => setFormData({ ...formData, billingDate: e.target.value })}
                  placeholder="1-31"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Entertainment, Software"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
            </div>
            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="active"
                checked={formData.active}
                onChange={(e) => setFormData({ ...formData, active: e.target.checked })}
                className="rounded"
              />
              <Label htmlFor="active" className="cursor-pointer">
                Active subscription
              </Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCloseDialog}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingSubscription ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

