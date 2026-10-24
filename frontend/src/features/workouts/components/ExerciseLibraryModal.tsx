import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  InputAdornment,
  Tabs,
  Tab,
  Chip,
  Grid,
  Button,
  IconButton,
  Stack,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import { useNotification } from '../../../context/NotificationContext';
import { useThemeSystem } from '../../../context/ThemeContext';
import type { Exercise } from '../types/workout';
import { workoutService } from '../services/workoutService';
import { ExerciseDemonstrationMedia } from './ExerciseDemonstrationMedia';

interface ExerciseLibraryModalProps {
  open: boolean;
  onClose: () => void;
  onSelectExercise: (exercise: Exercise) => void;
  actionType?: 'add' | 'replace';
  replacingExerciseName?: string;
  initialCategory?: string;
}

export const ExerciseLibraryModal: React.FC<ExerciseLibraryModalProps> = ({
  open,
  onClose,
  onSelectExercise,
  actionType = 'add',
  replacingExerciseName,
  initialCategory = 'All'
}) => {
  const { notify } = useNotification();
  const { designSystem, mode } = useThemeSystem();
  const isProf = designSystem === 'professional';
  const isDark = mode === 'dark';
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [equipmentTab, setEquipmentTab] = useState<'all' | 'without' | 'with' | 'hybrid'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');

  // Create Custom Exercise modal state
  const [createModalOpen, setCreateModalOpen] = useState<boolean>(false);
  const [selectedDetailExercise, setSelectedDetailExercise] = useState<Exercise | null>(null);
  const [isSubmittingCustom, setIsSubmittingCustom] = useState<boolean>(false);
  const [customFormError, setCustomFormError] = useState<string | null>(null);

  const initialCustomForm = {
    name: '',
    category: 'Chest',
    targetMuscles: '',
    secondaryMuscles: '',
    requiresEquipment: false,
    equipmentType: 'Bodyweight',
    difficultyLevel: 'Intermediate',
    description: '',
    instructions: '',
    defaultSets: 3,
    defaultReps: 10,
    defaultRestSeconds: 60,
    videoUrl: '',
    thumbnailUrl: '',
    postureTips: '',
    commonMistakes: '',
    safetyTips: ''
  };

  const [customForm, setCustomForm] = useState(initialCustomForm);

  const categories = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body'];
  const formCategories = ['Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];
  const formDifficulties = ['Beginner', 'Intermediate', 'Advanced'];

  useEffect(() => {
    if (!open) return;

    let isMounted = true;
    const fetchExercises = async () => {
      setLoading(true);
      try {
        let requiresEq: boolean | undefined = undefined;
        if (equipmentTab === 'without') requiresEq = false;
        if (equipmentTab === 'with') requiresEq = true;

        const loaded = await workoutService.getExercises({
          requiresEquipment: requiresEq,
          category: selectedCategory === 'All' ? undefined : selectedCategory
        });
        if (isMounted) {
          setExercises(loaded);
        }
      } catch (err) {
        console.error('Failed to load exercises for modal:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchExercises();

    return () => {
      isMounted = false;
    };
  }, [open, equipmentTab, selectedCategory]);

  const handleCreateCustomExercise = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.name.trim()) {
      setCustomFormError('Exercise name is required.');
      return;
    }
    if (!customForm.targetMuscles.trim()) {
      setCustomFormError('Primary muscle group is required.');
      return;
    }

    setIsSubmittingCustom(true);
    setCustomFormError(null);

    try {
      const created = await workoutService.createCustomExercise({
        name: customForm.name.trim(),
        category: customForm.category,
        targetMuscles: customForm.targetMuscles.trim(),
        secondaryMuscles: customForm.secondaryMuscles.trim() || undefined,
        requiresEquipment: customForm.requiresEquipment,
        equipmentType: customForm.requiresEquipment
          ? (customForm.equipmentType.trim() || 'Custom Equipment')
          : 'Bodyweight',
        difficultyLevel: customForm.difficultyLevel,
        description: customForm.description.trim() || undefined,
        instructions: customForm.instructions.trim() || undefined,
        defaultSets: Number(customForm.defaultSets) || 3,
        defaultReps: Number(customForm.defaultReps) || 10,
        defaultRestSeconds: Number(customForm.defaultRestSeconds) || 60,
        videoUrl: customForm.videoUrl.trim() || undefined,
        thumbnailUrl: customForm.thumbnailUrl.trim() || undefined,
        postureTips: customForm.postureTips.trim() || undefined,
        commonMistakes: customForm.commonMistakes.trim() || undefined,
        safetyTips: customForm.safetyTips.trim() || undefined
      });

      setExercises((prev) => [created, ...prev]);
      notify.success(`Custom exercise "${created.name}" created successfully!`, 'Exercise Created');
      setCreateModalOpen(false);
      setCustomForm(initialCustomForm);
    } catch (err: any) {
      console.error('Failed to create custom exercise:', err);
      const errMsg = err?.response?.data?.message || 'Failed to create custom exercise. Please try again.';
      setCustomFormError(errMsg);
      notify.error(errMsg, 'Creation Failed');
    } finally {
      setIsSubmittingCustom(false);
    }
  };

  const filteredExercises = exercises.filter((ex) => {
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchName = ex.name.toLowerCase().includes(q);
      const matchMuscles = ex.targetMuscles.toLowerCase().includes(q);
      const matchEquip = ex.equipmentType.toLowerCase().includes(q);
      if (!matchName && !matchMuscles && !matchEquip) return false;
    }
    if (difficultyFilter !== 'All' && ex.difficultyLevel !== difficultyFilter) {
      return false;
    }
    return true;
  });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="lg"
      fullWidth
      slotProps={{
        paper: {
          sx: {
            m: { xs: 1, sm: 2 },
            width: { xs: 'calc(100% - 16px)', sm: 'auto' },
            maxHeight: { xs: 'calc(100% - 16px)', sm: '90vh' },
            borderRadius: isProf ? '0px !important' : { xs: '16px', sm: '20px' },
            bgcolor: isProf ? (isDark ? '#1F2732 !important' : '#ffffff') : (isDark ? '#1A1D2D !important' : '#ffffff'),
            color: 'var(--text-primary)',
            backgroundImage: 'none',
            border: isProf ? '1px solid var(--card-border)' : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)')
          }
        }
      }}
    >
      <DialogTitle
        sx={{
          p: 3,
          pb: 2,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)'
        }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
            {actionType === 'replace'
              ? `Replace "${replacingExerciseName || 'Exercise'}"`
              : 'Exercise Movement Library'}
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
            Select verified exercises with demonstration previews, movement kinetics, and target anatomy.
          </Typography>
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.5, sm: 3 }, overflowY: 'auto' }}>
        {/* Top Filters: Mode Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
          <Tabs
            value={equipmentTab}
            onChange={(_, val) => setEquipmentTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: { xs: '12px', sm: '13px' },
                minHeight: 40,
                py: 1,
                px: { xs: 1.5, sm: 2 }
              }
            }}
          >
            <Tab value="all" label="All Exercises" />
            <Tab value="without" label="Without Equipment (Bodyweight)" />
            <Tab value="with" label="With Equipment" />
            <Tab value="hybrid" label="Hybrid (All Modes)" />
          </Tabs>
        </Box>

        {/* Search, Filters & Create Custom Exercise */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ mb: 3, alignItems: { xs: 'stretch', md: 'center' }, justifyContent: 'space-between' }}
        >
          <TextField
            size="small"
            placeholder="Search exercises, muscles (e.g. Quads, Lats, Dumbbells)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ color: 'var(--text-secondary)', fontSize: 20 }} />
                  </InputAdornment>
                )
              }
            }}
            sx={{ width: { xs: '100%', md: 320 } }}
          />

          <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120, flex: { xs: 1, sm: 'none' } }}>
              <InputLabel id="library-category-label" sx={{ bgcolor: 'var(--card-bg, #ffffff)', px: 0.6, borderRadius: '4px' }}>
                Category
              </InputLabel>
              <Select
                labelId="library-category-label"
                id="library-category-select"
                value={selectedCategory}
                label="Category"
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((c) => (
                  <MenuItem key={c} value={c}>
                    {c}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120, flex: { xs: 1, sm: 'none' } }}>
              <InputLabel id="library-difficulty-label" sx={{ bgcolor: 'var(--card-bg, #ffffff)', px: 0.6, borderRadius: '4px' }}>
                Difficulty
              </InputLabel>
              <Select
                labelId="library-difficulty-label"
                id="library-difficulty-select"
                value={difficultyFilter}
                label="Difficulty"
                onChange={(e) => setDifficultyFilter(e.target.value)}
              >
                {difficulties.map((d) => (
                  <MenuItem key={d} value={d}>
                    {d}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => {
                setCustomFormError(null);
                setCreateModalOpen(true);
              }}
              sx={{
                width: { xs: '100%', sm: 'auto' },
                borderRadius: '10px',
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '13px',
                px: 2,
                py: 0.8,
                bgcolor: 'var(--accent-primary, #6366f1)',
                whiteSpace: 'nowrap',
                '&:hover': { bgcolor: '#4f46e5' }
              }}
            >
              Create Custom Exercise
            </Button>
          </Stack>
        </Stack>

        {/* Exercise Cards Grid */}
        <Grid container spacing={2.5}>
          {filteredExercises.map((ex) => (
            <Grid key={ex.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box
                sx={{
                  borderRadius: isProf ? '0px !important' : '16px',
                  border: ex.isCustom 
                    ? '1px solid rgba(236, 72, 153, 0.35)' 
                    : '1px solid var(--card-border)',
                  bgcolor: isProf 
                    ? (isDark ? '#26303F' : '#ffffff') 
                    : (isDark ? 'rgba(255, 255, 255, 0.04)' : '#ffffff'),
                  color: 'var(--text-primary)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  boxShadow: isProf ? 'none' : '0 2px 10px rgba(0,0,0,0.04)',
                  transition: isProf ? 'none' : 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: isProf ? 'none' : 'translateY(-3px)',
                    boxShadow: isProf ? 'none' : '0 8px 24px rgba(255, 111, 38, 0.12)'
                  }
                }}
              >
                {/* Media Demonstration Animation */}
                <ExerciseDemonstrationMedia
                  exerciseName={ex.name}
                  category={ex.category}
                  targetMuscles={ex.targetMuscles}
                  secondaryMuscles={ex.secondaryMuscles}
                  instructions={ex.instructions}
                  description={ex.description}
                  postureTips={ex.postureTips}
                  commonMistakes={ex.commonMistakes}
                  safetyTips={ex.safetyTips}
                  difficultyLevel={ex.difficultyLevel}
                  equipmentType={ex.equipmentType}
                  requiresEquipment={ex.requiresEquipment}
                  defaultSets={ex.defaultSets}
                  defaultReps={ex.defaultReps}
                  defaultRestSeconds={ex.defaultRestSeconds}
                  animationUrl={ex.animationUrl}
                  thumbnailUrl={ex.thumbnailUrl}
                  videoUrl={ex.videoUrl}
                  isCustom={ex.isCustom}
                  size="compact"
                  autoPlay={false}
                />

                <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box>
                    <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1, alignItems: 'center' }}>
                      {ex.isCustom && (
                        <Chip
                          label="Custom"
                          size="small"
                          sx={{
                            height: 20,
                            fontSize: '10px',
                            fontWeight: 800,
                            borderRadius: isProf ? '0px' : '6px',
                            bgcolor: 'rgba(236, 72, 153, 0.12)',
                            color: '#ec4899',
                            border: '1px solid rgba(236, 72, 153, 0.3)'
                          }}
                        />
                      )}
                      <Chip
                        label={ex.difficultyLevel}
                        size="small"
                        sx={{ height: 20, fontSize: '10px', fontWeight: 700, borderRadius: isProf ? '0px' : '6px' }}
                      />
                      <Chip
                        icon={ex.requiresEquipment ? <FitnessCenterIcon sx={{ fontSize: '11px !important' }} /> : undefined}
                        label={ex.requiresEquipment ? ex.equipmentType : 'Bodyweight'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '10px',
                          fontWeight: 600,
                          borderRadius: isProf ? '0px' : '6px',
                          bgcolor: ex.requiresEquipment ? 'rgba(255, 111, 38, 0.12)' : 'rgba(16, 185, 129, 0.12)',
                          color: ex.requiresEquipment ? '#FF6F26' : '#10b981'
                        }}
                      />
                    </Stack>

                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5 }}>
                      {ex.name}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '11px', mb: 1.5, minHeight: 34 }}>
                      {ex.description || ex.instructions || 'Standard movement mechanics and posture control.'}
                    </Typography>
                  </Box>

                  {/* Explicit Secondary Action Row: View Instructions & Watch Demo */}
                  <Stack direction="row" spacing={1} sx={{ mb: 1.2, mt: 'auto' }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      startIcon={<MenuBookIcon sx={{ fontSize: 13 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDetailExercise(ex);
                      }}
                      sx={{
                        fontSize: '11px',
                        py: 0.6,
                        borderRadius: isProf ? '0px' : '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      View Instructions
                    </Button>
                    <Button
                      fullWidth
                      variant="outlined"
                      size="small"
                      component="a"
                      href={ex.videoUrl ? ex.videoUrl : `https://www.youtube.com/results?search_query=${encodeURIComponent(ex.name + ' proper exercise technique form')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      startIcon={<OpenInNewIcon sx={{ fontSize: 13 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      sx={{
                        fontSize: '11px',
                        py: 0.6,
                        borderRadius: isProf ? '0px' : '8px',
                        textTransform: 'none',
                        fontWeight: 600,
                        borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)',
                        color: 'var(--accent-primary, #FF6F26)'
                      }}
                    >
                      Watch Demo
                    </Button>
                  </Stack>

                  <Button
                    fullWidth
                    variant="contained"
                    size="small"
                    onClick={() => {
                      onSelectExercise(ex);
                      onClose();
                    }}
                    startIcon={actionType === 'replace' ? <SwapHorizIcon /> : <AddIcon />}
                    sx={{
                      borderRadius: isProf ? '0px' : '10px',
                      textTransform: 'none',
                      fontWeight: 700,
                      py: 0.8,
                      background: isProf 
                        ? 'var(--accent-primary, #FF6F26)' 
                        : 'linear-gradient(135deg, #FF6F26 0%, #FFA048 100%)',
                      color: '#ffffff',
                      boxShadow: isProf ? 'none' : '0 4px 12px rgba(255, 111, 38, 0.3)',
                      '&:hover': {
                        background: isProf 
                          ? '#e05307' 
                          : 'linear-gradient(135deg, #FF5B0D 0%, #FF9030 100%)',
                        boxShadow: isProf ? 'none' : '0 6px 16px rgba(255, 111, 38, 0.4)'
                      }
                    }}
                  >
                    {actionType === 'replace' ? 'Replace with This' : 'Add to Workout'}
                  </Button>
                </Box>
              </Box>
            </Grid>
          ))}
        </Grid>

        {filteredExercises.length === 0 && !loading && (
          <Box sx={{ py: 8, textAlign: 'center' }}>
            <Typography variant="h6" sx={{ color: 'var(--text-secondary)', fontWeight: 600 }}>
              No exercises found matching your criteria.
            </Typography>
            <Typography variant="body2" sx={{ color: 'var(--text-secondary)', mt: 0.5 }}>
              Try adjusting your search query, equipment filter, or category.
            </Typography>
          </Box>
        )}
      </DialogContent>

      {/* Modal Dialog for Creating Custom Exercise */}
      <Dialog
        open={createModalOpen}
        onClose={() => !isSubmittingCustom && setCreateModalOpen(false)}
        maxWidth="md"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              m: { xs: 1, sm: 2 },
              width: { xs: 'calc(100% - 16px)', sm: 'auto' },
              maxHeight: { xs: 'calc(100% - 16px)', sm: '90vh' },
              borderRadius: isProf ? '0px !important' : { xs: '16px', sm: '20px' },
              bgcolor: isProf ? (isDark ? '#1F2732 !important' : '#ffffff') : (isDark ? '#1A1D2D !important' : '#ffffff'),
              color: 'var(--text-primary)',
              backgroundImage: 'none',
              border: isProf ? '1px solid var(--card-border)' : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)')
            }
          }
        }}
      >
        <DialogTitle sx={{ p: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
              Create Custom Exercise
            </Typography>
            <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
              Define a private exercise tailored to your routine. It will be stored securely in your library.
            </Typography>
          </Box>
          <IconButton size="small" onClick={() => !isSubmittingCustom && setCreateModalOpen(false)}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>

        <form onSubmit={handleCreateCustomExercise}>
          <DialogContent sx={{ p: 2.5, pt: 1 }}>
            {customFormError && (
              <Alert severity="error" sx={{ mb: 2, borderRadius: '10px' }}>
                {customFormError}
              </Alert>
            )}

            <Stack spacing={2.5}>
              {/* Exercise Name & Category */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 8 }}>
                  <TextField
                    fullWidth
                    required
                    label="Exercise Name"
                    placeholder="e.g. Bulgarian Split Squat, Dragon Flags"
                    value={customForm.name}
                    onChange={(e) => setCustomForm({ ...customForm, name: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="custom-category-label">Category / Body Focus</InputLabel>
                    <Select
                      labelId="custom-category-label"
                      value={customForm.category}
                      label="Category / Body Focus"
                      onChange={(e) => setCustomForm({ ...customForm, category: e.target.value })}
                    >
                      {formCategories.map((c) => (
                        <MenuItem key={c} value={c}>
                          {c}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Muscles Targeted */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    required
                    label="Primary Muscle Group"
                    placeholder="e.g. Quadriceps, Glutes, Chest"
                    value={customForm.targetMuscles}
                    onChange={(e) => setCustomForm({ ...customForm, targetMuscles: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Secondary Muscle Groups (Optional)"
                    placeholder="e.g. Hamstrings, Calves, Core"
                    value={customForm.secondaryMuscles}
                    onChange={(e) => setCustomForm({ ...customForm, secondaryMuscles: e.target.value })}
                    size="small"
                  />
                </Grid>
              </Grid>

              {/* Equipment & Difficulty */}
              <Grid container spacing={2} sx={{ alignItems: 'center' }}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControlLabel
                    control={
                      <Switch
                        checked={customForm.requiresEquipment}
                        onChange={(e) =>
                          setCustomForm({
                            ...customForm,
                            requiresEquipment: e.target.checked,
                            equipmentType: e.target.checked ? (customForm.equipmentType === 'Bodyweight' ? 'Dumbbells' : customForm.equipmentType) : 'Bodyweight'
                          })
                        }
                      />
                    }
                    label="Requires Equipment"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    label="Equipment Type"
                    placeholder={customForm.requiresEquipment ? 'e.g. Dumbbells, Barbell, Kettlebell' : 'Bodyweight'}
                    value={customForm.requiresEquipment ? customForm.equipmentType : 'Bodyweight'}
                    disabled={!customForm.requiresEquipment}
                    onChange={(e) => setCustomForm({ ...customForm, equipmentType: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <FormControl fullWidth size="small">
                    <InputLabel id="custom-diff-label">Difficulty Level</InputLabel>
                    <Select
                      labelId="custom-diff-label"
                      value={customForm.difficultyLevel}
                      label="Difficulty Level"
                      onChange={(e) => setCustomForm({ ...customForm, difficultyLevel: e.target.value })}
                    >
                      {formDifficulties.map((d) => (
                        <MenuItem key={d} value={d}>
                          {d}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>

              {/* Recommended Sets, Reps, Rest */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Recommended Sets"
                    value={customForm.defaultSets}
                    onChange={(e) => setCustomForm({ ...customForm, defaultSets: Math.max(1, parseInt(e.target.value) || 1) })}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Recommended Reps / Duration"
                    value={customForm.defaultReps}
                    onChange={(e) => setCustomForm({ ...customForm, defaultReps: Math.max(1, parseInt(e.target.value) || 1) })}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 4 }}>
                  <TextField
                    fullWidth
                    type="number"
                    label="Rest Time (seconds)"
                    value={customForm.defaultRestSeconds}
                    onChange={(e) => setCustomForm({ ...customForm, defaultRestSeconds: Math.max(0, parseInt(e.target.value) || 0) })}
                    size="small"
                  />
                </Grid>
              </Grid>

              {/* Short Description */}
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Short Description"
                placeholder="Overview of the exercise, movement pattern, or target goals..."
                value={customForm.description}
                onChange={(e) => setCustomForm({ ...customForm, description: e.target.value })}
                size="small"
              />

              {/* Step-by-Step Instructions */}
              <TextField
                fullWidth
                multiline
                rows={3}
                label="Step-by-Step Instructions"
                placeholder="1. Setup and posture...&#10;2. Concentric movement...&#10;3. Controlled eccentric return..."
                value={customForm.instructions}
                onChange={(e) => setCustomForm({ ...customForm, instructions: e.target.value })}
                size="small"
              />

              {/* Media URLs */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Demonstration Video URL (Optional)"
                    placeholder="https://www.youtube.com/watch?v=... or .mp4 URL"
                    value={customForm.videoUrl}
                    onChange={(e) => setCustomForm({ ...customForm, videoUrl: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Image / Animation URL (Optional)"
                    placeholder="https://example.com/demo.png or .gif"
                    value={customForm.thumbnailUrl}
                    onChange={(e) => setCustomForm({ ...customForm, thumbnailUrl: e.target.value })}
                    size="small"
                  />
                </Grid>
              </Grid>

              {/* Technique & Safety Form Cues */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Recommended Posture & Technique (Optional)"
                    placeholder="e.g. Keep spine neutral, elbows tucked at 45 degrees"
                    value={customForm.postureTips}
                    onChange={(e) => setCustomForm({ ...customForm, postureTips: e.target.value })}
                    size="small"
                  />
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <TextField
                    fullWidth
                    label="Common Mistakes & Safety Tips (Optional)"
                    placeholder="e.g. Avoid flaring shoulders or arching lower back"
                    value={customForm.safetyTips}
                    onChange={(e) => setCustomForm({ ...customForm, safetyTips: e.target.value })}
                    size="small"
                  />
                </Grid>
              </Grid>
            </Stack>
          </DialogContent>

          <DialogActions sx={{ p: 2.5, pt: 1, borderTop: '1px solid rgba(0, 0, 0, 0.06)' }}>
            <Button
              onClick={() => setCreateModalOpen(false)}
              disabled={isSubmittingCustom}
              sx={{ fontWeight: 700, borderRadius: '10px' }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={isSubmittingCustom}
              startIcon={isSubmittingCustom ? <CircularProgress size={16} color="inherit" /> : <AddIcon />}
              sx={{
                fontWeight: 700,
                borderRadius: '10px',
                px: 3,
                bgcolor: 'var(--accent-primary, #6366f1)',
                '&:hover': { bgcolor: '#4f46e5' }
              }}
            >
              {isSubmittingCustom ? 'Saving...' : 'Save Custom Exercise'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Dedicated Exercise Details & Movement Demonstration Modal */}
      <Dialog
        open={Boolean(selectedDetailExercise)}
        onClose={() => setSelectedDetailExercise(null)}
        maxWidth="sm"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              m: { xs: 1, sm: 2 },
              width: { xs: 'calc(100% - 16px)', sm: 'auto' },
              maxHeight: { xs: 'calc(100% - 16px)', sm: '90vh' },
              borderRadius: isProf ? '0px !important' : { xs: '16px', sm: '20px' },
              bgcolor: isProf ? (isDark ? '#1F2732 !important' : '#ffffff') : (isDark ? '#1A1D2D !important' : '#ffffff'),
              color: 'var(--text-primary)',
              backgroundImage: 'none',
              border: isProf ? '1px solid var(--card-border)' : (isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.08)')
            }
          }
        }}
      >
        {selectedDetailExercise && (
          <>
            <DialogTitle sx={{ p: 2.5, pb: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Stack direction="row" spacing={1} sx={{ alignItems: 'center', mb: 0.8, flexWrap: 'wrap', gap: 0.5 }}>
                  <Chip
                    label={selectedDetailExercise.category}
                    size="small"
                    sx={{
                      bgcolor: 'rgba(99, 102, 241, 0.12)',
                      color: 'var(--accent-primary, #6366f1)',
                      fontWeight: 700,
                      fontSize: '11px',
                      height: 22
                    }}
                  />
                  <Chip
                    label={selectedDetailExercise.difficultyLevel}
                    size="small"
                    sx={{ height: 22, fontSize: '11px', fontWeight: 600 }}
                  />
                  <Chip
                    label={selectedDetailExercise.requiresEquipment ? selectedDetailExercise.equipmentType : 'Bodyweight'}
                    size="small"
                    sx={{ height: 22, fontSize: '11px', fontWeight: 600 }}
                  />
                  {selectedDetailExercise.isCustom && (
                    <Chip
                      label="Custom Exercise"
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '11px',
                        fontWeight: 700,
                        bgcolor: 'rgba(236, 72, 153, 0.12)',
                        color: '#ec4899',
                        border: '1px solid rgba(236, 72, 153, 0.3)'
                      }}
                    />
                  )}
                </Stack>
                <Typography variant="h6" sx={{ fontWeight: 800, color: 'var(--text-primary)' }}>
                  {selectedDetailExercise.name}
                </Typography>
              </Box>
              <IconButton size="small" onClick={() => setSelectedDetailExercise(null)}>
                <CloseIcon />
              </IconButton>
            </DialogTitle>

            <DialogContent sx={{ p: 2.5, pt: 1, overflowY: 'auto' }}>
              {/* Animation/Media Preview */}
              <Box sx={{ mb: 2 }}>
                <ExerciseDemonstrationMedia
                  exerciseName={selectedDetailExercise.name}
                  category={selectedDetailExercise.category}
                  targetMuscles={selectedDetailExercise.targetMuscles}
                  secondaryMuscles={selectedDetailExercise.secondaryMuscles}
                  instructions={selectedDetailExercise.instructions}
                  description={selectedDetailExercise.description}
                  postureTips={selectedDetailExercise.postureTips}
                  commonMistakes={selectedDetailExercise.commonMistakes}
                  safetyTips={selectedDetailExercise.safetyTips}
                  difficultyLevel={selectedDetailExercise.difficultyLevel}
                  equipmentType={selectedDetailExercise.equipmentType}
                  requiresEquipment={selectedDetailExercise.requiresEquipment}
                  defaultSets={selectedDetailExercise.defaultSets}
                  defaultReps={selectedDetailExercise.defaultReps}
                  defaultRestSeconds={selectedDetailExercise.defaultRestSeconds}
                  animationUrl={selectedDetailExercise.animationUrl}
                  thumbnailUrl={selectedDetailExercise.thumbnailUrl}
                  videoUrl={selectedDetailExercise.videoUrl}
                  isCustom={selectedDetailExercise.isCustom}
                  size="compact"
                  autoPlay={true}
                />
              </Box>

              <Stack spacing={2}>
                {selectedDetailExercise.description && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
                      Description
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                      {selectedDetailExercise.description}
                    </Typography>
                  </Box>
                )}

                {selectedDetailExercise.instructions && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
                      Step-by-Step Instructions
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        color: 'var(--text-secondary)',
                        lineHeight: 1.6,
                        whiteSpace: 'pre-line',
                        bgcolor: isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.02)',
                        p: 1.5,
                        borderRadius: '10px',
                        border: isDark ? '1px solid rgba(255, 255, 255, 0.07)' : '1px solid rgba(0, 0, 0, 0.05)'
                      }}
                    >
                      {selectedDetailExercise.instructions}
                    </Typography>
                  </Box>
                )}

                {/* Target Anatomy */}
                <Box>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.8 }}>
                    Target Anatomy
                  </Typography>
                  <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
                    {selectedDetailExercise.targetMuscles && (
                      <Chip
                        label={`Primary: ${selectedDetailExercise.targetMuscles}`}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: 'rgba(99, 102, 241, 0.1)',
                          color: 'var(--accent-primary, #6366f1)'
                        }}
                      />
                    )}
                    {selectedDetailExercise.secondaryMuscles && (
                      <Chip
                        label={`Secondary: ${selectedDetailExercise.secondaryMuscles}`}
                        size="small"
                        sx={{
                          fontWeight: 600,
                          bgcolor: 'rgba(16, 185, 129, 0.1)',
                          color: '#10b981'
                        }}
                      />
                    )}
                  </Stack>
                </Box>

                {/* Posture & Form Technique */}
                {selectedDetailExercise.postureTips && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
                      Posture & Form Technique
                    </Typography>
                    <Alert severity="info" sx={{ py: 0.5, borderRadius: '10px', fontSize: '13px' }}>
                      {selectedDetailExercise.postureTips}
                    </Alert>
                  </Box>
                )}

                {/* Common Mistakes & Safety Tips */}
                {(selectedDetailExercise.commonMistakes || selectedDetailExercise.safetyTips) && (
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'var(--text-primary)', mb: 0.5 }}>
                      Safety & Form Cues
                    </Typography>
                    <Stack spacing={1}>
                      {selectedDetailExercise.commonMistakes && (
                        <Alert severity="warning" sx={{ py: 0.5, borderRadius: '10px', fontSize: '13px' }}>
                          <strong>Avoid:</strong> {selectedDetailExercise.commonMistakes}
                        </Alert>
                      )}
                      {selectedDetailExercise.safetyTips && (
                        <Alert severity="success" sx={{ py: 0.5, borderRadius: '10px', fontSize: '13px' }}>
                          <strong>Tip:</strong> {selectedDetailExercise.safetyTips}
                        </Alert>
                      )}
                    </Stack>
                  </Box>
                )}
              </Stack>
            </DialogContent>

            <DialogActions sx={{ p: 2, pt: 1, borderTop: isDark ? '1px solid rgba(255, 255, 255, 0.08)' : '1px solid rgba(0, 0, 0, 0.06)' }}>
              <Button onClick={() => setSelectedDetailExercise(null)} sx={{ fontWeight: 700, borderRadius: '10px' }}>
                Close
              </Button>
              <Button
                variant="contained"
                onClick={() => {
                  const ex = selectedDetailExercise;
                  setSelectedDetailExercise(null);
                  onSelectExercise(ex);
                  onClose();
                }}
                sx={{
                  fontWeight: 700,
                  borderRadius: isProf ? '0px' : '10px',
                  bgcolor: 'var(--accent-primary, #FF6F26)',
                  '&:hover': { bgcolor: '#e05307' }
                }}
              >
                {actionType === 'replace' ? 'Replace with This' : 'Add to Workout'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Dialog>
  );
};
