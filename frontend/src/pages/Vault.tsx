import React, { useState, useEffect } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, IconButton, Alert, Stack, ToggleButton, ToggleButtonGroup, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import LanguageIcon from '@mui/icons-material/Language';
import NoteIcon from '@mui/icons-material/Note';
import PageWrapper from '../components/PageWrapper';
import LogoLoader from '../components/LogoLoader';
import ReportExporter from '../components/ReportExporter';
import ThemeToggle from '../components/ThemeToggle';
import apiClient from '../api/apiClient';

interface VaultItem {
  id: number;
  title: string;
  content: string; // Decrypted content string (could be JSON or raw text)
}

const Vault: React.FC = () => {
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedIdField, setCopiedIdField] = useState<string | null>(null);

  // Form Fields
  const [itemType, setItemType] = useState<'login' | 'note'>('login');
  const [title, setTitle] = useState('');
  
  // Login Fields
  const [website, setWebsite] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  // Note Fields
  const [noteContent, setNoteContent] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [revealedIds, setRevealedIds] = useState<Record<number, boolean>>({});

  const fetchVaultItems = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/api/vault');
      if (res.data.isSuccess) {
        setItems(res.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load vault items.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVaultItems();
  }, []);

  const handleAddVaultItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;

    let finalContent = '';
    if (itemType === 'login') {
      if (!username || !password) return;
      finalContent = JSON.stringify({
        website: website.trim(),
        username: username.trim(),
        password: password
      });
    } else {
      if (!noteContent) return;
      finalContent = noteContent;
    }

    setError(null);
    setSubmitting(true);
    try {
      const res = await apiClient.post('/api/vault', { title, content: finalContent });
      if (res.data.isSuccess) {
        setItems((prev) => [...prev, res.data.data]);
        setTitle('');
        setWebsite('');
        setUsername('');
        setPassword('');
        setNoteContent('');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to encrypt and save item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteVaultItem = async (id: number) => {
    try {
      const res = await apiClient.delete(`/api/vault/${id}`);
      if (res.data.isSuccess) {
        setItems((prev) => prev.filter((item) => item.id !== id));
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to delete vault item.');
    }
  };

  const toggleReveal = (id: number) => {
    setRevealedIds((prev) => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const copyToClipboard = (text: string, fieldKey: string) => {
    navigator.clipboard.writeText(text);
    setCopiedIdField(fieldKey);
    setTimeout(() => {
      setCopiedIdField(null);
    }, 1500);
  };

  // Helper to parse item content
  const parseContent = (contentStr: string) => {
    try {
      if (contentStr.startsWith('{') && contentStr.endsWith('}')) {
        const parsed = JSON.parse(contentStr);
        if (parsed.username !== undefined && parsed.password !== undefined) {
          return {
            isLogin: true,
            website: parsed.website || '',
            username: parsed.username || '',
            password: parsed.password || ''
          };
        }
      }
    } catch (e) {}

    return {
      isLogin: false,
      website: '',
      username: '',
      password: '',
      rawContent: contentStr
    };
  };

  return (
    <PageWrapper>
      <Box sx={{ padding: '24px', height: '100%', overflowY: 'auto' }}>
        <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1, flexWrap: 'wrap', gap: 2 }}>
          <Stack direction="row" spacing={2} sx={{ alignItems: 'center' }}>
            <LockIcon sx={{ color: 'var(--accent-primary)', fontSize: 32 }} />
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
              Encrypted Security Vault
            </Typography>
          </Stack>
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
            <ThemeToggle />
            <ReportExporter module="Vault" />
          </Stack>
        </Stack>
        <Typography variant="body1" sx={{ color: 'var(--text-secondary)', mb: 4 }}>
          Securely store passwords, private keys, and credential codes. Saved text is encrypted symmetrically using AES-256 before entering database storage.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
            {error}
          </Alert>
        )}

        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'stretch' }}>
          {/* Add Secure Item Form */}
          <Box sx={{ flex: { xs: '1 1 auto', md: 5 }, display: 'flex', flexDirection: 'column' }}>
            <Card sx={{ width: '100%', height: '100%', borderRadius: '16px', boxShadow: 'var(--shadow-soft)', p: 2, display: 'flex', flexDirection: 'column' }}>
              <CardContent sx={{ flex: 1 }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 2, color: 'var(--accent-primary)' }}>
                  Encrypt Credentials
                </Typography>

                <Box sx={{ mb: 3 }}>
                  <ToggleButtonGroup
                    value={itemType}
                    exclusive
                    onChange={(_, val) => val && setItemType(val)}
                    fullWidth
                    size="small"
                  >
                    <ToggleButton value="login" sx={{ textTransform: 'none', fontWeight: 600 }}>
                      <LanguageIcon sx={{ mr: 1, fontSize: 18 }} /> Login Credentials
                    </ToggleButton>
                    <ToggleButton value="note" sx={{ textTransform: 'none', fontWeight: 600 }}>
                      <NoteIcon sx={{ mr: 1, fontSize: 18 }} /> Secure Note
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>

                <form onSubmit={handleAddVaultItem}>
                  <Stack spacing={2.5}>
                    <TextField
                      label="Item Name / Title"
                      placeholder={itemType === 'login' ? 'e.g. Google, Netflix, Bank Account' : 'e.g. Server SSH Key, Wi-Fi Password'}
                      required
                      fullWidth
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />

                    {itemType === 'login' ? (
                      <>
                        <TextField
                          label="Website URL"
                          placeholder="e.g. https://google.com (optional)"
                          fullWidth
                          value={website}
                          onChange={(e) => setWebsite(e.target.value)}
                        />
                        <TextField
                          label="Username / Email"
                          placeholder="Enter account username or email..."
                          required
                          fullWidth
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                        />
                        <TextField
                          label="Password"
                          placeholder="Enter account password..."
                          type="password"
                          required
                          fullWidth
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                        />
                      </>
                    ) : (
                      <TextField
                        label="Secure Note Content"
                        placeholder="Enter passwords, recovery keys, or secret codes here..."
                        type="password"
                        required
                        multiline
                        rows={4}
                        fullWidth
                        value={noteContent}
                        onChange={(e) => setNoteContent(e.target.value)}
                      />
                    )}

                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      disabled={submitting}
                      startIcon={<LockIcon />}
                      sx={{
                        bgcolor: 'var(--accent-primary)',
                        py: 1.5,
                        borderRadius: '12px',
                        fontWeight: 600,
                        textTransform: 'none',
                        '&:hover': { bgcolor: 'var(--accent-secondary)' }
                      }}
                    >
                      {submitting ? 'Encrypting...' : 'Save Encrypted'}
                    </Button>
                  </Stack>
                </form>
              </CardContent>
            </Card>
          </Box>

          {/* Secure Items List */}
          <Box sx={{ flex: { xs: '1 1 auto', md: 7 }, display: 'flex', flexDirection: 'column' }}>
            <Card sx={{ width: '100%', height: '100%', borderRadius: '16px', boxShadow: 'var(--shadow-soft)', display: 'flex', flexDirection: 'column', p: 2 }}>
              <CardContent sx={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                <Typography variant="h6" sx={{ fontWeight: 600, mb: 3, color: 'var(--text-primary)' }}>
                  Secure Credentials List
                </Typography>

                {loading ? (
                  <LogoLoader />
                ) : items.length === 0 ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1, flexDirection: 'column', color: '#8D8D8D', minHeight: '350px' }}>
                    <LockIcon sx={{ fontSize: 48, opacity: 0.5, mb: 2 }} />
                    <Typography variant="body1">No secrets registered. Populate your secure vault!</Typography>
                  </Box>
                ) : (
                  <Stack spacing={2} sx={{ overflowY: 'auto', maxHeight: '420px', pr: 1 }}>
                    {items.map((item) => {
                      const data = parseContent(item.content);
                      const isRevealed = !!revealedIds[item.id];

                      return (
                        <Card
                          key={item.id}
                          sx={{
                            flexShrink: 0,
                            borderRadius: '12px',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                            bgcolor: 'var(--card-bg)',
                            border: '1px solid rgba(0,0,0,0.04)',
                            transition: 'var(--transition-smooth)',
                            '&:hover': { boxShadow: 'var(--shadow-hover)' }
                          }}
                        >
                          <CardContent sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', py: '16px !important' }}>
                            <Stack direction="row" spacing={2.5} sx={{ alignItems: 'flex-start', flex: 1, minWidth: 0 }}>
                              <Box sx={{ bgcolor: data.isLogin ? 'rgba(33, 150, 243, 0.08)' : 'rgba(232, 90, 79, 0.08)', p: 1.5, borderRadius: '50%', mt: 0.5 }}>
                                {data.isLogin ? (
                                  <LanguageIcon sx={{ color: '#2196F3', display: 'block' }} />
                                ) : (
                                  <NoteIcon sx={{ color: 'var(--accent-primary)', display: 'block' }} />
                                )}
                              </Box>
                              <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="body1" sx={{ fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 1 }}>
                                  {item.title}
                                  {data.isLogin && data.website && (
                                    <Tooltip title={`Go to website: ${data.website}`}>
                                      <IconButton
                                        size="small"
                                        href={data.website.startsWith('http') ? data.website : `https://${data.website}`}
                                        target="_blank"
                                        sx={{ p: 0.2, color: '#9E9E9E' }}
                                      >
                                        <LinkIcon sx={{ fontSize: 16 }} />
                                      </IconButton>
                                    </Tooltip>
                                  )}
                                </Typography>

                                {data.isLogin ? (
                                  // DISPLAY LOGIN CREDENTIALS
                                  <Stack spacing={1} sx={{ mt: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="caption" sx={{ color: '#8E8D8A', width: '70px', fontWeight: 600 }}>USERNAME:</Typography>
                                      <Typography variant="body2" sx={{ fontWeight: 600, color: '#37474F', fontFamily: 'monospace' }}>{data.username}</Typography>
                                      <Tooltip title={copiedIdField === `${item.id}-user` ? 'Copied!' : 'Copy Username'}>
                                        <IconButton size="small" onClick={() => copyToClipboard(data.username, `${item.id}-user`)} sx={{ p: 0.5 }}>
                                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Tooltip>
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                      <Typography variant="caption" sx={{ color: '#8E8D8A', width: '70px', fontWeight: 600 }}>PASSWORD:</Typography>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontWeight: 600,
                                          color: isRevealed ? 'var(--accent-secondary)' : '#8D8D8D',
                                          fontFamily: 'monospace',
                                          letterSpacing: isRevealed ? 'normal' : '0.15em'
                                        }}
                                      >
                                        {isRevealed ? data.password : '••••••••••••'}
                                      </Typography>
                                      {isRevealed && (
                                        <Tooltip title={copiedIdField === `${item.id}-pass` ? 'Copied!' : 'Copy Password'}>
                                          <IconButton size="small" onClick={() => copyToClipboard(data.password, `${item.id}-pass`)} sx={{ p: 0.5 }}>
                                            <ContentCopyIcon sx={{ fontSize: 14 }} />
                                          </IconButton>
                                        </Tooltip>
                                      )}
                                    </Box>
                                  </Stack>
                                ) : (
                                  // DISPLAY SECURE NOTE
                                  <Box sx={{ mt: 1 }}>
                                    <Typography
                                      variant="subtitle2"
                                      sx={{
                                        fontFamily: 'monospace',
                                        fontSize: '14px',
                                        color: isRevealed ? '#37474F' : '#8D8D8D',
                                        letterSpacing: isRevealed ? 'normal' : '0.2em',
                                        wordBreak: 'break-all'
                                      }}
                                    >
                                      {isRevealed ? data.rawContent : '••••••••••••••••'}
                                    </Typography>
                                    {isRevealed && (
                                      <Tooltip title={copiedIdField === `${item.id}-note` ? 'Copied!' : 'Copy Secret Note'}>
                                        <IconButton size="small" onClick={() => copyToClipboard(data.rawContent || '', `${item.id}-note`)} sx={{ p: 0.5, mt: 0.5 }}>
                                          <ContentCopyIcon sx={{ fontSize: 14 }} />
                                        </IconButton>
                                      </Tooltip>
                                    )}
                                  </Box>
                                )}
                              </Box>
                            </Stack>

                            <Stack direction="row" spacing={1} sx={{ alignSelf: 'flex-start' }}>
                              <IconButton onClick={() => toggleReveal(item.id)} size="small" sx={{ color: 'var(--text-secondary)' }}>
                                {isRevealed ? <VisibilityOff /> : <Visibility />}
                              </IconButton>
                              <IconButton onClick={() => handleDeleteVaultItem(item.id)} size="small" sx={{ color: '#E85A4F' }}>
                                <DeleteIcon />
                              </IconButton>
                            </Stack>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      </Box>
    </PageWrapper>
  );
};

export default Vault;

