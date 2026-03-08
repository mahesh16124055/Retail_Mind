import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, Box, Typography, Alert, Stepper, Step, StepLabel,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, Chip, LinearProgress, Tooltip
} from '@mui/material';
import { CloudUpload, Download, CheckCircle } from '@mui/icons-material';

interface BulkDataImportProps {
    open: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
    storeId: string;
}

const SAMPLE_DATA = [
    { skuName: 'Parle-G 100g', category: 'Snacks', quantity: 50, price: 10, cost: 7 },
    { skuName: 'Amul Butter 500g', category: 'Dairy', quantity: 30, price: 250, cost: 200 },
    { skuName: 'Maggi Masala 2-Min', category: 'Snacks', quantity: 100, price: 12, cost: 8 },
    { skuName: 'Aashirvaad Atta 5kg', category: 'Staples', quantity: 25, price: 300, cost: 250 },
    { skuName: 'Tata Salt 1kg', category: 'Staples', quantity: 40, price: 20, cost: 15 },
];

const BulkDataImport: React.FC<BulkDataImportProps> = ({ open, onClose, onImportSuccess, storeId }) => {
    const [activeStep, setActiveStep] = useState(0);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any[]>([]);
    const [uploading, setUploading] = useState(false);
    const [validationErrors, setValidationErrors] = useState<string[]>([]);

    const steps = ['Upload File', 'Validate Data', 'Import to Database'];

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            setFile(selectedFile);
            parseFile(selectedFile);
        }
    };

    const parseFile = async (file: File) => {
        try {
            const text = await file.text();
            const lines = text.split('\n').filter(line => line.trim());
            
            if (lines.length < 2) {
                setValidationErrors(['File must contain header row and at least one data row']);
                return;
            }

            const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
            const requiredHeaders = ['skuname', 'category', 'quantity', 'price', 'cost'];
            const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
            
            if (missingHeaders.length > 0) {
                setValidationErrors([`Missing required columns: ${missingHeaders.join(', ')}`]);
                return;
            }

            const data = lines.slice(1).map((line, index) => {
                const values = line.split(',').map(v => v.trim());
                const row: any = { rowNumber: index + 2 };
                headers.forEach((header, i) => {
                    row[header] = values[i];
                });
                return row;
            });

            // Validate data
            const errors: string[] = [];
            data.forEach(row => {
                if (!row.skuname) errors.push(`Row ${row.rowNumber}: SKU name is required`);
                if (!row.quantity || isNaN(Number(row.quantity))) errors.push(`Row ${row.rowNumber}: Invalid quantity`);
                if (!row.price || isNaN(Number(row.price))) errors.push(`Row ${row.rowNumber}: Invalid price`);
            });

            setValidationErrors(errors);
            setParsedData(data);
            
            if (errors.length === 0) {
                setActiveStep(1);
            }
        } catch (err: any) {
            setValidationErrors([`Failed to parse file: ${err.message}`]);
        }
    };

    const handleImport = async () => {
        setUploading(true);
        try {
            // TODO: Send to backend bulk import endpoint
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            setActiveStep(2);
            setTimeout(() => {
                onImportSuccess();
                handleClose();
            }, 1500);
        } catch (err: any) {
            setValidationErrors([`Import failed: ${err.message}`]);
        } finally {
            setUploading(false);
        }
    };

    const handleClose = () => {
        setActiveStep(0);
        setFile(null);
        setParsedData([]);
        setValidationErrors([]);
        onClose();
    };

    const downloadTemplate = () => {
        const csv = [
            'skuName,category,quantity,price,cost',
            ...SAMPLE_DATA.map(row => `${row.skuName},${row.category},${row.quantity},${row.price},${row.cost}`)
        ].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `retailmind_template_store_${storeId}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    <Box display="flex" alignItems="center">
                        <CloudUpload sx={{ mr: 1, color: '#667eea' }} />
                        Bulk Data Import
                    </Box>
                    <Tooltip title="Download CSV template with sample data">
                        <Button
                            size="small"
                            startIcon={<Download />}
                            onClick={downloadTemplate}
                        >
                            Download Template
                        </Button>
                    </Tooltip>
                </Box>
            </DialogTitle>
            <DialogContent>
                <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                {activeStep === 0 && (
                    <Box>
                        <Alert severity="info" sx={{ mb: 3 }}>
                            <Typography variant="body2" gutterBottom>
                                <strong>Required CSV columns:</strong> skuName, category, quantity, price, cost
                            </Typography>
                            <Typography variant="body2">
                                Click "Download Template" above to get a sample CSV file with example data.
                            </Typography>
                        </Alert>

                        <Box
                            sx={{
                                border: '2px dashed #667eea',
                                borderRadius: 2,
                                p: 4,
                                textAlign: 'center',
                                bgcolor: '#f5f7fa',
                                cursor: 'pointer',
                                '&:hover': { bgcolor: '#e8eaf6' }
                            }}
                            onClick={() => document.getElementById('bulk-file-input')?.click()}
                        >
                            <input
                                id="bulk-file-input"
                                type="file"
                                accept=".csv"
                                style={{ display: 'none' }}
                                onChange={handleFileSelect}
                            />
                            
                            <CloudUpload sx={{ fontSize: 60, color: file ? '#667eea' : '#ccc', mb: 1 }} />
                            <Typography variant="h6" color={file ? 'primary' : 'text.secondary'}>
                                {file ? file.name : 'Click to select CSV file'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {file ? `${(file.size / 1024).toFixed(2)} KB` : 'Maximum 5MB'}
                            </Typography>
                        </Box>

                        {validationErrors.length > 0 && (
                            <Alert severity="error" sx={{ mt: 2 }}>
                                <Typography variant="subtitle2" gutterBottom>Validation Errors:</Typography>
                                {validationErrors.map((err, i) => (
                                    <Typography key={i} variant="body2">• {err}</Typography>
                                ))}
                            </Alert>
                        )}
                    </Box>
                )}

                {activeStep === 1 && (
                    <Box>
                        <Alert severity="success" sx={{ mb: 2 }} icon={<CheckCircle />}>
                            <strong>{parsedData.length} rows</strong> validated successfully! Ready to import.
                        </Alert>

                        <TableContainer component={Paper} sx={{ maxHeight: 400 }}>
                            <Table stickyHeader size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell><strong>SKU Name</strong></TableCell>
                                        <TableCell><strong>Category</strong></TableCell>
                                        <TableCell align="right"><strong>Quantity</strong></TableCell>
                                        <TableCell align="right"><strong>Price</strong></TableCell>
                                        <TableCell align="right"><strong>Cost</strong></TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {parsedData.slice(0, 10).map((row, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{row.skuname}</TableCell>
                                            <TableCell>
                                                <Chip label={row.category} size="small" />
                                            </TableCell>
                                            <TableCell align="right">{row.quantity}</TableCell>
                                            <TableCell align="right">₹{row.price}</TableCell>
                                            <TableCell align="right">₹{row.cost}</TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                        
                        {parsedData.length > 10 && (
                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                Showing first 10 of {parsedData.length} rows
                            </Typography>
                        )}

                        {uploading && <LinearProgress sx={{ mt: 2 }} />}
                    </Box>
                )}

                {activeStep === 2 && (
                    <Box sx={{ textAlign: 'center', py: 4 }}>
                        <CheckCircle sx={{ fontSize: 80, color: '#4caf50', mb: 2 }} />
                        <Typography variant="h5" gutterBottom>Import Successful!</Typography>
                        <Typography color="text.secondary">
                            {parsedData.length} SKUs have been imported to Store {storeId}
                        </Typography>
                    </Box>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={handleClose}>
                    {activeStep === 2 ? 'Close' : 'Cancel'}
                </Button>
                {activeStep === 1 && (
                    <Button onClick={handleImport} variant="contained" disabled={uploading}>
                        {uploading ? 'Importing...' : `Import ${parsedData.length} Items`}
                    </Button>
                )}
            </DialogActions>
        </Dialog>
    );
};

export default BulkDataImport;
