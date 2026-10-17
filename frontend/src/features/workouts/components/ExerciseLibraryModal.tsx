import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
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
  MenuItem
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import AddIcon from '@mui/icons-material/Add';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
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
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [equipmentTab, setEquipmentTab] = useState<'all' | 'without' | 'with' | 'hybrid'>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  const [difficultyFilter, setDifficultyFilter] = useState<string>('All');

  const categories = ['All', 'Chest', 'Back', 'Legs', 'Shoulders', 'Arms', 'Core', 'Cardio', 'Full Body'];
  const difficulties = ['All', 'Beginner', 'Intermediate', 'Advanced'];

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
            borderRadius: '20px',
            bgcolor: 'var(--bg-card, #ffffff)',
            backgroundImage: 'none',
            border: '1px solid rgba(0, 0, 0, 0.08)',
            maxHeight: '90vh'
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
          borderBottom: '1px solid rgba(0, 0, 0, 0.06)'
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

      <DialogContent sx={{ p: 3 }}>
        {/* Top Filters: Mode Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2.5 }}>
          <Tabs
            value={equipmentTab}
            onChange={(_, val) => setEquipmentTab(val)}
            textColor="primary"
            indicatorColor="primary"
            sx={{
              minHeight: 40,
              '& .MuiTab-root': {
                textTransform: 'none',
                fontWeight: 700,
                fontSize: '13px',
                minHeight: 40,
                py: 1
              }
            }}
          >
            <Tab value="all" label="All Exercises" />
            <Tab value="without" label="Without Equipment (Bodyweight)" />
            <Tab value="with" label="With Equipment" />
            <Tab value="hybrid" label="Hybrid (All Modes)" />
          </Tabs>
        </Box>

        {/* Search & Category Selectors */}
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          sx={{ mb: 3, alignItems: 'center', justifyContent: 'space-between' }}
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
            sx={{ width: { xs: '100%', md: 360 } }}
          />

          <Stack direction="row" spacing={1.5} sx={{ width: { xs: '100%', md: 'auto' }, flexWrap: 'wrap' }}>
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Category</InputLabel>
              <Select
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

            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Difficulty</InputLabel>
              <Select
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
          </Stack>
        </Stack>

        {/* Exercise Cards Grid */}
        <Grid container spacing={2.5}>
          {filteredExercises.map((ex) => (
            <Grid key={ex.id} size={{ xs: 12, sm: 6, md: 4 }}>
              <Box
                sx={{
                  borderRadius: '16px',
                  border: '1px solid rgba(0, 0, 0, 0.08)',
                  bgcolor: 'var(--bg-card, #ffffff)',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  boxShadow: 'var(--shadow-soft, 0 2px 8px rgba(0,0,0,0.04))',
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                  '&:hover': {
                    transform: 'translateY(-3px)',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)'
                  }
                }}
              >
                {/* Media Demonstration Animation */}
                <ExerciseDemonstrationMedia
                  exerciseName={ex.name}
                  category={ex.category}
                  targetMuscles={ex.targetMuscles}
                  instructions={ex.instructions}
                  animationUrl={ex.animationUrl}
                  thumbnailUrl={ex.thumbnailUrl}
                  size="compact"
                  autoPlay={false}
                />

                <Box sx={{ p: 2, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <Box>
                    <Stack direction="row" spacing={0.8} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
                      <Chip
                        label={ex.difficultyLevel}
                        size="small"
                        sx={{ height: 20, fontSize: '10px', fontWeight: 700 }}
                      />
                      <Chip
                        icon={ex.requiresEquipment ? <FitnessCenterIcon sx={{ fontSize: '11px !important' }} /> : undefined}
                        label={ex.requiresEquipment ? ex.equipmentType : 'Bodyweight'}
                        size="small"
                        sx={{
                          height: 20,
                          fontSize: '10px',
                          fontWeight: 600,
                          bgcolor: ex.requiresEquipment ? 'rgba(99, 102, 241, 0.08)' : 'rgba(16, 185, 129, 0.08)',
                          color: ex.requiresEquipment ? 'var(--accent-primary)' : '#10b981'
                        }}
                      />
                    </Stack>

                    <Typography variant="subtitle1" sx={{ fontWeight: 800, color: 'var(--text-primary)', mb: 0.5 }}>
                      {ex.name}
                    </Typography>

                    <Typography variant="body2" sx={{ color: 'var(--text-secondary)', fontSize: '11px', mb: 1.5, minHeight: 34 }}>
                      {ex.instructions || 'Standard movement mechanics and posture control.'}
                    </Typography>
                  </Box>

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
                      borderRadius: '10px',
                      textTransform: 'none',
                      fontWeight: 700,
                      py: 0.8,
                      bgcolor: 'var(--accent-primary, #6366f1)',
                      '&:hover': { bgcolor: '#4f46e5' }
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
    </Dialog>
  );
};
