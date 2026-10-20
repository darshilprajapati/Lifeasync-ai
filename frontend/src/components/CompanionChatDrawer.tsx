import React, { useState, useRef, useEffect } from 'react';
import { Drawer, Box, Typography, TextField, Avatar, Stack, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import apiClient from '../api/apiClient';
import { trackAction } from '../utils/analytics';
import { useThemeSystem } from '../context/ThemeContext';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
  isExternalSearch?: boolean;
  sources?: string[];
}

interface CompanionChatDrawerProps {
  open: boolean;
  onClose: () => void;
  anchor?: 'left' | 'right';
}

const CompanionChatDrawer: React.FC<CompanionChatDrawerProps> = ({ open, onClose, anchor = 'right' }) => {
  const { mode, designSystem } = useThemeSystem();
  const isDark = mode === 'dark';
  const isProf = designSystem === 'professional';

  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Hi! 👋 I'm the LifeSync AI Assistant. I can help you understand LifeSync AI, explore features, explain workflows, and answer questions about the app. What would you like to know?",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [botMood, setBotMood] = useState('Friendly');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      setTimeout(scrollToBottom, 100);
    }
  }, [messages, open]);

  useEffect(() => {
    if (open) {
      setMessages([
        {
          sender: 'bot',
          text: "Hi! 👋 I'm the LifeSync AI Assistant. I can help you understand LifeSync AI, explore features, explain workflows, and answer questions about the app. What would you like to know?",
          timestamp: new Date()
        }
      ]);
      setInputValue('');
      setBotMood('Friendly');
      apiClient.post('/api/companion/reset').catch((err) => {
        console.warn("Failed to reset companion session on backend:", err);
      });
    }
  }, [open]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = { sender: 'user', text, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setLoading(true);

    try {
      const res = await apiClient.post('/api/companion/message', { message: text });
      if (res.data.isSuccess) {
        trackAction('companion_message_sent', { module: 'companion' });
        const reply = res.data.data.reply;
        const mood = res.data.data.mood;
        const isExternalSearch = res.data.data.isExternalSearch;
        const sources = res.data.data.sources;

        setBotMood(mood);

        setMessages((prev) => [
          ...prev,
          {
            sender: 'bot',
            text: reply,
            timestamp: new Date(),
            isExternalSearch,
            sources
          }
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: "Ouch! My brain circuits got crossed. Check your server connection and let's try again! ⚡", timestamp: new Date() }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const getMoodConfig = (mood: string) => {
    switch (mood) {
      case 'Friendly':
        return { color: '#4CAF50', emoji: '🤖', glow: 'rgba(76, 175, 80, 0.25)' };
      case 'Supportive':
        return { color: '#2196F3', emoji: '🫂', glow: 'rgba(33, 150, 243, 0.25)' };
      case 'Flirty':
        return { color: '#E91E63', emoji: '😘', glow: 'rgba(233, 30, 99, 0.25)' };
      case 'Funny':
        return { color: '#FF9800', emoji: '😆', glow: 'rgba(255, 152, 0, 0.25)' };
      case 'Sassy':
        return { color: '#9C27B0', emoji: '💅', glow: 'rgba(156, 39, 176, 0.25)' };
      case 'Financial Roast':
        return { color: '#E85A4F', emoji: '💸', glow: 'rgba(232, 90, 79, 0.25)' };
      case 'Analytical':
        return { color: '#00897B', emoji: '📊', glow: 'rgba(0, 137, 123, 0.25)' };
      default:
        return { color: '#8E8D8A', emoji: '🤖', glow: 'rgba(142, 141, 138, 0.25)' };
    }
  };

  const moodCfg = getMoodConfig(botMood);

  const formatTime = (d: Date) => {
    try {
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // Theme-derived style tokens for the chatbot drawer
  const drawerBg = isDark
    ? (isProf ? '#141A21' : 'linear-gradient(180deg, #101932 0%, #0B1120 100%)')
    : '#FFFFFF';

  const drawerBorder = isDark
    ? (isProf ? '1px solid #2E3846' : '1px solid rgba(56, 189, 248, 0.28)')
    : (isProf ? '1px solid #DFE1E6' : '1px solid rgba(232, 90, 79, 0.2)');

  const drawerShadow = isProf
    ? (isDark ? '0 8px 24px rgba(0, 0, 0, 0.5)' : '0 8px 24px rgba(0, 0, 0, 0.12)')
    : (isDark
        ? '0 16px 48px rgba(0, 0, 0, 0.8), 0 0 24px rgba(56, 189, 248, 0.15)'
        : '0 16px 40px rgba(142, 141, 138, 0.25)');

  const headerBg = isDark
    ? (isProf ? '#19222C' : 'rgba(20, 30, 51, 0.98)')
    : (isProf ? '#F4F5F7' : 'rgba(255, 255, 255, 0.98)');

  const conversationBg = isDark
    ? (isProf ? '#0E1318' : '#0A0F1D')
    : (isProf ? '#FAFBFC' : '#F8F9FB');

  const footerBg = isDark
    ? (isProf ? '#19222C' : 'rgba(16, 23, 42, 0.98)')
    : (isProf ? '#F4F5F7' : '#FFFFFF');

  const inputBg = isDark
    ? (isProf ? '#0E1318' : '#0B1120')
    : (isProf ? '#FFFFFF' : '#F3F4F6');

  const inputBorder = isDark
    ? (isProf ? '1px solid #2E3846' : '1px solid rgba(56, 189, 248, 0.28)')
    : (isProf ? '1px solid #DFE1E6' : '1px solid rgba(0, 0, 0, 0.12)');

  const inputTextColor = isDark ? (isProf ? '#F7FAFC' : '#FFFFFF') : (isProf ? '#172B4D' : '#1F2937');
  const placeholderColor = isDark ? '#94A3B8' : '#8E8D8A';

  return (
    <Drawer
      className="lifesync-companion-drawer"
      anchor={anchor}
      open={open}
      onClose={onClose}
      variant="persistent"
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: 'calc(100% - 32px)', sm: '380px' },
          height: '580px',
          maxHeight: 'calc(100vh - 110px)',
          top: 'auto',
          bottom: '96px',
          right: anchor === 'right' ? '24px' : 'auto',
          left: anchor === 'left' ? '24px' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          background: drawerBg,
          backgroundColor: isDark ? (isProf ? '#141A21' : '#0F172A') : '#FFFFFF',
          backdropFilter: isProf ? 'none' : 'blur(20px)',
          boxShadow: drawerShadow,
          border: drawerBorder,
          borderRadius: isProf ? '0px !important' : '20px',
          overflow: 'hidden',
          zIndex: 1400,
          transition: 'all 0.25s cubic-bezier(0.2, 0.8, 0.2, 1)'
        }
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          bgcolor: headerBg,
          borderBottom: isDark ? (isProf ? '1px solid #2E3846' : '1px solid rgba(56, 189, 248, 0.2)') : '1px solid var(--card-border)',
          flexShrink: 0
        }}
      >
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <ChatIcon sx={{ color: 'var(--accent-primary)', fontSize: 24 }} />
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)', fontSize: '15px', lineHeight: 1.2 }}>
              LifeSync AI Assistant
            </Typography>
            <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : 'var(--text-secondary)', fontSize: '11px', display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <span>●</span> {botMood} Mode
            </Typography>
          </Box>
        </Stack>
        <IconButton
          onClick={onClose}
          size="small"
          aria-label="Close Assistant"
          sx={{
            color: isDark ? '#94A3B8' : 'var(--text-secondary)',
            '&:hover': {
              color: 'var(--accent-primary)',
              bgcolor: isDark ? 'rgba(255, 107, 91, 0.15)' : 'rgba(232, 90, 79, 0.1)'
            }
          }}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Messages Stream Body */}
      <Box
        sx={{
          flex: 1,
          overflowY: 'auto',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
          bgcolor: conversationBg,
          '&::-webkit-scrollbar': { width: '6px' },
          '&::-webkit-scrollbar-track': { background: 'transparent' },
          '&::-webkit-scrollbar-thumb': {
            background: isDark ? 'rgba(56, 189, 248, 0.25)' : 'rgba(0, 0, 0, 0.15)',
            borderRadius: '3px'
          }
        }}
      >
        {messages.map((m, idx) => {
          const isUser = m.sender === 'user';
          
          // Isolated bubble styling unaffected by generic .MuiPaper-root overrides
          const bubbleBg = isUser
            ? (isDark
                ? (isProf ? 'rgba(226, 109, 56, 0.2)' : 'linear-gradient(135deg, rgba(255, 107, 91, 0.28) 0%, rgba(255, 111, 38, 0.38) 100%)')
                : (isProf ? 'rgba(217, 83, 30, 0.1)' : 'linear-gradient(135deg, rgba(232, 90, 79, 0.12) 0%, rgba(233, 128, 116, 0.18) 100%)'))
            : (isDark
                ? (isProf ? '#1C242F' : '#162035')
                : (isProf ? '#FFFFFF' : '#FFFFFF'));

          const bubbleBorder = isUser
            ? (isDark
                ? (isProf ? '1px solid rgba(226, 109, 56, 0.45)' : '1px solid rgba(255, 107, 91, 0.55)')
                : (isProf ? '1px solid rgba(217, 83, 30, 0.3)' : '1px solid rgba(232, 90, 79, 0.3)'))
            : (isDark
                ? (isProf ? '1px solid #2B3848' : '1px solid rgba(56, 189, 248, 0.25)')
                : (isProf ? '1px solid #DFE1E6' : '1px solid rgba(0, 0, 0, 0.08)'));

          const textColor = isUser
            ? (isDark ? '#FFFFFF' : (isProf ? '#172B4D' : '#2D2D2D'))
            : (isDark ? '#F1F5F9' : (isProf ? '#172B4D' : '#1F2937'));

          const bubbleShadow = isProf
            ? 'none'
            : (isUser
                ? (isDark ? '0 4px 14px rgba(255, 107, 91, 0.15)' : 'none')
                : (isDark ? '0 4px 16px rgba(0, 0, 0, 0.35)' : '0 2px 8px rgba(0, 0, 0, 0.04)'));

          return (
            <Box
              key={idx}
              sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                width: '100%'
              }}
            >
              <Stack
                direction="row"
                spacing={1}
                sx={{
                  alignItems: 'flex-start',
                  maxWidth: '88%',
                  flexDirection: isUser ? 'row-reverse' : 'row'
                }}
              >
                {!isUser && (
                  <Avatar
                    sx={{
                      bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : `${moodCfg.color}15`,
                      border: isDark ? '1px solid rgba(56, 189, 248, 0.35)' : '1px solid rgba(0, 0, 0, 0.06)',
                      width: 28,
                      height: 28,
                      fontSize: '13px',
                      flexShrink: 0
                    }}
                  >
                    {moodCfg.emoji}
                  </Avatar>
                )}

                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                  <Box
                    className="lifesync-chat-bubble"
                    sx={{
                      borderRadius: isProf
                        ? '0px !important'
                        : isUser
                          ? '16px 16px 4px 16px'
                          : '16px 16px 16px 4px',
                      background: bubbleBg,
                      border: bubbleBorder,
                      boxShadow: bubbleShadow,
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{
                        color: textColor,
                        fontSize: '13px',
                        lineHeight: 1.5,
                        whiteSpace: 'pre-line',
                        fontWeight: isDark ? 450 : 400
                      }}
                    >
                      {m.text}
                    </Typography>

                    {m.sources && m.sources.length > 0 && (
                      <Box sx={{ mt: 1.5, pt: 1, borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.06)' }}>
                        <Typography variant="caption" sx={{ color: isDark ? '#94A3B8' : '#8E8D8A', fontWeight: 600, display: 'block', mb: 0.5, fontSize: '11px' }}>
                          Sources:
                        </Typography>
                        <Stack direction="row" spacing={0.75} useFlexGap sx={{ flexWrap: 'wrap' }}>
                          {m.sources.map((src, sIdx) => {
                            let domain = src;
                            try { domain = new URL(src).hostname.replace('www.', ''); } catch { /* ignore */ }
                            return (
                              <a
                                key={sIdx}
                                href={src}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  fontSize: '11px',
                                  color: isDark ? '#38BDF8' : '#2196F3',
                                  textDecoration: 'none',
                                  padding: '2px 8px',
                                  borderRadius: '8px',
                                  backgroundColor: isDark ? 'rgba(56, 189, 248, 0.15)' : 'rgba(33, 150, 243, 0.08)',
                                  border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(33, 150, 243, 0.2)',
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  gap: '4px'
                                }}
                              >
                                🔗 {domain}
                              </a>
                            );
                          })}
                        </Stack>
                      </Box>
                    )}
                  </Box>

                  <Typography
                    variant="caption"
                    sx={{
                      color: isDark ? '#94A3B8' : '#9CA3AF',
                      fontSize: '10px',
                      mt: 0.4,
                      px: 0.5
                    }}
                  >
                    {formatTime(m.timestamp)}
                  </Typography>
                </Box>
              </Stack>
            </Box>
          );
        })}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Avatar
                sx={{
                  bgcolor: isDark ? 'rgba(56, 189, 248, 0.15)' : `${moodCfg.color}15`,
                  border: isDark ? '1px solid rgba(56, 189, 248, 0.3)' : '1px solid rgba(0, 0, 0, 0.06)',
                  width: 28,
                  height: 28
                }}
              >
                💭
              </Avatar>
              <Box
                className="lifesync-chat-bubble"
                sx={{
                  borderRadius: isProf ? '0px !important' : '16px 16px 16px 4px',
                  bgcolor: isDark ? (isProf ? '#1C242F' : '#162035') : '#FFFFFF',
                  border: isDark ? (isProf ? '1px solid #2B3848' : '1px solid rgba(56, 189, 248, 0.25)') : '1px solid rgba(0, 0, 0, 0.08)'
                }}
              >
                <Stack direction="row" spacing={0.6} sx={{ py: 0.3, px: 0.5 }}>
                  <Box className="typing-dot" sx={{ width: 6, height: 6, bgcolor: 'var(--accent-primary)', borderRadius: '50%' }} />
                  <Box className="typing-dot" sx={{ width: 6, height: 6, bgcolor: 'var(--accent-primary)', borderRadius: '50%' }} />
                  <Box className="typing-dot" sx={{ width: 6, height: 6, bgcolor: 'var(--accent-primary)', borderRadius: '50%' }} />
                </Stack>
              </Box>
            </Stack>
          </Box>
        )}
        <div ref={chatEndRef} />
      </Box>

      {/* Footer Area */}
      <Box
        sx={{
          p: 2,
          bgcolor: footerBg,
          borderTop: isDark ? (isProf ? '1px solid #2E3846' : '1px solid rgba(56, 189, 248, 0.2)') : '1px solid var(--card-border)',
          flexShrink: 0
        }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          style={{ display: 'flex', gap: '8px', alignItems: 'center' }}
        >
          <TextField
            placeholder="Ask about features, workflows, help..."
            fullWidth
            size="small"
            value={inputValue}
            disabled={loading}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage(inputValue);
              }
            }}
            slotProps={{
              input: {
                sx: {
                  borderRadius: isProf ? '0px !important' : '12px',
                  bgcolor: inputBg,
                  color: inputTextColor,
                  fontSize: '13px',
                  border: inputBorder,
                  '& fieldset': { border: 'none' },
                  '& input::placeholder': {
                    color: placeholderColor,
                    opacity: 1
                  }
                }
              }
            }}
          />
          <IconButton
            type="submit"
            disabled={loading || !inputValue.trim()}
            sx={{
              bgcolor: 'var(--accent-primary)',
              color: '#FFFFFF',
              width: 38,
              height: 38,
              borderRadius: isProf ? '0px !important' : '12px',
              flexShrink: 0,
              boxShadow: isProf ? 'none' : '0 2px 10px rgba(255, 107, 91, 0.35)',
              '&:hover': {
                bgcolor: 'var(--accent-secondary)'
              },
              '&.Mui-disabled': {
                bgcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                color: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.25)'
              }
            }}
          >
            <SendIcon sx={{ fontSize: '17px' }} />
          </IconButton>
        </form>
      </Box>
    </Drawer>
  );
};

export default CompanionChatDrawer;
