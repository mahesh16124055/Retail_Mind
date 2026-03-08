import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip,
    CircularProgress, Button, Alert, Divider, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { SmartToy, Warning, CheckCircle, Store } from '@mui/icons-material';
import { RetailMindApi } from '../services/api';
import type { InventoryInsightResponse } from '../services/api';

const Dashboard: React.FC = () => {
    const [insights, setInsights] = useState<InventoryInsightResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [scenario, setScenario] = useState<'NORMAL' | 'FESTIVAL' | 'SLUMP'>('NORMAL');

    // Hardcoded for MVP Demo
    const DEMO_STORE_ID = "101";

    const scenarioLabels: Record<typeof scenario, string> = {
        NORMAL: 'Normal weekday demand',
        FESTIVAL: 'Festival spike (Diwali / Pongal)',
        SLUMP: 'Monsoon / off-season slump'
    };

    const fetchInsights = async (scenarioOverride?: typeof scenario) => {
        const effectiveScenario = scenarioOverride ?? scenario;
        setLoading(true);
        setError(null);
        try {
            const data = await RetailMindApi.getInsights(DEMO_STORE_ID, effectiveScenario);
            setInsights(data);
        } catch (err: any) {
            setError("Failed to fetch AI insights from the cloud backend. Please try again.");
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

    const totalSkus = insights.length;
    const criticalCount = insights.filter(i => i.riskLevel === 'CRITICAL').length;
    const highCount = insights.filter(i => i.riskLevel === 'HIGH').length;
    const countMedium = insights.filter(i => i.riskLevel === 'MEDIUM').length;
    const countLow = insights.filter(i => i.riskLevel === 'LOW').length;
    const actionCount = criticalCount + highCount;

    const aiSummaryText = totalSkus === 0
        ? "No SKUs loaded yet. Initialize mock data to see AI-driven recommendations."
        : `AI flags ${actionCount} SKUs needing attention (${criticalCount} critical, ${highCount} high risk). There are ${countMedium} medium and ${countLow} low risk items.`;

    const handleScenarioChange = (
        _event: React.MouseEvent<HTMLElement>,
        newScenario: typeof scenario | null
    ) => {
        if (!newScenario) return;
        setScenario(newScenario);
        fetchInsights(newScenario);
    };

    return (
        <Box sx={{ flexGrow: 1, p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 4, alignItems: 'center' }}>
                <Typography variant="h4" component="h1" fontWeight="bold">
                    <Store sx={{ mr: 1, verticalAlign: 'bottom' }} />
                    RetailMind Kirana HQ
                </Typography>
                <Box display="flex" gap={2} alignItems="center">
                    <ToggleButtonGroup
                        size="small"
                        value={scenario}
                        exclusive
                        onChange={handleScenarioChange}
                    >
                        <ToggleButton value="NORMAL">Weekday</ToggleButton>
                        <ToggleButton value="FESTIVAL">Festival</ToggleButton>
                        <ToggleButton value="SLUMP">Slump</ToggleButton>
                    </ToggleButtonGroup>
                    <Button variant="outlined" color="secondary" onClick={handleInitializeDemo}>
                        1. Initialize Mock Data (DynamoDB)
                    </Button>
                    <Button variant="contained" color="primary" onClick={() => fetchInsights()} disabled={loading}>
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
                    {/* KPI + Summary Row */}
                    <Grid item xs={12} md={8}>
                        <Grid container spacing={2}>
                            <Grid item xs={6} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="subtitle2" color="text.secondary">Tracked SKUs</Typography>
                                        <Typography variant="h5" fontWeight="bold">{totalSkus}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="subtitle2" color="text.secondary">Need Action</Typography>
                                        <Typography variant="h5" fontWeight="bold" color="error">
                                            {actionCount}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="subtitle2" color="text.secondary">Critical</Typography>
                                        <Typography variant="h5" fontWeight="bold" color="error">
                                            {criticalCount}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={6} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="subtitle2" color="text.secondary">Low Risk</Typography>
                                        <Typography variant="h5" fontWeight="bold" color="success.main">
                                            {countLow}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                                    AI Summary ({scenarioLabels[scenario]})
                                </Typography>
                                <Typography variant="body2">
                                    {aiSummaryText}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* SKU cards */}
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
