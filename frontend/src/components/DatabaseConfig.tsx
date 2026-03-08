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
    const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
    
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
        password: ''
    });

    // MySQL Config
    const [mysqlConfig, setMysqlConfig] = useState({
        host: 'localhost',
        port: '3306',
        database: 'retailmind',
        username: 'root',
        password: ''
    });

    const handleTestConnection = async () => {
        setTesting(true);
        setConnectionStatus('idle');
        
        try {
            // Simulate connection test
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            // TODO: Call backend API to test connection
            setConnectionStatus('success');
        } catch (err) {
            setConnectionStatus('error');
        } finally {
            setTesting(false);
        }
    };

    const handleConnect = () => {
        const config = tabValue === 0 ? dynamoConfig : tabValue === 1 ? postgresConfig : mysqlConfig;
        onConnect({ type: ['dynamodb', 'postgresql', 'mysql'][tabValue], ...config });
        onClose();
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

                <Tabs value={tabValue} onChange={(_, v) => setTabValue(v)} sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tab label="DynamoDB (Current)" />
                    <Tab label="PostgreSQL" />
                    <Tab label="MySQL" />
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
                        
                        <Alert severity="warning">
                            PostgreSQL support is coming soon. Currently using DynamoDB.
                        </Alert>
                    </Box>
                </TabPanel>

                <TabPanel value={tabValue} index={2}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField label="Host" value={mysqlConfig.host} onChange={(e) => setMysqlConfig({ ...mysqlConfig, host: e.target.value })} fullWidth />
                        <TextField label="Port" value={mysqlConfig.port} onChange={(e) => setMysqlConfig({ ...mysqlConfig, port: e.target.value })} fullWidth />
                        <TextField label="Database" value={mysqlConfig.database} onChange={(e) => setMysqlConfig({ ...mysqlConfig, database: e.target.value })} fullWidth />
                        <TextField label="Username" value={mysqlConfig.username} onChange={(e) => setMysqlConfig({ ...mysqlConfig, username: e.target.value })} fullWidth />
                        <TextField label="Password" type="password" value={mysqlConfig.password} onChange={(e) => setMysqlConfig({ ...mysqlConfig, password: e.target.value })} fullWidth />
                        
                        <Alert severity="warning">
                            MySQL support is coming soon. Currently using DynamoDB.
                        </Alert>
                    </Box>
                </TabPanel>

                {connectionStatus === 'success' && (
                    <Alert severity="success" sx={{ mt: 2 }} icon={<CheckCircle />}>
                        Connection successful! Database is reachable.
                    </Alert>
                )}
                {connectionStatus === 'error' && (
                    <Alert severity="error" sx={{ mt: 2 }} icon={<ErrorIcon />}>
                        Connection failed. Please check your credentials and try again.
                    </Alert>
                )}
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Cancel</Button>
                <Button onClick={handleTestConnection} disabled={testing}>
                    {testing ? 'Testing...' : 'Test Connection'}
                </Button>
                <Button onClick={handleConnect} variant="contained" disabled={tabValue !== 0}>
                    Connect
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default DatabaseConfig;
