import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, Typography, Box, Select, MenuItem, FormControl,
    InputLabel, CircularProgress, Chip, Alert
} from '@mui/material';
import { TrendingUp, TrendingDown, TrendingFlat } from '@mui/icons-material';
import { Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts';

interface ForecastDataPoint {
    date: string;
    predictedDemand: number;
    lowerBound: number;
    upperBound: number;
    seasonalFactor: string;
}

interface ForecastData {
    skuId: string;
    skuName: string;
    forecast: ForecastDataPoint[];
    confidenceScore: number;
    trendDirection: string;
}

interface ForecastChartProps {
    skuId: string;
}

const ForecastChart: React.FC<ForecastChartProps> = ({ skuId }) => {
    const [forecastData, setForecastData] = useState<ForecastData | null>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (skuId) fetchForecast();
    }, [skuId, days]);

    const fetchForecast = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/forecast/visualization/${skuId}?days=${days}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            setForecastData(data);
        } catch (err: any) {
            console.error('Forecast error:', err);
            setError('Failed to load forecast data: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getTrendIcon = (trend: string) => {
        switch (trend) {
            case 'INCREASING': return <TrendingUp sx={{ color: '#4caf50' }} />;
            case 'DECREASING': return <TrendingDown sx={{ color: '#f44336' }} />;
            default: return <TrendingFlat sx={{ color: '#9e9e9e' }} />;
        }
    };

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="center" p={3}>
                        <CircularProgress />
                    </Box>
                </CardContent>
            </Card>
        );
    }

    if (error || !forecastData) {
        return (
            <Card>
                <CardContent>
                    <Alert severity="error">{error || 'No forecast data available'}</Alert>
                </CardContent>
            </Card>
        );
    }

    const chartData = forecastData.forecast.map(point => ({
        date: new Date(point.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
        predicted: Math.round(point.predictedDemand),
        lower: Math.round(point.lowerBound),
        upper: Math.round(point.upperBound),
        seasonal: point.seasonalFactor
    }));

    return (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                        <Typography variant="h6" fontWeight="bold">
                            📈 Demand Forecast: {forecastData.skuName}
                        </Typography>
                        <Box display="flex" gap={1} mt={1} alignItems="center">
                            <Chip 
                                label={`${(forecastData.confidenceScore * 100).toFixed(0)}% Confidence`}
                                size="small" 
                                color="primary"
                            />
                            <Box display="flex" alignItems="center">
                                {getTrendIcon(forecastData.trendDirection)}
                                <Typography variant="caption" sx={{ ml: 0.5 }}>
                                    {forecastData.trendDirection}
                                </Typography>
                            </Box>
                        </Box>
                    </Box>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Forecast Period</InputLabel>
                        <Select value={days} label="Forecast Period" onChange={(e) => setDays(Number(e.target.value))}>
                            <MenuItem value={7}>7 Days</MenuItem>
                            <MenuItem value={14}>14 Days</MenuItem>
                            <MenuItem value={30}>30 Days</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="date" />
                        <YAxis label={{ value: 'Units', angle: -90, position: 'insideLeft' }} />
                        <Tooltip />
                        <Legend />
                        <Area 
                            type="monotone" 
                            dataKey="upper" 
                            fill="#e3f2fd" 
                            stroke="none" 
                            name="Upper Bound"
                        />
                        <Area 
                            type="monotone" 
                            dataKey="lower" 
                            fill="#ffffff" 
                            stroke="none" 
                            name="Lower Bound"
                        />
                        <Line 
                            type="monotone" 
                            dataKey="predicted" 
                            stroke="#667eea" 
                            strokeWidth={3}
                            name="Predicted Demand"
                            dot={{ fill: '#667eea', r: 4 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>

                <Alert severity="info" sx={{ mt: 2 }}>
                    Forecast includes seasonality patterns, weekend effects, and festival periods
                </Alert>
            </CardContent>
        </Card>
    );
};

export default ForecastChart;
