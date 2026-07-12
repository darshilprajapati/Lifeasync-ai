import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, IconButton, Select, MenuItem, InputLabel, FormControl, Grid, Alert, Stack, Tab, Tabs, Chip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ReceiptIcon from '@mui/icons-material/Receipt';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import ThemeToggle from '../components/ThemeToggle';
import apiClient from '../api/apiClient';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Transaction {
  id: number;
  description: string;
  amount: number;
  type: string;
  date: string;
  category: string;
}

interface RecurringItem {
  id: number;
  description: string;
  amount: number;
  type: string; // 'Loan', 'EMI', 'Bill'
  frequency: string; // 'Monthly', 'Yearly'
  dueDate: string;
  isPaid: boolean;
}

interface FinanceSummary {
  totalIncome: number;
  totalExpense: number;
  balance: number;
  projectedMonthlyRecurring: number;
  projectedYearlyRecurring: number;
}

const Finance: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [recurringItems, setRecurringItems] = useState<RecurringItem[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    totalIncome: 0,
    totalExpense: 0,
    balance: 0,
    projectedMonthlyRecurring: 0,
    projectedYearlyRecurring: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Tab State
  const [activeTab, setActiveTab] = useState(0); // 0 = Ledger & Analytics, 1 = Bills & Loans Tracker

  // Transaction Form fields
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('Expense');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Recurring Commitment Form fields
  const [recDescription, setRecDescription] = useState('');
  const [recAmount, setRecAmount] = useState('');
  const [recType, setRecType] = useState('Bill');
  const [recFrequency, setRecFrequency] = useState('Monthly');
  const [recDueDate, setRecDueDate] = useState('');
  const [recSubmitting, setRecSubmitting] = useState(false);

  const fetchFinanceData = async () => {
    try {
      setLoading(true);
      const [transRes, sumRes, recRes] = await Promise.all([
        apiClient.get('/api/finance'),
        apiClient.get('/api/finance/summary'),
        apiClient.get('/api/finance/recurring')
      ]);

      if (transRes.data.isSuccess) setTransactions(transRes.data.data);
      if (sumRes.data.isSuccess) setSummary(sumRes.data.data);
      if (recRes.data.isSuccess) setRecurringItems(recRes.data.data);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load financial records.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || !type || !category || !date) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/finance', {
        description,
        amount: parseFloat(amount),
        type,
        date: new Date(date).toISOString(),
        category
      });

      if (res.data.isSuccess) {
        await fetchFinanceData();
        setDescription('');
        setAmount('');
        setCategory('');
        setDate('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record transaction.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteTransaction = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/finance/${id}`);
      if (res.data.isSuccess) {
        await fetchFinanceData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete transaction.');
    }
  };

  const handleAddRecurringItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recDescription || !recAmount || !recType || !recFrequency || !recDueDate) return;
    setError(null);
    setRecSubmitting(true);
    try {
      const res = await apiClient.post('/api/finance/recurring', {
        description: recDescription,
        amount: parseFloat(recAmount),
        type: recType,
        frequency: recFrequency,
        dueDate: new Date(recDueDate).toISOString()
      });

      if (res.data.isSuccess) {
        await fetchFinanceData();
        setRecDescription('');
        setRecAmount('');
        setRecDueDate('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to record commitment.');
    } finally {
      setRecSubmitting(false);
    }
  };

  const handleDeleteRecurringItem = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/finance/recurring/${id}`);
      if (res.data.isSuccess) {
        await fetchFinanceData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete commitment.');
    }
  };

  const handlePayRecurringItem = async (id: number) => {
    try {
      setError(null);
      const res = await apiClient.post(`/api/finance/recurring/${id}/pay`);
      if (res.data.isSuccess) {
        await fetchFinanceData();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to process payment.');
    }
  };

  const chartData = [
    {
      name: 'Summary',
      Income: summary.totalIncome,
      Expense: summary.totalExpense,
    }
  ];

  const getRecurringTypeColor = (type: string) => {
    switch (type) {
      case 'Loan': return '#FF9800'; // orange
      case 'EMI': return '#9C27B0'; // purple
      case 'Bill': return '#2196F3'; // blue
      default: return '#6D6D6D';
    }
  };

  const isDueSoon = (dateStr: string) => {
    const due = new Date(dateStr);
    const today = new Date();
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays >= 0 && diffDays <= 3;
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <AccountBalanceWalletIcon sx={{ color: 'var(--accent-primary)', fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Personal Finance Tracker
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ThemeToggle />
            <ReportExporter module="Finance" />
          </Stack>
        </Stack>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 4 }}>
          Log incomes, track expenses, monitor balance allocations, and analyze budgets.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {/* Summary & Projection Cards Row */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', borderLeft: '5px solid #4CAF50' }}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#8D8D8D', fontWeight: 600 }}>Total Income</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#4CAF50', mt: 1 }}>
                      ${summary.totalIncome.toFixed(2)}
                    </Typography>
                  </Box>
                  <TrendingUpIcon sx={{ color: '#4CAF50', fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', borderLeft: '5px solid #E85A4F' }}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#8D8D8D', fontWeight: 600 }}>Total Expenses</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#E85A4F', mt: 1 }}>
                      ${summary.totalExpense.toFixed(2)}
                    </Typography>
                  </Box>
                  <TrendingDownIcon sx={{ color: '#E85A4F', fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 4 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', borderLeft: '5px solid var(--accent-primary)', bgcolor: 'rgba(232, 90, 79, 0.02)' }}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#8D8D8D', fontWeight: 600 }}>Net Balance</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--accent-primary)', mt: 1 }}>
                      ${summary.balance.toFixed(2)}
                    </Typography>
                  </Box>
                  <AccountBalanceWalletIcon sx={{ color: 'var(--accent-primary)', fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          
          {/* Commitment Projections */}
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', borderLeft: '5px solid #2196F3', bgcolor: 'rgba(33, 150, 243, 0.02)' }}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#8D8D8D', fontWeight: 600 }}>Committed Monthly Cost (Bills & EMIs)</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#2196F3', mt: 1 }}>
                      ${(summary.projectedMonthlyRecurring || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <CalendarMonthIcon sx={{ color: '#2196F3', fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', borderLeft: '5px solid #9C27B0', bgcolor: 'rgba(156, 39, 176, 0.02)' }}>
              <CardContent>
                <Stack direction="row" spacing={2} sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ color: '#8D8D8D', fontWeight: 600 }}>Committed Yearly Cost (Bills & EMIs)</Typography>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: '#9C27B0', mt: 1 }}>
                      ${(summary.projectedYearlyRecurring || 0).toFixed(2)}
                    </Typography>
                  </Box>
                  <ReceiptIcon sx={{ color: '#9C27B0', fontSize: 40 }} />
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Tab Selector */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 4 }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} textColor="inherit" sx={{ '& .MuiTabs-indicator': { backgroundColor: 'var(--accent-primary)' } }}>
            <Tab label="Ledger & Analytics" sx={{ fontWeight: 600, textTransform: 'none' }} />
            <Tab label="Committed Bills & Loans" sx={{ fontWeight: 600, textTransform: 'none' }} />
          </Tabs>
        </Box>

        {activeTab === 0 ? (
          /* TAB 0: LEDGER & ANALYTICS */
          <Grid container spacing={4}>
            {/* Add Transaction Form */}
            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', p: 2 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--accent-primary)' }}>
                    Log Transaction
                  </Typography>
                  <form onSubmit={handleAddTransaction}>
                    <Stack spacing={2.5}>
                      <TextField
                        label="Description"
                        placeholder="e.g. Grocery Shop, Monthly Salary"
                        required
                        fullWidth
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                      <TextField
                        label="Amount ($)"
                        type="number"
                        required
                        fullWidth
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                      />
                      <FormControl fullWidth>
                        <InputLabel id="type-label">Type</InputLabel>
                        <Select
                          labelId="type-label"
                          label="Type"
                          value={type}
                          onChange={(e) => setType(e.target.value)}
                        >
                          <MenuItem value="Expense">Expense</MenuItem>
                          <MenuItem value="Income">Income</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label="Category"
                        placeholder="e.g. Food, Utilities, Salary, Travel"
                        required
                        fullWidth
                        value={category}
                        onChange={(e) => setCategory(e.target.value)}
                      />
                      <TextField
                        label="Date"
                        type="date"
                        required
                        fullWidth
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={submitting}
                        startIcon={<AddIcon />}
                        sx={{
                          bgcolor: 'var(--accent-primary)',
                          py: 1.5,
                          borderRadius: '12px',
                          fontWeight: 600,
                          '&:hover': { bgcolor: 'var(--accent-secondary)' },
                        }}
                      >
                        {submitting ? 'Logging...' : 'Log Transaction'}
                      </Button>
                    </Stack>
                  </form>
                </CardContent>
              </Card>
            </Grid>

            {/* Transactions List & Charts */}
            <Grid size={{ xs: 12, md: 7 }}>
              <Stack spacing={4}>
                {/* Chart Card */}
                <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', p: 2 }}>
                  <CardContent>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--text-primary)' }}>
                      Income vs Expense Breakdown
                    </Typography>
                    <Box sx={{ width: '100%', height: 200 }}>
                      <ResponsiveContainer>
                        <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip formatter={(value) => `$${value}`} />
                          <Legend />
                          <Bar dataKey="Income" fill="#4CAF50" radius={[10, 10, 0, 0]} barSize={60} />
                          <Bar dataKey="Expense" fill="#E85A4F" radius={[10, 10, 0, 0]} barSize={60} />
                        </BarChart>
                      </ResponsiveContainer>
                    </Box>
                  </CardContent>
                </Card>

                {/* Transactions History Card */}
                <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', minHeight: '300px', display: 'flex', flexDirection: 'column' }}>
                  <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--text-primary)' }}>
                      Transaction History
                    </Typography>

                    {loading ? (
                      <LogoLoader />
                    ) : transactions.length === 0 ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', color: '#8D8D8D' }}>
                        <AccountBalanceWalletIcon sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                        <Typography variant="body1">No transactions recorded yet.</Typography>
                      </Box>
                    ) : (
                      <Stack spacing={1.5} sx={{ overflowY: 'auto', maxHeight: '400px', pr: 1 }}>
                        {transactions.map((t) => (
                          <Card
                            key={t.id}
                            sx={{
                              flexShrink: 0,
                              borderRadius: '12px',
                              boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                              borderLeft: t.type === 'Income' ? '4px solid #4CAF50' : '4px solid #E85A4F',
                              bgcolor: 'var(--card-bg)',
                            }}
                          >
                            <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', py: '10px !important' }}>
                              <Box sx={{ minWidth: 0 }}>
                                <Typography variant="body2" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                  {t.description}
                                </Typography>
                                <Stack direction="row" spacing={1.5} sx={{ mt: 0.5, alignItems: 'center' }}>
                                  <Typography variant="caption" sx={{ bgcolor: '#F0F0F0', px: 1, py: 0.2, borderRadius: '4px', color: 'var(--text-secondary)', fontWeight: 500 }}>
                                    {t.category}
                                  </Typography>
                                  <Typography variant="caption" sx={{ color: '#8D8D8D' }}>
                                    {new Date(t.date).toLocaleDateString()}
                                  </Typography>
                                </Stack>
                              </Box>
                              <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: t.type === 'Income' ? '#4CAF50' : '#E85A4F' }}>
                                  {t.type === 'Income' ? '+' : '-'}${t.amount.toFixed(2)}
                                </Typography>
                                <IconButton onClick={() => handleDeleteTransaction(t.id)} size="small" sx={{ color: '#E85A4F' }}>
                                  <DeleteIcon />
                                </IconButton>
                              </Stack>
                            </CardContent>
                          </Card>
                        ))}
                      </Stack>
                    )}
                  </CardContent>
                </Card>
              </Stack>
            </Grid>
          </Grid>
        ) : (
          /* TAB 1: COMMITTED BILLS & LOANS */
          <Grid container spacing={4} sx={{ alignItems: 'stretch' }}>
            {/* Add Commitment Form */}
            <Grid size={{ xs: 12, md: 5 }} sx={{ display: 'flex' }}>
              <Card sx={{ width: '100%', height: '100%', borderRadius: '16px', boxShadow: 'var(--shadow-soft)', p: 2, display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flex: 1 }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--accent-primary)' }}>
                    Add Commitment / Recurring Cost
                  </Typography>
                  <form onSubmit={handleAddRecurringItem}>
                    <Stack spacing={2.5}>
                      <TextField
                        label="Description / Name"
                        placeholder="e.g. Netflix, Car Loan, House Rent"
                        required
                        fullWidth
                        value={recDescription}
                        onChange={(e) => setRecDescription(e.target.value)}
                      />
                      <TextField
                        label="Amount ($)"
                        type="number"
                        required
                        fullWidth
                        value={recAmount}
                        onChange={(e) => setRecAmount(e.target.value)}
                      />
                      <FormControl fullWidth>
                        <InputLabel id="rec-type-label">Type</InputLabel>
                        <Select
                          labelId="rec-type-label"
                          label="Type"
                          value={recType}
                          onChange={(e) => setRecType(e.target.value)}
                        >
                          <MenuItem value="Bill">Bill / Subscription</MenuItem>
                          <MenuItem value="EMI">EMI Payment</MenuItem>
                          <MenuItem value="Loan">Loan Payment</MenuItem>
                        </Select>
                      </FormControl>
                      <FormControl fullWidth>
                        <InputLabel id="rec-freq-label">Billing Cycle</InputLabel>
                        <Select
                          labelId="rec-freq-label"
                          label="Billing Cycle"
                          value={recFrequency}
                          onChange={(e) => setRecFrequency(e.target.value)}
                        >
                          <MenuItem value="Monthly">Monthly</MenuItem>
                          <MenuItem value="Yearly">Yearly</MenuItem>
                        </Select>
                      </FormControl>
                      <TextField
                        label="Next Expiry / Due Date"
                        type="date"
                        required
                        fullWidth
                        value={recDueDate}
                        onChange={(e) => setRecDueDate(e.target.value)}
                        slotProps={{ inputLabel: { shrink: true } }}
                      />
                      <Button
                        type="submit"
                        variant="contained"
                        fullWidth
                        disabled={recSubmitting}
                        startIcon={<AddIcon />}
                        sx={{
                          bgcolor: 'var(--accent-primary)',
                          py: 1.5,
                          borderRadius: '12px',
                          fontWeight: 600,
                          '&:hover': { bgcolor: 'var(--accent-secondary)' },
                        }}
                      >
                        {recSubmitting ? 'Recording...' : 'Record Commitment'}
                      </Button>
                    </Stack>
                  </form>
                </CardContent>
              </Card>
            </Grid>

            {/* Commitments List sorted by expiry date first */}
            <Grid size={{ xs: 12, md: 7 }} sx={{ display: 'flex' }}>
              <Card sx={{ width: '100%', height: '100%', borderRadius: '16px', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', p: 2 }}>
                <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--text-primary)' }}>
                    Active Bills, EMIs & Loans (Sorted by Expiry Date)
                  </Typography>

                  {loading ? (
                    <LogoLoader />
                  ) : recurringItems.length === 0 ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', color: '#8D8D8D', minHeight: '350px' }}>
                      <ReceiptIcon sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                      <Typography variant="body1">No committed bills or loans logged.</Typography>
                    </Box>
                  ) : (
                    <Stack spacing={2} sx={{ overflowY: 'auto', maxHeight: '420px', pr: 1 }}>
                      {recurringItems.map((item) => {
                        const dueSoon = isDueSoon(item.dueDate);
                        const isOverdue = new Date(item.dueDate) < new Date() && !isSameDay(new Date(item.dueDate), new Date());

                        function isSameDay(d1: Date, d2: Date) {
                          return d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate();
                        }

                        return (
                          <Card
                            key={item.id}
                            sx={{
                              flexShrink: 0,
                              borderRadius: '12px',
                              boxShadow: dueSoon || isOverdue ? '0 4px 16px rgba(232, 90, 79, 0.1)' : '0 2px 8px rgba(0,0,0,0.02)',
                              borderLeft: `5px solid ${getRecurringTypeColor(item.type)}`,
                              border: dueSoon || isOverdue ? '1px solid rgba(232, 90, 79, 0.25)' : 'none',
                              bgcolor: 'var(--card-bg)',
                            }}
                          >
                            <CardContent sx={{ py: '12px !important' }}>
                              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                                <Grid size={{ xs: 12, sm: 7 }}>
                                  <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
                                      {item.description}
                                    </Typography>
                                    <Chip
                                      label={`${item.type} - ${item.frequency}`}
                                      size="small"
                                      sx={{
                                        bgcolor: `${getRecurringTypeColor(item.type)}12`,
                                        color: getRecurringTypeColor(item.type),
                                        fontWeight: 700,
                                        fontSize: '10px',
                                        height: '20px'
                                      }}
                                    />
                                  </Stack>
                                  <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                                    <Typography variant="body2" sx={{ color: isOverdue ? '#E85A4F' : dueSoon ? '#FF9800' : '#8D8D8D', fontWeight: dueSoon || isOverdue ? 700 : 500, fontSize: '13px' }}>
                                      Expiry/Due Date: {new Date(item.dueDate).toLocaleDateString()}
                                    </Typography>
                                    {(dueSoon || isOverdue) && (
                                      <Typography variant="caption" sx={{ color: '#E85A4F', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                        {isOverdue ? '⚠️ Overdue' : '⏳ Due Soon!'}
                                      </Typography>
                                    )}
                                  </Stack>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 5 }}>
                                  <Stack direction="row" spacing={1.5} sx={{ justifyContent: { xs: 'flex-start', sm: 'flex-end' }, alignItems: 'center' }}>
                                    <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                                      ${item.amount.toFixed(2)}
                                    </Typography>
                                    <IconButton
                                      onClick={() => handlePayRecurringItem(item.id)}
                                      size="small"
                                      sx={{
                                        bgcolor: '#4CAF5015',
                                        color: '#4CAF50',
                                        border: '1px solid rgba(76, 175, 80, 0.25)',
                                        '&:hover': { bgcolor: '#4CAF50', color: 'white' }
                                      }}
                                      title="Mark as Paid"
                                    >
                                      <CheckCircleIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                    <IconButton
                                      onClick={() => handleDeleteRecurringItem(item.id)}
                                      size="small"
                                      sx={{
                                        bgcolor: '#E85A4F12',
                                        color: '#E85A4F',
                                        '&:hover': { bgcolor: '#E85A4F', color: 'white' }
                                      }}
                                      title="Delete Commitment"
                                    >
                                      <DeleteIcon sx={{ fontSize: 20 }} />
                                    </IconButton>
                                  </Stack>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}
      </Box>
    </PageWrapper>
  );
};

export default Finance;

