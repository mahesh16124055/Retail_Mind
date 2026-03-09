import React from 'react';
import { Box, Typography, Button, Paper, Grid, Card, CardContent } from '@mui/material';
import { PlayArrow, Inventory, TrendingUp, SmartToy, Assessment } from '@mui/icons-material';

interface LandingStateProps {
  storeId: string;
  onTriggerAnalysis: () => void;
}

const LandingState: React.FC<LandingStateProps> = ({ storeId, onTriggerAnalysis }) => {
  return (
    <Box sx={{ flexGrow: 1, p: 3, bgcolor: '#f5f7fa', minHeight: '80vh' }}>
      {/* Welcome Section */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 6, 
          mb: 4, 
          textAlign: 'center',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom>
          Welcome to RetailMind
        </Typography>
        <Typography variant="h6" sx={{ mb: 4, opacity: 0.9 }}>
          AI-Powered Inventory Intelligence for Store {storeId}
        </Typography>
        
        <Button
          variant="contained"
          size="large"
          startIcon={<PlayArrow />}
          onClick={onTriggerAnalysis}
          sx={{
            bgcolor: 'white',
            color: '#667eea',
            px: 6,
            py: 2,
            fontSize: '1.1rem',
            fontWeight: 'bold',
            '&:hover': {
              bgcolor: '#f0f0f0',
              transform: 'scale(1.05)',
            },
            transition: 'all 0.3s ease',
          }}
        >
          Start Analysis
        </Button>
        
        <Typography variant="body2" sx={{ mt: 2, opacity: 0.8 }}>
          Click to load inventory data and generate AI-powered insights
        </Typography>
      </Paper>

      {/* Empty State Placeholders */}
      <Grid container spacing={3}>
        {/* KPI Placeholders */}
        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', bgcolor: '#f5f5f5' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Total SKUs</Typography>
                  <Typography variant="h3" fontWeight="bold" color="text.disabled">--</Typography>
                </Box>
                <Inventory sx={{ fontSize: 50, color: '#e0e0e0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', bgcolor: '#f5f5f5' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Need Action</Typography>
                  <Typography variant="h3" fontWeight="bold" color="text.disabled">--</Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 50, color: '#e0e0e0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', bgcolor: '#f5f5f5' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Critical Risk</Typography>
                  <Typography variant="h3" fontWeight="bold" color="text.disabled">--</Typography>
                </Box>
                <Assessment sx={{ fontSize: 50, color: '#e0e0e0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card sx={{ height: '100%', bgcolor: '#f5f5f5' }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="subtitle2" color="text.secondary">Healthy Stock</Typography>
                  <Typography variant="h3" fontWeight="bold" color="text.disabled">--</Typography>
                </Box>
                <SmartToy sx={{ fontSize: 50, color: '#e0e0e0' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Chart Placeholders */}
        <Grid item xs={12} md={6}>
          <Card sx={{ height: 300, bgcolor: '#f5f5f5' }}>
            <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box textAlign="center">
                <Assessment sx={{ fontSize: 80, color: '#e0e0e0', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  Risk Distribution Chart
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  Awaiting analysis...
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ height: 300, bgcolor: '#f5f5f5' }}>
            <CardContent sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Box textAlign="center">
                <SmartToy sx={{ fontSize: 80, color: '#e0e0e0', mb: 2 }} />
                <Typography variant="h6" color="text.secondary">
                  AI Intelligence Summary
                </Typography>
                <Typography variant="body2" color="text.disabled">
                  Awaiting analysis...
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Insights Placeholder */}
        <Grid item xs={12}>
          <Card sx={{ bgcolor: '#f5f5f5', p: 4 }}>
            <Box textAlign="center">
              <Inventory sx={{ fontSize: 100, color: '#e0e0e0', mb: 2 }} />
              <Typography variant="h5" color="text.secondary" gutterBottom>
                No Insights Available
              </Typography>
              <Typography variant="body1" color="text.disabled" sx={{ mb: 3 }}>
                Click "Start Analysis" to load inventory data and generate AI-powered recommendations
              </Typography>
              <Button
                variant="outlined"
                startIcon={<PlayArrow />}
                onClick={onTriggerAnalysis}
                sx={{ color: '#667eea', borderColor: '#667eea' }}
              >
                Start Analysis
              </Button>
            </Box>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default LandingState;
