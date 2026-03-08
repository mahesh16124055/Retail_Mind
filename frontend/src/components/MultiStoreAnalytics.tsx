import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip, CircularProgress,
    Paper, LinearProgress, Alert
} from '@mui/material';
import { Store } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface StorePerformance {
    storeId: string;
    storeName: string;
    location: string;
    totalSkus: number;
    criticalCount: number;
    highRiskCount: number;
    averageStockLevel: number;
    stockoutRate: number;
    overstockRate: number;
    performanceGrade: string;
    topRisks: string[];
    revenueAtRisk: number;
}

const MultiStoreAnalytics: React.FC = () => {
    const [stores, setStores] = useState<StorePerformance[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStorePerformance();
    }, []);

    const fetchStorePerformance = async () => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
            const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/analytics/stores/performance`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            setStores(data);
        } catch (err: any) {
            console.error('Store analytics error:', err);
            setError('Failed to load store analytics: ' + err.message);
        } finally {
            setLoading(false);
        }
    };

    const getGradeColor = (grade: string) => {
        switch (grade) {
            case 'A': return '#4caf50';
            case 'B': return '#8bc34a';
            case 'C': return '#ffc107';
            case 'D': return '#ff9800';
            case 'F': return '#f44336';
            default: return '#9e9e9e';
        }
    };

    const chartData = stores.map(s => ({
        name: s.storeName,
        Critical: s.criticalCount,
        High: s.highRiskCount,
        Revenue: s.revenueAtRisk / 1000
    }));

    if (loading) {
        return (
            <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box sx={{ p: 3 }}>
            <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <Typography variant="h4" fontWeight="bold" display="flex" alignItems="center">
                    <Store sx={{ mr: 2, fontSize: 40 }} />
                    Multi-Store Performance Analytics
                </Typography>
                <Typography variant="body1" sx={{ opacity: 0.9, mt: 1 }}>
                    Compare performance across all retail locations
                </Typography>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            <Grid container spacing={3}>
                {/* Performance Chart */}
                <Grid item xs={12}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Risk Distribution by Store</Typography>
                            <ResponsiveContainer width="100%" height={300}>
                                <BarChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <Tooltip />
                                    <Legend />
                                    <Bar dataKey="Critical" fill="#d32f2f" />
                                    <Bar dataKey="High" fill="#f57c00" />
                                    <Bar dataKey="Revenue" fill="#667eea" name="Revenue at Risk (₹K)" />
                                </BarChart>
                            </ResponsiveContainer>
                        </CardContent>
                    </Card>
                </Grid>

                {/* Store Cards */}
                {stores.map((store) => (
                    <Grid item xs={12} md={6} lg={4} key={store.storeId}>
                        <Card elevation={3}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                    <Typography variant="h6" fontWeight="bold">{store.storeName}</Typography>
                                    <Chip 
                                        label={`Grade ${store.performanceGrade}`}
                                        sx={{ bgcolor: getGradeColor(store.performanceGrade), color: 'white', fontWeight: 'bold' }}
                                    />
                                </Box>
                                
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    📍 {store.location}
                                </Typography>

                                <Box sx={{ my: 2 }}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2">Total SKUs</Typography>
                                        <Typography variant="body2" fontWeight="bold">{store.totalSkus}</Typography>
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2">Critical Risk</Typography>
                                        <Chip label={store.criticalCount} size="small" color="error" />
                                    </Box>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2">High Risk</Typography>
                                        <Chip label={store.highRiskCount} size="small" color="warning" />
                                    </Box>
                                </Box>

                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="caption" color="text.secondary">Stockout Rate</Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={store.stockoutRate} 
                                        sx={{ height: 6, borderRadius: 3, bgcolor: '#ffebee', '& .MuiLinearProgress-bar': { bgcolor: '#d32f2f' } }}
                                    />
                                    <Typography variant="caption">{store.stockoutRate.toFixed(1)}%</Typography>
                                </Box>

                                <Box sx={{ p: 1.5, bgcolor: '#fff3e0', borderRadius: 1 }}>
                                    <Typography variant="caption" color="text.secondary">Revenue at Risk</Typography>
                                    <Typography variant="h6" color="error" fontWeight="bold">
                                        ₹{store.revenueAtRisk.toLocaleString()}
                                    </Typography>
                                </Box>

                                {store.topRisks.length > 0 && (
                                    <Box sx={{ mt: 2 }}>
                                        <Typography variant="caption" color="text.secondary">Top Risks:</Typography>
                                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                            {store.topRisks.map((risk, i) => (
                                                <Chip key={i} label={risk} size="small" variant="outlined" />
                                            ))}
                                        </Box>
                                    </Box>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default MultiStoreAnalytics;
