"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/firebase/client";
import { 
  getJobs, 
  createJob, 
  updateJob, 
  deleteJob,
  getShifts,
  createShift,
  updateShift,
  deleteShift,
  getWorkRecords,
  createWorkRecord,
  updateWorkRecord,
  getFreelanceIncomes,
  createFreelanceIncome,
  updateFreelanceIncome,
  deleteFreelanceIncome
} from "@/lib/work-helpers";
import type { Job, Shift, WorkRecord, FreelanceIncome } from "@/firebase/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Edit2, Trash2, Briefcase, Calendar, Clock, DollarSign, Plane, Heart, Calculator, FileText, TrendingUp, ChevronDown, ChevronUp, ChevronsDownUp, ChevronsUpDown } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { format, startOfMonth, endOfMonth, isAfter, isBefore, parse, addMonths, subMonths } from "date-fns";

export default function WorkPage() {
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [workRecords, setWorkRecords] = useState<WorkRecord[]>([]);
  const [freelanceIncomes, setFreelanceIncomes] = useState<FreelanceIncome[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<Date>(new Date());
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [openShiftDialog, setOpenShiftDialog] = useState(false);
  const [openFreelanceDialog, setOpenFreelanceDialog] = useState(false);
  const [openSaveRecordDialog, setOpenSaveRecordDialog] = useState(false);
  const [openManualSalaryDialog, setOpenManualSalaryDialog] = useState(false);
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editingShift, setEditingShift] = useState<Shift | null>(null);
  const [editingFreelance, setEditingFreelance] = useState<FreelanceIncome | null>(null);
  const [editingRecord, setEditingRecord] = useState<WorkRecord | null>(null);
  const [shiftsExpanded, setShiftsExpanded] = useState(false);
  const [expandedShifts, setExpandedShifts] = useState<Set<string>>(new Set());
  const { toast } = useToast();

  const toggleShiftExpansion = (shiftId: string) => {
    setExpandedShifts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(shiftId)) {
        newSet.delete(shiftId);
      } else {
        newSet.add(shiftId);
      }
      return newSet;
    });
  };

  const [jobFormData, setJobFormData] = useState({
    title: "",
    company: "",
    hourlyRate: "",
    overtimeRate: "1.25",
    overtimeThreshold: "160",
    transportPayment: "",
    transportPaymentDate: "1",
    paidVacationDays: "0",
    usedVacationDays: "0",
    illnessDays: "0",
    usedIllnessDays: "0",
  });

  const [shiftFormData, setShiftFormData] = useState({
    jobId: "",
    date: new Date().toISOString().split("T")[0],
    startTime: "09:00",
    endTime: "17:00",
    shiftType: "morning" as "morning" | "afternoon" | "night",
    notes: "",
  });

  const [freelanceFormData, setFreelanceFormData] = useState({
    title: "",
    description: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    client: "",
    category: "",
    status: "pending" as "pending" | "paid" | "overdue",
    dueDate: "",
    paidDate: "",
    notes: "",
  });

  const [manualSalaryFormData, setManualSalaryFormData] = useState({
    jobId: "",
    year: new Date().getFullYear(),
    month: new Date().getMonth() + 1,
    totalPay: "",
    totalHours: "",
    regularPay: "",
    overtime125Pay: "",
    overtime150Pay: "",
    transportPayment: "",
    notes: "",
  });

  const loadData = useCallback(async (userId: string) => {
    try {
      setLoading(true);
      const [jobsData, shiftsData, recordsData, freelanceData] = await Promise.all([
        getJobs(userId),
        getShifts(userId),
        getWorkRecords(userId),
        getFreelanceIncomes(userId),
      ]);
      setJobs(jobsData);
      setShifts(shiftsData);
      setWorkRecords(recordsData);
      setFreelanceIncomes(freelanceData);
      
      if (jobsData.length > 0 && !selectedJob) {
        setSelectedJob(jobsData[0]);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load work data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, selectedJob]);

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

  // Calculate hours from time strings
  const calculateHours = (startTime: string, endTime: string): number => {
    const [startH, startM] = startTime.split(":").map(Number);
    const [endH, endM] = endTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    let hours = (endMinutes - startMinutes) / 60;
    // Handle overnight shifts (e.g., 22:00 to 06:00)
    if (hours < 0) {
      hours += 24;
    }
    return hours;
  };

  // Calculate shift pay based on shift type and day of week
  const calculateShiftPay = (
    shift: Shift, 
    job: Job
  ): { 
    regularPay: number; 
    overtime125Pay: number; 
    overtime150Pay: number; 
    totalPay: number;
    regularHours: number;
    overtime125Hours: number;
    overtime150Hours: number;
  } => {
    const date = shift.date;
    const dayOfWeek = date.getDay(); // 0 = Sunday, 5 = Friday, 6 = Saturday
    const hours = shift.hours;
    
    let regularHours = 0;
    let overtime125Hours = 0;
    let overtime150Hours = 0;

    if (dayOfWeek === 6) {
      // Saturday: 100% for first 7 hours, 125% for 8-10, 150% for 11-12
      regularHours = Math.min(hours, 7);
      const remainingAfter7 = Math.max(0, hours - 7);
      overtime125Hours = remainingAfter7 > 0 ? Math.min(remainingAfter7, 3) : 0; // Hours 8, 9, 10 (max 3 hours)
      const remainingAfter10 = Math.max(0, hours - 10);
      overtime150Hours = remainingAfter10 > 0 ? remainingAfter10 : 0; // Hours 11, 12
    } else if (shift.shiftType === "night") {
      // Night shift: 100% for first 7 hours, 125% for 8th hour
      regularHours = Math.min(hours, 7);
      overtime125Hours = hours > 7 ? Math.min(hours - 7, 1) : 0;
      overtime150Hours = 0;
    } else if (dayOfWeek === 5) {
      // Friday: 100% for first 8 hours, 125% for 9-10, 150% for 11-12
      regularHours = Math.min(hours, 8);
      overtime125Hours = hours > 8 ? Math.min(hours - 8, 2) : 0; // Hours 9, 10
      overtime150Hours = hours > 10 ? hours - 10 : 0; // Hours 11, 12
    } else {
      // Morning/Afternoon shifts (Monday-Thursday, Sunday): 100% for all hours
      regularHours = hours;
      overtime125Hours = 0;
      overtime150Hours = 0;
    }

    const regularPay = regularHours * job.hourlyRate;
    const overtime125Pay = overtime125Hours * job.hourlyRate * 1.25;
    const overtime150Pay = overtime150Hours * job.hourlyRate * 1.5;
    const totalPay = regularPay + overtime125Pay + overtime150Pay;

    return {
      regularPay,
      overtime125Pay,
      overtime150Pay,
      totalPay,
      regularHours,
      overtime125Hours,
      overtime150Hours,
    };
  };

  // Get shift type colors
  const getShiftTypeColors = (shiftType: string, isOvertime: boolean) => {
    if (isOvertime) {
      return {
        bg: "bg-orange-500/20",
        text: "text-orange-300",
        border: "border-orange-500/30",
      };
    }
    switch (shiftType) {
      case "morning":
        return {
          bg: "bg-blue-500/20",
          text: "text-blue-300",
          border: "border-blue-500/30",
        };
      case "afternoon":
        return {
          bg: "bg-purple-500/20",
          text: "text-purple-300",
          border: "border-purple-500/30",
        };
      case "night":
        return {
          bg: "bg-indigo-500/20",
          text: "text-indigo-300",
          border: "border-indigo-500/30",
        };
      default:
        return {
          bg: "bg-gray-500/20",
          text: "text-gray-300",
          border: "border-gray-500/30",
        };
    }
  };

  // Get shifts for selected month
  const monthShifts = useMemo(() => {
    if (!selectedJob) return [];
    const monthStart = startOfMonth(selectedMonth);
    const monthEnd = endOfMonth(selectedMonth);
    
    return shifts.filter(shift => 
      shift.jobId === selectedJob.id &&
      shift.date >= monthStart &&
      shift.date <= monthEnd
    ).sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [shifts, selectedJob, selectedMonth]);

  // Get current month's work record if exists
  const currentMonthRecord = useMemo(() => {
    if (!selectedJob) return null;
    const month = selectedMonth.getMonth() + 1;
    const year = selectedMonth.getFullYear();
    return workRecords.find(
      record => record.jobId === selectedJob.id && record.month === month && record.year === year
    ) || null;
  }, [workRecords, selectedJob, selectedMonth]);

  // Get all records for current year
  const yearlyRecords = useMemo(() => {
    if (!selectedJob) return [];
    const currentYear = new Date().getFullYear();
    return workRecords
      .filter(record => record.jobId === selectedJob.id && record.year === currentYear)
      .sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.month - a.month;
      });
  }, [workRecords, selectedJob]);

  // Calculate yearly totals
  const yearlyTotals = useMemo(() => {
    if (yearlyRecords.length === 0) {
      return {
        totalPay: 0,
        totalHours: 0,
        monthsCount: 0,
      };
    }
    return yearlyRecords.reduce(
      (acc, record) => ({
        totalPay: acc.totalPay + record.totalPay,
        totalHours: acc.totalHours + record.totalHours,
        monthsCount: acc.monthsCount + 1,
      }),
      { totalPay: 0, totalHours: 0, monthsCount: 0 }
    );
  }, [yearlyRecords]);

  // Get upcoming shifts
  const upcomingShifts = useMemo(() => {
    const now = new Date();
    return shifts
      .filter(shift => shift.date >= now)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 10);
  }, [shifts]);

  // Group work records by year
  const workRecordsByYear = useMemo(() => {
    const grouped: Record<number, WorkRecord[]> = {};
    workRecords.forEach(record => {
      if (!grouped[record.year]) {
        grouped[record.year] = [];
      }
      grouped[record.year].push(record);
    });
    // Sort each year's records by month (Jan to Dec)
    Object.keys(grouped).forEach(year => {
      grouped[parseInt(year)].sort((a, b) => a.month - b.month);
    });
    return grouped;
  }, [workRecords]);

  // Get all years sorted descending
  const years = useMemo(() => {
    return Object.keys(workRecordsByYear)
      .map(y => parseInt(y))
      .sort((a, b) => b - a);
  }, [workRecordsByYear]);

  // Calculate monthly totals
  const monthlyTotals = useMemo(() => {
    if (!selectedJob || monthShifts.length === 0) {
      return {
      totalHours: 0,
      regularHours: 0,
      overtimeHours: 0,
      regularPay: 0,
      overtimePay: 0,
      overtime125Pay: 0,
      overtime150Pay: 0,
      transportPayment: 0,
      totalPay: 0,
    };
    }

    let totalHours = 0;
    let regularHours = 0;
    let overtimeHours = 0;
    let regularPay = 0;
    let overtimePay = 0;
    let overtime125Pay = 0;
    let overtime150Pay = 0;

    monthShifts.forEach(shift => {
      totalHours += shift.hours;
      regularHours += shift.regularHours;
      overtimeHours += shift.overtime125Hours + shift.overtime150Hours;
      
      if (selectedJob) {
        const pay = calculateShiftPay(shift, selectedJob);
        regularPay += pay.regularPay;
        overtime125Pay += pay.overtime125Pay;
        overtime150Pay += pay.overtime150Pay;
        overtimePay += pay.overtime125Pay + pay.overtime150Pay;
      }
    });

    const transportPayment = selectedJob?.transportPayment || 0;
    const totalPay = regularPay + overtimePay + transportPayment;

    return {
      totalHours,
      regularHours,
      overtimeHours,
      regularPay,
      overtimePay,
      overtime125Pay,
      overtime150Pay,
      transportPayment,
      totalPay,
    };
  }, [monthShifts, selectedJob]);

  const resetJobForm = () => {
    setJobFormData({
      title: "",
      company: "",
      hourlyRate: "",
      overtimeRate: "1.25",
      overtimeThreshold: "160",
      transportPayment: "",
      transportPaymentDate: "1",
      paidVacationDays: "0",
      usedVacationDays: "0",
      illnessDays: "0",
      usedIllnessDays: "0",
    });
    setEditingJob(null);
  };

  const resetShiftForm = () => {
    setShiftFormData({
      jobId: selectedJob?.id || "",
      date: new Date().toISOString().split("T")[0],
      startTime: "09:00",
      endTime: "17:00",
      shiftType: "morning",
      notes: "",
    });
    setEditingShift(null);
  };

  const handleJobSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const jobData = {
        title: jobFormData.title,
        company: jobFormData.company,
        hourlyRate: parseFloat(jobFormData.hourlyRate),
        overtimeRate: parseFloat(jobFormData.overtimeRate),
        overtimeThreshold: parseFloat(jobFormData.overtimeThreshold),
        transportPayment: parseFloat(jobFormData.transportPayment) || 0,
        transportPaymentDate: parseInt(jobFormData.transportPaymentDate),
        paidVacationDays: parseInt(jobFormData.paidVacationDays) || 0,
        usedVacationDays: parseInt(jobFormData.usedVacationDays) || 0,
        illnessDays: parseInt(jobFormData.illnessDays) || 0,
        usedIllnessDays: parseInt(jobFormData.usedIllnessDays) || 0,
      };

      if (editingJob) {
        await updateJob(user.uid, editingJob.id, jobData);
        toast({ title: "Job updated", description: "Job information has been updated." });
      } else {
        await createJob(user.uid, jobData);
        toast({ title: "Job created", description: "New job has been added." });
      }
      
      setOpenJobDialog(false);
      resetJobForm();
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save job",
        variant: "destructive",
      });
    }
  };

  const handleShiftSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedJob) return;

    try {
      const hours = calculateHours(shiftFormData.startTime, shiftFormData.endTime);
      const shiftDate = new Date(shiftFormData.date);
      
      // Calculate pay breakdown to determine hours at each rate
      const tempShift: Shift = {
        id: "",
        jobId: shiftFormData.jobId,
        date: shiftDate,
        startTime: shiftFormData.startTime,
        endTime: shiftFormData.endTime,
        hours,
        shiftType: shiftFormData.shiftType,
        isOvertime: false,
        regularHours: 0,
        overtime125Hours: 0,
        overtime150Hours: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      const payBreakdown = calculateShiftPay(tempShift, selectedJob);
      const isOvertime = payBreakdown.overtime125Hours > 0 || payBreakdown.overtime150Hours > 0;

      const shiftData = {
        jobId: shiftFormData.jobId,
        date: shiftDate,
        startTime: shiftFormData.startTime,
        endTime: shiftFormData.endTime,
        hours,
        shiftType: shiftFormData.shiftType,
        isOvertime,
        regularHours: payBreakdown.regularHours,
        overtime125Hours: payBreakdown.overtime125Hours,
        overtime150Hours: payBreakdown.overtime150Hours,
        notes: shiftFormData.notes || undefined,
      };

      if (editingShift) {
        await updateShift(user.uid, editingShift.id, shiftData);
        toast({ title: "Shift updated", description: "Shift has been updated." });
      } else {
        await createShift(user.uid, shiftData);
        toast({ title: "Shift added", description: "New shift has been added." });
      }

      setOpenShiftDialog(false);
      resetShiftForm();
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save shift",
        variant: "destructive",
      });
    }
  };

  const handleEditJob = (job: Job) => {
    setEditingJob(job);
    setJobFormData({
      title: job.title,
      company: job.company,
      hourlyRate: job.hourlyRate.toString(),
      overtimeRate: job.overtimeRate.toString(),
      overtimeThreshold: job.overtimeThreshold.toString(),
      transportPayment: job.transportPayment.toString(),
      transportPaymentDate: job.transportPaymentDate.toString(),
      paidVacationDays: job.paidVacationDays.toString(),
      usedVacationDays: job.usedVacationDays.toString(),
      illnessDays: job.illnessDays.toString(),
      usedIllnessDays: job.usedIllnessDays.toString(),
    });
    setOpenJobDialog(true);
  };

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift);
    setShiftFormData({
      jobId: shift.jobId,
      date: format(shift.date, "yyyy-MM-dd"),
      startTime: shift.startTime,
      endTime: shift.endTime,
      shiftType: shift.shiftType,
      notes: shift.notes || "",
    });
    setOpenShiftDialog(true);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this job? All associated shifts will also be deleted.")) return;

    try {
      await deleteJob(user.uid, jobId);
      toast({ title: "Job deleted", description: "Job has been deleted." });
      if (selectedJob?.id === jobId) {
        setSelectedJob(null);
      }
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete job",
        variant: "destructive",
      });
    }
  };

  const handleDeleteShift = async (shiftId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this shift?")) return;

    try {
      await deleteShift(user.uid, shiftId);
      toast({ title: "Shift deleted", description: "Shift has been deleted." });
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete shift",
        variant: "destructive",
      });
    }
  };

  const resetFreelanceForm = () => {
    setFreelanceFormData({
      title: "",
      description: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      client: "",
      category: "",
      status: "pending",
      dueDate: "",
      paidDate: "",
      notes: "",
    });
    setEditingFreelance(null);
  };

  const handleFreelanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const incomeData = {
        title: freelanceFormData.title,
        description: freelanceFormData.description || undefined,
        amount: parseFloat(freelanceFormData.amount),
        date: new Date(freelanceFormData.date),
        client: freelanceFormData.client || undefined,
        category: freelanceFormData.category || undefined,
        status: freelanceFormData.status,
        dueDate: freelanceFormData.dueDate ? new Date(freelanceFormData.dueDate) : undefined,
        paidDate: freelanceFormData.paidDate ? new Date(freelanceFormData.paidDate) : undefined,
        notes: freelanceFormData.notes || undefined,
      };

      if (editingFreelance) {
        await updateFreelanceIncome(user.uid, editingFreelance.id, incomeData);
        toast({ title: "Freelance income updated", description: "Freelance income has been updated." });
      } else {
        await createFreelanceIncome(user.uid, incomeData);
        toast({ title: "Freelance income added", description: "New freelance income has been added." });
      }

      setOpenFreelanceDialog(false);
      resetFreelanceForm();
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save freelance income",
        variant: "destructive",
      });
    }
  };

  const handleEditFreelance = (income: FreelanceIncome) => {
    setEditingFreelance(income);
    setFreelanceFormData({
      title: income.title,
      description: income.description || "",
      amount: income.amount.toString(),
      date: format(income.date, "yyyy-MM-dd"),
      client: income.client || "",
      category: income.category || "",
      status: income.status,
      dueDate: income.dueDate ? format(income.dueDate, "yyyy-MM-dd") : "",
      paidDate: income.paidDate ? format(income.paidDate, "yyyy-MM-dd") : "",
      notes: income.notes || "",
    });
    setOpenFreelanceDialog(true);
  };

  const handleDeleteFreelance = async (incomeId: string) => {
    if (!user) return;
    if (!confirm("Are you sure you want to delete this freelance income?")) return;

    try {
      await deleteFreelanceIncome(user.uid, incomeId);
      toast({ title: "Freelance income deleted", description: "Freelance income has been deleted." });
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete freelance income",
        variant: "destructive",
      });
    }
  };

  const handleManualSalarySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const recordData = {
        jobId: manualSalaryFormData.jobId,
        month: manualSalaryFormData.month,
        year: manualSalaryFormData.year,
        totalHours: parseFloat(manualSalaryFormData.totalHours) || 0,
        regularHours: parseFloat(manualSalaryFormData.totalHours) || 0,
        overtimeHours: 0,
        overtime125Hours: 0,
        overtime150Hours: 0,
        regularPay: parseFloat(manualSalaryFormData.regularPay) || 0,
        overtimePay: 0,
        overtime125Pay: parseFloat(manualSalaryFormData.overtime125Pay) || 0,
        overtime150Pay: parseFloat(manualSalaryFormData.overtime150Pay) || 0,
        transportPayment: parseFloat(manualSalaryFormData.transportPayment) || 0,
        vacationDaysUsed: 0,
        illnessDaysUsed: 0,
        totalPay: parseFloat(manualSalaryFormData.totalPay),
        shifts: [], // Empty array for manually added records
      };

      // Check if record already exists
      const existingRecord = workRecords.find(
        r => r.jobId === manualSalaryFormData.jobId && 
        r.month === manualSalaryFormData.month && 
        r.year === manualSalaryFormData.year
      );

      if (existingRecord) {
        await updateWorkRecord(user.uid, existingRecord.id, recordData);
        toast({ title: "Salary record updated", description: "Monthly salary has been updated." });
      } else {
        await createWorkRecord(user.uid, recordData);
        toast({ title: "Salary record added", description: "Monthly salary has been added." });
      }

      setOpenManualSalaryDialog(false);
      setManualSalaryFormData({
        jobId: "",
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
        totalPay: "",
        totalHours: "",
        regularPay: "",
        overtime125Pay: "",
        overtime150Pay: "",
        transportPayment: "",
        notes: "",
      });
      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save salary record",
        variant: "destructive",
      });
    }
  };

  const handleSaveMonthlyRecord = async () => {
    if (!user || !selectedJob || monthShifts.length === 0) {
      toast({
        title: "Error",
        description: "No shifts to save for this month",
        variant: "destructive",
      });
      return;
    }

    try {
      const month = selectedMonth.getMonth() + 1;
      const year = selectedMonth.getFullYear();
      const shiftIds = monthShifts.map(s => s.id);

      const recordData = {
        jobId: selectedJob.id,
        month,
        year,
        totalHours: monthlyTotals.totalHours,
        regularHours: monthlyTotals.regularHours,
        overtimeHours: monthlyTotals.overtimeHours,
        overtime125Hours: monthShifts.reduce((sum, s) => sum + s.overtime125Hours, 0),
        overtime150Hours: monthShifts.reduce((sum, s) => sum + s.overtime150Hours, 0),
        regularPay: monthlyTotals.regularPay,
        overtimePay: monthlyTotals.overtimePay,
        overtime125Pay: monthlyTotals.overtime125Pay,
        overtime150Pay: monthlyTotals.overtime150Pay,
        transportPayment: monthlyTotals.transportPayment,
        vacationDaysUsed: 0, // Can be updated later
        illnessDaysUsed: 0, // Can be updated later
        totalPay: monthlyTotals.totalPay,
        shifts: shiftIds,
      };

      if (currentMonthRecord) {
        await updateWorkRecord(user.uid, currentMonthRecord.id, recordData);
        toast({ title: "Record updated", description: "Monthly record has been updated." });
      } else {
        await createWorkRecord(user.uid, recordData);
        toast({ title: "Record saved", description: "Monthly record has been saved." });
      }

      loadData(user.uid);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save monthly record",
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <PageHeader
        title="Work & Shifts"
        description="Manage your job, shifts, and salary calculations"
      >
        <div className="flex flex-wrap gap-2">
          <Dialog open={openJobDialog} onOpenChange={(o) => { setOpenJobDialog(o); if (!o) resetJobForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial">
                <Briefcase className="mr-2 h-4 w-4" />
                {jobs.length === 0 ? "Add Job" : "Edit Job"}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingJob ? "Edit Job" : "Add New Job"}</DialogTitle>
                <DialogDescription>
                  {editingJob ? "Update your job information" : "Add your job details and payment settings"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleJobSubmit}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Job Title *</Label>
                      <Input
                        id="title"
                        value={jobFormData.title}
                        onChange={(e) => setJobFormData({ ...jobFormData, title: e.target.value })}
                        required
                        placeholder="e.g., Software Developer"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company">Company *</Label>
                      <Input
                        id="company"
                        value={jobFormData.company}
                        onChange={(e) => setJobFormData({ ...jobFormData, company: e.target.value })}
                        required
                        placeholder="Company name"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="hourlyRate">Hourly Rate (₪) *</Label>
                      <Input
                        id="hourlyRate"
                        type="number"
                        step="0.01"
                        value={jobFormData.hourlyRate}
                        onChange={(e) => setJobFormData({ ...jobFormData, hourlyRate: e.target.value })}
                        required
                        placeholder="50.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overtimeRate">Overtime Rate</Label>
                      <Input
                        id="overtimeRate"
                        type="number"
                        step="0.01"
                        value={jobFormData.overtimeRate}
                        onChange={(e) => setJobFormData({ ...jobFormData, overtimeRate: e.target.value })}
                        placeholder="1.25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overtimeThreshold">Overtime Threshold (hours)</Label>
                      <Input
                        id="overtimeThreshold"
                        type="number"
                        value={jobFormData.overtimeThreshold}
                        onChange={(e) => setJobFormData({ ...jobFormData, overtimeThreshold: e.target.value })}
                        placeholder="160"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="transportPayment">Transport Payment (₪/month)</Label>
                      <Input
                        id="transportPayment"
                        type="number"
                        step="0.01"
                        value={jobFormData.transportPayment}
                        onChange={(e) => setJobFormData({ ...jobFormData, transportPayment: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="transportPaymentDate">Transport Payment Day</Label>
                      <Input
                        id="transportPaymentDate"
                        type="number"
                        min="1"
                        max="31"
                        value={jobFormData.transportPaymentDate}
                        onChange={(e) => setJobFormData({ ...jobFormData, transportPaymentDate: e.target.value })}
                        placeholder="1"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="paidVacationDays">Paid Vacation Days (per year)</Label>
                      <Input
                        id="paidVacationDays"
                        type="number"
                        value={jobFormData.paidVacationDays}
                        onChange={(e) => setJobFormData({ ...jobFormData, paidVacationDays: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="usedVacationDays">Used Vacation Days</Label>
                      <Input
                        id="usedVacationDays"
                        type="number"
                        value={jobFormData.usedVacationDays}
                        onChange={(e) => setJobFormData({ ...jobFormData, usedVacationDays: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="illnessDays">Illness Days (per year)</Label>
                      <Input
                        id="illnessDays"
                        type="number"
                        value={jobFormData.illnessDays}
                        onChange={(e) => setJobFormData({ ...jobFormData, illnessDays: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="usedIllnessDays">Used Illness Days</Label>
                      <Input
                        id="usedIllnessDays"
                        type="number"
                        value={jobFormData.usedIllnessDays}
                        onChange={(e) => setJobFormData({ ...jobFormData, usedIllnessDays: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setOpenJobDialog(false); resetJobForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingJob ? "Update" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openShiftDialog} onOpenChange={(o) => { setOpenShiftDialog(o); if (!o) resetShiftForm(); }}>
            <DialogTrigger asChild>
              <Button disabled={!selectedJob}>
                <Plus className="mr-2 h-4 w-4" />
                Add Shift
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{editingShift ? "Edit Shift" : "Add New Shift"}</DialogTitle>
                <DialogDescription>
                  {editingShift ? "Update shift details" : "Add a new work shift"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleShiftSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="shiftJobId">Job *</Label>
                    <Select
                      value={shiftFormData.jobId}
                      onValueChange={(value) => setShiftFormData({ ...shiftFormData, jobId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title} - {job.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shiftDate">Date *</Label>
                    <Input
                      id="shiftDate"
                      type="date"
                      value={shiftFormData.date}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="startTime">Start Time *</Label>
                      <Input
                        id="startTime"
                        type="time"
                        value={shiftFormData.startTime}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, startTime: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="endTime">End Time *</Label>
                      <Input
                        id="endTime"
                        type="time"
                        value={shiftFormData.endTime}
                        onChange={(e) => setShiftFormData({ ...shiftFormData, endTime: e.target.value })}
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shiftType">Shift Type *</Label>
                    <Select
                      value={shiftFormData.shiftType}
                      onValueChange={(value: "morning" | "afternoon" | "night") => 
                        setShiftFormData({ ...shiftFormData, shiftType: value })
                      }
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select shift type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="morning">Morning</SelectItem>
                        <SelectItem value="afternoon">Afternoon</SelectItem>
                        <SelectItem value="night">Night</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="shiftNotes">Notes</Label>
                    <Textarea
                      id="shiftNotes"
                      value={shiftFormData.notes}
                      onChange={(e) => setShiftFormData({ ...shiftFormData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setOpenShiftDialog(false); resetShiftForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingShift ? "Update" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openFreelanceDialog} onOpenChange={(o) => { setOpenFreelanceDialog(o); if (!o) resetFreelanceForm(); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial">
                <TrendingUp className="mr-2 h-4 w-4" />
                Add Freelance
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingFreelance ? "Edit Freelance Income" : "Add Freelance Income"}</DialogTitle>
                <DialogDescription>
                  {editingFreelance ? "Update freelance income details" : "Add a new freelance income entry"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleFreelanceSubmit}>
                <div className="space-y-4 py-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="freelanceTitle">Title *</Label>
                      <Input
                        id="freelanceTitle"
                        value={freelanceFormData.title}
                        onChange={(e) => setFreelanceFormData({ ...freelanceFormData, title: e.target.value })}
                        required
                        placeholder="e.g., Website Design"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freelanceAmount">Amount (₪) *</Label>
                      <Input
                        id="freelanceAmount"
                        type="number"
                        step="0.01"
                        value={freelanceFormData.amount}
                        onChange={(e) => setFreelanceFormData({ ...freelanceFormData, amount: e.target.value })}
                        required
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freelanceDescription">Description</Label>
                    <Textarea
                      id="freelanceDescription"
                      value={freelanceFormData.description}
                      onChange={(e) => setFreelanceFormData({ ...freelanceFormData, description: e.target.value })}
                      placeholder="Project description..."
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="freelanceClient">Client</Label>
                      <Input
                        id="freelanceClient"
                        value={freelanceFormData.client}
                        onChange={(e) => setFreelanceFormData({ ...freelanceFormData, client: e.target.value })}
                        placeholder="Client name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freelanceCategory">Category</Label>
                      <Input
                        id="freelanceCategory"
                        value={freelanceFormData.category}
                        onChange={(e) => setFreelanceFormData({ ...freelanceFormData, category: e.target.value })}
                        placeholder="e.g., Design, Development"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="freelanceDate">Date *</Label>
                      <Input
                        id="freelanceDate"
                        type="date"
                        value={freelanceFormData.date}
                        onChange={(e) => setFreelanceFormData({ ...freelanceFormData, date: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freelanceStatus">Status *</Label>
                      <Select
                        value={freelanceFormData.status}
                        onValueChange={(value: "pending" | "paid" | "overdue") => 
                          setFreelanceFormData({ ...freelanceFormData, status: value })
                        }
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="paid">Paid</SelectItem>
                          <SelectItem value="overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="freelanceDueDate">Due Date</Label>
                      <Input
                        id="freelanceDueDate"
                        type="date"
                        value={freelanceFormData.dueDate}
                        onChange={(e) => setFreelanceFormData({ ...freelanceFormData, dueDate: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="freelancePaidDate">Paid Date</Label>
                      <Input
                        id="freelancePaidDate"
                        type="date"
                        value={freelanceFormData.paidDate}
                        onChange={(e) => setFreelanceFormData({ ...freelanceFormData, paidDate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="freelanceNotes">Notes</Label>
                    <Textarea
                      id="freelanceNotes"
                      value={freelanceFormData.notes}
                      onChange={(e) => setFreelanceFormData({ ...freelanceFormData, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => { setOpenFreelanceDialog(false); resetFreelanceForm(); }}>
                    Cancel
                  </Button>
                  <Button type="submit">{editingFreelance ? "Update" : "Create"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <Dialog open={openManualSalaryDialog} onOpenChange={setOpenManualSalaryDialog}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Add Monthly Salary</DialogTitle>
                <DialogDescription>
                  Manually add a monthly salary record without individual shifts
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleManualSalarySubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="manualJobId">Job *</Label>
                    <Select
                      value={manualSalaryFormData.jobId}
                      onValueChange={(value) => setManualSalaryFormData({ ...manualSalaryFormData, jobId: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a job" />
                      </SelectTrigger>
                      <SelectContent>
                        {jobs.map((job) => (
                          <SelectItem key={job.id} value={job.id}>
                            {job.title} - {job.company}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualYear">Year *</Label>
                      <Input
                        id="manualYear"
                        type="number"
                        value={manualSalaryFormData.year}
                        onChange={(e) => setManualSalaryFormData({ ...manualSalaryFormData, year: parseInt(e.target.value) })}
                        required
                        min="2020"
                        max="2100"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualMonth">Month *</Label>
                      <Select
                        value={manualSalaryFormData.month.toString()}
                        onValueChange={(value) => setManualSalaryFormData({ ...manualSalaryFormData, month: parseInt(value) })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                            <SelectItem key={m} value={m.toString()}>
                              {format(new Date(2000, m - 1, 1), "MMMM")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="manualTotalPay">Total Pay (₪) *</Label>
                    <Input
                      id="manualTotalPay"
                      type="number"
                      step="0.01"
                      value={manualSalaryFormData.totalPay}
                      onChange={(e) => setManualSalaryFormData({ ...manualSalaryFormData, totalPay: e.target.value })}
                      required
                      placeholder="0.00"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualTotalHours">Total Hours</Label>
                      <Input
                        id="manualTotalHours"
                        type="number"
                        step="0.1"
                        value={manualSalaryFormData.totalHours}
                        onChange={(e) => setManualSalaryFormData({ ...manualSalaryFormData, totalHours: e.target.value })}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualTransport">Transport Payment (₪)</Label>
                      <Input
                        id="manualTransport"
                        type="number"
                        step="0.01"
                        value={manualSalaryFormData.transportPayment}
                        onChange={(e) => setManualSalaryFormData({ ...manualSalaryFormData, transportPayment: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="manualRegularPay">Regular Pay (₪)</Label>
                      <Input
                        id="manualRegularPay"
                        type="number"
                        step="0.01"
                        value={manualSalaryFormData.regularPay}
                        onChange={(e) => setManualSalaryFormData({ ...manualSalaryFormData, regularPay: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="manualOvertime125Pay">125% Overtime Pay (₪)</Label>
                      <Input
                        id="manualOvertime125Pay"
                        type="number"
                        step="0.01"
                        value={manualSalaryFormData.overtime125Pay}
                        onChange={(e) => setManualSalaryFormData({ ...manualSalaryFormData, overtime125Pay: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpenManualSalaryDialog(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Add Salary</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      {jobs.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Briefcase className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Job Added</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center">
              Add your job information to start tracking shifts and calculating your salary
            </p>
            <Button onClick={() => setOpenJobDialog(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Job
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Job Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Current Job
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <Select
                  value={selectedJob?.id || ""}
                  onValueChange={(value) => {
                    const job = jobs.find(j => j.id === value);
                    setSelectedJob(job || null);
                  }}
                >
                  <SelectTrigger className="w-[300px]">
                    <SelectValue placeholder="Select a job" />
                  </SelectTrigger>
                  <SelectContent>
                    {jobs.map((job) => (
                      <SelectItem key={job.id} value={job.id}>
                        {job.title} - {job.company}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => selectedJob && handleEditJob(selectedJob)}>
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => selectedJob && handleDeleteJob(selectedJob.id)}>
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {selectedJob && (
            <>
              {/* Job Info & Days Tracking */}
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Payment Info
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Hourly Rate:</span>
                        <span className="text-sm font-medium">₪{selectedJob.hourlyRate.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Overtime Rate:</span>
                        <span className="text-sm font-medium">{selectedJob.overtimeRate}x</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Overtime After:</span>
                        <span className="text-sm font-medium">{selectedJob.overtimeThreshold}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Transport:</span>
                        <span className="text-sm font-medium">₪{selectedJob.transportPayment.toFixed(2)}/mo</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Plane className="h-4 w-4" />
                      Vacation Days
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total:</span>
                        <span className="text-sm font-medium">{selectedJob.paidVacationDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Used:</span>
                        <span className="text-sm font-medium">{selectedJob.usedVacationDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Remaining:</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {selectedJob.paidVacationDays - selectedJob.usedVacationDays} days
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Heart className="h-4 w-4" />
                      Illness Days
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total:</span>
                        <span className="text-sm font-medium">{selectedJob.illnessDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Used:</span>
                        <span className="text-sm font-medium">{selectedJob.usedIllnessDays} days</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Remaining:</span>
                        <span className="text-sm font-medium text-green-600 dark:text-green-400">
                          {selectedJob.illnessDays - selectedJob.usedIllnessDays} days
                        </span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Upcoming Shifts */}
              {upcomingShifts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Calendar className="h-5 w-5" />
                      Upcoming Shifts
                    </CardTitle>
                    <CardDescription>Your next scheduled shifts</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {upcomingShifts.map((shift) => {
                        const job = jobs.find(j => j.id === shift.jobId);
                        return (
                          <div
                            key={shift.id}
                            className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{job?.title || "Unknown Job"}</span>
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {format(shift.date, "MMM d, yyyy")} • {shift.startTime} - {shift.endTime} ({shift.hours}h)
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditShift(shift)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteShift(shift.id)}
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

              {/* Monthly View */}
              <Card>
                <CardHeader>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        {format(selectedMonth, "MMMM yyyy")}
                      </CardTitle>
                      <CardDescription>Shifts and salary calculation for this month</CardDescription>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMonth(subMonths(selectedMonth, 1))}
                        className="flex-1 sm:flex-initial"
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMonth(new Date())}
                        className="flex-1 sm:flex-initial"
                      >
                        Today
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedMonth(addMonths(selectedMonth, 1))}
                        className="flex-1 sm:flex-initial"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="overflow-x-hidden">
                  {/* Salary Calculator */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 rounded-xl border border-blue-200/50 dark:border-blue-800/50">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Calculator className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        <h3 className="font-semibold text-sm sm:text-base">Monthly Salary Calculation</h3>
                        {currentMonthRecord && (
                          <span className="text-xs px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded">
                            Saved
                          </span>
                        )}
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleSaveMonthlyRecord}
                        disabled={monthShifts.length === 0}
                        className="w-full sm:w-auto"
                      >
                        {currentMonthRecord ? "Update Record" : "Save Monthly Record"}
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Hours</div>
                        <div className="text-2xl font-bold">{monthlyTotals.totalHours.toFixed(1)}h</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Regular Pay</div>
                        <div className="text-2xl font-bold">₪{monthlyTotals.regularPay.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Overtime Pay</div>
                        <div className="text-2xl font-bold">₪{monthlyTotals.overtimePay.toFixed(2)}</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Pay</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ₪{monthlyTotals.totalPay.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-blue-200/50 dark:border-blue-800/50">
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Regular Hours: </span>
                          <span className="font-medium">{monthlyTotals.regularHours.toFixed(1)}h</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Overtime Hours: </span>
                          <span className="font-medium">{monthlyTotals.overtimeHours.toFixed(1)}h</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">125% OT: </span>
                          <span className="font-medium">₪{monthlyTotals.overtime125Pay.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">150% OT: </span>
                          <span className="font-medium">₪{monthlyTotals.overtime150Pay.toFixed(2)}</span>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t border-blue-200/30 dark:border-blue-800/30">
                        <div className="text-sm">
                          <span className="text-muted-foreground">Transport: </span>
                          <span className="font-medium">₪{monthlyTotals.transportPayment.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Shifts List */}
                  {monthShifts.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No shifts recorded for this month</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Shifts ({monthShifts.length})</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (shiftsExpanded) {
                              setExpandedShifts(new Set());
                            } else {
                              setExpandedShifts(new Set(monthShifts.map(s => s.id)));
                            }
                            setShiftsExpanded(!shiftsExpanded);
                          }}
                          className="h-8"
                        >
                          {shiftsExpanded ? (
                            <>
                              <ChevronsUpDown className="h-4 w-4 mr-1" />
                              Collapse All
                            </>
                          ) : (
                            <>
                              <ChevronsDownUp className="h-4 w-4 mr-1" />
                              Expand All
                            </>
                          )}
                        </Button>
                      </div>
                      {monthShifts.map((shift) => {
                        const pay = selectedJob ? calculateShiftPay(shift, selectedJob) : { 
                          regularPay: 0, 
                          overtime125Pay: 0, 
                          overtime150Pay: 0, 
                          totalPay: 0,
                          regularHours: 0,
                          overtime125Hours: 0,
                          overtime150Hours: 0,
                        };
                        const isExpanded = expandedShifts.has(shift.id) || shiftsExpanded;
                        const shiftColors = getShiftTypeColors(shift.shiftType, shift.isOvertime);
                        const dayName = format(shift.date, "EEEE");
                        
                        return (
                          <div
                            key={shift.id}
                            className="border rounded-lg overflow-hidden hover:bg-muted/50 transition-colors max-w-full"
                          >
                            {/* Collapsed/Card Header */}
                            <div
                              className="flex items-center justify-between p-3 sm:p-4 cursor-pointer gap-2 sm:gap-4"
                              onClick={(e) => {
                                // Don't toggle if clicking edit/delete buttons
                                if ((e.target as HTMLElement).closest('button')) return;
                                toggleShiftExpansion(shift.id);
                              }}
                            >
                              <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                                <Clock className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0 flex-1">
                                  <span className="font-medium text-sm sm:text-base whitespace-nowrap">
                                    {format(shift.date, "MMM d")} ({dayName.slice(0, 3)})
                                  </span>
                                  <span className={`text-xs px-2 py-0.5 rounded-full capitalize ${shiftColors.bg} ${shiftColors.text} ${shiftColors.border} border flex-shrink-0`}>
                                    {shift.shiftType === "morning" ? "Morning" : shift.shiftType === "afternoon" ? "Afternoon" : "Night"}
                                  </span>
                                  {shift.isOvertime && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300 border border-orange-500/30 flex-shrink-0">
                                      Overtime
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                                <div className="text-right">
                                  <div className="text-base sm:text-lg font-semibold whitespace-nowrap">
                                    ₪{pay.totalPay.toFixed(2)}
                                  </div>
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleEditShift(shift);
                                    }}
                                  >
                                    <Edit2 className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteShift(shift.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 flex-shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleShiftExpansion(shift.id);
                                  }}
                                >
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </Button>
                              </div>
                            </div>

                            {/* Expanded Details */}
                            {isExpanded && (
                              <div className="px-3 sm:px-4 pb-3 sm:pb-4 border-t pt-3 sm:pt-4 space-y-2">
                                <div className="text-sm text-muted-foreground">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span>{shift.startTime} - {shift.endTime}</span>
                                    <span>•</span>
                                    <span>{shift.hours}h</span>
                                  </div>
                                  {(pay.regularHours > 0 || pay.overtime125Hours > 0 || pay.overtime150Hours > 0) && (
                                    <div className="text-xs">
                                      {pay.regularHours > 0 && `${pay.regularHours.toFixed(1)}h @ 100%`}
                                      {pay.regularHours > 0 && (pay.overtime125Hours > 0 || pay.overtime150Hours > 0) && ", "}
                                      {pay.overtime125Hours > 0 && `${pay.overtime125Hours.toFixed(1)}h @ 125%`}
                                      {pay.overtime125Hours > 0 && pay.overtime150Hours > 0 && ", "}
                                      {pay.overtime150Hours > 0 && `${pay.overtime150Hours.toFixed(1)}h @ 150%`}
                                    </div>
                                  )}
                                </div>
                                <div className="text-xs text-muted-foreground space-y-1">
                                  <div>
                                    {pay.regularPay > 0 && `₪${pay.regularPay.toFixed(2)} reg`}
                                    {pay.regularPay > 0 && (pay.overtime125Pay > 0 || pay.overtime150Pay > 0) && " + "}
                                    {pay.overtime125Pay > 0 && `₪${pay.overtime125Pay.toFixed(2)} @125%`}
                                    {pay.overtime125Pay > 0 && pay.overtime150Pay > 0 && " + "}
                                    {pay.overtime150Pay > 0 && `₪${pay.overtime150Pay.toFixed(2)} @150%`}
                                  </div>
                                  {shift.notes && (
                                    <div className="pt-1 italic">Notes: {shift.notes}</div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Annual Income Overview - All Years */}
              {years.length > 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <DollarSign className="h-5 w-5" />
                          Annual Income Overview
                        </CardTitle>
                        <CardDescription>All years with monthly breakdown (Jan - Dec)</CardDescription>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setOpenManualSalaryDialog(true)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Monthly Salary
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {years.map((year) => {
                        const yearRecords = workRecordsByYear[year];
                        const yearTotal = yearRecords.reduce((sum, r) => sum + r.totalPay, 0);
                        const yearHours = yearRecords.reduce((sum, r) => sum + r.totalHours, 0);
                        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                        
                        return (
                          <div key={year} className="border rounded-lg p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div>
                                <h3 className="text-lg font-semibold">{year}</h3>
                                <div className="text-sm text-muted-foreground">
                                  Total: ₪{yearTotal.toFixed(2)} • {yearHours.toFixed(1)}h
                                </div>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                              {monthNames.map((monthName, index) => {
                                const monthNum = index + 1;
                                const record = yearRecords.find(r => r.month === monthNum);
                                return (
                                  <div
                                    key={monthNum}
                                    className={`p-2 border rounded text-center ${
                                      record ? "bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800" : "bg-muted/30"
                                    }`}
                                  >
                                    <div className="text-xs font-medium">{monthName}</div>
                                    {record ? (
                                      <>
                                        <div className="text-sm font-semibold text-green-600 dark:text-green-400 mt-1">
                                          ₪{record.totalPay.toFixed(0)}
                                        </div>
                                        <div className="text-xs text-muted-foreground">
                                          {record.totalHours.toFixed(0)}h
                                        </div>
                                      </>
                                    ) : (
                                      <div className="text-xs text-muted-foreground mt-1">-</div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Yearly Summary */}
              {yearlyRecords.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5" />
                      Yearly Summary ({new Date().getFullYear()})
                    </CardTitle>
                    <CardDescription>Total income and hours for the current year</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Income</div>
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          ₪{yearlyTotals.totalPay.toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Total Hours</div>
                        <div className="text-2xl font-bold">{yearlyTotals.totalHours.toFixed(1)}h</div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Months Recorded</div>
                        <div className="text-2xl font-bold">{yearlyTotals.monthsCount}</div>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold mb-3">Monthly Records</h4>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {yearlyRecords.map((record) => {
                          const monthName = format(new Date(record.year, record.month - 1, 1), "MMMM yyyy");
                          return (
                            <div
                              key={record.id}
                              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <div>
                                <div className="font-medium">{monthName}</div>
                                <div className="text-sm text-muted-foreground">
                                  {record.totalHours.toFixed(1)}h • {record.shifts.length} shifts
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="font-semibold">₪{record.totalPay.toFixed(2)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {record.regularPay > 0 && `₪${record.regularPay.toFixed(2)} reg`}
                                  {record.regularPay > 0 && (record.overtimePay > 0) && " + "}
                                  {record.overtimePay > 0 && `₪${record.overtimePay.toFixed(2)} OT`}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {/* Freelance Income Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Freelance Income
                  </CardTitle>
                  <CardDescription>Track your freelance projects and income</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => setOpenFreelanceDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Income
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {freelanceIncomes.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No freelance income recorded</p>
                  <p className="text-sm mt-2">Add your first freelance income to start tracking</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">Total Income</div>
                        <div className="text-xl sm:text-2xl font-bold text-green-600 dark:text-green-400">
                          ₪{freelanceIncomes.reduce((sum, income) => sum + income.amount, 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Paid</div>
                        <div className="text-xl sm:text-2xl font-bold">
                          ₪{freelanceIncomes.filter(i => i.status === "paid").reduce((sum, income) => sum + income.amount, 0).toFixed(2)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">Pending</div>
                        <div className="text-xl sm:text-2xl font-bold text-orange-600 dark:text-orange-400">
                          ₪{freelanceIncomes.filter(i => i.status === "pending" || i.status === "overdue").reduce((sum, income) => sum + income.amount, 0).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {freelanceIncomes.map((income) => {
                      const statusColors = {
                        pending: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300",
                        paid: "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300",
                        overdue: "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300",
                      };
                      return (
                        <div
                          key={income.id}
                          className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1 flex-wrap">
                              <span className="font-medium">{income.title}</span>
                              <span className={`text-xs px-2 py-1 rounded capitalize ${statusColors[income.status]}`}>
                                {income.status}
                              </span>
                              {income.category && (
                                <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                                  {income.category}
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {format(income.date, "MMM d, yyyy")}
                              {income.client && ` • ${income.client}`}
                              {income.description && ` • ${income.description}`}
                            </div>
                            {income.notes && (
                              <div className="text-xs text-muted-foreground mt-1">{income.notes}</div>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="text-lg font-semibold">₪{income.amount.toFixed(2)}</div>
                              {income.dueDate && (
                                <div className="text-xs text-muted-foreground">
                                  Due: {format(income.dueDate, "MMM d, yyyy")}
                                </div>
                              )}
                              {income.paidDate && (
                                <div className="text-xs text-muted-foreground">
                                  Paid: {format(income.paidDate, "MMM d, yyyy")}
                                </div>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEditFreelance(income)}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteFreelance(income.id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </motion.div>
  );
}

