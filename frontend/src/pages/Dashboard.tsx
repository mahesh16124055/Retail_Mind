import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip,
    CircularProgress, Button, Alert, Divider
} from '@mui/material';
import { SmartToy, Warning, CheckCircle, Store } from '@mui/icons-material';
import { RetailMindApi } from '../services/api';
import type { InventoryInsightResponse } from '../services/api';

const Dashboard: React.FC = () => {
    const [insights, setInsights] = useState<InventoryInsightResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);

    // Hardcoded for MVP Demo
    const DEMO_STORE_ID = "101";

    const fetchInsights = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await RetailMindApi.getInsights(DEMO_STORE_ID);
            setInsights(data);
        } catch (err: any) {
            setError("Failed to fetch AI insights. Is the Spring Boot backend running on port 8080?");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleInitializeDemo = async () => {
        try {
            setLoading(true);
            // Step 1: Init DynamoDB Tables
            await RetailMindApi.initializeDatabase();
            // Step 2: Seed Mock Data
            await RetailMindApi.seedData(DEMO_STORE_ID);
            // Step 3: Fetch Insights
            await fetchInsights();
        } catch (err) {
            setError("Error initializing demo data. Check backend logs.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchInsights();
    }, []);

    const getRiskColor = (level: string) => {
        switch (level) {
            case 'CRITICAL': return 'error';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return 'info';
            case 'LOW': return 'success';
            default: return 'default';
        }
    };

    return (
        <Box sx={{ flexGrow: 1, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    <Store sx={{ mr: 1, verticalAlign: 'bottom' }} />
                    RetailMind Kirana HQ
                </Typography>
                <Box gap={2} display="flex">
                    <Button variant="outlined" color="secondary" onClick={handleInitializeDemo}>
                        1. Initialize Mock Data (DynamoDB)
                    </Button>
                    <Button variant="contained" color="primary" onClick={fetchInsights} disabled={loading}>
                        2. Run Bedrock AI Analysis
                    </Button>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                    <CircularProgress />
                </Box>
            ) : insights.length === 0 && !error ? (
                <Alert severity="info" sx={{ mb: 3 }}>No data found. Click 'Initialize Mock Data' to begin the demo.</Alert>
            ) : (
                <Grid container spacing={3}>
                    {insights.map((insight) => (
                        <Grid item xs={12} md={6} lg={4} key={insight.skuId}>
                            <Card elevation={3} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="h6" component="h2">
                                            {insight.skuName}
                                        </Typography>
                                        <Chip
                                            label={insight.riskLevel}
                                            color={getRiskColor(insight.riskLevel) as any}
                                            size="small"
                                            icon={insight.riskLevel === 'CRITICAL' ? <Warning /> : <CheckCircle />}
                                        />
                                    </Box>

                                    <Typography color="text.secondary" gutterBottom>
                                        Current Stock: <strong>{insight.currentStock} units</strong>
                                    </Typography>

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ bgcolor: 'rgba(25, 118, 210, 0.08)', p: 2, borderRadius: 2 }}>
                                        <Typography variant="subtitle2" color="primary" gutterBottom display="flex" alignItems="center">
                                            <SmartToy sx={{ fontSize: 18, mr: 1 }} />
                                            Bedrock AI Recommendation
                                        </Typography>
                                        <Typography variant="body2" color="text.primary" sx={{ fontStyle: 'italic' }}>
                                            "{insight.aiRecommendation}"
                                        </Typography>
                                    </Box>

                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
        </Box>
    );
};

export default Dashboard;
