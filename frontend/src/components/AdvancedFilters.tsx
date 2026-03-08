import React, { useState } from 'react';
import {
    Drawer, Box, Typography, Button, Divider, FormControl,
    InputLabel, Select, MenuItem, Slider, Chip, IconButton
} from '@mui/material';
import { FilterList, Close } from '@mui/icons-material';

interface AdvancedFiltersProps {
    open: boolean;
    onClose: () => void;
    onApplyFilters: (filters: FilterState) => void;
}

export interface FilterState {
    riskLevels: string[];
    categories: string[];
    stockRange: [number, number];
}

const RISK_LEVELS = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
const CATEGORIES = ['Snacks', 'Dairy', 'Staples', 'Personal Care', 'Beverages'];

const AdvancedFilters: React.FC<AdvancedFiltersProps> = ({ open, onClose, onApplyFilters }) => {
    const [filters, setFilters] = useState<FilterState>({
        riskLevels: [],
        categories: [],
        stockRange: [0, 100]
    });

    const handleApply = () => {
        onApplyFilters(filters);
        onClose();
    };

    const handleReset = () => {
        const resetFilters = {
            riskLevels: [],
            categories: [],
            stockRange: [0, 100] as [number, number]
        };
        setFilters(resetFilters);
        onApplyFilters(resetFilters);
    };

    return (
        <Drawer anchor="right" open={open} onClose={onClose}>
            <Box sx={{ width: 350, p: 3 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center">
                        <FilterList sx={{ mr: 1, color: '#667eea' }} />
                        <Typography variant="h6">Advanced Filters</Typography>
                    </Box>
                    <IconButton onClick={onClose} size="small">
                        <Close />
                    </IconButton>
                </Box>

                <Divider sx={{ mb: 3 }} />

                {/* Risk Level Filter */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Risk Levels</InputLabel>
                    <Select
                        multiple
                        value={filters.riskLevels}
                        label="Risk Levels"
                        onChange={(e) => setFilters({ ...filters, riskLevels: e.target.value as string[] })}
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                    <Chip key={value} label={value} size="small" />
                                ))}
                            </Box>
                        )}
                    >
                        {RISK_LEVELS.map((level) => (
                            <MenuItem key={level} value={level}>
                                {level}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Category Filter */}
                <FormControl fullWidth sx={{ mb: 3 }}>
                    <InputLabel>Categories</InputLabel>
                    <Select
                        multiple
                        value={filters.categories}
                        label="Categories"
                        onChange={(e) => setFilters({ ...filters, categories: e.target.value as string[] })}
                        renderValue={(selected) => (
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                {selected.map((value) => (
                                    <Chip key={value} label={value} size="small" />
                                ))}
                            </Box>
                        )}
                    >
                        {CATEGORIES.map((category) => (
                            <MenuItem key={category} value={category}>
                                {category}
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>

                {/* Stock Range Filter */}
                <Box sx={{ mb: 3 }}>
                    <Typography gutterBottom>Stock Range</Typography>
                    <Slider
                        value={filters.stockRange}
                        onChange={(_, value) => setFilters({ ...filters, stockRange: value as [number, number] })}
                        valueLabelDisplay="auto"
                        min={0}
                        max={100}
                        marks={[
                            { value: 0, label: '0' },
                            { value: 50, label: '50' },
                            { value: 100, label: '100+' }
                        ]}
                    />
                </Box>

                <Divider sx={{ my: 3 }} />

                <Box display="flex" gap={1}>
                    <Button onClick={handleReset} fullWidth variant="outlined">
                        Reset
                    </Button>
                    <Button onClick={handleApply} fullWidth variant="contained">
                        Apply Filters
                    </Button>
                </Box>
            </Box>
        </Drawer>
    );
};

export default AdvancedFilters;
