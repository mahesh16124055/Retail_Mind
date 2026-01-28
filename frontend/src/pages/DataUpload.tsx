import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Alert,
  LinearProgress,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
} from '@mui/material';
import {
  CloudUpload as UploadIcon,
  Description as FileIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  AutoAwesome as SampleIcon,
} from '@mui/icons-material';

import { dataApi, handleApiError } from '../services/api';
import { UploadResult } from '../types';

const STORE_ID = 'STORE001'; // Default store for MVP

interface UploadState {
  loading: boolean;
  result: UploadResult | null;
  error: string | null;
}

const DataUpload: React.FC = () => {
  const [salesUpload, setSalesUpload] = useState<UploadState>({
    loading: false,
    result: null,
    error: null,
  });
  
  const [inventoryUpload, setInventoryUpload] = useState<UploadState>({
    loading: false,
    result: null,
    error: null,
  });
  
  const [skuUpload, setSkuUpload] = useState<UploadState>({
    loading: false,
    result: null,
    error: null,
  });

  const [sampleDataLoading, setSampleDataLoading] = useState(false);
  const [sampleDataResult, setSampleDataResult] = useState<any>(null);

  const handleFileUpload = async (
    file: File,
    uploadType: 'sales' | 'inventory' | 'sku',
    setState: React.Dispatch<React.SetStateAction<UploadState>>
  ) => {
    setState({ loading: true, result: null, error: null });

    try {
      let result;
      
      switch (uploadType) {
        case 'sales':
          result = await dataApi.uploadSales(STORE_ID, file);
          break;
        case 'inventory':
          result = await dataApi.uploadInventory(STORE_ID, file);
          break;
        case 'sku':
          result = await dataApi.uploadSKUMaster(file);
          break;
      }

      setState({
        loading: false,
        result: result.processing_result,
        error: null,
      });
    } catch (err) {
      setState({
        loading: false,
        result: null,
        error: handleApiError(err),
      });
    }
  };

  const generateSampleData = async () => {
    setSampleDataLoading(true);
    setSampleDataResult(null);

    try {
      const result = await dataApi.generateSampleData(STORE_ID, 20, 30);
      setSampleDataResult(result);
    } catch (err) {
      setSampleDataResult({ error: handleApiError(err) });
    } finally {
      setSampleDataLoading(false);
    }
  };

  const FileUploadCard: React.FC<{
    title: string;
    description: string;
    acceptedFormat: string;
    sampleFormat: string[];
    uploadState: UploadState;
    onFileSelect: (file: File) => void;
  }> = ({ title, description, acceptedFormat, sampleFormat, uploadState, onFileSelect }) => (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          {description}
        </Typography>

        <Box mb={2}>
          <Typography variant="subtitle2" gutterBottom>
            Expected CSV Format:
          </Typography>
          <Box component="code" sx={{ 
            display: 'block', 
            backgroundColor: 'grey.100', 
            p: 1, 
            borderRadius: 1,
            fontSize: '0.75rem',
            fontFamily: 'monospace'
          }}>
            {sampleFormat.join(',')}
          </Box>
        </Box>

        <input
          accept={acceptedFormat}
          style={{ display: 'none' }}
          id={`upload-${title.toLowerCase().replace(' ', '-')}`}
          type="file"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onFileSelect(file);
          }}
        />
        <label htmlFor={`upload-${title.toLowerCase().replace(' ', '-')}`}>
          <Button
            variant="contained"
            component="span"
            startIcon={<UploadIcon />}
            disabled={uploadState.loading}
            fullWidth
          >
            Choose File
          </Button>
        </label>

        {uploadState.loading && (
          <Box mt={2}>
            <LinearProgress />
            <Typography variant="body2" color="text.secondary" align="center" mt={1}>
              Processing file...
            </Typography>
          </Box>
        )}

        {uploadState.error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {uploadState.error}
          </Alert>
        )}

        {uploadState.result && (
          <Box mt={2}>
            <Alert severity="success">
              Upload completed successfully!
            </Alert>
            <Box mt={1}>
              <Typography variant="body2">
                <strong>Total rows:</strong> {uploadState.result.total_rows}
              </Typography>
              <Typography variant="body2">
                <strong>Successful:</strong> {uploadState.result.success_count}
              </Typography>
              <Typography variant="body2">
                <strong>Errors:</strong> {uploadState.result.error_count}
              </Typography>
            </Box>
            
            {uploadState.result.errors && uploadState.result.errors.length > 0 && (
              <Box mt={2}>
                <Typography variant="subtitle2" color="error">
                  Sample Errors:
                </Typography>
                <List dense>
                  {uploadState.result.errors.slice(0, 3).map((error, index) => (
                    <ListItem key={index}>
                      <ListItemIcon>
                        <ErrorIcon color="error" fontSize="small" />
                      </ListItemIcon>
                      <ListItemText
                        primary={`Row ${error.row}: ${error.error}`}
                        secondary={JSON.stringify(error.data)}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </Box>
        )}
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="lg">
      <Typography variant="h4" component="h1" gutterBottom>
        Data Upload
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        Upload your store data to enable AI-powered inventory analysis and recommendations.
      </Typography>

      {/* Sample Data Generation */}
      <Card sx={{ mb: 4, backgroundColor: 'primary.50' }}>
        <CardContent>
          <Box display="flex" alignItems="center" mb={2}>
            <SampleIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6">
              Generate Sample Data
            </Typography>
          </Box>
          <Typography variant="body2" paragraph>
            Don't have data files ready? Generate realistic sample data for testing and demonstration.
          </Typography>
          
          <Box display="flex" gap={2}>
            <Button
              variant="contained"
              color="primary"
              onClick={generateSampleData}
              disabled={sampleDataLoading}
              startIcon={sampleDataLoading ? undefined : <SampleIcon />}
            >
              {sampleDataLoading ? 'Generating...' : 'Generate Sample Data'}
            </Button>
            
            {sampleDataResult && !sampleDataResult.error && (
              <Button
                variant="outlined"
                color="primary"
                onClick={() => window.location.href = '/'}
              >
                Go to Dashboard
              </Button>
            )}
          </Box>

          {sampleDataLoading && (
            <Box mt={2}>
              <LinearProgress />
            </Box>
          )}

          {sampleDataResult && (
            <Box mt={2}>
              {sampleDataResult.error ? (
                <Alert severity="error">
                  {sampleDataResult.error}
                </Alert>
              ) : (
                <Alert severity="success">
                  Sample data generated successfully!
                  <Box mt={1}>
                    <Chip label={`${sampleDataResult.data_generated?.skus_created || 0} SKUs`} size="small" sx={{ mr: 1 }} />
                    <Chip label={`${sampleDataResult.data_generated?.inventory_items_created || 0} Inventory Items`} size="small" sx={{ mr: 1 }} />
                    <Chip label={`${sampleDataResult.data_generated?.transactions_created || 0} Transactions`} size="small" />
                  </Box>
                </Alert>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      <Divider sx={{ my: 4 }} />

      {/* File Upload Sections */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <FileUploadCard
            title="SKU Master Data"
            description="Upload product information including names, categories, pricing, and shelf life."
            acceptedFormat=".csv"
            sampleFormat={[
              'sku_id',
              'name',
              'category',
              'subcategory',
              'brand',
              'unit_cost',
              'selling_price',
              'shelf_life_days'
            ]}
            uploadState={skuUpload}
            onFileSelect={(file) => handleFileUpload(file, 'sku', setSkuUpload)}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FileUploadCard
            title="Inventory Data"
            description="Upload current stock levels, reorder points, and batch information."
            acceptedFormat=".csv"
            sampleFormat={[
              'sku_id',
              'current_stock',
              'reorder_point',
              'safety_stock',
              'batch_id',
              'expiry_date',
              'batch_quantity'
            ]}
            uploadState={inventoryUpload}
            onFileSelect={(file) => handleFileUpload(file, 'inventory', setInventoryUpload)}
          />
        </Grid>

        <Grid item xs={12} md={4}>
          <FileUploadCard
            title="Sales Transactions"
            description="Upload historical sales data for demand prediction and analysis."
            acceptedFormat=".csv"
            sampleFormat={[
              'transaction_id',
              'sku_id',
              'quantity',
              'unit_price',
              'timestamp',
              'customer_id'
            ]}
            uploadState={salesUpload}
            onFileSelect={(file) => handleFileUpload(file, 'sales', setSalesUpload)}
          />
        </Grid>
      </Grid>

      {/* Upload Instructions */}
      <Box mt={4}>
        <Typography variant="h6" gutterBottom>
          Upload Instructions
        </Typography>
        <List>
          <ListItem>
            <ListItemIcon>
              <FileIcon />
            </ListItemIcon>
            <ListItemText
              primary="File Format"
              secondary="All files must be in CSV format with headers in the first row"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <SuccessIcon />
            </ListItemIcon>
            <ListItemText
              primary="Data Quality"
              secondary="Ensure data is clean and follows the expected format for best results"
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <ErrorIcon />
            </ListItemIcon>
            <ListItemText
              primary="Error Handling"
              secondary="Invalid rows will be skipped and reported. Valid data will still be processed"
            />
          </ListItem>
        </List>
      </Box>
    </Container>
  );
};

export default DataUpload;