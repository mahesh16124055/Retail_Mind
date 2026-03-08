import React, { useState, useEffect } from 'react';
import {
    Drawer, Box, Typography, List, ListItem, ListItemText, ListItemIcon,
    IconButton, Badge, Chip, Divider, Button, Alert
} from '@mui/material';
import { 
    Notifications, Close, Warning, Error as ErrorIcon, 
    Info, CheckCircle, NotificationsActive 
} from '@mui/icons-material';

interface AlertData {
    alertId: string;
    storeId: string;
    skuId: string;
    skuName: string;
    alertType: string;
    severity: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
    actionRequired: string;
}

interface AlertsPanelProps {
    storeId: string;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({ storeId }) => {
    const [open, setOpen] = useState(false);
    const [alerts, setAlerts] = useState<AlertData[]>([]);

    useEffect(() => {
        if (storeId) fetchAlerts();
        const interval = setInterval(fetchAlerts, 30000); // Refresh every 30s
        return () => clearInterval(interval);
    }, [storeId]);

    const fetchAlerts = async () => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
            const response = await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/alerts/${storeId}`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            setAlerts(data);
        } catch (err) {
            console.error('Failed to fetch alerts', err);
        }
    };

    const handleAcknowledge = async (alertId: string) => {
        try {
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
            await fetch(
                `${import.meta.env.VITE_API_BASE_URL}/alerts/${alertId}/acknowledge`,
                { 
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                }
            );
            setAlerts(alerts.map(a => a.alertId === alertId ? { ...a, acknowledged: true } : a));
        } catch (err) {
            console.error('Failed to acknowledge alert', err);
        }
    };

    const unacknowledgedCount = alerts.filter(a => !a.acknowledged).length;
    const criticalCount = alerts.filter(a => a.severity === 'CRITICAL' && !a.acknowledged).length;

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return <ErrorIcon sx={{ color: '#d32f2f' }} />;
            case 'HIGH': return <Warning sx={{ color: '#f57c00' }} />;
            case 'MEDIUM': return <Info sx={{ color: '#0288d1' }} />;
            default: return <CheckCircle sx={{ color: '#388e3c' }} />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'CRITICAL': return 'error';
            case 'HIGH': return 'warning';
            case 'MEDIUM': return 'info';
            default: return 'success';
        }
    };

    return (
        <>
            <IconButton 
                onClick={() => setOpen(true)}
                sx={{ color: 'white' }}
            >
                <Badge badgeContent={unacknowledgedCount} color="error">
                    {criticalCount > 0 ? <NotificationsActive /> : <Notifications />}
                </Badge>
            </IconButton>

            <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
                <Box sx={{ width: 400, p: 3 }}>
                    <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6" fontWeight="bold">
                            🔔 Active Alerts
                        </Typography>
                        <IconButton onClick={() => setOpen(false)} size="small">
                            <Close />
                        </IconButton>
                    </Box>

                    {unacknowledgedCount > 0 && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            {unacknowledgedCount} alert{unacknowledgedCount > 1 ? 's' : ''} need attention
                        </Alert>
                    )}

                    <Divider sx={{ mb: 2 }} />

                    {alerts.length === 0 ? (
                        <Box textAlign="center" py={4}>
                            <CheckCircle sx={{ fontSize: 60, color: '#4caf50', mb: 2 }} />
                            <Typography color="text.secondary">No active alerts</Typography>
                        </Box>
                    ) : (
                        <List>
                            {alerts.map((alert) => (
                                <React.Fragment key={alert.alertId}>
                                    <ListItem
                                        sx={{
                                            bgcolor: alert.acknowledged ? '#f5f5f5' : '#fff',
                                            borderRadius: 1,
                                            mb: 1,
                                            border: '1px solid #e0e0e0',
                                            opacity: alert.acknowledged ? 0.6 : 1
                                        }}
                                    >
                                        <ListItemIcon>
                                            {getSeverityIcon(alert.severity)}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="subtitle2" fontWeight="bold">
                                                        {alert.skuName}
                                                    </Typography>
                                                    <Chip 
                                                        label={alert.severity}
                                                        size="small"
                                                        color={getSeverityColor(alert.severity) as any}
                                                    />
                                                </Box>
                                            }
                                            secondary={
                                                <Box mt={1}>
                                                    <Typography variant="body2" color="text.primary">
                                                        {alert.message}
                                                    </Typography>
                                                    <Typography variant="caption" color="primary" display="block" mt={0.5}>
                                                        ⚡ {alert.actionRequired}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                                        {new Date(alert.timestamp).toLocaleString()}
                                                    </Typography>
                                                    {!alert.acknowledged && (
                                                        <Button 
                                                            size="small" 
                                                            onClick={() => handleAcknowledge(alert.alertId)}
                                                            sx={{ mt: 1 }}
                                                        >
                                                            Acknowledge
                                                        </Button>
                                                    )}
                                                </Box>
                                            }
                                        />
                                    </ListItem>
                                </React.Fragment>
                            ))}
                        </List>
                    )}
                </Box>
            </Drawer>
        </>
    );
};

export default AlertsPanel;
