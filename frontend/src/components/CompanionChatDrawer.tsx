import React, { useState, useRef, useEffect } from 'react';
import { Drawer, Box, Typography, TextField, Avatar, Stack, Paper, IconButton } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import ChatIcon from '@mui/icons-material/Chat';
import apiClient from '../api/apiClient';

interface Message {
  sender: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

interface CompanionChatDrawerProps {
  open: boolean;
  onClose: () => void;
  anchor?: 'left' | 'right';
}

const CompanionChatDrawer: React.FC<CompanionChatDrawerProps> = ({ open, onClose, anchor = 'right' }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      sender: 'bot',
      text: "Hey! 🤖 I'm your LifeSync AI Companion. Tell me how your day is going, or ask me for a roast, joke, or flirt! What's up?",
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
          text: "Hey! 🤖 I'm your LifeSync AI Companion. Tell me how your day is going, or ask me for a roast, joke, or flirt! What's up?",
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
        const reply = res.data.data.reply;
        const mood = res.data.data.mood;

        setBotMood(mood);

        setMessages((prev) => [
          ...prev,
          { sender: 'bot', text: reply, timestamp: new Date() }
        ]);
      }
    } catch (err) {
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
      default:
        return { color: '#8E8D8A', emoji: '🤖', glow: 'rgba(142, 141, 138, 0.25)' };
    }
  };

  const moodCfg = getMoodConfig(botMood);



  return (
    <Drawer
      anchor={anchor}
      open={open}
      onClose={onClose}
      variant="persistent"
      sx={{
        '& .MuiDrawer-paper': {
          width: { xs: 'calc(100% - 48px)', sm: '350px' },
          height: '560px',
          maxHeight: 'calc(100vh - 120px)',
          top: 'auto',
          bottom: '96px',
          right: anchor === 'right' ? '24px' : 'auto',
          left: anchor === 'left' ? '24px' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          bgcolor: '#FDFBF7',
          boxShadow: '0 8px 32px rgba(142, 141, 138, 0.15)',
          border: '1px solid rgba(232, 90, 79, 0.1)',
          borderRadius: '20px',
          overflow: 'hidden'
        }
      }}
    >
      {/* Header */}
      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#FFFFFF', borderBottom: '1px solid rgba(232, 90, 79, 0.08)' }}>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <ChatIcon sx={{ color: 'var(--accent-primary)', fontSize: 24 }} />
          <Typography variant="h6" sx={{ fontWeight: 700, color: '#2D2D2D', fontSize: '16px' }}>
            LifeSync Companion
          </Typography>
        </Stack>
        <IconButton onClick={onClose} size="small" sx={{ color: '#8D8D8D' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>

      {/* Messages Stream */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 2, display: 'flex', flexDirection: 'column', gap: 2, bgcolor: '#FDFBF7' }}>
        {messages.map((m, idx) => (
          <Box
            key={idx}
            sx={{
              display: 'flex',
              justifyContent: m.sender === 'user' ? 'flex-end' : 'flex-start',
              width: '100%'
            }}
          >
            <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', maxWidth: '85%' }}>
              {m.sender === 'bot' && (
                <Avatar sx={{ bgcolor: `${moodCfg.color}15`, width: 28, height: 28, fontSize: '13px' }}>
                  {moodCfg.emoji}
                </Avatar>
              )}
              <Paper
                elevation={0}
                sx={{
                  p: '10px 14px',
                  borderRadius: m.sender === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                  bgcolor: m.sender === 'user' ? 'rgba(232, 90, 79, 0.08)' : '#FFFFFF',
                  border: m.sender === 'user' ? '1px solid rgba(232, 90, 79, 0.2)' : '1px solid rgba(0,0,0,0.06)',
                  boxShadow: 'none'
                }}
              >
                <Typography variant="body2" sx={{ color: '#2D2D2D', fontSize: '13px', lineHeight: 1.45, wordBreak: 'break-word', whiteSpace: 'pre-line' }}>
                  {m.text}
                </Typography>
              </Paper>
            </Stack>
          </Box>
        ))}

        {loading && (
          <Box sx={{ display: 'flex', justifyContent: 'flex-start', width: '100%' }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Avatar sx={{ bgcolor: `${moodCfg.color}10`, width: 28, height: 28 }}>
                💭
              </Avatar>
              <Paper elevation={0} sx={{ p: '10px 16px', borderRadius: '14px 14px 14px 4px', bgcolor: '#FFFFFF', border: '1px solid rgba(0,0,0,0.06)' }}>
                <Stack direction="row" spacing={0.5} sx={{ py: 0.2 }}>
                  <Box className="typing-dot" sx={{ width: 5, height: 5, bgcolor: '#8E8D8A', borderRadius: '50%' }} />
                  <Box className="typing-dot" sx={{ width: 5, height: 5, bgcolor: '#8E8D8A', borderRadius: '50%' }} />
                  <Box className="typing-dot" sx={{ width: 5, height: 5, bgcolor: '#8E8D8A', borderRadius: '50%' }} />
                </Stack>
              </Paper>
            </Stack>
          </Box>
        )}
        <div ref={chatEndRef} />
      </Box>

      {/* Footer Area */}
      <Box sx={{ p: 2, bgcolor: '#FFFFFF', borderTop: '1px solid rgba(232, 90, 79, 0.08)', flexShrink: 0 }}>


        {/* Input Field */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputValue);
          }}
          style={{ display: 'flex', gap: '8px' }}
        >
          <TextField
            placeholder="Type message, ask a joke..."
            fullWidth
            size="small"
            value={inputValue}
            disabled={loading}
            onChange={(e) => setInputValue(e.target.value)}
            slotProps={{
              input: {
                sx: {
                  borderRadius: '10px',
                  bgcolor: '#F8F9FA',
                  color: '#2D2D2D',
                  fontSize: '13px',
                  '& fieldset': { borderColor: 'rgba(0,0,0,0.08)' },
                  '& input::placeholder': { color: '#8D8D8D', opacity: 1 }
                }
              }
            }}
          />
          <IconButton
            type="submit"
            disabled={loading || !inputValue.trim()}
            sx={{
              bgcolor: 'var(--accent-primary)',
              color: 'white',
              width: 36,
              height: 36,
              borderRadius: '10px',
              '&:hover': { bgcolor: 'var(--accent-secondary)' },
              '&.Mui-disabled': { bgcolor: 'rgba(0,0,0,0.05)', color: 'rgba(0,0,0,0.25)' }
            }}
          >
            <SendIcon sx={{ fontSize: '16px' }} />
          </IconButton>
        </form>
      </Box>
    </Drawer>
  );
};

export default CompanionChatDrawer;
