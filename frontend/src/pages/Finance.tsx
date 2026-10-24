import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  TextField,
  IconButton,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Grid,
  Alert,
  Stack,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TablePagination,
  LinearProgress,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import SavingsIcon from '@mui/icons-material/Savings';
import HistoryIcon from '@mui/icons-material/History';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import { TiltCard } from '../components/modern3d/TiltCard';
import { IconSlideButton } from '../components/modern3d/IconSlideButton';
import { ResizablePanel } from '../components/resizable/ResizablePanel';
import { ResetLayoutButton } from '../components/resizable/ResetLayoutButton';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { useNotification } from '../context/NotificationContext';
import { exportToExcel } from '../utils/excelExport';

export interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: string; // 'Income' | 'Expense'
  date: string;
  category: string;
  userId?: number;
}

export interface RecurringItem {
  id: number;
  description: string;
  amount: number;
  type: string; // 'Loan' | 'EMI' | 'Bill'
  frequency: string; // 'Monthly' | 'Yearly'
  dueDate: string;
  isPaid: boolean;
}

export interface UserBudget {
  id: number;
  category: string;
  monthlyLimit: number;
  spent: number;
  remaining: number;
  percentage: number;
  isOverBudget: boolean;
}

export interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  projectedMonthlyRecurring: number;
  projectedYearlyRecurring: number;
}

export const formatINR = (val: number, includeDecimals: boolean = true): string => {
  if (val === undefined || val === null || isNaN(val)) return '₹0.00';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: includeDecimals ? 2 : 0,
    maximumFractionDigits: includeDecimals ? 2 : 0,
  }).format(val);
};

type DateFilterOption = 'all' | 'today' | 'yesterday' | 'this_week' | 'this_month' | 'this_year' | 'custom';

const DONUT_COLORS = ['#E85A4F', '#F97316', '#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#14B8A6', '#EC4899'];

const isDateInPeriod = (
  dateStr: string,
  filter: DateFilterOption,
  customStart?: string,
  customEnd?: string
): boolean => {
  if (filter === 'all' || !dateStr) return true;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return true;
  const now = new Date();

  if (filter === 'today') {
    return d.toDateString() === now.toDateString();
  }
  if (filter === 'yesterday') {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    return d.toDateString() === y.toDateString();
  }
  if (filter === 'this_week') {
    const startOfWeek = new Date(now);
    const day = startOfWeek.getDay();
    const diff = startOfWeek.getDate() - day + (day === 0 ? -6 : 1);
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    return d >= startOfWeek && d <= endOfWeek;
  }
  if (filter === 'this_month') {
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }
  if (filter === 'this_year') {
    return d.getFullYear() === now.getFullYear();
  }
  if (filter === 'custom' && customStart && customEnd) {
    const s = new Date(customStart);
    s.setHours(0, 0, 0, 0);
    const e = new Date(customEnd);
    e.setHours(23, 59, 59, 999);
    return d >= s && d <= e;
  }
  return true;
};

