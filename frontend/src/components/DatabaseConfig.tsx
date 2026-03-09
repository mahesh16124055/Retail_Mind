import React, { useState } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    Button, TextField, Box, Typography, Alert, Tabs, Tab,
    FormControl, InputLabel, Select, MenuItem, Chip
} from '@mui/material';
import { Storage, CheckCircle, Error as ErrorIcon } from '@mui/icons-material';

interface DatabaseConfigProps {
    open: boolean;
    onClose: () => void;
    onConnect: (config: any) => void;
}

interface TabPanelProps {
    children?: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index }) => (
    <div hidden={value !== index}>
        {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
);

const DatabaseConfig: React.FC<DatabaseConfigProps> = ({ open, onClose, onConnect }) => {
    const [tabValue, setTabValue] = useState(0);
    const [testing, setTesting] = useState(false);
    const [saving, setSaving] = useState(false);
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [errorMessage, setErrorMessage] = useState<string>('');
    const [dataMode, setDataMode] = useState<'MOCK' | 'PRODUCTION'>('MOCK');
    
    // DynamoDB Config
    const [dynamoConfig, setDynamoConfig] = useState({
        region: 'us-east-1',
        accessKeyId: '',
        secretAccessKey: '',
        tablePrefix: 'RetailMind_'
    });

    // PostgreSQL Config
    const [postgresConfig, setPostgresConfig] = useState({
        host: 'localhost',
        port: '5432',
        database: 'retailmind',
        username: 'postgres',
        password: '',
        poolSize: '10'
    });

    // MySQL Config
    const [mysqlConfig, setMysqlConfig] = useState({
        host: 'localhost',
        port: '3306',
        database: 'retailmind',
        username: 'root',
        password: '',
        poolSize: '10'
    });

    // MongoDB Config
    const [mongoConfig, setMongoConfig] = useState({
        host: 'localhost',
        port: '27017',
        database: 'retailmind',
        username: 'admin',
        password: '',
        poolSize: '10'
    });

    const handleModeChange = async (mode: 'MOCK' | 'PRODUCTION') => {
        try {
            await fetch(`http://localhost:8080/api/v1/database/mode?mode=${mode}`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });
            setDataMode(mode);
        } catch (err) {
            console.error('Failed to switch mode:', err);
        }
    };

    const handleTestConnection = async () => {
        setTesting(true);
        setConnectionStatus('idle');
        setErrorMessage('');
        
        try {
            const config = getCurrentConfig();
            const response = await fetch('http://localhost:8080/api/v1/database/validate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(config)
            });
            
            const result = await response.json();
            
            if (result.connected) {
                setConnectionStatus('success');
            } else {
                setConnectionStatus('error');
                setErrorMessage(result.errorMessage || 'Connection failed. Please check your credentials.');
            }
        } catch (err) {
            setConnectionStatus('error');
            setErrorMessage('Unable to connect to server. Please try again.');
        } finally {
            setTesting(false);
        }
    };

    const handleConnect = async () => {
        // Validate connection before saving
        if (connectionStatus !== 'success') {
            setErrorMessage('Please test the connection first before saving.');
            return;
        }
        
        setSaving(true);
        try {
            const config = getCurrentConfig();
            const response = await fetch('http://localhost:8080/api/v1/database/config', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify(config)
            });
            
            const result = await response.json();
            
            if (result.connected) {
                onConnect(config);
                onClose();
            } else {
                setErrorMessage(result.message || 'Failed to save configuration.');
            }
        } catch (err) {
            setErrorMessage('Unable to save configuration. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    const getCurrentConfig = () => {
        const configs = [
            { type: 'dynamodb', ...dynamoConfig },
            { type: 'postgresql', ...postgresConfig },
            { type: 'mysql', ...mysqlConfig },
            { type: 'mongodb', ...mongoConfig }
        ];
        return configs[tabValue];
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center">
                    <Storage sx={{ mr: 1, color: '#667eea' }} />
                    Database Connection Settings
                </Box>
            </DialogTitle>
            <DialogContent>
                <Alert severity="info" sx={{ mb: 2 }}>
                    Configure your database connection. Currently using AWS DynamoDB in us-east-1.
                </Alert>

                <Box sx={{ mb: 3, p: 2, border: '1px solid #e0e0e0', borderRadius: 1 }}>
                    <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                        Data Mode
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button
                            variant={dataMode === 'MOCK' ? 'contained' : 'outlined'}
                            onClick={() => handleModeChange('MOCK')}
                            sx={{ flex: 1 }}
                        >
                            Mock Data Mode
                        </Button>
                        <Button
                            variant={dataMode === 'PRODUCTION' ? 'contained' : 'outlined'}
                            onClick={() => handleModeChange('PRODUCTION')}
                            sx={{ flex: 1 }}
                        >
                            Production Data Mode
                        </Button>
                    </Box>
                    <Typography variant="caption" sx={{ mt: 1, display: 'block', color: 'text.secondary' }}>
                        {dataMode === 'MOCK' 
                            ? 'Using generated sample data for testing without real database connections.'
                            : 'Querying configured database with live production data.'}
                    </Typography>
                </Box>

                <Tabs value={tabValue} onChange={(_, v) => { setTabValue(v); setConnectionStatus('idle'); setErrorMessage(''); }} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="DynamoDB (Current)" />
                    <Tab label="PostgreSQL" />
                    <Tab label="MySQL" />
                    <Tab label="MongoDB" />
                </Tabs>

                <TabPanel value={tabValue} index={0}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel>AWS Region</InputLabel>
                            <Select
                                value={dynamoConfig.region}
                                label="AWS Region"
                                onChange={(e) => setDynamoConfig({ ...dynamoConfig, region: e.target.value })}
                            >
                                <MenuItem value="us-east-1">US East (N. Virginia)</MenuItem>
                                <MenuItem value="us-west-2">US West (Oregon)</MenuItem>
                                <MenuItem value="ap-south-1">Asia Pacific (Mumbai)</MenuItem>
                                <MenuItem value="eu-west-1">Europe (Ireland)</MenuItem>
                            </Select>
                        </FormControl>
                        
                        <TextField
                            label="Table Prefix"
                            value={dynamoConfig.tablePrefix}
                            onChange={(e) => setDynamoConfig({ ...dynamoConfig, tablePrefix: e.target.value })}
                            helperText="Prefix for all DynamoDB tables (e.g., RetailMind_)"
                            fullWidth
                        />

                        <Alert severity="success" icon={<CheckCircle />}>
                            <Typography variant="body2">
                                <strong>Current Connection:</strong> DynamoDB in {dynamoConfig.region}
                            </Typography>
                            <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                <Chip label="RetailMind_Store" size="small" />
                                <Chip label="RetailMind_Sku" size="small" />
                                <Chip label="RetailMind_Inventory" size="small" />
                                <Chip label="RetailMind_User" size="small" />
                                <Chip label="+3 more" size="small" />
                            </Box>
                        </Alert>
                    </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={1}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Host" value={postgresConfig.host} onChange={(e) => setPostgresConfig({ ...postgresConfig, host: e.target.value })} fullWidth />
                        <TextField label="Port" value={postgresConfig.port} onChange={(e) => setPostgresConfig({ ...postgresConfig, port: e.target.value })} fullWidth />
                        <TextField label="Database" value={postgresConfig.database} onChange={(e) => setPostgresConfig({ ...postgresConfig, database: e.target.value })} fullWidth />
                        <TextField label="Username" value={postgresConfig.username} onChange={(e) => setPostgresConfig({ ...postgresConfig, username: e.target.value })} fullWidth />
                        <TextField label="Password" type="password" value={postgresConfig.password} onChange={(e) => setPostgresConfig({ ...postgresConfig, password: e.target.value })} fullWidth />
                        <TextField label="Pool Size" type="number" value={postgresConfig.poolSize} onChange={(e) => setPostgresConfig({ ...postgresConfig, poolSize: e.target.value })} helperText="Connection pool size (5-50)" fullWidth />
                    </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Host" value={mysqlConfig.host} onChange={(e) => setMysqlConfig({ ...mysqlConfig, host: e.target.value })} fullWidth />
                        <TextField label="Port" value={mysqlConfig.port} onChange={(e) => setMysqlConfig({ ...mysqlConfig, port: e.target.value })} fullWidth />
                        <TextField label="Database" value={mysqlConfig.database} onChange={(e) => setMysqlConfig({ ...mysqlConfig, database: e.target.value })} fullWidth />
                        <TextField label="Username" value={mysqlConfig.username} onChange={(e) => setMysqlConfig({ ...mysqlConfig, username: e.target.value })} fullWidth />
                        <TextField label="Password" type="password" value={mysqlConfig.password} onChange={(e) => setMysqlConfig({ ...mysqlConfig, password: e.target.value })} fullWidth />
                        <TextField label="Pool Size" type="number" value={mysqlConfig.poolSize} onChange={(e) => setMysqlConfig({ ...mysqlConfig, poolSize: e.target.value })} helperText="Connection pool size (5-50)" fullWidth />
                    </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={3}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Host" value={mongoConfig.host} onChange={(e) => setMongoConfig({ ...mongoConfig, host: e.target.value })} fullWidth />
                        <TextField label="Port" value={mongoConfig.port} onChange={(e) => setMongoConfig({ ...mongoConfig, port: e.target.value })} fullWidth />
                        <TextField label="Database" value={mongoConfig.database} onChange={(e) => setMongoConfig({ ...mongoConfig, database: e.target.value })} fullWidth />
                        <TextField label="Username" value={mongoConfig.username} onChange={(e) => setMongoConfig({ ...mongoConfig, username: e.target.value })} fullWidth />
                        <TextField label="Password" type="password" value={mongoConfig.password} onChange={(e) => setMongoConfig({ ...mongoConfig, password: e.target.value })} fullWidth />
                        <TextField label="Pool Size" type="number" value={mongoConfig.poolSize} onChange={(e) => setMongoConfig({ ...mongoConfig, poolSize: e.target.value })} helperText="Connection pool size (5-50)" fullWidth />
                    </Box>
                </TabPanel>

                {connectionStatus === 'success' && (
                    <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircle />}>
                        Connection successful! Database is reachable.
                    </Alert>
                )}
                {connectionStatus === 'error' && (
                    <Alert severity="error" sx={{ mt: 2 }} icon={<ErrorIcon />}>
                        {errorMessage || 'Connection failed. Please check your credentials and try again.'}
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleTestConnection} disabled={testing || saving}>
                    {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button onClick={handleConnect} variant="contained" disabled={connectionStatus !== 'success' || saving}>
                    {saving ? 'Saving...' : 'Save & Connect'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DatabaseConfig;
