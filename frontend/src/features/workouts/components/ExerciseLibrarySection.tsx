import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Stack,
  TextField,
  InputAdornment,
  Chip,
  ToggleButton,
  ToggleButtonGroup,
  Grid,
  CircularProgress
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import SelfImprovementIcon from '@mui/icons-material/SelfImprovement';
import type { Exercise } from '../types/workout';
import { workoutService } from '../services/workoutService';
import { ExerciseCard } from './ExerciseCard';

const EQUIPMENT_OPTIONS = [
  'Dumbbells',
  'Barbell',
  'Kettlebell',
  'Resistance Bands',
  'Pull Up Bar',
  'Bench',
  'Yoga Mat'
];

const CATEGORIES = [
  'All',
  'Chest',
  'Back',
  'Legs',
  'Shoulders',
  'Arms',
  'Core',
  'Cardio',
  'Full Body'
];

interface ExerciseLibrarySectionProps {
  onSelectExercise?: (exercise: Exercise) => void;
  actionLabel?: string;
}

export const ExerciseLibrarySection: React.FC<ExerciseLibrarySectionProps> = ({
  onSelectExercise,
  actionLabel = 'Add to Routine'
}) => {
  const [equipmentMode, setEquipmentMode] = useState<'without' | 'with'>('without');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['Dumbbells']);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Fetch exercises whenever filters change
  useEffect(() => {
    let isMounted = true;
    const fetchExercises = async () => {
      setLoading(true);
      try {
        const data = await workoutService.getExercises({
          requiresEquipment: equipmentMode === 'without' ? false : undefined,
          equipmentList: equipmentMode === 'with' ? selectedEquipment : undefined,
          category: selectedCategory !== 'All' ? selectedCategory : undefined,
          search: searchQuery.trim() || undefined
        });

        if (isMounted) {
          setExercises(data);
        }
      } catch (err) {
        console.error('Failed to load exercises:', err);
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
  }, [equipmentMode, selectedEquipment, selectedCategory, searchQuery]);

  const handleEquipmentToggle = (item: string) => {
    setSelectedEquipment((prev) =>
      prev.includes(item) ? prev.filter((e) => e !== item) : [...prev, item]
    );
  };

  return (
    <Box sx={{ mb: 4 }}>
      {/* Title & Mode Switcher */}
      <Stack
        direction="row"
        sx={{ mb: 2, flexWrap: 'wrap', gap: 2, justifyContent: 'space-between', alignItems: 'center' }}
      >
        <Box>
          <Typography variant="h6" sx={{ fontWeight: 700, color: 'var(--text-primary)' }}>
            Exercise Library
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
            Browse {exercises.length} science-backed exercises filtered by muscle group and available gear
          </Typography>
        </Box>

        {/* Without / With Equipment Toggle */}
        <ToggleButtonGroup
          value={equipmentMode}
          exclusive
          onChange={(_, val) => val && setEquipmentMode(val)}
          size="small"
          sx={{
            bgcolor: 'var(--bg-card, #ffffff)',
            borderRadius: '10px',
            p: 0.3,
            boxShadow: 'var(--shadow-soft)'
          }}
        >
          <ToggleButton
            value="without"
            sx={{
              borderRadius: '8px !important',
              textTransform: 'none',
              px: 1.5,
              py: 0.6,
              fontSize: '12px',
              fontWeight: 600,
              gap: 0.8,
              '&.Mui-selected': {
                bgcolor: 'rgba(16, 185, 129, 0.15) !important',
                color: '#059669 !important'
              }
            }}
          >
            <SelfImprovementIcon sx={{ fontSize: 16 }} />
            Without Equipment (Bodyweight)
          </ToggleButton>
          <ToggleButton
            value="with"
            sx={{
              borderRadius: '8px !important',
              textTransform: 'none',
              px: 1.5,
              py: 0.6,
              fontSize: '12px',
              fontWeight: 600,
              gap: 0.8,
              '&.Mui-selected': {
                bgcolor: 'rgba(99, 102, 241, 0.15) !important',
                color: 'var(--accent-primary) !important'
              }
            }}
          >
            <FitnessCenterIcon sx={{ fontSize: 16 }} />
            With Equipment
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>

      {/* Equipment Selection Chips (Visible when "With Equipment" is active) */}
      {equipmentMode === 'with' && (
        <Box
          sx={{
            p: 1.5,
            mb: 2,
            bgcolor: 'rgba(99, 102, 241, 0.04)',
            borderRadius: '12px',
            border: '1px dashed rgba(99, 102, 241, 0.3)'
          }}
        >
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'var(--accent-primary)', display: 'block', mb: 1 }}>
            Select Your Available Equipment:
          </Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 0.8 }}>
            {EQUIPMENT_OPTIONS.map((item) => {
              const selected = selectedEquipment.includes(item);
              return (
                <Chip
                  key={item}
                  label={item}
                  size="small"
                  onClick={() => handleEquipmentToggle(item)}
                  color={selected ? 'primary' : 'default'}
                  variant={selected ? 'filled' : 'outlined'}
                  sx={{
                    fontSize: '11px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                />
              );
            })}
          </Stack>
        </Box>
      )}

      {/* Search & Category Filter Bar */}
      <Stack direction="row" spacing={2} sx={{ mb: 2.5, flexWrap: 'wrap', gap: 1.5 }}>
        <TextField
          size="small"
          placeholder="Search by exercise name or target muscle..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          sx={{ minWidth: 260, flex: { xs: '1 1 100%', sm: '1 1 auto' } }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'var(--text-secondary)', fontSize: 20 }} />
                </InputAdornment>
              ),
              sx: { borderRadius: '10px', bgcolor: 'var(--bg-card, #ffffff)' }
            }
          }}
        />

        {/* Categories scrollable row */}
        <Stack
          direction="row"
          spacing={1}
          sx={{
            overflowX: 'auto',
            pb: 0.5,
            flexWrap: { xs: 'nowrap', md: 'wrap' },
            gap: 0.8
          }}
        >
          {CATEGORIES.map((cat) => (
            <Chip
              key={cat}
              label={cat}
              size="small"
              onClick={() => setSelectedCategory(cat)}
              color={selectedCategory === cat ? 'primary' : 'default'}
              variant={selectedCategory === cat ? 'filled' : 'outlined'}
              sx={{
                fontSize: '11px',
                fontWeight: 600,
                borderRadius: '8px',
                cursor: 'pointer',
                borderColor: 'rgba(0,0,0,0.1)'
              }}
            />
          ))}
        </Stack>
      </Stack>

      {/* Grid of Exercises */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={32} sx={{ color: 'var(--accent-primary)' }} />
        </Box>
      ) : exercises.length === 0 ? (
        <Box
          sx={{
            textAlign: 'center',
            py: 6,
            bgcolor: 'var(--bg-card, #ffffff)',
            borderRadius: '16px',
            border: '1px solid rgba(0,0,0,0.06)'
          }}
        >
          <FitnessCenterIcon sx={{ fontSize: 40, color: 'var(--text-secondary)', mb: 1, opacity: 0.5 }} />
          <Typography variant="body1" sx={{ fontWeight: 600, color: 'var(--text-primary)' }}>
            No matching exercises found
          </Typography>
          <Typography variant="caption" sx={{ color: 'var(--text-secondary)' }}>
            Try adjusting your search query, selecting additional equipment, or choosing "All" categories.
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {exercises.map((exercise) => (
            <Grid key={exercise.id} size={{ xs: 12, sm: 6, md: 4, lg: 3 }}>
              <ExerciseCard
                exercise={exercise}
                onSelect={onSelectExercise}
                actionLabel={actionLabel}
              />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
};
