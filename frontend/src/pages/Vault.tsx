import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box,
  Typography,
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
  useTheme,
  useMediaQuery,
  Menu,
  Divider,
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
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import StarBorderIcon from '@mui/icons-material/StarBorder';
import StarIcon from '@mui/icons-material/Star';
import TuneIcon from '@mui/icons-material/Tune';
import KeyIcon from '@mui/icons-material/Key';
import DescriptionIcon from '@mui/icons-material/Description';


import { MobileFilterSheet } from '../components/mobile/MobileFilterSheet';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import { TiltCard } from '../components/modern3d/TiltCard';
import { IconSlideButton } from '../components/modern3d/IconSlideButton';
import { ResizablePanel } from '../components/resizable/ResizablePanel';
import { ResetLayoutButton } from '../components/resizable/ResetLayoutButton';
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
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [actionMenuAnchor, setActionMenuAnchor] = useState<null | { el: HTMLElement; item: VaultItem }>(null);
  const [favorites, setFavorites] = useState<Record<number, boolean>>({});
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

  const fetchVaultItems = useCallback(async () => {
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
  }, [notify]);

  useEffect(() => {
    fetchVaultItems();
  }, [fetchVaultItems]);

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
        {/* MOBILE VIEW: Option C — Privacy First */}
        {isMobile ? (
          <Box sx={{ pb: 6 }}>
            {/* 1. Header Card: CipherVault + Privacy Description + AES-256 Badge */}
            <TiltCard
              maxTilt={1.5}
              enableRefraction={false}
              sx={{
                p: 2.2,
                borderRadius: '20px',
                bgcolor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-soft)',
                mb: 2,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Subtle background glow */}
              <Box
                sx={{
                  position: 'absolute',
                  right: -25,
                  top: -25,
                  width: 140,
                  height: 140,
                  borderRadius: '50%',
                  background: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, rgba(59, 130, 246, 0) 70%)',
                  pointerEvents: 'none',
                }}
              />

              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'flex-start', mb: 1.5 }}>
                <Box
                  sx={{
                    width: 44,
                    height: 44,
                    borderRadius: '14px',
                    bgcolor: 'rgba(59, 130, 246, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#2563EB',
                    flexShrink: 0,
                  }}
                >
                  <ShieldIcon sx={{ fontSize: 26 }} />
                </Box>
                <Box sx={{ flex: 1 }}>
                  <Typography variant="h5" sx={{ fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.3px' }}>
                    CipherVault
                  </Typography>
                  <Typography variant="caption" sx={{ fontWeight: 650, color: 'var(--text-secondary)', display: 'block', mt: 0.2 }}>
                    Your privacy. Your data. Always protected.
                  </Typography>
                </Box>
              </Stack>

              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '12.5px', lineHeight: 1.5, mb: 1.8 }}>
                All your credentials, passwords, notes and keys are secured with military-grade AES-256-GCM encryption. We never access your data.
              </Typography>

              <Chip
                icon={<VerifiedUserIcon sx={{ color: '#2563EB !important', fontSize: '16px !important' }} />}
                label="AES-256 Protected"
                sx={{
                  bgcolor: 'rgba(59, 130, 246, 0.1)',
                  color: '#2563EB',
                  border: '1px solid rgba(59, 130, 246, 0.25)',
                  fontWeight: 750,
                  fontSize: '11.5px',
                  height: 28,
                }}
              />
            </TiltCard>

            {/* 2. Compact Vault Security Status Card */}
            <TiltCard
              maxTilt={1}
              enableRefraction={false}
              sx={{
                p: 1.8,
                borderRadius: '18px',
                bgcolor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                boxShadow: 'var(--shadow-soft)',
                mb: 2,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    bgcolor: 'rgba(16, 185, 129, 0.12)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10B981',
                  }}
                >
                  <CheckCircleIcon sx={{ fontSize: 22 }} />
                </Box>
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '13.5px' }}>
                    Your Vault is Secure
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700, fontSize: '11px' }}>
                    Active &amp; Protected
                  </Typography>
                </Box>
              </Stack>
              <ChevronRightIcon sx={{ color: 'var(--text-secondary)', fontSize: 20 }} />
            </TiltCard>

            {/* 3. Four Category Shortcuts: Passwords, Notes, Links, Vault */}
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: 1.2,
                mb: 2.5,
              }}
            >
              {/* Passwords */}
              <Box
                onClick={() => setActiveCategory(activeCategory === 'Login' ? 'All' : 'Login')}
                sx={{
                  p: 1.2,
                  py: 1.6,
                  borderRadius: '16px',
                  bgcolor: activeCategory === 'Login' ? 'rgba(245, 158, 11, 0.12)' : 'var(--card-bg)',
                  border: '1.5px solid',
                  borderColor: activeCategory === 'Login' ? '#F59E0B' : 'var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    bgcolor: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F59E0B',
                    mb: 0.8,
                  }}
                >
                  <KeyIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '11.5px', color: 'var(--text-primary)' }}>
                  Passwords
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 650, fontSize: '10px', color: 'var(--text-secondary)', mt: 0.2 }}>
                  {counts.passwords} items
                </Typography>
              </Box>

              {/* Notes */}
              <Box
                onClick={() => setActiveCategory(activeCategory === 'Note' ? 'All' : 'Note')}
                sx={{
                  p: 1.2,
                  py: 1.6,
                  borderRadius: '16px',
                  bgcolor: activeCategory === 'Note' ? 'rgba(139, 92, 246, 0.12)' : 'var(--card-bg)',
                  border: '1.5px solid',
                  borderColor: activeCategory === 'Note' ? '#8B5CF6' : 'var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    bgcolor: 'rgba(139, 92, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#8B5CF6',
                    mb: 0.8,
                  }}
                >
                  <DescriptionIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '11.5px', color: 'var(--text-primary)' }}>
                  Notes
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 650, fontSize: '10px', color: 'var(--text-secondary)', mt: 0.2 }}>
                  {counts.notes} items
                </Typography>
              </Box>

              {/* Links */}
              <Box
                onClick={() => setActiveCategory(activeCategory === 'Link' ? 'All' : 'Link')}
                sx={{
                  p: 1.2,
                  py: 1.6,
                  borderRadius: '16px',
                  bgcolor: activeCategory === 'Link' ? 'rgba(16, 185, 129, 0.12)' : 'var(--card-bg)',
                  border: '1.5px solid',
                  borderColor: activeCategory === 'Link' ? '#10B981' : 'var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    bgcolor: 'rgba(16, 185, 129, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#10B981',
                    mb: 0.8,
                  }}
                >
                  <LinkIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '11.5px', color: 'var(--text-primary)' }}>
                  Links
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 650, fontSize: '10px', color: 'var(--text-secondary)', mt: 0.2 }}>
                  {counts.links} items
                </Typography>
              </Box>

              {/* Vault / All */}
              <Box
                onClick={() => setActiveCategory('All')}
                sx={{
                  p: 1.2,
                  py: 1.6,
                  borderRadius: '16px',
                  bgcolor: activeCategory === 'All' ? 'rgba(59, 130, 246, 0.12)' : 'var(--card-bg)',
                  border: '1.5px solid',
                  borderColor: activeCategory === 'All' ? '#3B82F6' : 'var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    borderRadius: '10px',
                    bgcolor: 'rgba(59, 130, 246, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#3B82F6',
                    mb: 0.8,
                  }}
                >
                  <ShieldIcon sx={{ fontSize: 18 }} />
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '11.5px', color: 'var(--text-primary)' }}>
                  Vault
                </Typography>
                <Typography variant="caption" sx={{ fontWeight: 650, fontSize: '10px', color: 'var(--text-secondary)', mt: 0.2 }}>
                  {counts.total} items
                </Typography>
              </Box>
            </Box>

            {/* 4. Recent Items Section Header */}
            <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '15px' }}>
                Recent Items
              </Typography>
              <Button
                size="small"
                onClick={() => {
                  setActiveCategory('All');
                  setSearchQuery('');
                }}
                sx={{
                  color: 'var(--accent-primary)',
                  fontWeight: 750,
                  fontSize: '12px',
                  textTransform: 'none',
                  p: 0,
                  '&:hover': { bgcolor: 'transparent', textDecoration: 'underline' },
                }}
              >
                View All &gt;
              </Button>
            </Stack>

            {/* Compact Search & Filter trigger (No horizontal scrolling tabs) */}
            <Stack direction="row" spacing={1} sx={{ mb: 2, alignItems: 'center' }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Search secrets by title, username..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: <SearchIcon sx={{ color: 'var(--text-secondary)', mr: 0.8, fontSize: 19 }} />,
                    sx: {
                      bgcolor: 'var(--card-bg)',
                      borderRadius: '14px',
                      fontSize: '13px',
                      '& fieldset': { borderColor: 'var(--card-border)' },
                    },
                  },
                }}
              />
              <Button
                variant={activeCategory !== 'All' ? 'contained' : 'outlined'}
                onClick={() => setMobileFilterOpen(true)}
                startIcon={<TuneIcon sx={{ fontSize: 18 }} />}
                sx={{
                  height: 40,
                  px: 1.8,
                  borderRadius: '14px',
                  fontWeight: 700,
                  fontSize: '12.5px',
                  whiteSpace: 'nowrap',
                  textTransform: 'none',
                  bgcolor: activeCategory !== 'All' ? 'var(--accent-primary)' : 'var(--card-bg)',
                  borderColor: activeCategory !== 'All' ? 'var(--accent-primary)' : 'var(--card-border)',
                  color: activeCategory !== 'All' ? '#FFFFFF' : 'var(--text-primary)',
                  boxShadow: activeCategory !== 'All' ? '0 4px 12px rgba(232, 90, 79, 0.25)' : 'none',
                }}
              >
                Filter
              </Button>
            </Stack>

            {/* Active filter chip */}
            {activeCategory !== 'All' && (
              <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
                <Chip
                  label={'Category: ' + (activeCategory === 'Login' ? 'Passwords' : activeCategory === 'Note' ? 'Notes' : 'Links')}
                  size="small"
                  onDelete={() => setActiveCategory('All')}
                  sx={{
                    fontWeight: 700,
                    fontSize: '11px',
                    bgcolor: 'rgba(232, 90, 79, 0.1)',
                    color: 'var(--accent-primary)',
                    border: '1px solid rgba(232, 90, 79, 0.2)',
                  }}
                />
              </Stack>
            )}

            {/* 5. Secret Items List or Empty State */}
            {filteredItems.length === 0 ? (
              <Box
                sx={{
                  py: 6,
                  px: 3,
                  textAlign: 'center',
                  bgcolor: 'var(--card-bg)',
                  borderRadius: '20px',
                  border: '1px solid var(--card-border)',
                  boxShadow: 'var(--shadow-soft)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <Box
                  sx={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    bgcolor: 'var(--bg-secondary)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-secondary)',
                    mb: 1.8,
                  }}
                >
                  <LockOutlinedIcon sx={{ fontSize: 28 }} />
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5, fontSize: '16px' }}>
                  No items yet
                </Typography>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)', maxWidth: 280, mb: 2.5, fontSize: '12.5px', lineHeight: 1.4 }}>
                  Add your first password, note or link to keep it secure in CipherVault.
                </Typography>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => openCreateDialog('Login')}
                  sx={{
                    bgcolor: 'var(--accent-primary)',
                    color: '#FFFFFF',
                    fontWeight: 750,
                    borderRadius: '14px',
                    px: 3,
                    py: 1,
                    textTransform: 'none',
                    fontSize: '13px',
                    boxShadow: '0 4px 14px rgba(232, 90, 79, 0.35)',
                    '&:hover': { bgcolor: 'var(--accent-secondary)' },
                  }}
                >
                  + Add Secret
                </Button>
              </Box>
            ) : (
              <Stack spacing={1.2}>
                {filteredItems.map((item) => {
                  const data = parseContent(item.content, item.category);
                  const isRevealed = Boolean(revealedIds[item.id]);
                  const isFav = Boolean(favorites[item.id]);

                  // Company initial or icon
                  const initial = (item.title || 'S').charAt(0).toUpperCase();
                  const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#E85A4F', '#06B6D4'];
                  const iconBg = colors[(item.title.charCodeAt(0) || 0) % colors.length];

                  return (
                    <TiltCard
                      key={item.id}
                      maxTilt={1.2}
                      enableRefraction={false}
                      sx={{
                        p: 1.8,
                        borderRadius: '18px',
                        bgcolor: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        boxShadow: 'var(--shadow-soft)',
                        transition: 'all 0.2s',
                      }}
                    >
                      {/* Item Row */}
                      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
                        <Stack direction="row" spacing={1.2} sx={{ alignItems: 'center', flex: 1, minWidth: 0, mr: 1 }}>
                          <Box
                            sx={{
                              width: 38,
                              height: 38,
                              borderRadius: '12px',
                              bgcolor: iconBg + '1A',
                              border: '1.5px solid ' + iconBg + '4D',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              color: iconBg,
                              fontWeight: 900,
                              fontSize: '15px',
                              flexShrink: 0,
                            }}
                          >
                            {initial}
                          </Box>
                          <Box sx={{ minWidth: 0, flex: 1 }}>
                            <Stack direction="row" spacing={0.8} sx={{ alignItems: 'center' }}>
                              <Typography
                                variant="subtitle2"
                                sx={{
                                  fontWeight: 800,
                                  color: 'var(--text-primary)',
                                  fontSize: '13.5px',
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {item.title}
                              </Typography>
                              <Chip
                                label={data.type === 'Login' ? 'Password' : data.type}
                                size="small"
                                sx={{
                                  height: 20,
                                  fontSize: '10px',
                                  fontWeight: 750,
                                  bgcolor:
                                    data.type === 'Login'
                                      ? 'rgba(59, 130, 246, 0.12)'
                                      : data.type === 'Link'
                                      ? 'rgba(16, 185, 129, 0.12)'
                                      : 'rgba(139, 92, 246, 0.12)',
                                  color:
                                    data.type === 'Login'
                                      ? '#3B82F6'
                                      : data.type === 'Link'
                                      ? '#10B981'
                                      : '#8B5CF6',
                                  flexShrink: 0,
                                }}
                              />
                            </Stack>
                            <Typography
                              variant="caption"
                              sx={{
                                color: 'var(--text-secondary)',
                                fontSize: '11px',
                                display: 'block',
                                whiteSpace: 'nowrap',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                              }}
                            >
                              {data.type === 'Login'
                                ? (data.username ? data.username.slice(0, 3) + '••••@' + (data.username.split('@')[1] || '...') : 'Saved credential')
                                : data.type === 'Link'
                                ? (data.url || 'Saved URL')
                                : (data.noteText || 'Encrypted secure note')}
                            </Typography>
                          </Box>
                        </Stack>

                        {/* Actions */}
                        <Stack direction="row" spacing={0.3} sx={{ alignItems: 'center', flexShrink: 0 }}>
                          <IconButton
                            size="small"
                            onClick={() => setFavorites((prev) => ({ ...prev, [item.id]: !prev[item.id] }))}
                            sx={{ p: 0.5, color: isFav ? '#F59E0B' : 'var(--text-secondary)' }}
                          >
                            {isFav ? <StarIcon sx={{ fontSize: 17 }} /> : <StarBorderIcon sx={{ fontSize: 17 }} />}
                          </IconButton>
                          {data.type === 'Login' && (
                            <IconButton
                              size="small"
                              onClick={() => togglePasswordReveal(item.id)}
                              sx={{ p: 0.5, color: isRevealed ? 'var(--accent-primary)' : 'var(--text-secondary)' }}
                            >
                              {isRevealed ? <VisibilityOff sx={{ fontSize: 17 }} /> : <Visibility sx={{ fontSize: 17 }} />}
                            </IconButton>
                          )}
                          <IconButton
                            size="small"
                            onClick={(e) => setActionMenuAnchor({ el: e.currentTarget, item })}
                            sx={{ p: 0.5, color: 'var(--text-secondary)' }}
                          >
                            <MoreVertIcon sx={{ fontSize: 17 }} />
                          </IconButton>
                        </Stack>
                      </Stack>

                      {/* Revealed Password Row */}
                      {isRevealed && data.type === 'Login' && (
                        <Box
                          sx={{
                            mt: 1.2,
                            p: 1.2,
                            borderRadius: '12px',
                            bgcolor: 'var(--bg-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--text-primary)', fontSize: '12px' }}>
                            {data.password}
                          </Typography>
                          <IconButton
                            size="small"
                            onClick={() => copyToClipboard(data.password || '', 'Password')}
                            sx={{ p: 0.4, color: 'var(--accent-primary)' }}
                          >
                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                          </IconButton>
                        </Box>
                      )}
                    </TiltCard>
                  );
                })}

                {/* Mobile Floating Add Secret Button Footer */}
                <Box
                  onClick={() => openCreateDialog('Login')}
                  sx={{
                    p: 1.8,
                    mt: 1,
                    borderRadius: '16px',
                    border: '2px dashed rgba(232, 90, 79, 0.45)',
                    bgcolor: 'rgba(232, 90, 79, 0.03)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    color: 'var(--accent-primary)',
                    fontWeight: 750,
                    fontSize: '13.5px',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: 'rgba(232, 90, 79, 0.08)',
                      borderColor: 'var(--accent-primary)',
                    },
                  }}
                >
                  <AddIcon sx={{ mr: 1, fontSize: 18 }} />
                  Add Secret
                </Box>
              </Stack>
            )}
          </Box>
        ) : (
          <Box>
            
        {/* CipherVault Hero Banner */}
        <TiltCard
          maxTilt={1.5}
          enableRefraction={false}
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

            <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
              <ResetLayoutButton pageId="vault" pageName="Vault" />
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
          </Stack>
        </TiltCard>

        {/* Security Feature Pillars */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid size={{ xs: 12, md: 4 }}>
            <TiltCard
              maxTilt={3}
              sx={{
                p: 2,
                borderRadius: '14px',
                height: '100%',
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
            </TiltCard>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TiltCard
              maxTilt={3}
              sx={{
                p: 2,
                borderRadius: '14px',
                height: '100%',
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
            </TiltCard>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <TiltCard
              maxTilt={3}
              sx={{
                p: 2,
                borderRadius: '14px',
                height: '100%',
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
            </TiltCard>
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
          <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
            <TiltCard
              maxTilt={3.5}
              sx={{
                p: 2.2,
                borderRadius: 'var(--radius-card)',
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
            </TiltCard>
          </Grid>

          {/* Password Manager */}
          <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
            <TiltCard
              maxTilt={3.5}
              onClick={() => setActiveCategory('Login')}
              sx={{
                p: 2.2,
                borderRadius: 'var(--radius-card)',
                border: '1px solid',
                borderColor: activeCategory === 'Login' ? 'var(--accent-primary)' : 'var(--card-border)',
                cursor: 'pointer',
                height: '100%',
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
            </TiltCard>
          </Grid>

          {/* Secure Notes */}
          <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
            <TiltCard
              maxTilt={3.5}
              onClick={() => setActiveCategory('Note')}
              sx={{
                p: 2.2,
                borderRadius: 'var(--radius-card)',
                border: '1px solid',
                borderColor: activeCategory === 'Note' ? 'var(--accent-primary)' : 'var(--card-border)',
                cursor: 'pointer',
                height: '100%',
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
            </TiltCard>
          </Grid>

          {/* Links & Bookmarks */}
          <Grid size={{ xs: 6, sm: 6, lg: 3 }}>
            <TiltCard
              maxTilt={3.5}
              onClick={() => setActiveCategory('Link')}
              sx={{
                p: 2.2,
                borderRadius: 'var(--radius-card)',
                border: '1px solid',
                borderColor: activeCategory === 'Link' ? 'var(--accent-primary)' : 'var(--card-border)',
                cursor: 'pointer',
                height: '100%',
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
            </TiltCard>
          </Grid>
        </Grid>

        {/* Toolbar & Category Switcher */}
        <TiltCard
          maxTilt={1.5}
          enableRefraction={false}
          sx={{
            mb: 3,
            p: 1.5,
            borderRadius: 'var(--radius-card)',
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

              <IconSlideButton
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => openCreateDialog(activeCategory === 'All' ? 'Login' : activeCategory)}
                sx={{
                  bgcolor: 'var(--accent-primary)',
                  color: '#FFFFFF',
                  fontWeight: 700,
                  px: 2.5,
                  py: 0.8,
                  whiteSpace: 'nowrap',
                  '&:hover': { bgcolor: 'var(--accent-secondary)' },
                }}
              >
                Add Secret
              </IconSlideButton>
            </Stack>
          </Stack>
        </TiltCard>

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
          <ResizablePanel pageId="vault" componentId="vault_items_grid" defaultHeight={620} minHeight={380} maxHeight={1400}>
            <Grid container spacing={2.5} sx={{ height: '100%', overflowY: 'auto', pr: 0.5 }}>
              {filteredItems.map((item) => {
              const data = parseContent(item.content, item.category);
              const isRevealed = !!revealedIds[item.id];

              return (
                <Grid key={item.id} size={{ xs: 12, md: 6, lg: 4 }}>
                  <TiltCard
                    maxTilt={3}
                    enableRefraction={false}
                    sx={{
                      p: 2.2,
                      borderRadius: 'var(--radius-card)',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
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
                  </TiltCard>
                </Grid>
              );
            })}
          </Grid>
        </ResizablePanel>
      )}
          </Box>
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
          <IconSlideButton
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
              px: 2.5,
              py: 0.8,
              '&:hover': { bgcolor: 'var(--accent-secondary)' },
            }}
          >
            {submitting ? 'Encrypting...' : editingId ? 'Update Secret' : 'Encrypt & Save'}
          </IconSlideButton>
        </DialogActions>
      </Dialog>
            {/* Mobile Action Menu for Secret Card (Copy, Edit, Delete) */}
        <Menu
          anchorEl={actionMenuAnchor?.el}
          open={Boolean(actionMenuAnchor)}
          onClose={() => setActionMenuAnchor(null)}
          slotProps={{
            paper: {
              sx: {
                borderRadius: '14px',
                boxShadow: 'var(--shadow-hover)',
                bgcolor: 'var(--card-bg)',
                border: '1px solid var(--card-border)',
                minWidth: '170px',
              },
            },
          }}
        >
          {actionMenuAnchor && (() => {
            const parsed = parseContent(actionMenuAnchor.item.content, actionMenuAnchor.item.category);
            return (
              <Box>
                {parsed.type === 'Login' && (
                  <Box>
                    <MenuItem
                      onClick={() => {
                        copyToClipboard(parsed.username || '', 'Username');
                        setActionMenuAnchor(null);
                      }}
                      sx={{ fontSize: '12.5px', fontWeight: 600 }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 15, mr: 1, color: 'var(--text-secondary)' }} />
                      Copy Username
                    </MenuItem>
                    <MenuItem
                      onClick={() => {
                        copyToClipboard(parsed.password || '', 'Password');
                        setActionMenuAnchor(null);
                      }}
                      sx={{ fontSize: '12.5px', fontWeight: 600 }}
                    >
                      <ContentCopyIcon sx={{ fontSize: 15, mr: 1, color: 'var(--text-secondary)' }} />
                      Copy Password
                    </MenuItem>
                    <Divider sx={{ my: 0.5 }} />
                  </Box>
                )}
                {parsed.type === 'Link' && (
                  <MenuItem
                    onClick={() => {
                      copyToClipboard(parsed.url || '', 'Link');
                      setActionMenuAnchor(null);
                    }}
                    sx={{ fontSize: '12.5px', fontWeight: 600 }}
                  >
                    <ContentCopyIcon sx={{ fontSize: 15, mr: 1, color: 'var(--text-secondary)' }} />
                    Copy URL
                  </MenuItem>
                )}
                <MenuItem
                  onClick={() => {
                    const itm = actionMenuAnchor.item;
                    setActionMenuAnchor(null);
                    openEditDialog(itm);
                  }}
                  sx={{ fontSize: '12.5px', fontWeight: 600 }}
                >
                  <EditIcon sx={{ fontSize: 15, mr: 1, color: 'var(--text-secondary)' }} />
                  Edit Secret
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    const id = actionMenuAnchor.item.id;
                    setActionMenuAnchor(null);
                    handleDeleteItem(id);
                  }}
                  sx={{ fontSize: '12.5px', fontWeight: 600, color: '#EF4444' }}
                >
                  <DeleteIcon sx={{ fontSize: 15, mr: 1, color: '#EF4444' }} />
                  Delete Secret
                </MenuItem>
              </Box>
            );
          })()}
        </Menu>

        {/* Mobile Filter Sheet for Vault Categories */}
        <MobileFilterSheet
          open={mobileFilterOpen}
          onClose={() => setMobileFilterOpen(false)}
          title="Filter Secrets"
          groups={[
            {
              id: 'category',
              label: 'Category',
              selectedValue: activeCategory,
              onChange: (val) => setActiveCategory(val as any),
              options: [
                { value: 'All', label: 'All (' + counts.total + ')' },
                { value: 'Login', label: 'Passwords (' + counts.passwords + ')' },
                { value: 'Note', label: 'Notes (' + counts.notes + ')' },
                { value: 'Link', label: 'Links (' + counts.links + ')' },
              ],
            },
          ]}
          onReset={() => setActiveCategory('All')}
          onApply={() => setMobileFilterOpen(false)}
        />
      </PageWrapper>
  );
};

export default Vault;
