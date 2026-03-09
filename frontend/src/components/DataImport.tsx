import React, { useState } from 'react';
import { 
    Dialog, DialogTitle, DialogContent, DialogActions, 
    Button, Box, Typography, Alert, LinearProgress 
} from '@mui/material';
import { CloudUpload, Description } from '@mui/icons-material';

interface DataImportProps {
    open: boolean;
    onClose: () => void;
    onImportSuccess: () => void;
}

const DataImport: React.FC<DataImportProps> = ({ open, onClose, onImportSuccess }) => {
    const [file, setFile] = useState<File | null>(null);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            if (selectedFile.type === 'text/csv' || selectedFile.name.endsWith('.csv')) {
                setFile(selectedFile);
                setError(null);
            } else {
                setError('Please select a CSV file');
                setFile(null);
            }
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setUploading(true);
        setError(null);

        try {
            // Parse CSV and send to backend
            const text = await file.text();
            const lines = text.split('\n');
            
            // Simple CSV parsing (assumes header row)
            const headers = lines[0].split(',').map(h => h.trim());
            const data = lines.slice(1)
                .filter(line => line.trim())
                .map(line => {
                    const values = line.split(',').map(v => v.trim());
                    const obj: any = {};
                    headers.forEach((header, index) => {
                        obj[header] = values[index];
                    });
                    return obj;
                });

            // Send to backend API endpoint for bulk import
            const response = await fetch('/api/v1/data/import', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    records: data,
                    strategy: {
                        type: 'APPEND',
                        createBackup: true,
                        backupRetentionDays: 7
                    },
                    storeId: localStorage.getItem('storeId') || 'STORE-001'
                })
            });

            if (!response.ok) {
                throw new Error(`Import failed: ${response.statusText}`);
            }

            const result = await response.json();
            
            if (!result.successful) {
                throw new Error(result.errors?.join(', ') || 'Import failed');
            }

            console.log('Import successful:', result);
            onImportSuccess();
            onClose();
        } catch (err: any) {
            setError(`Upload failed: ${err.message}`);
        } finally {
            setUploading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center">
                    <CloudUpload sx={{ mr: 1, color: '#667eea' }} />
                    Import Inventory Data
                </Box>
            </DialogTitle>
            <DialogContent>
                <Alert severity="info" sx={{ mb: 3 }}>
                    Upload a CSV file with your inventory data. Expected columns: SKU Name, Category, Quantity, Price, Cost
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
                    onClick={() => document.getElementById('file-input')?.click()}
                >
                    <input
                        id="file-input"
                        type="file"
                        accept=".csv"
                        style={{ display: 'none' }}
                        onChange={handleFileSelect}
                    />
                    
                    {file ? (
                        <Box>
                            <Description sx={{ fontSize: 60, color: '#667eea', mb: 1 }} />
                            <Typography variant="h6">{file.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                {(file.size / 1024).toFixed(2)} KB
                            </Typography>
                        </Box>
                    ) : (
                        <Box>
                            <CloudUpload sx={{ fontSize: 60, color: '#ccc', mb: 1 }} />
                            <Typography variant="h6" color="text.secondary">
                                Click to select CSV file
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                or drag and drop here
                            </Typography>
                        </Box>
                    )}
                </Box>

                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
                {uploading && <LinearProgress sx={{ mt: 2 }} />}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={uploading}>
                    Cancel
                </Button>
                <Button 
                    onClick={handleUpload} 
                    variant="contained" 
                    disabled={!file || uploading}
                    startIcon={<CloudUpload />}
                >
                    {uploading ? 'Uploading...' : 'Upload & Import'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DataImport;
