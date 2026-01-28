import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Alert,
  CircularProgress,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  TrendingUp as TrendIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';

import { predictionsApi, recommendationsApi, handleApiError } from '../services/api';

const STORE_ID = 'STORE001'; // Default store for MVP

const Analytics: React.FC = () => {
  const [modelPerformance, setModelPerformance] = useState<any>(null);
  const [feedbackStats, setFeedbackStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState(30);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);

      const [performance, feedback] = await Promise.all([
        predictionsApi.getModelPerformance(STORE_ID, timeRange),
        recommendationsApi.getFeedbackStats(STORE_ID, timeRange),
      ]);

      setModelPerformance(performance);
      setFeedbackStats(feedback);
    } catch (err) {
      setError(handleApiError(err));
    } finally {
      setLoading(false);
    }
  };

  const getPerformanceColor = (grade: string) => {
    switch (grade) {
      case 'Excellent': return 'success';
      case 'Good': return 'info';
      case 'Fair': return 'warning';
      case 'Poor': return 'error';
      case 'Very Poor': return 'error';
      default: return 'default';
    }
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
            Analytics Dashboard
          </Typography>
          <Box display="flex" gap={2} alignItems="center">
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Time Range</InputLabel>
              <Select
                value={timeRange}
                label="Time Range"
                onChange={(e) => setTimeRange(Number(e.target.value))}
              >
                <MenuItem value={7}>7 days</MenuItem>
                <MenuItem value={30}>30 days</MenuItem>
                <MenuItem value={90}>90 days</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadAnalytics}
              disabled={loading}
            >
              Refresh
            </Button>
          </Box>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Performance metrics and insights for Store: Sample Kirana Store (STORE001)
        </Typography>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {/* Model Performance */}
        {modelPerformance && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <TrendIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Demand Prediction Performance
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Predictions
                    </Typography>
                    <Typography variant="h4">
                      {modelPerformance.total_predictions}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Accurate Predictions
                    </Typography>
                    <Typography variant="h4">
                      {modelPerformance.accurate_predictions}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Accuracy Rate
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {(modelPerformance.accuracy_rate * 100).toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Performance Grade
                    </Typography>
                    <Typography 
                      variant="h6" 
                      color={`${getPerformanceColor(modelPerformance.performance_grade)}.main`}
                    >
                      {modelPerformance.performance_grade}
                    </Typography>
                  </Grid>
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary">
                      Mean Absolute Error
                    </Typography>
                    <Typography variant="body1">
                      {modelPerformance.mean_absolute_error} units
                    </Typography>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Recommendation Feedback */}
        {feedbackStats && (
          <Grid item xs={12} md={6}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                  <AssessmentIcon sx={{ mr: 1 }} />
                  <Typography variant="h6">
                    Recommendation Feedback
                  </Typography>
                </Box>
                
                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Total Recommendations
                    </Typography>
                    <Typography variant="h4">
                      {feedbackStats.overall.total}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Accepted
                    </Typography>
                    <Typography variant="h4" color="success.main">
                      {feedbackStats.overall.accepted}
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Acceptance Rate
                    </Typography>
                    <Typography variant="h4" color="primary">
                      {(feedbackStats.overall.acceptance_rate * 100).toFixed(1)}%
                    </Typography>
                  </Grid>
                  <Grid item xs={6}>
                    <Typography variant="body2" color="text.secondary">
                      Pending
                    </Typography>
                    <Typography variant="h4" color="warning.main">
                      {feedbackStats.overall.pending}
                    </Typography>
                  </Grid>
                </Grid>

                {/* Breakdown by Type */}
                {Object.keys(feedbackStats.by_type).length > 0 && (
                  <Box mt={3}>
                    <Typography variant="subtitle1" gutterBottom>
                      By Recommendation Type
                    </Typography>
                    {Object.entries(feedbackStats.by_type).map(([type, stats]: [string, any]) => (
                      <Box key={type} mb={1}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                          <Typography variant="body2">
                            {type.replace('_', ' ')}
                          </Typography>
                          <Typography variant="body2" color="primary">
                            {(stats.acceptance_rate * 100).toFixed(0)}% ({stats.accepted}/{stats.total})
                          </Typography>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        )}

        {/* Key Insights */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Key Insights
              </Typography>
              
              <Grid container spacing={2}>
                {modelPerformance && (
                  <Grid item xs={12} md={6}>
                    <Alert 
                      severity={modelPerformance.accuracy_rate >= 0.8 ? 'success' : 'warning'}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="subtitle2">
                        Prediction Accuracy
                      </Typography>
                      <Typography variant="body2">
                        {modelPerformance.accuracy_rate >= 0.8 
                          ? `Excellent prediction accuracy of ${(modelPerformance.accuracy_rate * 100).toFixed(1)}%. The AI model is performing well.`
                          : `Prediction accuracy is ${(modelPerformance.accuracy_rate * 100).toFixed(1)}%. Consider reviewing data quality or model parameters.`
                        }
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                {feedbackStats && (
                  <Grid item xs={12} md={6}>
                    <Alert 
                      severity={feedbackStats.overall.acceptance_rate >= 0.7 ? 'success' : 'info'}
                      sx={{ mb: 2 }}
                    >
                      <Typography variant="subtitle2">
                        Recommendation Acceptance
                      </Typography>
                      <Typography variant="body2">
                        {feedbackStats.overall.acceptance_rate >= 0.7
                          ? `High acceptance rate of ${(feedbackStats.overall.acceptance_rate * 100).toFixed(1)}%. Users find recommendations valuable.`
                          : `Acceptance rate is ${(feedbackStats.overall.acceptance_rate * 100).toFixed(1)}%. Consider refining recommendation logic.`
                        }
                      </Typography>
                    </Alert>
                  </Grid>
                )}

                <Grid item xs={12}>
                  <Alert severity="info">
                    <Typography variant="subtitle2">
                      System Status
                    </Typography>
                    <Typography variant="body2">
                      The RetailMind AI system is actively learning from your data and feedback. 
                      Regular analysis helps improve prediction accuracy and recommendation relevance.
                      {modelPerformance && modelPerformance.total_predictions === 0 && 
                        " Upload more sales data to improve prediction accuracy."
                      }
                    </Typography>
                  </Alert>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
};

export default Analytics;