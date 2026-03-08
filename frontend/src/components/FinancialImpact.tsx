import React, { useState, useEffect } from 'react';
import {
    Card, CardContent, Typography, Box, Grid, Chip, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Collapse, IconButton
} from '@mui/material';
import { AttachMoney, ExpandMore } from '@mui/icons-material';

interface FinancialImpact {
    skuId: string;
    skuName: string;
    currentStock: number;
    unitPrice: number;
    unitCost: number;
    profitMargin: number;
    revenueAtRisk: number;
    potentialRevenueLoss: number;
    excessInventoryCost: number;
    recommendedOrderValue: number;
    projectedROI: number;
    impactLevel: string;
}

interface FinancialImpactProps {
    storeId: string;
}

const FinancialImpact: React.FC<FinancialImpactProps> = ({ storeId }) => {
    const [impacts, setImpacts] = useState<FinancialImpact[]>([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(true);

    useEffect(() => {
        fetchFinancialImpact();
    }, [storeId]);

    const fetchFinancialImpact = async () => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/financial/impact/${storeId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            setImpacts(data);
        } catch (err) {
            console.error('Failed to load financial impact', err);
        } finally {
            setLoading(false);
        }
    };

    const totalRevenueAtRisk = impacts.reduce((sum, i) => sum + i.revenueAtRisk, 0);
    const totalPotentialLoss = impacts.reduce((sum, i) => sum + i.potentialRevenueLoss, 0);
    const totalExcessCost = impacts.reduce((sum, i) => sum + i.excessInventoryCost, 0);
    const avgROI = impacts.length > 0 
        ? impacts.reduce((sum, i) => sum + i.projectedROI, 0) / impacts.length 
        : 0;

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="center" p={2}>
                        <CircularProgress />
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Card>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold" display="flex" alignItems="center">
                        <AttachMoney sx={{ mr: 1, color: '#667eea' }} />
                        Financial Impact Analysis
                    </Typography>
                    <IconButton onClick={() => setExpanded(!expanded)} size="small">
                        <ExpandMore sx={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: '0.3s' }} />
                    </IconButton>
                </Box>

                <Grid container spacing={2} mb={2}>
                    <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, bgcolor: '#ffebee' }}>
                            <Typography variant="caption" color="text.secondary">Revenue at Risk</Typography>
                            <Typography variant="h6" color="error" fontWeight="bold">
                                ₹{totalRevenueAtRisk.toLocaleString()}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, bgcolor: '#fff3e0' }}>
                            <Typography variant="caption" color="text.secondary">Potential Loss</Typography>
                            <Typography variant="h6" color="warning.main" fontWeight="bold">
                                ₹{totalPotentialLoss.toLocaleString()}
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, bgcolor: '#e8f5e9' }}>
                            <Typography variant="caption" color="text.secondary">Avg ROI</Typography>
                            <Typography variant="h6" color="success.main" fontWeight="bold">
                                {avgROI.toFixed(1)}%
                            </Typography>
                        </Paper>
                    </Grid>
                    <Grid item xs={6} md={3}>
                        <Paper sx={{ p: 2, bgcolor: '#e3f2fd' }}>
                            <Typography variant="caption" color="text.secondary">Excess Cost</Typography>
                            <Typography variant="h6" color="primary" fontWeight="bold">
                                ₹{totalExcessCost.toLocaleString()}
                            </Typography>
                        </Paper>
                    </Grid>
                </Grid>

                <Collapse in={expanded}>
                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 400 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell><strong>SKU</strong></TableCell>
                                    <TableCell align="right"><strong>Stock</strong></TableCell>
                                    <TableCell align="right"><strong>Margin</strong></TableCell>
                                    <TableCell align="right"><strong>Revenue Risk</strong></TableCell>
                                    <TableCell align="right"><strong>ROI</strong></TableCell>
                                    <TableCell><strong>Impact</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {impacts.slice(0, 10).map((impact) => (
                                    <TableRow key={impact.skuId} hover>
                                        <TableCell>{impact.skuName}</TableCell>
                                        <TableCell align="right">{impact.currentStock}</TableCell>
                                        <TableCell align="right">{impact.profitMargin.toFixed(1)}%</TableCell>
                                        <TableCell align="right">₹{impact.revenueAtRisk.toFixed(0)}</TableCell>
                                        <TableCell align="right">
                                            <Chip 
                                                label={`${impact.projectedROI.toFixed(0)}%`}
                                                size="small"
                                                color={impact.projectedROI > 50 ? 'success' : 'default'}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <Chip 
                                                label={impact.impactLevel}
                                                size="small"
                                                color={
                                                    impact.impactLevel === 'CRITICAL' ? 'error' :
                                                    impact.impactLevel === 'HIGH' ? 'warning' :
                                                    impact.impactLevel === 'MEDIUM' ? 'info' : 'success'
                                                }
                                            />
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    {impacts.length > 10 && (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, textAlign: 'center' }}>
                            Showing top 10 of {impacts.length} SKUs by revenue impact
                        </Typography>
                    )}
                </Collapse>
            </CardContent>
        </Card>
    );
};

export default FinancialImpact;
