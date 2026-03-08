import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Card, CardContent, Grid, Chip,
    CircularProgress, Button, Alert, Divider, ToggleButton, ToggleButtonGroup,
    Paper, LinearProgress, IconButton, Tooltip, Badge
} from '@mui/material';
import { 
    SmartToy, Warning, CheckCircle, Store, TrendingUp, 
    Inventory, CloudUpload, Download, Settings, FilterList, Refresh
} from '@mui/icons-material';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip as RechartsTooltip } from 'recharts';
import { RetailMindApi } from '../services/api';
import type { InventoryInsightResponse } from '../services/api';
import DataImport from '../components/DataImport';
import BulkDataImport from '../components/BulkDataImport';
import DatabaseConfig from '../components/DatabaseConfig';
import ExportReports from '../components/ExportReports';
import AdvancedFilters, { type FilterState } from '../components/AdvancedFilters';
import ForecastChart from '../components/ForecastChart';
import FinancialImpact from '../components/FinancialImpact';

interface DashboardProps {
    storeId: string;
}

const Dashboard: React.FC<DashboardProps> = ({ storeId }) => {
    const [insights, setInsights] = useState<InventoryInsightResponse[]>([]);
    const [filteredInsights, setFilteredInsights] = useState<InventoryInsightResponse[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [scenario, setScenario] = useState<'NORMAL' | 'FESTIVAL' | 'SLUMP'>('NORMAL');
    const [importDialogOpen, setImportDialogOpen] = useState(false);
    const [bulkImportOpen, setBulkImportOpen] = useState(false);
    const [dbConfigOpen, setDbConfigOpen] = useState(false);
    const [filtersOpen, setFiltersOpen] = useState(false);
    const [exportAnchor, setExportAnchor] = useState<null | HTMLElement>(null);
    const [lastAnalysisTime, setLastAnalysisTime] = useState<Date | null>(null);
    const [activeFilters, setActiveFilters] = useState<FilterState>({
        riskLevels: [],
        categories: [],
        stockRange: [0, 100]
    });
    const [selectedSkuForForecast, setSelectedSkuForForecast] = useState<string | null>(null);

    const scenarioLabels: Record<typeof scenario, string> = {
        NORMAL: 'Normal weekday demand',
        FESTIVAL: 'Festival spike (Diwali / Pongal)',
        SLUMP: 'Monsoon / off-season slump'
    };

    const fetchInsights = async (scenarioOverride?: typeof scenario) => {
        const effectiveScenario = scenarioOverride ?? scenario;
        setLoading(true);
        setError(null);
        setSuccessMessage(null);
        try {
            const data = await RetailMindApi.getInsights(storeId, effectiveScenario);
            setInsights(data);
            setFilteredInsights(data);
            setLastAnalysisTime(new Date());
        } catch (err: any) {
            setError("Failed to fetch AI insights from the cloud backend. Please try again.");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = (filters: FilterState) => {
        setActiveFilters(filters);
        
        let filtered = [...insights];
        
        // Filter by risk levels
        if (filters.riskLevels.length > 0) {
            filtered = filtered.filter(i => filters.riskLevels.includes(i.riskLevel));
        }
        
        // Filter by stock range
        filtered = filtered.filter(i => 
            i.currentStock >= filters.stockRange[0] && 
            i.currentStock <= filters.stockRange[1]
        );
        
        setFilteredInsights(filtered);
    };

    useEffect(() => {
        applyFilters(activeFilters);
    }, [insights]);

    const handleInitializeDemo = async () => {
        try {
            setLoading(true);
            setError(null);
            setSuccessMessage(null);
            
            // Step 1: Init DynamoDB Tables
            await RetailMindApi.initializeDatabase();
            
            // Step 2: Seed Mock Data
            await RetailMindApi.seedData(storeId);
            
            // Step 3: Auto-fetch insights after seeding
            await fetchInsights();
            
            setSuccessMessage(`✅ Demo data initialized for Store ${storeId}! ${insights.length} SKUs loaded with AI recommendations.`);
            
        } catch (err: any) {
            const errorMsg = err.response?.data?.message || err.message || "Error initializing demo data";
            setError(`Initialization failed: ${errorMsg}. Please try again or check backend logs.`);
            console.error("Demo initialization error:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleRunAIAnalysis = async () => {
        if (insights.length === 0) {
            setError('Please initialize demo data first before running AI analysis.');
            return;
        }
        
        setSuccessMessage(null);
        await fetchInsights();
        setSuccessMessage(`🤖 AI analysis refreshed! Generated new recommendations using Amazon Bedrock.`);
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

    const totalSkus = filteredInsights.length;
    const criticalCount = filteredInsights.filter(i => i.riskLevel === 'CRITICAL').length;
    const highCount = filteredInsights.filter(i => i.riskLevel === 'HIGH').length;
    const countMedium = filteredInsights.filter(i => i.riskLevel === 'MEDIUM').length;
    const countLow = filteredInsights.filter(i => i.riskLevel === 'LOW').length;
    const actionCount = criticalCount + highCount;

    const hasActiveFilters = activeFilters.riskLevels.length > 0 || activeFilters.stockRange[0] > 0 || activeFilters.stockRange[1] < 100;

    const aiSummaryText = totalSkus === 0
        ? "No SKUs loaded yet. Initialize mock data to see AI-driven recommendations."
        : `AI flags ${actionCount} SKUs needing attention (${criticalCount} critical, ${highCount} high risk). There are ${countMedium} medium and ${countLow} low risk items.`;

    // Chart data
    const riskChartData = [
        { name: 'Critical', value: criticalCount, color: '#d32f2f' },
        { name: 'High', value: highCount, color: '#f57c00' },
        { name: 'Medium', value: countMedium, color: '#0288d1' },
        { name: 'Low', value: countLow, color: '#388e3c' },
    ].filter(item => item.value > 0);

    const handleScenarioChange = (
        _event: React.MouseEvent<HTMLElement>,
        newScenario: typeof scenario | null
    ) => {
        if (!newScenario) return;
        setScenario(newScenario);
        fetchInsights(newScenario);
    };

    return (
        <Box sx={{ flexGrow: 1, p: 3, bgcolor: '#f5f7fa', minHeight: '100vh' }}>
            {/* Header Section */}
            <Paper elevation={0} sx={{ p: 3, mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Box>
                        <Typography variant="h4" component="h1" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                            <Store sx={{ mr: 2, fontSize: 40 }} />
                            Inventory Intelligence Dashboard
                        </Typography>
                        <Typography variant="body1" sx={{ opacity: 0.9 }}>
                            AI-Powered Insights • Real-time Risk Detection • Smart Recommendations
                        </Typography>
                        {lastAnalysisTime && (
                            <Typography variant="caption" sx={{ opacity: 0.7, display: 'block', mt: 0.5 }}>
                                Last AI analysis: {lastAnalysisTime.toLocaleTimeString()}
                            </Typography>
                        )}
                    </Box>
                    <Box display="flex" gap={2} alignItems="center" flexDirection="column">
                        <ToggleButtonGroup
                            size="small"
                            value={scenario}
                            exclusive
                            onChange={handleScenarioChange}
                            sx={{ bgcolor: 'white' }}
                        >
                            <ToggleButton value="NORMAL">📅 Weekday</ToggleButton>
                            <ToggleButton value="FESTIVAL">🎉 Festival</ToggleButton>
                            <ToggleButton value="SLUMP">🌧️ Slump</ToggleButton>
                        </ToggleButtonGroup>
                        <Box display="flex" gap={1} flexWrap="wrap">
                            <Button 
                                variant="contained" 
                                sx={{ bgcolor: 'white', color: '#667eea', '&:hover': { bgcolor: '#f0f0f0' } }}
                                onClick={handleInitializeDemo}
                                size="small"
                            >
                                Initialize Demo Data
                            </Button>
                            <Button 
                                variant="contained" 
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                                onClick={() => setBulkImportOpen(true)} 
                                size="small"
                                startIcon={<CloudUpload />}
                            >
                                Bulk Import
                            </Button>
                            <Button 
                                variant="contained" 
                                sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' } }}
                                onClick={handleRunAIAnalysis} 
                                disabled={loading}
                                size="small"
                                startIcon={<Refresh />}
                            >
                                Refresh AI
                            </Button>
                            <Tooltip title="Export reports">
                                <IconButton 
                                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, color: 'white' }}
                                    onClick={(e) => setExportAnchor(e.currentTarget)}
                                    size="small"
                                >
                                    <Download />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Advanced filters">
                                <IconButton 
                                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, color: 'white' }}
                                    onClick={() => setFiltersOpen(true)}
                                    size="small"
                                >
                                    <Badge badgeContent={hasActiveFilters ? '!' : 0} color="error">
                                        <FilterList />
                                    </Badge>
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Database settings">
                                <IconButton 
                                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }, color: 'white' }}
                                    onClick={() => setDbConfigOpen(true)}
                                    size="small"
                                >
                                    <Settings />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                </Box>
            </Paper>

            {error && <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError(null)}>{error}</Alert>}
            {successMessage && <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>{successMessage}</Alert>}
            
            {hasActiveFilters && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Filters active: Showing {filteredInsights.length} of {insights.length} SKUs
                    <Button size="small" onClick={() => applyFilters({ riskLevels: [], categories: [], stockRange: [0, 100] })} sx={{ ml: 2 }}>
                        Clear Filters
                    </Button>
                </Alert>
            )}

            {loading ? (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', mt: 10 }}>
                    <CircularProgress size={60} sx={{ mb: 3 }} />
                    <Typography variant="h6" color="text.secondary">
                        {insights.length === 0 ? 'Initializing demo data and running AI analysis...' : 'Running AI analysis...'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This may take a few seconds
                    </Typography>
                </Box>
            ) : insights.length === 0 && !error ? (
                <Paper sx={{ p: 6, textAlign: 'center' }}>
                    <Inventory sx={{ fontSize: 80, color: '#ccc', mb: 2 }} />
                    <Typography variant="h5" gutterBottom>No Data Available</Typography>
                    <Typography color="text.secondary" sx={{ mb: 3 }}>
                        Click "Initialize Demo Data" to load sample inventory and see AI recommendations
                    </Typography>
                    <Button variant="contained" onClick={handleInitializeDemo}>
                        Get Started
                    </Button>
                </Paper>
            ) : (
                <Grid container spacing={3}>
                    {/* KPI Cards Row */}
                    <Grid item xs={12} md={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Total SKUs</Typography>
                                        <Typography variant="h3" fontWeight="bold">{totalSkus}</Typography>
                                    </Box>
                                    <Inventory sx={{ fontSize: 50, opacity: 0.3 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Need Action</Typography>
                                        <Typography variant="h3" fontWeight="bold">{actionCount}</Typography>
                                    </Box>
                                    <Warning sx={{ fontSize: 50, opacity: 0.3 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Critical Risk</Typography>
                                        <Typography variant="h3" fontWeight="bold">{criticalCount}</Typography>
                                    </Box>
                                    <TrendingUp sx={{ fontSize: 50, opacity: 0.3 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card sx={{ background: 'linear-gradient(135deg, #30cfd0 0%, #330867 100%)', color: 'white' }}>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ opacity: 0.9 }}>Healthy Stock</Typography>
                                        <Typography variant="h3" fontWeight="bold">{countLow}</Typography>
                                    </Box>
                                    <CheckCircle sx={{ fontSize: 50, opacity: 0.3 }} />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Risk Distribution Chart */}
                    <Grid item xs={12} md={5}>
                        <Card sx={{ height: '100%' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom fontWeight="bold">
                                    📊 Risk Distribution
                                </Typography>
                                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                    {scenarioLabels[scenario]}
                                </Typography>
                                {riskChartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={250}>
                                        <PieChart>
                                            <Pie
                                                data={riskChartData}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {riskChartData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <Typography color="text.secondary" textAlign="center" sx={{ py: 5 }}>
                                        No data to display
                                    </Typography>
                                )}
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* AI Summary Card */}
                    <Grid item xs={12} md={7}>
                        <Card sx={{ height: '100%', background: 'linear-gradient(135deg, #e0f7fa 0%, #e1bee7 100%)' }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom fontWeight="bold" display="flex" alignItems="center">
                                    <SmartToy sx={{ mr: 1, color: '#667eea' }} />
                                    AI Intelligence Summary
                                </Typography>
                                <Divider sx={{ my: 2 }} />
                                <Typography variant="body1" sx={{ mb: 3 }}>
                                    {aiSummaryText}
                                </Typography>
                                
                                <Box sx={{ mb: 2 }}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2">Critical Items</Typography>
                                        <Typography variant="body2" fontWeight="bold">{criticalCount}/{totalSkus}</Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={totalSkus > 0 ? (criticalCount / totalSkus) * 100 : 0} 
                                        sx={{ height: 8, borderRadius: 4, bgcolor: '#ffebee', '& .MuiLinearProgress-bar': { bgcolor: '#d32f2f' } }}
                                    />
                                </Box>

                                <Box sx={{ mb: 2 }}>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2">High Risk Items</Typography>
                                        <Typography variant="body2" fontWeight="bold">{highCount}/{totalSkus}</Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={totalSkus > 0 ? (highCount / totalSkus) * 100 : 0} 
                                        sx={{ height: 8, borderRadius: 4, bgcolor: '#fff3e0', '& .MuiLinearProgress-bar': { bgcolor: '#f57c00' } }}
                                    />
                                </Box>

                                <Box>
                                    <Box display="flex" justifyContent="space-between" mb={1}>
                                        <Typography variant="body2">Healthy Stock</Typography>
                                        <Typography variant="body2" fontWeight="bold">{countLow}/{totalSkus}</Typography>
                                    </Box>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={totalSkus > 0 ? (countLow / totalSkus) * 100 : 0} 
                                        sx={{ height: 8, borderRadius: 4, bgcolor: '#e8f5e9', '& .MuiLinearProgress-bar': { bgcolor: '#388e3c' } }}
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    {/* Financial Impact Section */}
                    <Grid item xs={12}>
                        <FinancialImpact storeId={storeId} />
                    </Grid>

                    {/* Forecast Chart Section */}
                    {selectedSkuForForecast && (
                        <Grid item xs={12}>
                            <ForecastChart skuId={selectedSkuForForecast} />
                        </Grid>
                    )}

                    {/* SKU cards */}
                    {filteredInsights.map((insight) => (
                        <Grid item xs={12} md={6} lg={4} key={insight.skuId}>
                            <Card 
                                elevation={2} 
                                sx={{ 
                                    height: '100%', 
                                    display: 'flex', 
                                    flexDirection: 'column',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 6
                                    }
                                }}
                                onClick={() => setSelectedSkuForForecast(insight.skuId)}
                            >
                                <CardContent sx={{ flexGrow: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                        <Typography variant="h6" component="h2" fontWeight="bold">
                                            {insight.skuName}
                                        </Typography>
                                        <Chip
                                            label={insight.riskLevel}
                                            color={getRiskColor(insight.riskLevel) as any}
                                            size="small"
                                            icon={insight.riskLevel === 'CRITICAL' || insight.riskLevel === 'HIGH' ? <Warning /> : <CheckCircle />}
                                        />
                                    </Box>

                                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, p: 1.5, bgcolor: '#f5f5f5', borderRadius: 2 }}>
                                        <Inventory sx={{ mr: 1, color: '#667eea' }} />
                                        <Typography color="text.secondary">
                                            Current Stock: <strong style={{ color: '#000' }}>{insight.currentStock} units</strong>
                                        </Typography>
                                    </Box>

                                    <Divider sx={{ my: 2 }} />

                                    <Box sx={{ bgcolor: 'rgba(102, 126, 234, 0.08)', p: 2, borderRadius: 2, border: '1px solid rgba(102, 126, 234, 0.2)' }}>
                                        <Typography variant="subtitle2" color="primary" gutterBottom display="flex" alignItems="center" fontWeight="bold">
                                            <SmartToy sx={{ fontSize: 18, mr: 1 }} />
                                            AI Recommendation
                                        </Typography>
                                        <Typography variant="body2" color="text.primary" sx={{ fontStyle: 'italic', lineHeight: 1.6 }}>
                                            "{insight.aiRecommendation}"
                                        </Typography>
                                    </Box>

                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}

            <DataImport 
                open={importDialogOpen}
                onClose={() => setImportDialogOpen(false)}
                onImportSuccess={() => {
                    setSuccessMessage('✅ Data imported successfully! Running AI analysis...');
                    fetchInsights();
                }}
            />

            <BulkDataImport
                open={bulkImportOpen}
                onClose={() => setBulkImportOpen(false)}
                onImportSuccess={() => {
                    setSuccessMessage('✅ Bulk data imported successfully! Running AI analysis...');
                    fetchInsights();
                }}
                storeId={storeId}
            />

            <DatabaseConfig
                open={dbConfigOpen}
                onClose={() => setDbConfigOpen(false)}
                onConnect={(config) => {
                    console.log('Database config:', config);
                    setSuccessMessage(`✅ Connected to ${config.type} database`);
                }}
            />

            <ExportReports
                anchorEl={exportAnchor}
                open={Boolean(exportAnchor)}
                onClose={() => setExportAnchor(null)}
                insights={filteredInsights}
                storeId={storeId}
            />

            <AdvancedFilters
                open={filtersOpen}
                onClose={() => setFiltersOpen(false)}
                onApplyFilters={applyFilters}
            />
        </Box>
    );
};

export default Dashboard;
