import React, { useState } from 'react';
import { Alert, Box, Typography, TextField, Button, Card, CardContent, InputAdornment, IconButton } from '@mui/material';
import { Link, useNavigate } from 'react-router-dom';
import PageWrapper from '../components/PageWrapper';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import EmailIcon from '@mui/icons-material/Email';
import LockIcon from '@mui/icons-material/Lock';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { LifeSyncConstellation } from '../components/LifeSyncConstellation';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageWrapper>
      <Box
        sx={{
          display: 'flex',
          height: '100vh',
          width: '100vw',
          bgcolor: 'var(--bg-primary)',
        }}
      >
        {/* Left Side: Brand presentation (Split Layout) */}
        <Box
          sx={{
            flex: 1,
            display: { xs: 'none', md: 'flex' },
            flexDirection: 'column',
            justifyContent: 'center',
            p: 8,
            background: 'linear-gradient(135deg, #E85A4F 0%, #E98074 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Shifting background ambient light blobs */}
          <Box
            component={motion.div}
            animate={{
              x: [0, 40, -30, 0],
              y: [0, -50, 30, 0],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            sx={{
              position: 'absolute',
              top: '15%',
              left: '15%',
              width: '320px',
              height: '320px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.18) 0%, rgba(255,255,255,0) 70%)',
              filter: 'blur(35px)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />
          <Box
            component={motion.div}
            animate={{
              x: [0, -30, 45, 0],
              y: [0, 40, -40, 0],
            }}
            transition={{
              duration: 12,
              repeat: Infinity,
              ease: 'easeInOut'
            }}
            sx={{
              position: 'absolute',
              bottom: '15%',
              right: '15%',
              width: '280px',
              height: '280px',
              borderRadius: '50%',
              background: 'radial-gradient(circle, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0) 70%)',
              filter: 'blur(25px)',
              pointerEvents: 'none',
              zIndex: 1,
            }}
          />

          {/* Logo & Project Name in top-left corner */}
          <Box
            component={motion.div}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            sx={{
              position: 'absolute',
              top: '32px',
              left: '32px',
              zIndex: 3,
              userSelect: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
            }}
          >
            <motion.div
              animate={{ scale: [1, 1.05, 1] }}
              transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
              style={{ display: 'inline-block' }}
            >
              <Box
                sx={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundImage: 'url(/logo.jpg)',
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  backgroundRepeat: 'no-repeat',
                  border: '1.5px solid rgba(255, 255, 255, 0.25)',
                  boxShadow: '0 0 12px rgba(0, 230, 118, 0.25)',
                }}
              />
            </motion.div>
            <Typography
              variant="h6"
              sx={{
                fontWeight: 800,
                letterSpacing: '0.08em',
                color: '#FFFFFF',
                fontSize: '1.2rem',
                filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15))',
                fontFamily: '"Outfit", "Inter", sans-serif',
                textTransform: 'uppercase',
              }}
            >
              LifeSync AI
            </Typography>
          </Box>

          {/* Central synchronization constellation graphic */}
          <Box sx={{ zIndex: 2, width: '100%' }}>
            <motion.div
              initial="hidden"
              animate="visible"
              variants={{
                hidden: { opacity: 0, scale: 0.9 },
                visible: { opacity: 1, scale: 1, transition: { duration: 0.8, ease: 'easeOut' } }
              }}
              style={{ width: '100%' }}
            >
              <LifeSyncConstellation />
            </motion.div>
          </Box>
        </Box>

        {/* Right Side: Form Container */}
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            p: 4,
          }}
        >

          <Card
            component={motion.div}
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            sx={{
              width: '100%',
              maxWidth: '450px',
              borderRadius: '18px',
              boxShadow: 'var(--shadow-soft)',
              bgcolor: 'var(--card-bg)',
              p: 3,
              position: 'relative',
              zIndex: 2,
            }}
          >
            <CardContent>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'var(--text-primary)' }}>
                Welcome Back
              </Typography>
              <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mb: 4 }}>
                Enter your details to sign in and resume sync.
              </Typography>

              {error && (
                <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
                  {error}
                </Alert>
              )}

              <form onSubmit={handleSubmit}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                  {/* Email Input */}
                  <TextField
                    label="Email Address"
                    variant="outlined"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <EmailIcon sx={{ color: 'var(--neutral-secondary)' }} />
                          </InputAdornment>
                        ),
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                        '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'var(--accent-primary)' },
                    }}
                  />

                  {/* Password Input */}
                  <TextField
                    label="Password"
                    variant="outlined"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    slotProps={{
                      input: {
                        startAdornment: (
                          <InputAdornment position="start">
                            <LockIcon sx={{ color: 'var(--neutral-secondary)' }} />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton onClick={() => setShowPassword(!showPassword)} edge="end">
                              <motion.div
                                key={showPassword ? 'visible' : 'hidden'}
                                initial={{ opacity: 0, rotate: -45, scale: 0.8 }}
                                animate={{ opacity: 1, rotate: 0, scale: 1 }}
                                transition={{ duration: 0.22, ease: 'easeOut' }}
                                style={{ display: 'flex' }}
                              >
                                {showPassword ? (
                                  <VisibilityOff sx={{ color: 'var(--accent-primary)' }} />
                                ) : (
                                  <Visibility sx={{ color: 'var(--neutral-secondary)' }} />
                                )}
                              </motion.div>
                            </IconButton>
                          </InputAdornment>
                        ),
                      }
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '12px',
                        '&:hover fieldset': { borderColor: 'var(--accent-primary)' },
                        '&.Mui-focused fieldset': { borderColor: 'var(--accent-primary)' },
                      },
                      '& .MuiInputLabel-root.Mui-focused': { color: 'var(--accent-primary)' },
                    }}
                  />

                  {/* Forgot Password Link */}
                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: -1.5 }}>
                    <Typography
                      variant="caption"
                      onClick={() => navigate('/forgot-password')}
                      sx={{
                        color: 'var(--accent-primary)',
                        cursor: 'pointer',
                        fontWeight: 600,
                        '&:hover': { textDecoration: 'underline' },
                      }}
                    >
                      Forgot Password?
                    </Typography>
                  </Box>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    disabled={submitting}
                    sx={{
                      bgcolor: 'var(--accent-primary)',
                      color: 'white',
                      py: 1.5,
                      borderRadius: '12px',
                      fontSize: '16px',
                      fontWeight: 600,
                      textTransform: 'none',
                      boxShadow: '0 4px 14px rgba(232, 90, 79, 0.3)',
                      '&:hover': {
                        bgcolor: 'var(--accent-secondary)',
                      },
                    }}
                  >
                    {submitting ? 'Signing In...' : 'Sign In'}
                  </Button>
                </Box>
              </form>

              <Box sx={{ mt: 4, textAlign: 'center' }}>
                <Typography variant="body2" sx={{ color: 'var(--text-secondary)' }}>
                  Don't have an account?{' '}
                  <Link to="/register" style={{ color: 'var(--accent-primary)', fontWeight: 600, textDecoration: 'none' }}>
                    Sign Up
                  </Link>
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>
    </PageWrapper>
  );
};

export default Login;

