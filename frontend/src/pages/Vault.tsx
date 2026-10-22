import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Card,
  TextField,
  IconButton,
  Alert,
  Stack,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import AddIcon from '@mui/icons-material/Add';
import LockIcon from '@mui/icons-material/Lock';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import NoteIcon from '@mui/icons-material/Note';
import ShieldIcon from '@mui/icons-material/Shield';
import SecurityIcon from '@mui/icons-material/Security';
import SearchIcon from '@mui/icons-material/Search';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';

import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { useNotification } from '../context/NotificationContext';

export interface VaultItem {
  id: number;
  title: string;
  content: string; // Decrypted content string (JSON string or plain text)
  category?: string; // 'Login' | 'Note' | 'Link'
}

interface ParsedVaultContent {
  type: 'Login' | 'Note' | 'Link';
  username?: string;
  password?: string;
  website?: string;
  url?: string;
  noteText?: string;
}

const Vault: React.FC = () => {
  const { notify } = useNotification();
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search
  const [activeCategory, setActiveCategory] = useState<'All' | 'Login' | 'Note' | 'Link'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [revealedIds, setRevealedIds] = useState<Record<number, boolean>>({});

  // Add / Edit Modal State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [itemType, setItemType] = useState<'Login' | 'Note' | 'Link'>('Login');
  const [title, setTitle] = useState('');
  const [website, setWebsite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchVaultItems = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/vault');
      if (res.data.isSuccess) {
        setItems(res.data.data);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to load vault items.';
      setError(msg);
      notify.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultItems();
  }, []);

  // Robust content parser supporting login credentials, secure notes, and secure links
  const parseContent = (contentStr: string, explicitCategory?: string): ParsedVaultContent => {
    if (!contentStr) return { type: 'Note', noteText: '' };

    try {
      if (contentStr.trim().startsWith('{')) {
        const parsed = JSON.parse(contentStr);
        if (parsed.website !== undefined || parsed.username !== undefined || parsed.password !== undefined) {
          return {
            type: 'Login',
            username: parsed.username || '',
            password: parsed.password || '',
            website: parsed.website || '',
          };
        }
        if (parsed.url !== undefined) {
          return {
            type: 'Link',
            url: parsed.url || '',
            noteText: parsed.notes || '',
          };
        }
      }
    } catch {
      // Fallback to text note
    }

    if (explicitCategory === 'Link') {
      return { type: 'Link', url: contentStr, noteText: '' };
    }
    return { type: 'Note', noteText: contentStr };
  };

  // Summary Counts
  const counts = useMemo(() => {
    let passwords = 0;
    let notes = 0;
    let links = 0;

    items.forEach((item) => {
      const parsed = parseContent(item.content, item.category);
      if (parsed.type === 'Login') passwords++;
      else if (parsed.type === 'Link') links++;
      else notes++;
    });

    return {
      total: items.length,
      passwords,
      notes,
      links,
    };
  }, [items]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const parsed = parseContent(item.content, item.category);
      if (activeCategory !== 'All' && parsed.type !== activeCategory) {
        return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = item.title.toLowerCase().includes(q);
        const userMatch = (parsed.username || '').toLowerCase().includes(q);
        const webMatch = (parsed.website || parsed.url || '').toLowerCase().includes(q);
        if (!titleMatch && !userMatch && !webMatch) return false;
      }
      return true;
    });
  }, [items, activeCategory, searchQuery]);

  const togglePasswordReveal = (id: number) => {
    setRevealedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const copyToClipboard = (text: string, label: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    notify.success(`${label} copied to clipboard!`);
  };

  const openCreateDialog = (type: 'Login' | 'Note' | 'Link' = 'Login') => {
    setEditingId(null);
    setItemType(type);
    setTitle('');
    setWebsite('');
    setUsername('');
    setPassword('');
    setNoteContent('');
    setLinkUrl('');
    setDialogOpen(true);
  };

  const openEditDialog = (item: VaultItem) => {
    setEditingId(item.id);
    setTitle(item.title);
    const parsed = parseContent(item.content, item.category);
    setItemType(parsed.type);
    setWebsite(parsed.website || '');
    setUsername(parsed.username || '');
    setPassword(parsed.password || '');
    setNoteContent(parsed.noteText || '');
    setLinkUrl(parsed.url || '');
    setDialogOpen(true);
  };

  const handleSaveItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let finalContent = '';
    if (itemType === 'Login') {
      if (!username.trim() || !password) return;
      finalContent = JSON.stringify({
        website: website.trim(),
        username: username.trim(),
        password,
      });
    } else if (itemType === 'Link') {
      if (!linkUrl.trim()) return;
      finalContent = JSON.stringify({
        url: linkUrl.trim(),
        notes: noteContent.trim(),
      });
    } else {
      if (!noteContent.trim()) return;
      finalContent = noteContent.trim();
    }

    setSubmitting(true);
    try {
      if (editingId) {
        const res = await apiClient.put(`/api/vault/${editingId}`, {
          title: title.trim(),
          content: finalContent,
          category: itemType,
        });
        if (res.data.isSuccess) {
          trackAction('vault_item_updated', { module: 'vault', action: 'edit' });
          notify.success(`"${title.trim()}" updated.`);
          setItems((prev) => prev.map((item) => (item.id === editingId ? res.data.data : item)));
          setDialogOpen(false);
        }
      } else {
        const res = await apiClient.post('/api/vault', {
          title: title.trim(),
          content: finalContent,
          category: itemType,
        });
        if (res.data.isSuccess) {
          trackAction('vault_item_created', { module: 'vault', action: 'create' });
          notify.success(`"${title.trim()}" encrypted and stored.`);
          setItems((prev) => [...prev, res.data.data]);
          setDialogOpen(false);
        }
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to encrypt and save item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/vault/${id}`);
      if (res.data.isSuccess) {
        trackAction('vault_item_deleted', { module: 'vault', action: 'delete' });
        notify.success('Item deleted from secure vault.');
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err: any) {
      notify.error(err.response?.data?.message || 'Failed to delete vault item.');
    }
  };

  const safeUrl = (rawUrl?: string): string => {
    if (!rawUrl) return '#';
    const trimmed = rawUrl.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed;
    return `https://${trimmed}`;
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: { xs: '16px', md: '28px' }, height: '100%', overflowY: 'auto', bgcolor: 'var(--bg-primary)' }}>
        {/* CipherVault Hero Banner */}
        <Card
          sx={{
            mb: 3,
            p: { xs: 2.5, md: 3.5 },
            borderRadius: 'var(--radius-card)',
            bgcolor: 'var(--card-bg)',
            border: '1px solid var(--card-border)',
            boxShadow: 'var(--shadow-soft)',
            position: 'relative',
          }}
        >
          <Stack
            direction={{ xs: 'column', md: 'row' }}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' }, gap: 2 }}
          >
            <Stack direction="row" spacing={2.5} sx={{ alignItems: 'center' }}>
              <Box
                sx={{
                  bgcolor: 'rgba(59, 130, 246, 0.12)',
                  color: '#2563EB',
                  p: 2,
                  borderRadius: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ShieldIcon sx={{ fontSize: 36 }} />
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, letterSpacing: '-0.5px', mb: 0.6, color: 'var(--text-primary)' }}>
                  Welcome to CipherVault
                </Typography>
                <Typography variant="body1" sx={{ color: 'var(--text-secondary)', maxWidth: '650px', fontSize: '14.5px', lineHeight: 1.5 }}>
                  Your private credentials, passwords, notes, and keys are protected with military-grade AES-256-GCM encryption.
                </Typography>
              </Box>
            </Stack>

            <Chip
              icon={<VerifiedUserIcon sx={{ color: '#2563EB !important', fontSize: '18px !important' }} />}
              label="AES-256 Protected"
              sx={{
                bgcolor: 'rgba(59, 130, 246, 0.08)',
                color: '#2563EB',
                border: '1px solid rgba(59, 130, 246, 0.25)',
                fontWeight: 700,
                fontSize: '13px',
                py: 2,
                px: 1.2,
                borderRadius: '12px',
              }}
            />
          </Stack>
        </Card>

        {/* Security Feature Pillars */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                p: 2,
                borderRadius: '14px',
                bgcolor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box sx={{ p: 1.2, borderRadius: '10px', bgcolor: 'rgba(59, 130, 246, 0.12)', color: '#3B82F6' }}>
                <LockIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Secure Vault
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  Active & Protected
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                p: 2,
                borderRadius: '14px',
                bgcolor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box sx={{ p: 1.2, borderRadius: '10px', bgcolor: 'rgba(232, 90, 79, 0.12)', color: 'var(--accent-primary)' }}>
                <SecurityIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Encryption Standard
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  AES-256 Symmetric Key
                </Typography>
              </Box>
            </Card>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Card
              sx={{
                p: 2,
                borderRadius: '14px',
                bgcolor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-soft)',
                display: 'flex',
                alignItems: 'center',
                gap: 2,
              }}
            >
              <Box sx={{ p: 1.2, borderRadius: '10px', bgcolor: 'rgba(16, 185, 129, 0.12)', color: '#10B981' }}>
                <VerifiedUserIcon fontSize="medium" />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
                  Zero Knowledge Privacy
                </Typography>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  Strict User Isolation
                </Typography>
              </Box>
            </Card>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: '12px' }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* 4 CipherVault Category Summary Cards */}
        <Grid container spacing={2.5} sx={{ mb: 3 }}>
          {/* Total Status */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              sx={{
                p: 2.2,
                borderRadius: 'var(--radius-card)',
                bgcolor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-soft)',
                height: '100%',
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Vault Status
                </Typography>
                <Chip size="small" label="SECURE" sx={{ fontWeight: 800, fontSize: '10px', bgcolor: 'rgba(16, 185, 129, 0.15)', color: '#10B981' }} />
              </Stack>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5 }}>
                {counts.total}
              </Typography>
              <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                Total encrypted items in vault
              </Typography>
            </Card>
          </Grid>

          {/* Password Manager */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              onClick={() => setActiveCategory('Login')}
              sx={{
                p: 2.2,
                borderRadius: 'var(--radius-card)',
                bgcolor: 'var(--card-bg)',
                border: '1px solid',
                borderColor: activeCategory === 'Login' ? 'var(--accent-primary)' : 'var(--card-border)',
                boxShadow: 'var(--shadow-soft)',
                cursor: 'pointer',
                height: '100%',
                transition: '0.2s',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Password Manager
                </Typography>
                <VpnKeyIcon sx={{ color: '#3B82F6', fontSize: 20 }} />
              </Stack>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#3B82F6', mb: 0.5 }}>
                {counts.passwords}
              </Typography>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                  Store & manage passwords securely
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateDialog('Login');
                  }}
                  sx={{
                    color: '#3B82F6',
                    borderColor: 'rgba(59, 130, 246, 0.3)',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '11px',
                    px: 1,
                    py: 0.2,
                    borderRadius: '8px',
                    '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.08)', borderColor: '#3B82F6' },
                  }}
                >
                  + Add
                </Button>
              </Stack>
            </Card>
          </Grid>

          {/* Secure Notes */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              onClick={() => setActiveCategory('Note')}
              sx={{
                p: 2.2,
                borderRadius: 'var(--radius-card)',
                bgcolor: 'var(--card-bg)',
                border: '1px solid',
                borderColor: activeCategory === 'Note' ? 'var(--accent-primary)' : 'var(--card-border)',
                boxShadow: 'var(--shadow-soft)',
                cursor: 'pointer',
                height: '100%',
                transition: '0.2s',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Secure Notes
                </Typography>
                <NoteIcon sx={{ color: 'var(--accent-primary)', fontSize: 20 }} />
              </Stack>
              <Typography variant="h3" sx={{ fontWeight: 800, color: 'var(--accent-primary)', mb: 0.5 }}>
                {counts.notes}
              </Typography>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                  Encrypted notes & sensitive keys
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateDialog('Note');
                  }}
                  sx={{
                    color: 'var(--accent-primary)',
                    borderColor: 'rgba(232, 90, 79, 0.3)',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '11px',
                    px: 1,
                    py: 0.2,
                    borderRadius: '8px',
                    '&:hover': { bgcolor: 'rgba(232, 90, 79, 0.08)', borderColor: 'var(--accent-primary)' },
                  }}
                >
                  + Add
                </Button>
              </Stack>
            </Card>
          </Grid>

          {/* Links & Bookmarks */}
          <Grid size={{ xs: 12, sm: 6, lg: 3 }}>
            <Card
              onClick={() => setActiveCategory('Link')}
              sx={{
                p: 2.2,
                borderRadius: 'var(--radius-card)',
                bgcolor: 'var(--card-bg)',
                border: '1px solid',
                borderColor: activeCategory === 'Link' ? 'var(--accent-primary)' : 'var(--card-border)',
                boxShadow: 'var(--shadow-soft)',
                cursor: 'pointer',
                height: '100%',
                transition: '0.2s',
                '&:hover': { transform: 'translateY(-2px)' },
              }}
            >
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-secondary)' }}>
                  Secure Links
                </Typography>
                <LinkIcon sx={{ color: '#10B981', fontSize: 20 }} />
              </Stack>
              <Typography variant="h3" sx={{ fontWeight: 800, color: '#10B981', mb: 0.5 }}>
                {counts.links}
              </Typography>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mt: 1 }}>
                <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
                  Encrypted bookmarks & URLs
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={(e) => {
                    e.stopPropagation();
                    openCreateDialog('Link');
                  }}
                  sx={{
                    color: '#10B981',
                    borderColor: 'rgba(16, 185, 129, 0.3)',
                    fontWeight: 700,
                    textTransform: 'none',
                    fontSize: '11px',
                    px: 1,
                    py: 0.2,
                    borderRadius: '8px',
                    '&:hover': { bgcolor: 'rgba(16, 185, 129, 0.08)', borderColor: '#10B981' },
                  }}
                >
                  + Add
                </Button>
              </Stack>
            </Card>
          </Grid>
        </Grid>

        {/* Toolbar & Category Switcher */}
        <Card
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
            direction={{ xs: 'column', md: 'row' }}
            sx={{ justifyContent: 'space-between', alignItems: { xs: 'stretch', md: 'center' }, gap: 2 }}
          >
            <Box sx={{ width: { xs: '100%', md: '320px' } }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search secrets by title, username, url..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'var(--text-secondary)', mr: 1, fontSize: 20 }} />,
                  },
                }}
              />
            </Box>

            <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', alignItems: 'center' }}>
              {(
                [
                  { key: 'All', label: `All (${counts.total})` },
                  { key: 'Login', label: `Passwords (${counts.passwords})` },
                  { key: 'Note', label: `Notes (${counts.notes})` },
                  { key: 'Link', label: `Links (${counts.links})` },
                ] as const
              ).map((tab) => (
                <Chip
                  key={tab.key}
                  label={tab.label}
                  clickable
                  onClick={() => setActiveCategory(tab.key)}
                  sx={{
                    fontWeight: 600,
                    fontSize: '12px',
                    borderRadius: 'var(--radius-chip)',
                    bgcolor: activeCategory === tab.key ? 'var(--accent-primary)' : 'transparent',
                    color: activeCategory === tab.key ? '#FFFFFF' : 'var(--text-secondary)',
                    border: '1px solid',
                    borderColor: activeCategory === tab.key ? 'var(--accent-primary)' : 'var(--card-border)',
                  }}
                />
              ))}

              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openCreateDialog(activeCategory === 'All' ? 'Login' : activeCategory)}
                sx={{
                  bgcolor: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  textTransform: 'none',
                  borderRadius: 'var(--radius-button)',
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: 'var(--accent-secondary)' },
                }}
              >
                Add Secret
              </Button>
            </Stack>
          </Stack>
        </Card>

        {/* Vault Items Grid */}
        {loading ? (
          <Box sx={{ py: 8 }}>
            <LogoLoader />
          </Box>
        ) : filteredItems.length === 0 ? (
          <Box
            sx={{
              py: 8,
              textAlign: 'center',
              bgcolor: 'var(--card-bg)',
              borderRadius: 'var(--radius-card)',
              border: '1px dashed var(--card-border)',
              color: 'var(--text-secondary)',
            }}
          >
            <LockIcon sx={{ fontSize: 44, opacity: 0.4, mb: 1.5 }} />
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              No encrypted items match your filters.
            </Typography>
            <Typography variant="caption" sx={{ display: 'block', mt: 0.5 }}>
              Click "Add Secret" above to secure your first login or private note.
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={2.5}>
            {filteredItems.map((item) => {
              const data = parseContent(item.content, item.category);
              const isRevealed = !!revealedIds[item.id];

              return (
                <Grid key={item.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <Card
                    sx={{
                      p: 2.2,
                      borderRadius: 'var(--radius-card)',
                      bgcolor: 'var(--card-bg)',
                      border: '1px solid var(--card-border)',
                      boxShadow: 'var(--shadow-soft)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      transition: 'transform 0.15s, box-shadow 0.15s',
                      '&:hover': { transform: 'translateY(-2px)', boxShadow: 'var(--shadow-hover)' },
                    }}
                  >
                    <Box>
                      {/* Top Bar: Icon, Title & Actions */}
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                        <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center' }}>
                          <Box
                            sx={{
                              p: 1,
                              borderRadius: '8px',
                              bgcolor:
                                data.type === 'Login'
                                  ? 'rgba(59, 130, 246, 0.12)'
                                  : data.type === 'Link'
                                  ? 'rgba(16, 185, 129, 0.12)'
                                  : 'rgba(232, 90, 79, 0.12)',
                              color:
                                data.type === 'Login'
                                  ? '#3B82F6'
                                  : data.type === 'Link'
                                  ? '#10B981'
                                  : 'var(--accent-primary)',
                            }}
                          >
                            {data.type === 'Login' ? (
                              <VpnKeyIcon fontSize="small" />
                            ) : data.type === 'Link' ? (
                              <LinkIcon fontSize="small" />
                            ) : (
                              <NoteIcon fontSize="small" />
                            )}
                          </Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                            {item.title}
                          </Typography>
                        </Stack>

                        <Stack direction="row" spacing={0.3}>
                          <IconButton size="small" onClick={() => openEditDialog(item)}>
                            <EditIcon sx={{ fontSize: 16, color: 'var(--text-secondary)' }} />
                          </IconButton>
                          <IconButton size="small" onClick={() => handleDeleteItem(item.id)}>
                            <DeleteIcon sx={{ fontSize: 16, color: 'var(--text-secondary)', '&:hover': { color: '#EF4444' } }} />
                          </IconButton>
                        </Stack>
                      </Stack>

                      {/* Content rendering based on type */}
                      {data.type === 'Login' && (
                        <Stack spacing={1.2} sx={{ bgcolor: 'var(--bg-secondary)', p: 1.5, borderRadius: '10px' }}>
                          {data.website && (
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                              <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                                URL:
                              </Typography>
                              <a
                                href={safeUrl(data.website)}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '12px',
                                  color: 'var(--accent-primary)',
                                  textDecoration: 'none',
                                  fontWeight: 600,
                                }}
                              >
                                {data.website.replace(/^https?:\/\//, '')}
                              </a>
                            </Box>
                          )}

                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                              Username:
                            </Typography>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <Typography variant="body2" sx={{ fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
                                {data.username}
                              </Typography>
                              <IconButton size="small" onClick={() => copyToClipboard(data.username || '', 'Username')} sx={{ p: 0.3 }}>
                                <ContentCopyIcon sx={{ fontSize: 13 }} />
                              </IconButton>
                            </Stack>
                          </Box>

                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                              Password:
                            </Typography>
                            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
                              <Typography
                                variant="body2"
                                sx={{
                                  fontWeight: 700,
                                  color: isRevealed ? 'var(--accent-primary)' : 'var(--text-secondary)',
                                  fontFamily: 'monospace',
                                  letterSpacing: isRevealed ? 'normal' : '2px',
                                }}
                              >
                                {isRevealed ? data.password : '••••••••••••'}
                              </Typography>
                              <IconButton size="small" onClick={() => togglePasswordReveal(item.id)} sx={{ p: 0.3 }}>
                                {isRevealed ? <VisibilityOff sx={{ fontSize: 14 }} /> : <Visibility sx={{ fontSize: 14 }} />}
                              </IconButton>
                              {isRevealed && (
                                <IconButton size="small" onClick={() => copyToClipboard(data.password || '', 'Password')} sx={{ p: 0.3 }}>
                                  <ContentCopyIcon sx={{ fontSize: 13 }} />
                                </IconButton>
                              )}
                            </Stack>
                          </Box>
                        </Stack>
                      )}

                      {data.type === 'Link' && (
                        <Stack spacing={1} sx={{ bgcolor: 'var(--bg-secondary)', p: 1.5, borderRadius: '10px' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <Typography variant="caption" sx={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                              Link:
                            </Typography>
                            <a
                              href={safeUrl(data.url)}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: '12px',
                                color: 'var(--accent-primary)',
                                textDecoration: 'none',
                                fontWeight: 700,
                              }}
                            >
                              Visit URL
                            </a>
                          </Box>
                          {data.noteText && (
                            <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                              {data.noteText}
                            </Typography>
                          )}
                        </Stack>
                      )}

                      {data.type === 'Note' && (
                        <Box sx={{ bgcolor: 'var(--bg-secondary)', p: 1.5, borderRadius: '10px' }}>
                          <Typography
                            variant="body2"
                            sx={{
                              color: isRevealed ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontFamily: isRevealed ? 'inherit' : 'monospace',
                              letterSpacing: isRevealed ? 'normal' : '1px',
                              whiteSpace: 'pre-wrap',
                              fontSize: '12.5px',
                              lineHeight: 1.5,
                            }}
                          >
                            {isRevealed ? data.noteText : '•••••••••••••••••••••••••••••••'}
                          </Typography>
                          <Stack direction="row" sx={{ justifyContent: 'flex-end', mt: 1 }}>
                            <Button
                              size="small"
                              startIcon={isRevealed ? <VisibilityOff /> : <Visibility />}
                              onClick={() => togglePasswordReveal(item.id)}
                              sx={{ fontSize: '11px', textTransform: 'none' }}
                            >
                              {isRevealed ? 'Hide Note' : 'Reveal Secret Note'}
                            </Button>
                          </Stack>
                        </Box>
                      )}
                    </Box>

                    <Box sx={{ pt: 1.5, mt: 1.5, borderTop: '1px solid var(--border-color)' }}>
                      <Typography variant="caption" sx={{ color: 'var(--text-secondary)', fontSize: '11px' }}>
                        AES-256 Encrypted • Zero Plaintext
                      </Typography>
                    </Box>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        )}
      </Box>

      {/* CREATE / EDIT SECRET MODAL */}
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
          {editingId ? 'Edit Secret' : 'Add Encrypted Secret'}
        </DialogTitle>
        <DialogContent dividers sx={{ borderColor: 'var(--card-border)' }}>
          <form onSubmit={handleSaveItem} id="vault-form">
            <Stack spacing={2} sx={{ pt: 1 }}>
              <FormControl fullWidth size="small">
                <InputLabel>Category / Type</InputLabel>
                <Select
                  value={itemType}
                  label="Category / Type"
                  onChange={(e) => setItemType(e.target.value as any)}
                >
                  <MenuItem value="Login">Password / Login</MenuItem>
                  <MenuItem value="Note">Secure Note</MenuItem>
                  <MenuItem value="Link">Secure Link</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Item Title"
                required
                fullWidth
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. AWS Root Account, Bank PIN"
              />

              {itemType === 'Login' && (
                <>
                  <TextField
                    label="Website URL (Optional)"
                    fullWidth
                    size="small"
                    value={website}
                    onChange={(e) => setWebsite(e.target.value)}
                    placeholder="https://aws.amazon.com"
                  />
                  <TextField
                    label="Username / Email"
                    required
                    fullWidth
                    size="small"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="admin@example.com"
                  />
                  <TextField
                    label="Password"
                    required
                    fullWidth
                    size="small"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                  />
                </>
              )}

              {itemType === 'Link' && (
                <>
                  <TextField
                    label="Secure URL"
                    required
                    fullWidth
                    size="small"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://private-dashboard.internal"
                  />
                  <TextField
                    label="Notes / Context (Optional)"
                    fullWidth
                    size="small"
                    multiline
                    rows={2}
                    value={noteContent}
                    onChange={(e) => setNoteContent(e.target.value)}
                    placeholder="Any access instructions or passcodes..."
                  />
                </>
              )}

              {itemType === 'Note' && (
                <TextField
                  label="Secure Note Content"
                  required
                  fullWidth
                  multiline
                  rows={4}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Paste recovery seed phrases, private SSH keys, or confidential notes here..."
                />
              )}
            </Stack>
          </form>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setDialogOpen(false)} sx={{ color: 'var(--text-secondary)' }}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="vault-form"
            variant="contained"
            disabled={
              !title.trim() ||
              (itemType === 'Login' && (!username.trim() || !password)) ||
              (itemType === 'Link' && !linkUrl.trim()) ||
              (itemType === 'Note' && !noteContent.trim()) ||
              submitting
            }
            sx={{
              bgcolor: 'var(--accent-primary)',
              fontWeight: 700,
              '&:hover': { bgcolor: 'var(--accent-secondary)' },
            }}
          >
            {submitting ? 'Encrypting...' : editingId ? 'Update Secret' : 'Encrypt & Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </PageWrapper>
  );
};

export default Vault;
