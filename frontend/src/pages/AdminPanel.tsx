import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Button, Stack, Alert, CircularProgress, Chip, Tabs, Tab, Dialog, DialogTitle, DialogContent, DialogActions, TextField, List, ListItem, ListItemText, ListItemIcon } from '@mui/material';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import KeyIcon from '@mui/icons-material/Key';
import AssessmentIcon from '@mui/icons-material/Assessment';
import PeopleIcon from '@mui/icons-material/People';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ThemeToggle from '../components/ThemeToggle';
import apiClient from '../api/apiClient';

interface ManagedUser {
  id: number;
  fullName: string;
  email: string;
  role: string;
  status: string; // 'Active', 'Pending', 'Inactive'
}

const AdminPanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState(0);
  const [pendingUsers, setPendingUsers] = useState<ManagedUser[]>([]);
  const [allUsers, setAllUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [actioningId, setActioningId] = useState<number | null>(null);

  // Password reset dialog state
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [submittingPassword, setSubmittingPassword] = useState(false);

  // Activity stats dialog state
  const [statsDialogOpen, setStatsDialogOpen] = useState(false);
  const [userStats, setUserStats] = useState<Record<string, number> | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const fetchPendingUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/users/pending');
      if (res.data.isSuccess) {
        setPendingUsers(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch pending user registrations.');
    } finally {
      setLoading(false);
    }
  };

  const fetchAllUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await apiClient.get('/api/users');
      if (res.data.isSuccess) {
        setAllUsers(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to fetch user directory.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 0) {
      fetchPendingUsers();
    } else {
      fetchAllUsers();
    }
  }, [activeTab]);

  const handleApprove = async (id: number) => {
    setActioningId(id);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post(`/api/users/${id}/approve`);
      if (res.data.isSuccess) {
        setSuccessMsg('User account approved and activated successfully.');
        setPendingUsers((prev) => prev.filter((u) => u.id !== id));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to approve user.');
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleStatus = async (user: ManagedUser) => {
    setActioningId(user.id);
    setError(null);
    setSuccessMsg(null);
    // UserStatus Enum: Active = 1, Pending = 2, Inactive = 3
    const nextStatus = user.status === 'Active' ? 3 : 1; 
    try {
      const res = await apiClient.post(`/api/users/${user.id}/status`, nextStatus);
      if (res.data.isSuccess) {
        setSuccessMsg(`User account status updated successfully to ${nextStatus === 1 ? 'Active' : 'Inactive'}.`);
        setAllUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: nextStatus === 1 ? 'Active' : 'Inactive' } : u))
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to toggle status.');
    } finally {
      setActioningId(null);
    }
  };

  const handleToggleRole = async (user: ManagedUser) => {
    setActioningId(user.id);
    setError(null);
    setSuccessMsg(null);
    // UserRole Enum: Admin = 1, User = 2
    const nextRole = user.role === 'Admin' ? 2 : 1;
    try {
      const res = await apiClient.post(`/api/users/${user.id}/role`, nextRole);
      if (res.data.isSuccess) {
        setSuccessMsg(`User role updated successfully to ${nextRole === 1 ? 'Admin' : 'User'}.`);
        setAllUsers((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, role: nextRole === 1 ? 'Admin' : 'User' } : u))
        );
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to update user role.');
    } finally {
      setActioningId(null);
    }
  };

  const handleOpenResetDialog = (user: ManagedUser) => {
    setSelectedUser(user);
    setNewPassword('');
    setResetDialogOpen(true);
  };

  const handleCloseResetDialog = () => {
    setResetDialogOpen(false);
    setSelectedUser(null);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newPassword) return;
    setSubmittingPassword(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await apiClient.post(`/api/users/${selectedUser.id}/reset-password`, { newPassword });
      if (res.data.isSuccess) {
        setSuccessMsg(`Successfully reset password for ${selectedUser.fullName}.`);
        handleCloseResetDialog();
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password.');
    } finally {
      setSubmittingPassword(false);
    }
  };

  const handleOpenStatsDialog = async (user: ManagedUser) => {
    setSelectedUser(user);
    setStatsDialogOpen(true);
    setLoadingStats(true);
    setUserStats(null);
    try {
      const res = await apiClient.get(`/api/users/${user.id}/activity-stats`);
      if (res.data.isSuccess) {
        setUserStats(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load user activity log.');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCloseStatsDialog = () => {
    setStatsDialogOpen(false);
    setSelectedUser(null);
    setUserStats(null);
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <AdminPanelSettingsIcon sx={{ color: 'var(--accent-primary)', fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              System Administration
            </Typography>
          </Stack>
          <ThemeToggle />
        </Stack>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
          Manage user accounts, approve registrations, configure status pipelines, and inspect audit activity logs.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        {successMsg && (
          <Alert severity="success" sx={{ mb: 3, borderRadius: '12px' }}>
            {successMsg}
          </Alert>
        )}

        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={(_, val) => setActiveTab(val)} textColor="inherit" sx={{ '& .MuiTabs-indicator': { backgroundColor: 'var(--accent-primary)' } }}>
            <Tab label="Pending Approvals" sx={{ fontWeight: 600, textTransform: 'none' }} />
            <Tab label="All User Accounts" sx={{ fontWeight: 600, textTransform: 'none' }} />
          </Tabs>
        </Box>

        <Card sx={{ borderRadius: '16px', boxShadow: 'var(--shadow-soft)', p: 1 }}>
          <CardContent>
            {activeTab === 0 ? (
              // PENDING REGISTRATIONS QUEUE
              <>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--text-primary)' }}>
                  Pending Registrations Approval Queue
                </Typography>

                {loading ? (
                  <LogoLoader />
                ) : pendingUsers.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center', color: '#8D8D8D' }}>
                    <CheckCircleIcon sx={{ fontSize: 48, color: '#4CAF50', opacity: 0.5, mb: 2 }} />
                    <Typography variant="body1">All user registrations are processed. No pending requests!</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid var(--neutral-primary)', borderRadius: '12px', bgcolor: 'transparent' }}>
                    <Table>
                      <TableHead sx={{ bgcolor: 'var(--bg-primary)' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Full Name</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Email Address</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Assigned Role</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Current Status</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {pendingUsers.map((user) => (
                          <TableRow key={user.id} hover>
                            <TableCell sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.fullName}</TableCell>
                            <TableCell sx={{ color: 'var(--text-secondary)' }}>{user.email}</TableCell>
                            <TableCell>
                              <Chip label={user.role} variant="outlined" size="small" sx={{ fontWeight: 600 }} />
                            </TableCell>
                            <TableCell>
                              <Chip label={user.status} color="warning" size="small" sx={{ fontWeight: 600 }} />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                                <Button
                                  variant="contained"
                                  size="small"
                                  color="success"
                                  disabled={actioningId === user.id}
                                  startIcon={<CheckCircleIcon />}
                                  onClick={() => handleApprove(user.id)}
                                  sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                                >
                                  Approve
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            ) : (
              // ALL USER ACCOUNTS DIRECTORY
              <>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--text-primary)' }}>
                  All System User Accounts
                </Typography>

                {loading ? (
                  <LogoLoader />
                ) : allUsers.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center', color: '#8D8D8D' }}>
                    <Typography variant="body1">No user accounts registered.</Typography>
                  </Box>
                ) : (
                  <TableContainer component={Paper} sx={{ boxShadow: 'none', border: '1px solid var(--neutral-primary)', borderRadius: '12px', bgcolor: 'transparent' }}>
                    <Table>
                      <TableHead sx={{ bgcolor: 'var(--bg-primary)' }}>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Full Name</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Email Address</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Role</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {allUsers.map((user) => (
                          <TableRow key={user.id} hover>
                            <TableCell sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.fullName}</TableCell>
                            <TableCell sx={{ color: 'var(--text-secondary)' }}>{user.email}</TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                                <Chip label={user.role} variant="outlined" size="small" sx={{ fontWeight: 600 }} />
                                <Button
                                  variant="text"
                                  size="small"
                                  color="secondary"
                                  disabled={actioningId === user.id}
                                  onClick={() => handleToggleRole(user)}
                                  sx={{ textTransform: 'none', minWidth: 0, p: '2px 8px', fontSize: '11px', fontWeight: 600 }}
                                >
                                  {user.role === 'Admin' ? 'Make User' : 'Make Admin'}
                                </Button>
                              </Stack>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={user.status}
                                color={user.status === 'Active' ? 'success' : user.status === 'Pending' ? 'warning' : 'default'}
                                size="small"
                                sx={{ fontWeight: 600 }}
                              />
                            </TableCell>
                            <TableCell sx={{ textAlign: 'right' }}>
                              <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color={user.status === 'Active' ? 'error' : 'success'}
                                  disabled={actioningId === user.id}
                                  startIcon={user.status === 'Active' ? <BlockIcon /> : <CheckCircleIcon />}
                                  onClick={() => handleToggleStatus(user)}
                                  sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                                >
                                  {user.status === 'Active' ? 'Deactivate' : 'Activate'}
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="secondary"
                                  startIcon={<KeyIcon />}
                                  onClick={() => handleOpenResetDialog(user)}
                                  sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                                >
                                  Reset Pass
                                </Button>
                                <Button
                                  variant="outlined"
                                  size="small"
                                  color="info"
                                  startIcon={<AssessmentIcon />}
                                  onClick={() => handleOpenStatsDialog(user)}
                                  sx={{ textTransform: 'none', borderRadius: '8px', fontWeight: 600 }}
                                >
                                  Activity Logs
                                </Button>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* DIALOG 1: RESET PASSWORD */}
        <Dialog open={resetDialogOpen} onClose={handleCloseResetDialog} slotProps={{ paper: { sx: { borderRadius: '16px', p: 1 } } }}>
          <DialogTitle sx={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
            Reset Password for {selectedUser?.fullName}
          </DialogTitle>
          <form onSubmit={handleResetPassword}>
            <DialogContent sx={{ minWidth: '350px' }}>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
                Enter the new password below. This will override their forgotten credentials.
              </Typography>
              <TextField
                label="New Password"
                type="password"
                required
                fullWidth
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </DialogContent>
            <DialogActions sx={{ p: 2 }}>
              <Button onClick={handleCloseResetDialog} color="inherit" sx={{ fontWeight: 600 }}>Cancel</Button>
              <Button type="submit" variant="contained" disabled={submittingPassword} sx={{ bgcolor: 'var(--accent-primary)', fontWeight: 600, '&:hover': { bgcolor: 'var(--accent-secondary)' } }}>
                {submittingPassword ? 'Resetting...' : 'Confirm Reset'}
              </Button>
            </DialogActions>
          </form>
        </Dialog>

        {/* DIALOG 2: USER ACTIVITY LOGS STATS */}
        <Dialog open={statsDialogOpen} onClose={handleCloseStatsDialog} slotProps={{ paper: { sx: { borderRadius: '16px', p: 1, minWidth: '380px' } } }}>
          <DialogTitle sx={{ fontWeight: 700, color: 'var(--accent-secondary)', display: 'flex', alignItems: 'center', gap: 1 }}>
            <AssessmentIcon /> Activity Log for {selectedUser?.fullName}
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 3 }}>
              Total entries logged across system modules:
            </Typography>

            {loadingStats ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress sx={{ color: 'var(--accent-secondary)' }} />
              </Box>
            ) : userStats ? (
              <List>
                {Object.entries(userStats).map(([moduleName, count]) => (
                  <ListItem key={moduleName} sx={{ borderBottom: '1px solid #EEEEEE', py: 1.5 }}>
                    <ListItemIcon sx={{ minWidth: '40px' }}>
                      <PeopleIcon sx={{ color: 'var(--accent-secondary)' }} />
                    </ListItemIcon>
                    <ListItemText
                      primary={<Typography sx={{ fontWeight: 600, color: '#37474F' }}>{moduleName}</Typography>}
                    />
                    <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--accent-primary)' }}>
                      {count}
                    </Typography>
                  </ListItem>
                ))}
              </List>
            ) : (
              <Typography variant="body2" color="error">Failed to load statistics.</Typography>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
            <Button onClick={handleCloseStatsDialog} variant="contained" sx={{ bgcolor: 'var(--accent-secondary)', fontWeight: 600, '&:hover': { bgcolor: '#78909C' } }}>
              Close Logs
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </PageWrapper>
  );
};

export default AdminPanel;

