"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getLoans, createLoan, updateLoan, deleteLoan } from "@/lib/firestore-helpers";
import type { Loan } from "@/firebase/types";
import { Plus, Edit2, Trash2, Loader2, CreditCard, TrendingDown } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PageHeader } from "@/components/page-header";
import { format } from "date-fns";

export default function LoansPage() {
  const [user, setUser] = React.useState<User | null>(null);
  const [loans, setLoans] = React.useState<Loan[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [showDialog, setShowDialog] = React.useState(false);
  const [editingLoan, setEditingLoan] = React.useState<Loan | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = React.useState({
    name: "",
    totalAmount: "",
    remainingAmount: "",
    monthlyPayment: "",
    paymentsLeft: "",
    startDate: "",
    interestRate: "",
    notes: "",
  });

  const loadLoans = React.useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const data = await getLoans(userId);
      setLoans(data);
    } catch (error) {
      console.error("Error loading loans:", error);
      toast({
        title: "Error",
        description: "Failed to load loans",
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
        loadLoans(currentUser.uid);
      }
    });
    return () => unsubscribe();
  }, [loadLoans]);

  const handleOpenDialog = (loan?: Loan) => {
    if (loan) {
      setEditingLoan(loan);
      setFormData({
        name: loan.name,
        totalAmount: loan.totalAmount.toString(),
        remainingAmount: loan.remainingAmount.toString(),
        monthlyPayment: loan.monthlyPayment.toString(),
        paymentsLeft: loan.paymentsLeft.toString(),
        startDate: format(loan.startDate, "yyyy-MM-dd"),
        interestRate: loan.interestRate?.toString() || "",
        notes: loan.notes || "",
      });
    } else {
      setEditingLoan(null);
      setFormData({
        name: "",
        totalAmount: "",
        remainingAmount: "",
        monthlyPayment: "",
        paymentsLeft: "",
        startDate: format(new Date(), "yyyy-MM-dd"),
        interestRate: "",
        notes: "",
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setEditingLoan(null);
    setFormData({
      name: "",
      totalAmount: "",
      remainingAmount: "",
      monthlyPayment: "",
      paymentsLeft: "",
      startDate: format(new Date(), "yyyy-MM-dd"),
      interestRate: "",
      notes: "",
    });
  };

  const handleSave = async () => {
    if (!user) return;

    if (!formData.name.trim() || !formData.totalAmount || !formData.remainingAmount || !formData.monthlyPayment || !formData.paymentsLeft || !formData.startDate) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const totalAmount = parseFloat(formData.totalAmount);
    const remainingAmount = parseFloat(formData.remainingAmount);
    const monthlyPayment = parseFloat(formData.monthlyPayment);
    const paymentsLeft = parseInt(formData.paymentsLeft);

    if (isNaN(totalAmount) || totalAmount <= 0) {
      toast({
        title: "Error",
        description: "Total amount must be a positive number",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(remainingAmount) || remainingAmount < 0 || remainingAmount > totalAmount) {
      toast({
        title: "Error",
        description: "Remaining amount must be between 0 and total amount",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(monthlyPayment) || monthlyPayment <= 0) {
      toast({
        title: "Error",
        description: "Monthly payment must be a positive number",
        variant: "destructive",
      });
      return;
    }

    if (isNaN(paymentsLeft) || paymentsLeft < 0) {
      toast({
        title: "Error",
        description: "Payments left must be a non-negative number",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const loanData = {
        name: formData.name.trim(),
        totalAmount,
        remainingAmount,
        monthlyPayment,
        paymentsLeft,
        startDate: new Date(formData.startDate),
        interestRate: formData.interestRate ? parseFloat(formData.interestRate) : undefined,
        notes: formData.notes.trim() || undefined,
      };

      if (editingLoan) {
        await updateLoan(user.uid, editingLoan.id, loanData);
        toast({
          title: "Success",
          description: "Loan updated successfully",
        });
      } else {
        await createLoan(user.uid, loanData);
        toast({
          title: "Success",
          description: "Loan created successfully",
        });
      }
      await loadLoans(user.uid);
      handleCloseDialog();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save loan",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (loan: Loan) => {
    if (!user) return;
    if (!confirm(`Are you sure you want to delete &quot;${loan.name}&quot;?`)) return;

    try {
      await deleteLoan(user.uid, loan.id);
      toast({
        title: "Success",
        description: "Loan deleted successfully",
      });
      await loadLoans(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete loan",
        variant: "destructive",
      });
    }
  };

  const totalRemaining = loans.reduce((sum, loan) => sum + loan.remainingAmount, 0);
  const totalMonthlyPayments = loans.reduce((sum, loan) => sum + loan.monthlyPayment, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Loans"
        description="Track your loans, payments, and progress"
      />

      {/* Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingDown className="h-5 w-5" />
            Loan Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500/10 to-orange-500/10 rounded-lg border">
              <div className="text-sm text-muted-foreground">Total Remaining</div>
              <div className="text-3xl font-bold mt-2">₪{totalRemaining.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-lg border">
              <div className="text-sm text-muted-foreground">Monthly Payments</div>
              <div className="text-3xl font-bold mt-2">₪{totalMonthlyPayments.toFixed(2)}</div>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500/10 to-emerald-500/10 rounded-lg border">
              <div className="text-sm text-muted-foreground">Active Loans</div>
              <div className="text-3xl font-bold mt-2">{loans.length}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loans List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Your Loans</CardTitle>
              <CardDescription>
                {loans.length} loan{loans.length !== 1 ? "s" : ""} total
              </CardDescription>
            </div>
            <Button onClick={() => handleOpenDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Add Loan
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : loans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No loans yet. Click &quot;Add Loan&quot; to get started.
            </div>
          ) : (
            <div className="space-y-4">
              {loans.map((loan) => {
                const paidAmount = loan.totalAmount - loan.remainingAmount;
                const progressPercent = (paidAmount / loan.totalAmount) * 100;
                
                return (
                  <div key={loan.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{loan.name}</h3>
                        <div className="text-sm text-muted-foreground mt-1">
                          Started: {format(loan.startDate, "MMM d, yyyy")}
                          {loan.interestRate && ` • ${loan.interestRate}% interest`}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenDialog(loan)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(loan)}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{progressPercent.toFixed(1)}%</span>
                      </div>
                      <div className="relative w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div
                          className="absolute left-0 top-0 h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                          style={{ width: `${progressPercent}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Paid: ₪{paidAmount.toFixed(2)}</span>
                        <span>Remaining: ₪{loan.remainingAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    {/* Loan Details */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2 border-t">
                      <div>
                        <div className="text-xs text-muted-foreground">Total Amount</div>
                        <div className="font-semibold">₪{loan.totalAmount.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Monthly Payment</div>
                        <div className="font-semibold">₪{loan.monthlyPayment.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Payments Left</div>
                        <div className="font-semibold">{loan.paymentsLeft}</div>
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground">Remaining</div>
                        <div className="font-semibold text-red-600 dark:text-red-400">₪{loan.remainingAmount.toFixed(2)}</div>
                      </div>
                    </div>

                    {loan.notes && (
                      <div className="text-sm text-muted-foreground pt-2 border-t">
                        {loan.notes}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingLoan ? "Edit Loan" : "Add Loan"}
            </DialogTitle>
            <DialogDescription>
              {editingLoan
                ? "Update your loan details"
                : "Add a new loan to track"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Loan Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Car Loan, Student Loan"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="totalAmount">Total Amount (₪) *</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="remainingAmount">Remaining Amount (₪) *</Label>
                <Input
                  id="remainingAmount"
                  type="number"
                  step="0.01"
                  value={formData.remainingAmount}
                  onChange={(e) => setFormData({ ...formData, remainingAmount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="monthlyPayment">Monthly Payment (₪) *</Label>
                <Input
                  id="monthlyPayment"
                  type="number"
                  step="0.01"
                  value={formData.monthlyPayment}
                  onChange={(e) => setFormData({ ...formData, monthlyPayment: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="paymentsLeft">Payments Left *</Label>
                <Input
                  id="paymentsLeft"
                  type="number"
                  value={formData.paymentsLeft}
                  onChange={(e) => setFormData({ ...formData, paymentsLeft: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate">Start Date *</Label>
                <Input
                  id="startDate"
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interestRate">Interest Rate (%)</Label>
                <Input
                  id="interestRate"
                  type="number"
                  step="0.01"
                  value={formData.interestRate}
                  onChange={(e) => setFormData({ ...formData, interestRate: e.target.value })}
                  placeholder="Optional"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Input
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Additional notes..."
              />
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
              ) : editingLoan ? (
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