const Finance: React.FC = () => {
  const { notify } = useNotification();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    projectedMonthlyRecurring: 0,
    projectedYearlyRecurring: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [dateFilter, setDateFilter] = useState<DateFilterOption>('this_month');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Transaction Modal State (Create / Edit)
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'Income' | 'Expense'>('Expense');
  const [category, setCategory] = useState('Food');
  const [txDate, setTxDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Recurring Commitment Modal State
  const [recDialogOpen, setRecDialogOpen] = useState(false);
  const [recDescription, setRecDescription] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState<'Bill' | 'Loan' | 'EMI'>('Bill');
  const [recFrequency, setRecFrequency] = useState<'Monthly' | 'Yearly'>('Monthly');
  const [recDueDate, setRecDueDate] = useState('');
  const [recSubmitting, setRecSubmitting] = useState(false);

  // User Budgets State
  const [budgets, setBudgets] = useState<UserBudget[]>([]);
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false);
  const [editingBudgetId, setEditingBudgetId] = useState<number | null>(null);
  const [budgetCategory, setBudgetCategory] = useState('Food');
  const [customBudgetCategory, setCustomBudgetCategory] = useState('');
  const [budgetLimit, setBudgetLimit] = useState('');
  const [budgetSubmitting, setBudgetSubmitting] = useState(false);

  // Finance Log State
  const [logOpen, setLogOpen] = useState(false);
  const [logSearch, setLogSearch] = useState('');
  const [logTypeFilter, setLogTypeFilter] = useState<string>('All');
  const [logCategoryFilter, setLogCategoryFilter] = useState<string>('All');
  const [logDateFilter, setLogDateFilter] = useState<DateFilterOption>('all');
  const [logCustomStart, setLogCustomStart] = useState('');
  const [logCustomEnd, setLogCustomEnd] = useState('');
  const [logPage, setLogPage] = useState(0);
  const [logRowsPerPage, setLogRowsPerPage] = useState(10);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [transRes, sumRes, recRes, budgetRes] = await Promise.all([
        apiClient.get('/api/finance'),
        apiClient.get('/api/finance/summary'),
        apiClient.get('/api/finance/recurring'),
        apiClient.get('/api/finance/budgets'),
      ]);

      if (transRes.data.isSuccess) setTransactions(transRes.data.data);
      if (sumRes.data.isSuccess) setSummary(sumRes.data.data);
      if (recRes.data.isSuccess) setRecurringItems(recRes.data.data);
      if (budgetRes.data?.isSuccess) setBudgets(budgetRes.data.data);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load financial records.';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  // Filtered transactions for the dashboard view
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      const matchPeriod = isDateInPeriod(t.date, dateFilter, customStart, customEnd);
      if (!matchPeriod) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(q);
        const catMatch = t.category.toLowerCase().includes(q);
        if (!descMatch && !catMatch) return false;
      }
      return true;
    });
  }, [transactions, dateFilter, customStart, customEnd, searchQuery]);

  // Derived Analytics from filtered records
  const periodAnalytics = useMemo(() => {
    let income = 0;
    let expense = 0;
    filteredTransactions.forEach((t) => {
      if (t.type.toLowerCase() === 'income') income += t.amount;
      else expense += t.amount;
    });

    const netFlow = income - expense;
    const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

    return {
      income,
      expense,
      netFlow,
      savingsRate,
    };
  }, [filteredTransactions]);

  // Spending Breakdown chart data (Expenses grouped by Category)
  const categoryChartData = useMemo(() => {
    const map: Record<string, number> = {};
    let totalExpense = 0;

    filteredTransactions
      .filter((t) => t.type.toLowerCase() === 'expense')
      .forEach((t) => {
        const cat = t.category || 'Other';
        map[cat] = (map[cat] || 0) + t.amount;
        totalExpense += t.amount;
      });

    return Object.entries(map).map(([name, value]) => ({
      name,
      value: Math.round(value * 100) / 100,
      percent: totalExpense > 0 ? Math.round((value / totalExpense) * 100) : 0,
    }));
  }, [filteredTransactions]);

  // Income vs Expense Trend (group by Month or Day)
  const incomeVsExpenseData = useMemo(() => {
    const monthMap: Record<string, { month: string; income: number; expense: number }> = {};
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    // Initialize recent 6 months
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      monthMap[key] = { month: key, income: 0, expense: 0 };
    }

    transactions.forEach((t) => {
      const d = new Date(t.date);
      if (isNaN(d.getTime())) return;
      const key = `${months[d.getMonth()]} ${d.getFullYear().toString().slice(-2)}`;
      if (monthMap[key]) {
        if (t.type.toLowerCase() === 'income') monthMap[key].income += t.amount;
        else monthMap[key].expense += t.amount;
      }
    });

    return Object.values(monthMap);
  }, [transactions]);

  // Monthly Net Cash Flow bar chart
  const cashFlowData = useMemo(() => {
    return incomeVsExpenseData.map((m) => ({
      month: m.month,
      cashFlow: Math.round((m.income - m.expense) * 100) / 100,
      isPositive: m.income >= m.expense,
    }));
  }, [incomeVsExpenseData]);

  // Budget Planner progress (Configurable categories vs actual spend)
  const budgetProgressData = useMemo(() => {
    const actuals: Record<string, number> = {};
    filteredTransactions
      .filter((t) => t.type.toLowerCase() === 'expense')
      .forEach((t) => {
        const cat = t.category || 'Other';
        actuals[cat.toLowerCase()] = (actuals[cat.toLowerCase()] || 0) + t.amount;
      });

    return budgets.map((b) => {
      const spent = actuals[b.category.toLowerCase()] || 0;
      const budget = b.monthlyLimit;
      const pct = budget > 0 ? Math.round((spent / budget) * 100) : 0;
      const remaining = budget - spent;
      return {
        id: b.id,
        category: b.category,
        spent,
        budget,
        pct,
        remaining,
        isOverBudget: spent > budget,
      };
    });
  }, [budgets, filteredTransactions]);

  // Budget CRUD handlers
  const handleOpenCreateBudget = () => {
    setEditingBudgetId(null);
    setBudgetCategory('Food');
    setCustomBudgetCategory('');
    setBudgetLimit('');
    setBudgetDialogOpen(true);
  };

  const handleOpenEditBudget = (b: { id: number; category: string; budget: number }) => {
    setEditingBudgetId(b.id);
    const standardCategories = ['Food', 'Shopping', 'Entertainment', 'Utilities', 'Transport', 'Housing', 'Healthcare', 'Education', 'Personal'];
    if (standardCategories.includes(b.category)) {
      setBudgetCategory(b.category);
      setCustomBudgetCategory('');
    } else {
      setBudgetCategory('Other');
      setCustomBudgetCategory(b.category);
    }
    setBudgetLimit(b.budget.toString());
    setBudgetDialogOpen(true);
  };

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalCategory = budgetCategory === 'Other' ? customBudgetCategory.trim() : budgetCategory.trim();
    if (!finalCategory) {
      notify.warning('Please specify a category name.', 'Validation Error');
      return;
    }
    const limitVal = parseFloat(budgetLimit);
    if (isNaN(limitVal) || limitVal <= 0) {
      notify.warning('Please enter a valid positive monthly limit.', 'Validation Error');
      return;
    }

    setBudgetSubmitting(true);
    try {
      if (editingBudgetId) {
        const res = await apiClient.put(`/api/finance/budgets/${editingBudgetId}`, {
          category: finalCategory,
          monthlyLimit: limitVal,
        });
        if (res.data.isSuccess) {
          notify.success(`Budget for "${finalCategory}" updated to ${formatINR(limitVal, false)}!`, 'Budget Updated');
          setBudgetDialogOpen(false);
          await fetchFinanceData();
        }
      } else {
        const res = await apiClient.post('/api/finance/budgets', {
          category: finalCategory,
          monthlyLimit: limitVal,
        });
        if (res.data.isSuccess) {
          notify.success(`Budget for "${finalCategory}" set to ${formatINR(limitVal, false)}!`, 'Budget Created');
          setBudgetDialogOpen(false);
          await fetchFinanceData();
        }
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to save budget.';
      notify.error(errMsg, 'Budget Error');
    } finally {
      setBudgetSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: number, catName: string) => {
    try {
      const res = await apiClient.delete(`/api/finance/budgets/${id}`);
      if (res.data.isSuccess) {
        notify.info(`Budget limit for "${catName}" removed.`, 'Budget Deleted');
        await fetchFinanceData();
      }
    } catch (err: any) {
      const errMsg = err.response?.data?.message || 'Failed to delete budget.';
      notify.error(errMsg, 'Delete Failed');
    }
  };

  // Transaction CRUD handlers
  const openCreateDialog = (initialType: 'Expense' | 'Income' = 'Expense') => {
    setEditingId(null);
    setDescription('');
    setAmount('');
    setType(initialType);
    setCategory(initialType === 'Income' ? 'Salary' : 'Food');
    setTxDate(new Date().toISOString().slice(0, 10));
    setDialogOpen(true);
  };

  const openEditDialog = (t: Transaction) => {
    setEditingId(t.id);
    setDescription(t.description);
    setAmount(String(t.amount));
    setType(t.type.toLowerCase() === 'income' ? 'Income' : 'Expense');
    setCategory(t.category);
    setTxDate(new Date(t.date).toISOString().slice(0, 10));
    setDialogOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);
    if (!description.trim() || isNaN(numAmount) || numAmount <= 0 || !txDate) return;

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await apiClient.put(`/api/finance/${editingId}`, {
          description: description.trim(),
          amount: numAmount,
          type,
          category: category.trim(),
          date: new Date(txDate).toISOString(),
        });
        if (res.data.isSuccess) {
          trackAction('finance_transaction_updated', { module: 'finance', action: 'edit' });
          notify.success('Transaction updated successfully.');
          setTransactions((prev) => prev.map((t) => (t.id === editingId ? res.data.data : t)));
          setDialogOpen(false);
          // Refresh summary
          const sumRes = await apiClient.get('/api/finance/summary');
          if (sumRes.data.isSuccess) setSummary(sumRes.data.data);
          window.dispatchEvent(new CustomEvent('lifesync:score-updated'));
          window.dispatchEvent(new CustomEvent('lifesync:finance-updated'));
        }
      } else {
        const res = await apiClient.post('/api/finance', {
          description: description.trim(),
          amount: numAmount,
          type,
          category: category.trim(),
          date: new Date(txDate).toISOString(),
        });
        if (res.data.isSuccess) {
          trackAction('finance_transaction_created', { module: 'finance', action: 'create' });
          notify.success('Transaction recorded successfully.');
          setTransactions((prev) => [res.data.data, ...prev]);
          setDialogOpen(false);
          // Refresh summary
          const sumRes = await apiClient.get('/api/finance/summary');
          if (sumRes.data.isSuccess) setSummary(sumRes.data.data);
          window.dispatchEvent(new CustomEvent('lifesync:score-updated'));
          window.dispatchEvent(new CustomEvent('lifesync:finance-updated'));
        }
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to save transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/finance/${id}`);
      if (res.data.isSuccess) {
        trackAction('finance_transaction_deleted', { module: 'finance', action: 'delete' });
        notify.success('Transaction removed.');
        setTransactions((prev) => prev.filter((t) => t.id !== id));
        const sumRes = await apiClient.get('/api/finance/summary');
        if (sumRes.data.isSuccess) setSummary(sumRes.data.data);
        window.dispatchEvent(new CustomEvent('lifesync:score-updated'));
        window.dispatchEvent(new CustomEvent('lifesync:finance-updated'));
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to delete transaction.');
    }
  };

  // Recurring commitment handlers
  const handleSaveRecurring = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(recAmount);
    if (!recDescription.trim() || isNaN(numAmount) || numAmount <= 0 || !recDueDate) return;

    setRecSubmitting(true);
    try {
      const res = await apiClient.post('/api/finance/recurring', {
        description: recDescription.trim(),
        amount: numAmount,
        type: recType,
        frequency: recFrequency,
        dueDate: new Date(recDueDate).toISOString(),
      });
      if (res.data.isSuccess) {
        notify.success('Recurring commitment added.');
        setRecurringItems((prev) => [...prev, res.data.data]);
        setRecDialogOpen(false);
        setRecDescription('');
        setRecAmount('');
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to add recurring commitment.');
    } finally {
      setRecSubmitting(false);
    }
  };

  const handleDeleteRecurring = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/finance/recurring/${id}`);
      if (res.data.isSuccess) {
        notify.success('Recurring commitment deleted.');
        setRecurringItems((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to delete recurring commitment.');
    }
  };

  const handlePayRecurring = async (id: number) => {
    try {
      const res = await apiClient.post(`/api/finance/recurring/${id}/pay`);
      if (res.data.isSuccess) {
        notify.success('Recurring payment logged as transaction.');
        setTransactions((prev) => [res.data.data, ...prev]);
        setRecurringItems((prev) =>
          prev.map((r) => (r.id === id ? { ...r, isPaid: true } : r))
        );
        const sumRes = await apiClient.get('/api/finance/summary');
        if (sumRes.data.isSuccess) setSummary(sumRes.data.data);
        window.dispatchEvent(new CustomEvent('lifesync:score-updated'));
        window.dispatchEvent(new CustomEvent('lifesync:finance-updated'));
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to process recurring payment.');
    }
  };

  // Distinct category list for filtering
  const availableCategories = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      if (t.category) set.add(t.category);
    });
    return Array.from(set).sort();
  }, [transactions]);

  // Log filter calculations and Excel Export
  const logRecords = useMemo(() => {
    return transactions.filter((t) => {
      const matchPeriod = isDateInPeriod(t.date, logDateFilter, logCustomStart, logCustomEnd);
      if (!matchPeriod) return false;

      if (logTypeFilter !== 'All') {
        if (logTypeFilter.toLowerCase() !== t.type.toLowerCase()) return false;
      }

      if (logCategoryFilter !== 'All') {
        if (logCategoryFilter.toLowerCase() !== t.category.toLowerCase()) return false;
      }

      if (logSearch.trim()) {
        const q = logSearch.toLowerCase();
        const descMatch = t.description.toLowerCase().includes(q);
        const catMatch = t.category.toLowerCase().includes(q);
        if (!descMatch && !catMatch) return false;
      }
      return true;
    });
  }, [transactions, logDateFilter, logCustomStart, logCustomEnd, logTypeFilter, logCategoryFilter, logSearch]);

  const pagedLogRecords = useMemo(() => {
    const start = logPage * logRowsPerPage;
    return logRecords.slice(start, start + logRowsPerPage);
  }, [logRecords, logPage, logRowsPerPage]);

  const handleExportFinanceExcel = () => {
    const exportRows = logRecords.map((t) => ({
      ID: t.id,
      Description: t.description,
      'Amount (₹)': t.amount,
      Currency: 'INR',
      Type: t.type,
      Category: t.category,
      Date: new Date(t.date).toLocaleDateString(),
    }));

    exportToExcel(
      exportRows,
      `LifeSync_Finance_Log_${new Date().toISOString().slice(0, 10)}`,
      'Transactions'
    );
    notify.success(`Exported ${exportRows.length} transactions matching active filters.`);
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: { xs: '16px', md: '28px' }, height: '100%', overflowY: 'auto', bgcolor: 'var(--bg-primary)' }}>
        {/* Header */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, mb: 2.5, gap: 2 }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center', mb: 0.5 }}>
              <Box
                sx={{
                  bgcolor: 'rgba(232, 90, 79, 0.12)',
                  p: 1,
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <AccountBalanceWalletIcon sx={{ color: 'var(--accent-primary)', fontSize: 26 }} />
              </Box>
              <Typography variant="h4" sx={{ fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>
                Finance
              </Typography>
            </Stack>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
              Cashly-style analytics dashboard. Monitor cash flow, budgets, and transactions in real time.
            </Typography>
          </Box>

          <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', flexWrap: 'wrap', gap: 1 }}>
            <IconSlideButton
              variant="outlined"
              startIcon={<HistoryIcon sx={{ fontSize: 16 }} />}
              onClick={() => {
                setLogPage(0);
                setLogOpen(true);
              }}
              sx={{
                borderColor: 'var(--card-border)',
                color: 'var(--text-primary)',
                bgcolor: 'var(--card-bg)',
                fontWeight: 650,
                fontSize: '12.5px',
                px: 1.8,
                py: 0.65,
                '&:hover': { bgcolor: 'rgba(232, 90, 79, 0.08)', borderColor: 'var(--accent-primary)' },
              }}
            >
              Finance Log
            </IconSlideButton>

            <IconSlideButton
              variant="outlined"
              startIcon={<FileDownloadIcon sx={{ fontSize: 16 }} />}
              onClick={handleExportFinanceExcel}
              disabled={transactions.length === 0}
              sx={{
                borderColor: 'var(--card-border)',
                color: 'var(--text-primary)',
                bgcolor: 'var(--card-bg)',
                fontWeight: 650,
                fontSize: '12.5px',
                px: 1.8,
                py: 0.65,
                '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.08)', borderColor: '#10B981', color: '#10B981' },
              }}
            >
              Export Records
            </IconSlideButton>

            <IconSlideButton
              variant="outlined"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => setRecDialogOpen(true)}
              sx={{
                borderColor: 'var(--card-border)',
                color: 'var(--text-primary)',
                bgcolor: 'var(--card-bg)',
                fontWeight: 650,
                fontSize: '12.5px',
                px: 1.8,
                py: 0.65,
                '&:hover': { bgcolor: 'rgba(232, 90, 79, 0.08)', borderColor: 'var(--accent-primary)' },
              }}
            >
              + Recurring Bill
            </IconSlideButton>

            <IconSlideButton
              variant="contained"
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              onClick={() => openCreateDialog('Expense')}
              sx={{
                bgcolor: 'var(--accent-primary)',
                color: '#FFFFFF',
                fontWeight: 700,
                fontSize: '12.5px',
                px: 2.2,
                py: 0.65,
                boxShadow: '0 4px 14px rgba(232, 90, 79, 0.35)',
                '&:hover': { bgcolor: 'var(--accent-secondary)' },
              }}
            >
              Add Transaction
            </IconSlideButton>

            <ResetLayoutButton pageId="finance" pageName="Finance" />
          </Stack>
        </Stack>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Filter Toolbar */}
        <TiltCard
          maxTilt={1.5}
          enableRefraction={false}
          sx={{
            mb: 3,
            p: 1.5,
            bgcolor: 'var(--card-bg)',
            borderRadius: 'var(--radius-card)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-soft)',
          }}
        >
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', lg: 'center' }, gap: 2 }}
          >
            <Box sx={{ position: 'relative', width: { xs: '100%', lg: '320px' } }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search transactions..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'var(--text-secondary)', mr: 1, fontSize: 20 }} />,
                  },
                }}
              />
            </Box>

            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', py: 0.5, alignItems: 'center' }}>
              <FilterListIcon sx={{ color: 'var(--text-secondary)', fontSize: 18 }} />
              {(
                [
                  { key: 'today', label: 'Today' },
                  { key: 'this_week', label: 'This Week' },
                  { key: 'this_month', label: 'This Month' },
                  { key: 'this_year', label: 'This Year' },
                  { key: 'all', label: 'All Time' },
                  { key: 'custom', label: 'Custom' },
                ] as const
              ).map((tab) => (
                <Chip
                  key={tab.key}
                  label={tab.label}
                  clickable
                  onClick={() => setDateFilter(tab.key)}
                  sx={{
                    fontWeight: 600,
                    fontSize: '12px',
                    borderRadius: 'var(--radius-chip)',
                    bgcolor: dateFilter === tab.key ? 'var(--accent-primary)' : 'transparent',
                    color: dateFilter === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: dateFilter === tab.key ? 'var(--accent-primary)' : 'var(--card-border)',
                  }}
                />
              ))}
            </Stack>
          </Stack>

          {dateFilter === 'custom' && (
            <Stack direction="row" spacing={2} sx={{ mt: 2, pt: 2, borderTop: '1px dashed var(--card-border)' }}>
              <TextField
                size="small"
                label="From"
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                label="To"
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          )}
        </TiltCard>

        {loading ? (
          <Box sx={{ py: 8 }}>
            <LogoLoader />
          </Box>
        ) : (
          <Stack spacing={3}>
            {/* Top Metric Cards (Cashly Style 2x2 on Mobile - Reference Image 4) */}
            <Grid container spacing={{ xs: 1.5, sm: 2, md: 2.5 }}>
              {/* Total Balance */}
              <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
                <TiltCard sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, height: '100%' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: { xs: '11px', sm: '13px' } }}>
                      Total Balance
                    </Typography>
                    <AccountBalanceWalletIcon sx={{ color: 'var(--accent-primary)', fontSize: { xs: 16, sm: 20 } }} />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5, fontSize: { xs: '16px', sm: '22px', md: '26px' } }}>
                    {formatINR(summary.balance)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600, fontSize: { xs: '10px', sm: '11.5px' } }}>
                    ↑ 0.0%
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Monthly Income (Period Based) */}
              <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
                <TiltCard sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, height: '100%' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: { xs: '11px', sm: '13px' } }}>
                      Period Income
                    </Typography>
                    <TrendingUpIcon sx={{ color: '#10B981', fontSize: { xs: 16, sm: 20 } }} />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#10B981', mb: 0.5, fontSize: { xs: '16px', sm: '22px', md: '26px' } }}>
                    +{formatINR(periodAnalytics.income)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 600, fontSize: { xs: '10px', sm: '11.5px' } }}>
                    ↑ 0.0%
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Monthly Expense (Period Based) */}
              <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
                <TiltCard sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, height: '100%' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: { xs: '11px', sm: '13px' } }}>
                      Period Expenses
                    </Typography>
                    <TrendingDownIcon sx={{ color: '#EF4444', fontSize: { xs: 16, sm: 20 } }} />
                  </Stack>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: '#EF4444', mb: 0.5, fontSize: { xs: '16px', sm: '22px', md: '26px' } }}>
                    -{formatINR(periodAnalytics.expense)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#EF4444', fontWeight: 600, fontSize: { xs: '10px', sm: '11.5px' } }}>
                    ↓ 0.0%
                  </Typography>
                </TiltCard>
              </Grid>

              {/* Net Cash Flow / Savings */}
              <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
                <TiltCard sx={{ p: { xs: 1.5, sm: 2, md: 2.2 }, height: '100%' }}>
                  <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-secondary)', fontSize: { xs: '11px', sm: '13px' } }}>
                      Net Cash Flow
                    </Typography>
                    <SavingsIcon sx={{ color: periodAnalytics.netFlow >= 0 ? '#10B981' : '#EF4444', fontSize: { xs: 16, sm: 20 } }} />
                  </Stack>
                  <Typography
                    variant="h5"
                    sx={{
                      fontWeight: 800,
                      color: periodAnalytics.netFlow >= 0 ? '#10B981' : '#EF4444',
                      mb: 0.5,
                      fontSize: { xs: '16px', sm: '22px', md: '26px' },
                    }}
                  >
                    {periodAnalytics.netFlow >= 0 ? '+' : ''}{formatINR(periodAnalytics.netFlow)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: periodAnalytics.netFlow >= 0 ? '#10B981' : '#EF4444', fontWeight: 600, fontSize: { xs: '10px', sm: '11.5px' } }}>
                    {periodAnalytics.savingsRate.toFixed(1)}% savings
                  </Typography>
                </TiltCard>
              </Grid>
            </Grid>

            {/* Middle Section: Cashly Visual Charts */}
            <Grid container spacing={2.5}>
              {/* Income vs Expenses 6-Month Chart */}
              <Grid size={{ xs: 12, lg: 8 }}>
                <ResizablePanel pageId="finance" componentId="income_vs_expense" defaultHeight={380} minHeight={280} maxHeight={650}>
                  <TiltCard
                    maxTilt={2}
                    sx={{
                      p: 2.5,
                      borderRadius: 'var(--radius-card)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          Income vs Expenses
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                          6-month overview of cash performance
                        </Typography>
                      </Box>
                    </Stack>

                    {incomeVsExpenseData.every((d) => d.income === 0 && d.expense === 0) ? (
                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 3,
                          textAlign: 'center',
                          bgcolor: 'rgba(16, 185, 129, 0.02)',
                          borderRadius: '12px',
                          border: '1px dashed var(--card-border)',
                        }}
                      >
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            bgcolor: 'rgba(16, 185, 129, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10B981',
                            mb: 1.5,
                          }}
                        >
                          <TrendingUpIcon sx={{ fontSize: 28 }} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5 }}>
                          No Cash Activity Recorded
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', maxWidth: 340, mb: 2 }}>
                          Log your income and expenses to visualize 6-month financial performance and trends.
                        </Typography>
                        <Button
                          size="small"
                          variant="contained"
                          startIcon={<AddIcon />}
                          onClick={() => openCreateDialog('Expense')}
                          sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            bgcolor: 'var(--accent-primary)',
                            fontWeight: 700,
                            fontSize: '12px',
                            px: 2,
                            py: 0.6,
                          }}
                        >
                          Add First Transaction
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ flex: 1, width: '100%', minHeight: 250 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={incomeVsExpenseData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                              <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                              </linearGradient>
                              <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E85A4F" stopOpacity={0.4} />
                                <stop offset="95%" stopColor="#E85A4F" stopOpacity={0.0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                            <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={12} />
                            <YAxis stroke="var(--text-secondary)" fontSize={12} />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: 'var(--card-bg)',
                                borderColor: 'var(--card-border)',
                                borderRadius: '10px',
                                color: 'var(--text-primary)',
                              }}
                            />
                            <Legend />
                            <Area type="monotone" dataKey="income" name="Income" stroke="#10B981" fillOpacity={1} fill="url(#incomeGrad)" strokeWidth={2.5} />
                            <Area type="monotone" dataKey="expense" name="Expense" stroke="#E85A4F" fillOpacity={1} fill="url(#expenseGrad)" strokeWidth={2.5} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                  </TiltCard>
                </ResizablePanel>
              </Grid>

              {/* Spending Breakdown Donut Chart */}
              <Grid size={{ xs: 12, lg: 4 }}>
                <ResizablePanel pageId="finance" componentId="spending_breakdown" defaultHeight={380} minHeight={280} maxHeight={650}>
                  <TiltCard
                    maxTilt={2}
                    sx={{
                      p: 2.5,
                      borderRadius: 'var(--radius-card)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                      Spending Breakdown
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 2 }}>
                      Distribution across expense categories
                    </Typography>

                    {categoryChartData.length === 0 ? (
                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 3,
                          textAlign: 'center',
                          bgcolor: 'rgba(232, 90, 79, 0.02)',
                          borderRadius: '12px',
                          border: '1px dashed var(--card-border)',
                        }}
                      >
                        <Box
                          sx={{
                            width: 52,
                            height: 52,
                            borderRadius: '50%',
                            bgcolor: 'rgba(232, 90, 79, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent-primary)',
                            mb: 1.5,
                          }}
                        >
                          <AccountBalanceWalletIcon sx={{ fontSize: 26 }} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5 }}>
                          No Expense Records
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', maxWidth: 280, mb: 2 }}>
                          Expense categories will form a distribution donut chart here once transactions are recorded.
                        </Typography>
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon />}
                          onClick={() => openCreateDialog('Expense')}
                          sx={{
                            borderRadius: '8px',
                            textTransform: 'none',
                            color: 'var(--accent-primary)',
                            borderColor: 'var(--accent-primary)',
                            fontWeight: 700,
                            fontSize: '12px',
                            px: 2,
                            py: 0.5,
                          }}
                        >
                          Log Expense
                        </Button>
                      </Box>
                    ) : (
                      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                        <ResponsiveContainer width="100%" height={190}>
                          <PieChart>
                            <Pie
                              data={categoryChartData}
                              dataKey="value"
                              nameKey="name"
                              innerRadius={50}
                              outerRadius={75}
                              paddingAngle={3}
                            >
                              {categoryChartData.map((_, index) => (
                                <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                              ))}
                            </Pie>
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: 'var(--card-bg)',
                                borderColor: 'var(--card-border)',
                                borderRadius: '10px',
                                color: 'var(--text-primary)',
                              }}
                            />
                          </PieChart>
                        </ResponsiveContainer>

                        <Stack spacing={0.8} sx={{ width: '100%', mt: 1 }}>
                          {categoryChartData.slice(0, 4).map((c, i) => (
                            <Stack key={c.name} direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: DONUT_COLORS[i % DONUT_COLORS.length] }} />
                                <Typography variant="caption" sx={{ color: 'var(--text-primary)', fontWeight: 600 }}>
                                  {c.name}
                                </Typography>
                              </Stack>
                              <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 700 }}>
                                {formatINR(c.value, false)} ({c.percent}%)
                              </Typography>
                            </Stack>
                          ))}
                        </Stack>
                      </Box>
                    )}
                  </TiltCard>
                </ResizablePanel>
              </Grid>
            </Grid>

            {/* Bottom Row: Cash Flow + Budget Planner Progress + Recurring Commitments */}
            <Grid container spacing={2.5}>
              {/* Monthly Net Cash Flow */}
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <ResizablePanel pageId="finance" componentId="cash_flow" defaultHeight={380} minHeight={260} maxHeight={600}>
                  <TiltCard
                    maxTilt={2.5}
                    sx={{
                      p: 2.5,
                      borderRadius: 'var(--radius-card)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                      Cash Flow
                    </Typography>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 2, display: 'block' }}>
                      Monthly net savings (positive vs deficit)
                    </Typography>

                    {cashFlowData.every((d) => d.cashFlow === 0) ? (
                      <Box
                        sx={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          p: 3,
                          textAlign: 'center',
                          bgcolor: 'rgba(59, 130, 246, 0.02)',
                          borderRadius: '12px',
                          border: '1px dashed var(--card-border)',
                        }}
                      >
                        <Box
                          sx={{
                            width: 50,
                            height: 50,
                            borderRadius: '50%',
                            bgcolor: 'rgba(59, 130, 246, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#3B82F6',
                            mb: 1.5,
                          }}
                        >
                          <SavingsIcon sx={{ fontSize: 26 }} />
                        </Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5 }}>
                          Net Cash Flow Is Neutral
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', maxWidth: 280 }}>
                          Monthly savings surplus or deficit will plot here as income and expenses are logged.
                        </Typography>
                      </Box>
                    ) : (
                      <Box sx={{ flex: 1, width: '100%', minHeight: 200 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={cashFlowData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--card-border)" vertical={false} />
                            <XAxis dataKey="month" stroke="var(--text-secondary)" fontSize={11} />
                            <YAxis stroke="var(--text-secondary)" fontSize={11} />
                            <RechartsTooltip
                              contentStyle={{
                                backgroundColor: 'var(--card-bg)',
                                borderColor: 'var(--card-border)',
                                borderRadius: '10px',
                              }}
                            />
                            <Bar dataKey="cashFlow" name="Net Flow" fill="var(--accent-primary)" radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </Box>
                    )}
                  </TiltCard>
                </ResizablePanel>
              </Grid>

              {/* Budget Planner Progress */}
              <Grid size={{ xs: 12, md: 6, lg: 4 }}>
                <ResizablePanel pageId="finance" componentId="budget_planner" defaultHeight={380} minHeight={260} maxHeight={600}>
                  <TiltCard
                    maxTilt={2.5}
                    sx={{
                      p: 2.5,
                      borderRadius: 'var(--radius-card)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                      <Box>
                        <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                          Budget Planner
                        </Typography>
                        <Typography variant="caption" sx={{ color: 'var(--text-secondary)', display: 'block' }}>
                          Current spend vs custom monthly limits
                        </Typography>
                      </Box>
                      <Button
                        size="small"
                        variant="outlined"
                        startIcon={<AddIcon sx={{ fontSize: 15 }} />}
                        onClick={handleOpenCreateBudget}
                        sx={{
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: 700,
                          textTransform: 'none',
                          py: 0.3,
                          px: 1.2,
                          borderColor: 'var(--accent-primary)',
                          color: 'var(--accent-primary)',
                          '&:hover': { bgcolor: 'rgba(255, 111, 38, 0.08)', borderColor: 'var(--accent-primary)' }
                        }}
                      >
                        Set Budget
                      </Button>
                    </Stack>

                    <Stack spacing={1.5} sx={{ mt: 0.5, flex: 1, overflowY: 'auto', pr: 0.5 }}>
                      {budgetProgressData.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1.5 }}>
                            No monthly category budgets configured yet.
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={handleOpenCreateBudget}
                            sx={{ borderRadius: '8px', textTransform: 'none', bgcolor: 'var(--accent-primary)', fontWeight: 700 }}
                          >
                            + Set First Budget
                          </Button>
                        </Box>
                      ) : (
                        budgetProgressData.map((b) => (
                          <Box
                            key={b.id || b.category}
                            sx={{
                              p: 1.2,
                              borderRadius: '10px',
                              bgcolor: 'var(--bg-secondary)',
                              transition: 'all 0.2s ease',
                              '&:hover': {
                                bgcolor: 'var(--card-bg)',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                              }
                            }}
                          >
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                              <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                                <Typography variant="caption" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '12px' }}>
                                  {b.category}
                                </Typography>
                                {b.isOverBudget && (
                                  <Chip
                                    label="Over Budget"
                                    size="small"
                                    sx={{
                                      height: 18,
                                      fontSize: '9.5px',
                                      fontWeight: 800,
                                      bgcolor: 'rgba(239, 68, 68, 0.12)',
                                      color: '#EF4444',
                                      border: '1px solid rgba(239, 68, 68, 0.3)',
                                      borderRadius: '4px'
                                    }}
                                  />
                                )}
                              </Stack>
                              <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                                <Typography
                                  variant="caption"
                                  sx={{
                                    fontWeight: 700,
                                    fontSize: '11px',
                                    color: b.isOverBudget ? '#EF4444' : b.pct >= 70 ? '#F59E0B' : 'var(--text-secondary)'
                                  }}
                                >
                                  {formatINR(b.spent, false)} / {formatINR(b.budget, false)} ({b.pct}%)
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => handleOpenEditBudget(b)}
                                  sx={{ p: 0.3, color: 'var(--text-secondary)', '&:hover': { color: 'var(--accent-primary)' } }}
                                  title="Edit limit"
                                >
                                  <EditIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteBudget(b.id, b.category)}
                                  sx={{ p: 0.3, color: 'var(--text-secondary)', '&:hover': { color: '#EF4444' } }}
                                  title="Delete category budget"
                                >
                                  <DeleteIcon sx={{ fontSize: 14 }} />
                                </IconButton>
                              </Stack>
                            </Stack>
                            <LinearProgress
                              variant="determinate"
                              value={Math.min(b.pct, 100)}
                              sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: 'var(--card-border)',
                                '& .MuiLinearProgress-bar': {
                                  bgcolor: b.isOverBudget ? '#EF4444' : b.pct >= 70 ? '#F59E0B' : 'var(--accent-primary)',
                                  borderRadius: 3,
                                },
                              }}
                            />
                            <Stack direction="row" sx={{ justifyContent: 'space-between', mt: 0.4 }}>
                              <Typography
                                variant="caption"
                                sx={{
                                  fontSize: '10px',
                                  fontWeight: b.isOverBudget ? 700 : 500,
                                  color: b.isOverBudget ? '#EF4444' : 'var(--text-secondary)'
                                }}
                              >
                                {b.isOverBudget
                                  ? `Exceeded limit by ${formatINR(Math.abs(b.remaining), false)}`
                                  : `${formatINR(b.remaining, false)} remaining`}
                              </Typography>
                              <Typography variant="caption" sx={{ fontSize: '10px', color: 'var(--text-secondary)' }}>
                                {b.pct}% used
                              </Typography>
                            </Stack>
                          </Box>
                        ))
                      )}
                    </Stack>
                  </TiltCard>
                </ResizablePanel>
              </Grid>

              {/* Recurring Bills / Commitments Card */}
              <Grid size={{ xs: 12, lg: 4 }}>
                <ResizablePanel pageId="finance" componentId="recurring_commitments" defaultHeight={380} minHeight={260} maxHeight={600}>
                  <TiltCard
                    maxTilt={2}
                    sx={{
                      p: 2.5,
                      borderRadius: 'var(--radius-card)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                    }}
                  >
                    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                        Recurring Commitments
                      </Typography>
                      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                        <Chip
                          size="small"
                          label={`${recurringItems.length} Active`}
                          sx={{ fontWeight: 700, fontSize: '11px', bgcolor: 'rgba(232, 90, 79, 0.1)', color: 'var(--accent-primary)' }}
                        />
                        <Button
                          size="small"
                          variant="outlined"
                          startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                          onClick={() => setRecDialogOpen(true)}
                          sx={{
                            borderRadius: '8px',
                            fontSize: '11px',
                            fontWeight: 700,
                            textTransform: 'none',
                            py: 0.3,
                            px: 1.2,
                            borderColor: 'var(--accent-primary)',
                            color: 'var(--accent-primary)',
                            '&:hover': { bgcolor: 'rgba(255, 111, 38, 0.08)', borderColor: 'var(--accent-primary)' }
                          }}
                        >
                          + Add Bill
                        </Button>
                      </Stack>
                    </Stack>
                    <Typography variant="caption" sx={{ color: 'var(--text-secondary)', mb: 2, display: 'block' }}>
                      Fixed loans, subscriptions, and utility bills
                    </Typography>

                    <Stack spacing={1.2} sx={{ flex: 1, overflowY: 'auto', pr: 0.5 }}>
                      {recurringItems.length === 0 ? (
                        <Box sx={{ py: 4, textAlign: 'center' }}>
                          <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 1.5 }}>
                            No recurring bills added yet.
                          </Typography>
                          <Button
                            size="small"
                            variant="contained"
                            onClick={() => setRecDialogOpen(true)}
                            sx={{ borderRadius: '8px', textTransform: 'none', bgcolor: 'var(--accent-primary)', fontWeight: 700 }}
                          >
                            + Add First Bill
                          </Button>
                        </Box>
                      ) : (
                        recurringItems.map((item) => (
                          <TiltCard
                            key={item.id}
                            maxTilt={2}
                            enableRefraction={false}
                            sx={{
                              p: 1.5,
                              borderRadius: '10px',
                              bgcolor: 'var(--bg-secondary)',
                              border: '1px solid var(--card-border)',
                            }}
                          >
                            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                  {item.description}
                                </Typography>
                                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                                  Due {new Date(item.dueDate).toLocaleDateString()} • {item.frequency}
                                </Typography>
                              </Box>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: '#EF4444' }}>
                                  -{formatINR(item.amount)}
                                </Typography>
                                <IconButton
                                  size="small"
                                  onClick={() => handlePayRecurring(item.id)}
                                  title="Log Payment"
                                  sx={{ color: '#10B981' }}
                                >
                                  <CheckCircleIcon sx={{ fontSize: 18 }} />
                                </IconButton>
                                <IconButton
                                  size="small"
                                  onClick={() => handleDeleteRecurring(item.id)}
                                  sx={{ color: 'var(--text-secondary)' }}
                                >
                                  <DeleteIcon sx={{ fontSize: 17 }} />
                                </IconButton>
                              </Stack>
                            </Stack>
                          </TiltCard>
                        ))
                      )}
                    </Stack>
                  </TiltCard>
                </ResizablePanel>
              </Grid>
            </Grid>
          </Stack>
        )}
      </Box>

      {/* CREATE / EDIT TRANSACTION MODAL */}
      <Dialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 'var(--radius-card)',
              bgcolor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
          {editingId ? 'Edit Transaction' : 'Record Transaction'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'var(--card-border)' }}>
          <form onSubmit={handleSaveTransaction} id="tx-form">
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <TextField
                label="Description"
                required
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Whole Foods Groceries"
              />

              <TextField
                label="Amount (₹ INR)"
                required
                fullWidth
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                slotProps={{
                  htmlInput: { min: '0.01', step: '0.01' },
                  input: {
                    startAdornment: <Typography sx={{ mr: 1, color: 'var(--text-secondary)', fontWeight: 700 }}>₹</Typography>,
                  },
                }}
              />

              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={type}
                  label="Type"
                  onChange={(e) => setType(e.target.value as any)}
                >
                  <MenuItem value="Expense">Expense</MenuItem>
                  <MenuItem value="Income">Income</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Category"
                required
                fullWidth
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Food, Salary, Utilities, Cloud"
              />

              <TextField
                label="Date"
                type="date"
                required
                fullWidth
                value={txDate}
                onChange={(e) => setTxDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'var(--text-secondary)' }}>
            Cancel
          </Button>
          <IconSlideButton
            type="submit"
            form="tx-form"
            variant="contained"
            disabled={!description.trim() || !amount || parseFloat(amount) <= 0 || !txDate || submitting}
            sx={{
              bgcolor: 'var(--accent-primary)',
              fontWeight: 700,
              px: 2.5,
              py: 0.8,
              '&:hover': { bgcolor: 'var(--accent-secondary)' },
            }}
          >
            {submitting ? 'Saving...' : editingId ? 'Update' : 'Record'}
          </IconSlideButton>
        </DialogActions>
      </Dialog>

      {/* CREATE RECURRING COMMITMENT MODAL */}
      <Dialog
        open={recDialogOpen}
        onClose={() => setRecDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 'var(--radius-card)',
              bgcolor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              p: 1,
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
          Add Recurring Commitment
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'var(--card-border)' }}>
          <form onSubmit={handleSaveRecurring} id="rec-form">
            <Stack spacing={2.2} sx={{ pt: 1 }}>
              <TextField
                label="Bill / Commitment Name"
                required
                fullWidth
                value={recDescription}
                onChange={(e) => setRecDescription(e.target.value)}
                placeholder="e.g. Rent, Netflix, Car Loan"
              />

              <TextField
                label="Amount (₹ INR)"
                required
                fullWidth
                type="number"
                value={recAmount}
                onChange={(e) => setRecAmount(e.target.value)}
                slotProps={{
                  htmlInput: { min: '0.01', step: '0.01' },
                  input: {
                    startAdornment: <Typography sx={{ mr: 1, color: 'var(--text-secondary)', fontWeight: 700 }}>₹</Typography>,
                  },
                }}
              />

              <FormControl fullWidth size="small">
                <InputLabel>Type</InputLabel>
                <Select
                  value={recType}
                  label="Type"
                  onChange={(e) => setRecType(e.target.value as any)}
                >
                  <MenuItem value="Bill">Bill / Subscription</MenuItem>
                  <MenuItem value="Loan">Loan</MenuItem>
                  <MenuItem value="EMI">EMI</MenuItem>
                </Select>
              </FormControl>

              <FormControl fullWidth size="small">
                <InputLabel>Frequency</InputLabel>
                <Select
                  value={recFrequency}
                  label="Frequency"
                  onChange={(e) => setRecFrequency(e.target.value as any)}
                >
                  <MenuItem value="Monthly">Monthly</MenuItem>
                  <MenuItem value="Yearly">Yearly</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Next Due Date"
                type="date"
                required
                fullWidth
                value={recDueDate}
                onChange={(e) => setRecDueDate(e.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setRecDialogOpen(false)} sx={{ color: 'var(--text-secondary)' }}>
            Cancel
          </Button>
          <IconSlideButton
            type="submit"
            form="rec-form"
            variant="contained"
            disabled={!recDescription.trim() || !recAmount || parseFloat(recAmount) <= 0 || !recDueDate || recSubmitting}
            sx={{
              bgcolor: 'var(--accent-primary)',
              fontWeight: 700,
              px: 2.5,
              py: 0.8,
              '&:hover': { bgcolor: 'var(--accent-secondary)' },
            }}
          >
            {recSubmitting ? 'Saving...' : 'Add Commitment'}
          </IconSlideButton>
        </DialogActions>
      </Dialog>

      {/* FINANCE LOG & EXCEL EXPORT MODAL */}
      <Dialog
        open={logOpen}
        onClose={() => setLogOpen(false)}
        maxWidth="lg"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 'var(--radius-card)',
              bgcolor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
              maxHeight: '90vh',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'var(--text-primary)', pb: 1 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <HistoryIcon sx={{ color: 'var(--accent-primary)' }} />
              <Typography variant="h6" sx={{ fontWeight: 800 }}>
                Finance Activity Log & Export
              </Typography>
            </Stack>
            <IconButton onClick={() => setLogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </Stack>
        </DialogTitle>

        <DialogContent dividers sx={{ borderColor: 'var(--card-border)' }}>
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            spacing={2}
            sx={{ mb: 2.5, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
          >
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ flex: 1 }}>
              <TextField
                size="small"
                placeholder="Search transactions..."
                value={logSearch}
                onChange={(e) => {
                  setLogSearch(e.target.value);
                  setLogPage(0);
                }}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'var(--text-secondary)', mr: 1, fontSize: 18 }} />,
                  },
                }}
                sx={{ minWidth: '220px' }}
              />

              <FormControl size="small" sx={{ minWidth: '140px' }}>
                <InputLabel>Type</InputLabel>
                <Select
                  value={logTypeFilter}
                  label="Type"
                  onChange={(e) => {
                    setLogTypeFilter(e.target.value);
                    setLogPage(0);
                  }}
                >
                  <MenuItem value="All">All Types</MenuItem>
                  <MenuItem value="Income">Income</MenuItem>
                  <MenuItem value="Expense">Expense</MenuItem>
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: '150px' }}>
                <InputLabel>Category</InputLabel>
                <Select
                  value={logCategoryFilter}
                  label="Category"
                  onChange={(e) => {
                    setLogCategoryFilter(e.target.value);
                    setLogPage(0);
                  }}
                >
                  <MenuItem value="All">All Categories</MenuItem>
                  {availableCategories.map((cat) => (
                    <MenuItem key={cat} value={cat}>
                      {cat}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: '140px' }}>
                <InputLabel>Period</InputLabel>
                <Select
                  value={logDateFilter}
                  label="Period"
                  onChange={(e) => {
                    setLogDateFilter(e.target.value as any);
                    setLogPage(0);
                  }}
                >
                  <MenuItem value="all">All Time</MenuItem>
                  <MenuItem value="today">Today</MenuItem>
                  <MenuItem value="yesterday">Yesterday</MenuItem>
                  <MenuItem value="this_week">This Week</MenuItem>
                  <MenuItem value="this_month">This Month</MenuItem>
                  <MenuItem value="this_year">This Year</MenuItem>
                  <MenuItem value="custom">Custom Range</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <IconSlideButton
              variant="contained"
              startIcon={<FileDownloadIcon />}
              onClick={handleExportFinanceExcel}
              disabled={logRecords.length === 0}
              sx={{
                bgcolor: '#10B981',
                color: '#FFFFFF',
                fontWeight: 750,
                px: 2.5,
                py: 0.8,
                '&:hover': { bgcolor: '#059669' },
              }}
            >
              Export Excel ({logRecords.length})
            </IconSlideButton>
          </Stack>

          {logDateFilter === 'custom' && (
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
              <TextField
                size="small"
                label="From"
                type="date"
                value={logCustomStart}
                onChange={(e) => {
                  setLogCustomStart(e.target.value);
                  setLogPage(0);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                size="small"
                label="To"
                type="date"
                value={logCustomEnd}
                onChange={(e) => {
                  setLogCustomEnd(e.target.value);
                  setLogPage(0);
                }}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Stack>
          )}

          {logRecords.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center', color: 'var(--text-secondary)' }}>
              <Typography variant="body1">No transactions found matching active filters.</Typography>
            </Box>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ bgcolor: 'var(--bg-primary)' }}>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Description</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Category</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Date</TableCell>
                    <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Type</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Amount</TableCell>
                    <TableCell align="center" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {pagedLogRecords.map((t) => {
                    const isIncome = t.type.toLowerCase() === 'income';
                    return (
                      <TableRow key={t.id} hover>
                        <TableCell sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {t.description}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={t.category}
                            sx={{ fontSize: '11px', fontWeight: 600, bgcolor: 'var(--bg-secondary)', color: 'var(--text-primary)' }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {new Date(t.date).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          <Chip
                            size="small"
                            label={isIncome ? 'Income' : 'Expense'}
                            sx={{
                              fontSize: '10.5px',
                              fontWeight: 700,
                              bgcolor: isIncome ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
                              color: isIncome ? '#10B981' : '#EF4444',
                            }}
                          />
                        </TableCell>
                        <TableCell align="right" sx={{ fontWeight: 800, color: isIncome ? '#10B981' : '#EF4444' }}>
                          {isIncome ? '+' : '-'}{formatINR(t.amount)}
                        </TableCell>
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => {
                              openEditDialog(t);
                            }}
                            title="Edit transaction"
                            sx={{ p: 0.5 }}
                          >
                            <EditIcon sx={{ fontSize: 16, color: 'var(--text-secondary)', '&:hover': { color: 'var(--accent-primary)' } }} />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteTransaction(t.id)}
                            title="Delete transaction"
                            sx={{ p: 0.5 }}
                          >
                            <DeleteIcon sx={{ fontSize: 16, color: 'var(--text-secondary)', '&:hover': { color: '#EF4444' } }} />
                          </IconButton>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              <TablePagination
                rowsPerPageOptions={[5, 10, 25, 50]}
                component="div"
                count={logRecords.length}
                rowsPerPage={logRowsPerPage}
                page={logPage}
                onPageChange={(_, p) => setLogPage(p)}
                onRowsPerPageChange={(e) => {
                  setLogRowsPerPage(parseInt(e.target.value, 10));
                  setLogPage(0);
                }}
              />
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setLogOpen(false)} sx={{ color: 'var(--text-primary)', fontWeight: 600 }}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* MANAGE BUDGET MODAL */}
      <Dialog
        open={budgetDialogOpen}
        onClose={() => setBudgetDialogOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              borderRadius: 'var(--radius-card)',
              bgcolor: 'var(--card-bg)',
              border: '1px solid var(--card-border)',
            },
          },
        }}
      >
        <DialogTitle sx={{ fontWeight: 800, color: 'var(--text-primary)', pb: 1 }}>
          {editingBudgetId ? 'Edit Budget Category' : 'Set Category Budget'}
        </DialogTitle>
        <DialogContent sx={{ pt: '12px !important' }}>
          <form id="budget-form" onSubmit={handleSaveBudget}>
            <Stack spacing={2.5}>
              <FormControl fullWidth size="small">
                <InputLabel>Expense Category</InputLabel>
                <Select
                  value={budgetCategory}
                  label="Expense Category"
                  onChange={(e) => setBudgetCategory(e.target.value)}
                >
                  <MenuItem value="Food">Food & Dining</MenuItem>
                  <MenuItem value="Shopping">Shopping</MenuItem>
                  <MenuItem value="Entertainment">Entertainment</MenuItem>
                  <MenuItem value="Utilities">Utilities & Bills</MenuItem>
                  <MenuItem value="Transport">Transport & Fuel</MenuItem>
                  <MenuItem value="Housing">Housing & Rent</MenuItem>
                  <MenuItem value="Healthcare">Healthcare & Medical</MenuItem>
                  <MenuItem value="Education">Education</MenuItem>
                  <MenuItem value="Personal">Personal Care</MenuItem>
                  <MenuItem value="Other">Custom Category...</MenuItem>
                </Select>
              </FormControl>

              {budgetCategory === 'Other' && (
                <TextField
                  label="Custom Category Name"
                  placeholder="e.g. Subscriptions, Travel"
                  required
                  fullWidth
                  size="small"
                  value={customBudgetCategory}
                  onChange={(e) => setCustomBudgetCategory(e.target.value)}
                />
              )}

              <TextField
                label="Monthly Limit (₹)"
                type="number"
                placeholder="e.g. 6000"
                required
                fullWidth
                size="small"
                value={budgetLimit}
                onChange={(e) => setBudgetLimit(e.target.value)}
                slotProps={{
                  htmlInput: { min: 1, step: 'any' },
                  input: {
                    startAdornment: <Typography sx={{ mr: 1, color: 'var(--text-secondary)', fontWeight: 700 }}>₹</Typography>,
                  },
                }}
              />
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2, justifyContent: 'space-between' }}>
          {editingBudgetId ? (
            <Button
              color="error"
              size="small"
              onClick={() => {
                const b = budgets.find((x) => x.id === editingBudgetId);
                if (b) handleDeleteBudget(b.id, b.category);
                setBudgetDialogOpen(false);
              }}
              startIcon={<DeleteIcon />}
              sx={{ textTransform: 'none', fontWeight: 600 }}
            >
              Delete
            </Button>
          ) : <Box />}
          <Stack direction="row" spacing={1}>
            <Button onClick={() => setBudgetDialogOpen(false)} sx={{ color: 'var(--text-secondary)' }}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="budget-form"
              variant="contained"
              disabled={budgetSubmitting || !budgetLimit || parseFloat(budgetLimit) <= 0}
              sx={{
                bgcolor: 'var(--accent-primary)',
                fontWeight: 700,
                textTransform: 'none',
                '&:hover': { bgcolor: 'var(--accent-secondary)' },
              }}
            >
              {budgetSubmitting ? 'Saving...' : editingBudgetId ? 'Update Budget' : 'Save Budget'}
            </Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default Finance;
