import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  Divider,
} from '@mui/material';
import {
  ArrowBack as BackIcon,
  TrendingUp as TrendIcon,
  Warning as WarningIcon,
  Recommend as RecommendIcon,
} from '@mui/icons-material';
import { format } from 'date-fns';

import { dashboardApi, handleApiError } from '../services/api';
import { SKUDetail, RiskSeverity } from '../types';

const ProductDetails: React.FC = () => {
  const { storeId, skuId } = useParams<{ storeId: string; skuId: string }>();
  const navigate = useNavigate();
  
  const [skuDetail, setSkuDetail] = useState<SKUDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (storeId && skuId) {
      loadSKUDetail();
    }
  }, [storeId, skuId]);

  const loadSKUDetail = async () => {
    if (!storeId || !skuId) return;

    try {
      setLoading(true);
      setError(null);

      const detail = await dashboardApi.getSKUDetail(storeId, skuId);
      setSkuDetail(detail);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const getSeverityColor = (severity: RiskSeverity) => {
    switch (severity) {
      case 'CRITICAL': return 'error';
      case 'HIGH': return 'warning';
      case 'MEDIUM': return 'info';
      case 'LOW': return 'success';
      default: return 'default';
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toFixed(2)}`;
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

  if (error) {
    return (
      <Container maxWidth="lg">
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!skuDetail) {
    return (
      <Container maxWidth="lg">
        <Alert severity="info" sx={{ mt: 2 }}>
          Product not found
        </Alert>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mt: 2 }}
        >
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      {/* Header */}
      <Box mb={3}>
        <Button
          startIcon={<BackIcon />}
          onClick={() => navigate('/dashboard')}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        
        <Typography variant="h4" component="h1" gutterBottom>
          {skuDetail.sku.name}
        </Typography>
        <Typography variant="body1" color="text.secondary">
          SKU: {skuDetail.sku.sku_id} • Category: {skuDetail.sku.category} • Brand: {skuDetail.sku.brand}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        {/* Product Information */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Product Information
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Unit Cost
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(skuDetail.sku.unit_cost)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Selling Price
                  </Typography>
                  <Typography variant="h6">
                    {formatCurrency(skuDetail.sku.selling_price)}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Shelf Life
                  </Typography>
                  <Typography variant="body1">
                    {skuDetail.sku.shelf_life_days} days
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Margin
                  </Typography>
                  <Typography variant="body1">
                    {formatCurrency(skuDetail.sku.selling_price - skuDetail.sku.unit_cost)}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Current Inventory */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Current Inventory
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Current Stock
                  </Typography>
                  <Typography variant="h6">
                    {skuDetail.inventory.current_stock}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Available Stock
                  </Typography>
                  <Typography variant="h6">
                    {skuDetail.inventory.available_stock}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Reorder Point
                  </Typography>
                  <Typography variant="body1">
                    {skuDetail.inventory.reorder_point}
                  </Typography>
                </Grid>
                <Grid item xs={6}>
                  <Typography variant="body2" color="text.secondary">
                    Safety Stock
                  </Typography>
                  <Typography variant="body1">
                    {skuDetail.inventory.safety_stock}
                  </Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Demand Forecast */}
        {skuDetail.forecast && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    7-Day Demand Forecast
                  </Typography>
                </Box>
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Predicted Demand
                    </Typography>
                    <Typography variant="h6">
                      {skuDetail.forecast.predicted_demand.toFixed(1)} units
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Confidence Level
                    </Typography>
                    <Typography variant="h6">
                      {(skuDetail.forecast.confidence_level * 100).toFixed(0)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Confidence Range
                    </Typography>
                    <Typography variant="body1">
                      {skuDetail.forecast.confidence_interval[0].toFixed(1)} - {skuDetail.forecast.confidence_interval[1].toFixed(1)} units
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Model Used
                    </Typography>
                    <Typography variant="body1">
                      {skuDetail.forecast.model_used}
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Active Risks */}
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <WarningIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  Active Risks
                </Typography>
              </Box>
              {skuDetail.risks.length === 0 ? (
                <Alert severity="success">
                  No active risks detected
                </Alert>
              ) : (
                <Box>
                  {skuDetail.risks.map((risk) => (
                    <Box key={risk.risk_id} mb={2}>
                      <Box display="flex" alignItems="center" mb={1}>
                        <Chip
                          label={risk.severity}
                          color={getSeverityColor(risk.severity) as any}
                          size="small"
                          sx={{ mr: 1 }}
                        />
                        <Typography variant="subtitle2">
                          {risk.risk_type.replace('_', ' ')}
                        </Typography>
                      </Box>
                      <Typography variant="body2" color="text.secondary">
                        {risk.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Risk Score: {(risk.risk_score * 100).toFixed(0)}%
                      </Typography>
                    </Box>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recommendations */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <RecommendIcon sx={{ mr: 1 }} />
                <Typography variant="h6">
                  AI Recommendations
                </Typography>
              </Box>
              {skuDetail.recommendations.length === 0 ? (
                <Alert severity="info">
                  No recommendations available
                </Alert>
              ) : (
                <Grid container spacing={2}>
                  {skuDetail.recommendations.map((rec) => (
                    <Grid item xs={12} md={6} key={rec.recommendation_id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Box display="flex" alignItems="center" mb={1}>
                            <Chip
                              label={rec.recommendation_type}
                              color="primary"
                              size="small"
                              sx={{ mr: 1 }}
                            />
                            <Typography variant="caption" color="text.secondary">
                              Confidence: {(rec.confidence_level * 100).toFixed(0)}%
                            </Typography>
                          </Box>
                          <Typography variant="subtitle1" gutterBottom>
                            {rec.action}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" paragraph>
                            {rec.explanation}
                          </Typography>
                          <Typography variant="body2">
                            <strong>Expected Outcome:</strong> {rec.expected_outcome}
                          </Typography>
                          {rec.estimated_roi && (
                            <Typography variant="body2">
                              <strong>Estimated ROI:</strong> {(rec.estimated_roi * 100).toFixed(1)}%
                            </Typography>
                          )}
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Sales History */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Sales History (30 days)
              </Typography>
              {skuDetail.sales_history_30d.length === 0 ? (
                <Alert severity="info">
                  No sales data available
                </Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined">
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Date</TableCell>
                        <TableCell align="right">Quantity</TableCell>
                        <TableCell align="right">Unit Price</TableCell>
                        <TableCell align="right">Total Amount</TableCell>
                        <TableCell>Transaction ID</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {skuDetail.sales_history_30d.slice(0, 10).map((sale) => (
                        <TableRow key={sale.transaction_id}>
                          <TableCell>
                            {format(new Date(sale.timestamp), 'MMM dd, yyyy HH:mm')}
                          </TableCell>
                          <TableCell align="right">{sale.quantity}</TableCell>
                          <TableCell align="right">{formatCurrency(sale.unit_price)}</TableCell>
                          <TableCell align="right">{formatCurrency(sale.total_amount)}</TableCell>
                          <TableCell>{sale.transaction_id}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProductDetails;