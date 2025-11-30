"use client";

import { useEffect, useState, useCallback } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { getTransactions, createTransaction, updateTransaction, deleteTransaction, getBills, createBill, updateBill, deleteBill } from "@/lib/firestore-helpers";
import type { Transaction, Bill } from "@/firebase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Edit2, Trash2, TrendingUp, TrendingDown, Wallet, Calendar } from "lucide-react";
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
import { format, startOfMonth, endOfMonth } from "date-fns";

export default function FinancePage() {
  const [user, setUser] = useState<User | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [openBill, setOpenBill] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    amount: "",
    category: "",
    date: new Date().toISOString().split("T")[0],
    type: "expense" as "income" | "expense",
    notes: "",
  });

  const [billFormData, setBillFormData] = useState({
    name: "",
    amount: "",
    dueDate: "",
    paid: false,
    recurring: false,
    category: "",
    notes: "",
  });

  const loadData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const [transactionsData, billsData] = await Promise.all([
        getTransactions(userId),
        getBills(userId),
      ]);
      setTransactions(transactionsData);
      setBills(billsData);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load financial data",
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

  // Calculate monthly totals
  const monthlyTransactions = transactions.filter((t) => {
    const transactionDate = new Date(t.date);
    const monthStart = startOfMonth(new Date());
    const monthEnd = endOfMonth(new Date());
    return transactionDate >= monthStart && transactionDate <= monthEnd;
  });

  const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const monthlyExpenses = monthlyTransactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const balance = monthlyIncome - monthlyExpenses;
  const unpaidBills = bills.filter((b) => !b.paid && new Date(b.dueDate) <= new Date());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const transactionData = {
        amount: parseFloat(formData.amount),
        category: formData.category,
        date: new Date(formData.date),
        type: formData.type,
        notes: formData.notes || undefined,
      };

      if (editingTransaction) {
        await updateTransaction(user.uid, editingTransaction.id, transactionData);
        toast({ title: "Transaction updated", description: "Your transaction has been updated." });
      } else {
        await createTransaction(user.uid, transactionData);
        toast({ title: "Transaction created", description: "Your new transaction has been created." });
      }

      setOpen(false);
      resetForm();
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save transaction",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (transactionId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this transaction?")) return;

    try {
      await deleteTransaction(user.uid, transactionId);
      toast({ title: "Transaction deleted", description: "The transaction has been deleted." });
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete transaction",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      amount: transaction.amount.toString(),
      category: transaction.category,
      date: new Date(transaction.date).toISOString().split("T")[0],
      type: transaction.type,
      notes: transaction.notes || "",
    });
    setOpen(true);
  };

  const resetForm = () => {
    setFormData({
      amount: "",
      category: "",
      date: new Date().toISOString().split("T")[0],
      type: "expense",
      notes: "",
    });
    setEditingTransaction(null);
  };

  const handleBillSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const billData = {
        name: billFormData.name,
        amount: parseFloat(billFormData.amount),
        dueDate: new Date(billFormData.dueDate),
        paid: billFormData.paid,
        recurring: billFormData.recurring,
        category: billFormData.category || undefined,
        notes: billFormData.notes || undefined,
      };

      if (editingBill) {
        await updateBill(user.uid, editingBill.id, billData);
        toast({ title: "Bill updated", description: "Your bill has been updated." });
      } else {
        await createBill(user.uid, billData);
        toast({ title: "Bill created", description: "Your new bill has been created." });
      }

      setOpenBill(false);
      resetBillForm();
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save bill",
        variant: "destructive",
      });
    }
  };

  const handleBillDelete = async (billId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this bill?")) return;

    try {
      await deleteBill(user.uid, billId);
      toast({ title: "Bill deleted", description: "The bill has been deleted." });
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete bill",
        variant: "destructive",
      });
    }
  };

  const handleBillEdit = (bill: Bill) => {
    setEditingBill(bill);
    setBillFormData({
      name: bill.name,
      amount: bill.amount.toString(),
      dueDate: new Date(bill.dueDate).toISOString().split("T")[0],
      paid: bill.paid,
      recurring: bill.recurring,
      category: bill.category || "",
      notes: bill.notes || "",
    });
    setOpenBill(true);
  };

  const handleBillTogglePaid = async (bill: Bill) => {
    if (!user) return;
    try {
      await updateBill(user.uid, bill.id, { paid: !bill.paid });
      toast({
        title: bill.paid ? "Bill marked as unpaid" : "Bill marked as paid",
        description: `"${bill.name}" has been ${bill.paid ? "unpaid" : "paid"}.`,
      });
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update bill",
        variant: "destructive",
      });
    }
  };

  const resetBillForm = () => {
    setBillFormData({
      name: "",
      amount: "",
      dueDate: "",
      paid: false,
      recurring: false,
      category: "",
      notes: "",
    });
    setEditingBill(null);
  };

  const categories = [
    "Food",
    "Transportation",
    "Shopping",
    "Bills",
    "Entertainment",
    "Education",
    "Health",
    "Salary",
    "Other",
  ];

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
        title="Finance"
        description="Manage your finances, expenses, and budget"
      >
        <div className="flex gap-2">
          <Dialog open={openBill} onOpenChange={(o) => { setOpenBill(o); if (!o) resetBillForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                Add Bill
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingBill ? "Edit Bill" : "Create New Bill"}
                </DialogTitle>
                <DialogDescription>
                  {editingBill ? "Update your bill details" : "Add a new bill to track"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleBillSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="billName">Bill Name *</Label>
                    <Input
                      id="billName"
                      value={billFormData.name}
                      onChange={(e) => setBillFormData({ ...billFormData, name: e.target.value })}
                      required
                      placeholder="e.g., Rent, Electricity"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="billAmount">Amount (₪) *</Label>
                      <Input
                        id="billAmount"
                        type="number"
                        step="0.01"
                        value={billFormData.amount}
                        onChange={(e) => setBillFormData({ ...billFormData, amount: e.target.value })}
                        required
                        placeholder="0.00"
                        min="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="billDueDate">Due Date *</Label>
                      <Input
                        id="billDueDate"
                        type="date"
                        value={billFormData.dueDate}
                        onChange={(e) => setBillFormData({ ...billFormData, dueDate: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billCategory">Category</Label>
                    <Select
                      value={billFormData.category || undefined}
                      onValueChange={(value) => setBillFormData({ ...billFormData, category: value === "none" ? "" : value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="billRecurring"
                        checked={billFormData.recurring}
                        onChange={(e) => setBillFormData({ ...billFormData, recurring: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="billRecurring" className="text-sm font-normal">
                        Recurring bill
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="billPaid"
                        checked={billFormData.paid}
                        onChange={(e) => setBillFormData({ ...billFormData, paid: e.target.checked })}
                        className="rounded border-gray-300"
                      />
                      <Label htmlFor="billPaid" className="text-sm font-normal">
                        Paid
                      </Label>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="billNotes">Notes</Label>
                    <Textarea
                      id="billNotes"
                      value={billFormData.notes}
                      onChange={(e) => setBillFormData({ ...billFormData, notes: e.target.value })}
                      placeholder="Additional notes"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setOpenBill(false); resetBillForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingBill ? "Update" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>
                  {editingTransaction ? "Edit Transaction" : "Create New Transaction"}
                </DialogTitle>
                <DialogDescription>
                  {editingTransaction
                    ? "Update your transaction details"
                    : "Add a new income or expense"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Type *</Label>
                    <Select
                      value={formData.type}
                      onValueChange={(value: "income" | "expense") =>
                        setFormData({ ...formData, type: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="income">Income</SelectItem>
                        <SelectItem value="expense">Expense</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="amount">Amount (₪) *</Label>
                    <Input
                      id="amount"
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      required
                      placeholder="0.00"
                      min="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category *</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
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
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Additional notes"
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); resetForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingTransaction ? "Update" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Income</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{monthlyIncome.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyTransactions.filter((t) => t.type === "income").length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Expenses</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₪{monthlyExpenses.toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              {monthlyTransactions.filter((t) => t.type === "expense").length} transactions
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance >= 0 ? "text-green-600" : "text-red-600"}`}>
              ₪{balance.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">Current balance</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Your latest financial activity</CardDescription>
          </CardHeader>
          <CardContent>
            {transactions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet. Start tracking your expenses!</p>
            ) : (
              <div className="space-y-3">
                {transactions.slice(0, 5).map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {transaction.type === "income" ? (
                          <TrendingUp className="h-4 w-4 text-green-500" />
                        ) : (
                          <TrendingDown className="h-4 w-4 text-red-500" />
                        )}
                        <div>
                          <p className="font-medium">{transaction.category}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(transaction.date), "MMM d, yyyy")}
                          </p>
                        </div>
                      </div>
                      {transaction.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{transaction.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`font-semibold ${
                          transaction.type === "income" ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {transaction.type === "income" ? "+" : "-"}₪{transaction.amount.toFixed(2)}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(transaction)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(transaction.id)}
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

        <Card>
          <CardHeader>
            <CardTitle>Bills</CardTitle>
            <CardDescription>Manage your bills and payments</CardDescription>
          </CardHeader>
          <CardContent>
            {bills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No bills scheduled yet. Add your first bill!</p>
            ) : (
              <div className="space-y-3">
                {bills.map((bill) => (
                  <div
                    key={bill.id}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors ${
                      bill.paid ? "opacity-60" : ""
                    }`}
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className={`font-medium ${bill.paid ? "line-through" : ""}`}>{bill.name}</p>
                        {bill.recurring && (
                          <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                            Recurring
                          </span>
                        )}
                        {bill.paid && (
                          <span className="text-xs px-2 py-0.5 rounded bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                            Paid
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Calendar className="h-3 w-3" />
                        Due: {format(new Date(bill.dueDate), "MMM d, yyyy")}
                        {bill.category && ` • ${bill.category}`}
                      </p>
                      {bill.notes && (
                        <p className="text-xs text-muted-foreground mt-1">{bill.notes}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">₪{bill.amount.toFixed(2)}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleBillTogglePaid(bill)}
                        title={bill.paid ? "Mark as unpaid" : "Mark as paid"}
                      >
                        {bill.paid ? (
                          <span className="text-green-500">✓</span>
                        ) : (
                          <span className="text-gray-400">○</span>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleBillEdit(bill)}
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleBillDelete(bill.id)}
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
      </div>
    </motion.div>
  );
}
