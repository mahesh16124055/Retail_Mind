import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Alert,
  CircularProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Info as InfoIcon,
  CheckCircle as CheckCircleIcon,
  Visibility as ViewIcon,
  PlayArrow as AnalyzeIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';

import { dashboardApi, handleApiError } from '../services/api';
import { DashboardSummary, ProductAlert, RiskSeverity } from '../types';

const STORE_ID = 'STORE001'; // Default store for MVP

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [alerts, setAlerts] = useState<ProductAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      setSuccessMessage(null);

      const [summaryData, alertsData] = await Promise.all([
        dashboardApi.getSummary(STORE_ID),
        dashboardApi.getAlerts(STORE_ID, undefined, 20),
      ]);

      setSummary(summaryData);
      setAlerts(alertsData);
      setLastRefresh(new Date());
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const runAnalysis = async () => {
    try {
      setAnalyzing(true);
      setError(null);
      setSuccessMessage(null);

      await dashboardApi.triggerAnalysis(STORE_ID);
      
      // Refresh dashboard data after analysis
      await loadDashboardData();
      
      // Show success message
      setSuccessMessage('Analysis completed successfully! Dashboard updated with latest insights.');
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: RiskSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return 'error';
      case 'HIGH':
        return 'warning';
      case 'MEDIUM':
        return 'info';
      case 'LOW':
        return 'success';
      default:
        return 'default';
    }
  };

  const getSeverityIcon = (severity: RiskSeverity) => {
    switch (severity) {
      case 'CRITICAL':
        return <ErrorIcon />;
      case 'HIGH':
        return <WarningIcon />;
      case 'MEDIUM':
        return <InfoIcon />;
      case 'LOW':
        return <CheckCircleIcon />;
      default:
        return <InfoIcon />;
    }
  };

  const formatDaysText = (days: number | undefined, type: 'stockout' | 'expiry') => {
    if (days === undefined) return '-';
    
    if (days <= 0) {
      return type === 'stockout' ? 'Out of stock' : 'Expired';
    }
    
    return `${days} day${days === 1 ? '' : 's'}`;
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box mb={3}>
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h4" component="h1">
            Inventory Dashboard
          </Typography>
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="primary"
              startIcon={analyzing ? <CircularProgress size={20} /> : <AnalyzeIcon />}
              onClick={runAnalysis}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : 'Run Analysis'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadDashboardData}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>

        <Typography variant="body2" color="text.secondary">
          Store: Sample Kirana Store (STORE001) • Last updated: {lastRefresh.toLocaleString()}
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {successMessage && (
        <Alert severity="success" sx={{ mb: 3 }} onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      {/* Summary Cards */}
      {summary && (
        <Grid container spacing={3} mb={4}>
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Total SKUs
                </Typography>
                <Typography variant="h4">
                  {summary.total_skus}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Critical Alerts
                </Typography>
                <Typography variant="h4" color="error.main">
                  {summary.critical_alerts}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Low Stock
                </Typography>
                <Typography variant="h4" color="warning.main">
                  {summary.low_stock_items}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Expiry Warnings
                </Typography>
                <Typography variant="h4" color="info.main">
                  {summary.expiry_warnings}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={2.4}>
            <Card>
              <CardContent>
                <Typography color="text.secondary" gutterBottom>
                  Recommendations
                </Typography>
                <Typography variant="h4" color="success.main">
                  {summary.recommendations_pending}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Products Needing Attention */}
      <Card>
        <CardContent>
          <Typography variant="h5" component="h2" gutterBottom>
            Products Needing Attention
          </Typography>
          
          {alerts.length === 0 ? (
            <Alert severity="success">
              No critical issues found. All products are within safe levels.
            </Alert>
          ) : (
            <TableContainer component={Paper} variant="outlined">
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Product</TableCell>
                    <TableCell align="center">Current Stock</TableCell>
                    <TableCell align="center">7-Day Demand</TableCell>
                    <TableCell align="center">Days Until Stockout</TableCell>
                    <TableCell align="center">Days Until Expiry</TableCell>
                    <TableCell align="center">Risk Level</TableCell>
                    <TableCell>Primary Recommendation</TableCell>
                    <TableCell align="center">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.sku_id} hover>
                      <TableCell>
                        <Typography variant="subtitle2">
                          {alert.sku_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {alert.sku_id}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {alert.current_stock}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography variant="body2">
                          {alert.predicted_demand_7d.toFixed(1)}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body2"
                          color={alert.days_until_stockout && alert.days_until_stockout <= 2 ? 'error' : 'inherit'}
                        >
                          {formatDaysText(alert.days_until_stockout, 'stockout')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Typography 
                          variant="body2"
                          color={alert.days_until_expiry && alert.days_until_expiry <= 1 ? 'error' : 'inherit'}
                        >
                          {formatDaysText(alert.days_until_expiry, 'expiry')}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Chip
                          icon={getSeverityIcon(alert.risk_severity)}
                          label={alert.risk_severity}
                          color={getSeverityColor(alert.risk_severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" noWrap>
                          {alert.primary_recommendation}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Tooltip title="View Details">
                          <IconButton
                            size="small"
                            onClick={() => navigate(`/product/${STORE_ID}/${alert.sku_id}`)}
                          >
                            <ViewIcon />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item>
            <Button
              variant="outlined"
              onClick={() => navigate('/upload')}
            >
              Upload Data
            </Button>
          </Grid>
          <Grid item>
            <Button
              variant="outlined"
              onClick={() => navigate('/analytics')}
            >
              View Analytics
            </Button>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default Dashboard;