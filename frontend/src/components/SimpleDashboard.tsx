import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Button, Chip, CircularProgress, IconButton, Snackbar, Alert, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import { Warning, TrendingUp, Chat, Visibility, Refresh, Circle, ShoppingCart, WhatsApp, CheckCircle, Inventory2 } from '@mui/icons-material';
import { RetailMindApi } from '../services/api';
import type { InventoryInsightResponse } from '../services/api';
import { useTranslation } from '../hooks/useTranslation';

interface SimpleDashboardProps {
    storeId: string;
    storeName: string;
    onNavigateToAdvanced?: () => void;
    onOpenAIChat?: () => void;
}

const SimpleDashboard: React.FC<SimpleDashboardProps> = ({ storeId, storeName, onNavigateToAdvanced, onOpenAIChat }) => {
    const [insights, setInsights] = useState<InventoryInsightResponse[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showError, setShowError] = useState(false);
    const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
    const [isOnline, setIsOnline] = useState(true);
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [selectedItem, setSelectedItem] = useState<{ skuId: string; skuName: string } | null>(null);
    const { language, t } = useTranslation();

    useEffect(() => {
        fetchData();
    }, [storeId]);

    // Auto-refresh every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchData(true); // Silent refresh
        }, 30000);
        return () => clearInterval(interval);
    }, [storeId]);

    // Monitor online status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);
        
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    const fetchData = async (isRefresh = false) => {
        if (isRefresh) {
            setRefreshing(true);
        } else {
            setLoading(true);
        }
        setError(null);
        
        try {
            const data = await RetailMindApi.getInsights(storeId);
            setInsights(data);
            setLastUpdated(new Date());
        } catch (error: any) {
            console.error('Error fetching insights:', error);
            const errorMsg = language === 'hi' 
                ? 'डेटा लोड करने में त्रुटि। कृपया पुनः प्रयास करें।'
                : 'Error loading data. Please try again.';
            setError(errorMsg);
            setShowError(true);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        fetchData(true);
    };

    const handleReorder = (_skuId: string, skuName: string) => {
        // WhatsApp integration for supplier
        const supplierPhone = '919876543210'; // Demo supplier number
        const message = language === 'hi'
            ? `नमस्ते, मुझे ${skuName} का ऑर्डर देना है। कृपया उपलब्धता बताएं।`
            : `Hello, I need to order ${skuName}. Please confirm availability.`;
        
        const whatsappUrl = `https://wa.me/${supplierPhone}?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, '_blank');
    };

    const handleMarkAsOrdered = (_skuId: string, skuName: string) => {
        // Mark item as ordered (in real app, would update backend)
        const message = language === 'hi'
            ? `✅ ${skuName} को ऑर्डर के रूप में चिह्नित किया गया`
            : `✅ ${skuName} marked as ordered`;
        setError(null);
        setShowError(false);
        alert(message);
        setAnchorEl(null);
    };

    const handleOpenMenu = (event: React.MouseEvent<HTMLElement>, skuId: string, skuName: string) => {
        event.stopPropagation();
        setAnchorEl(event.currentTarget);
        setSelectedItem({ skuId, skuName });
    };

    const handleCloseMenu = () => {
        setAnchorEl(null);
        setSelectedItem(null);
    };

    const handleWhatsAppOrder = () => {
        if (selectedItem) {
            handleReorder(selectedItem.skuId, selectedItem.skuName);
        }
        handleCloseMenu();
    };

    const handleMarkOrdered = () => {
        if (selectedItem) {
            handleMarkAsOrdered(selectedItem.skuId, selectedItem.skuName);
        }
    };

    const getTimeAgo = (date: Date): string => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
        
        if (seconds < 60) {
            return language === 'hi' 
                ? `${seconds} सेकंड पहले`
                : `${seconds} ${t('prod.secondsAgo')}`;
        }
        
        const minutes = Math.floor(seconds / 60);
        return language === 'hi'
            ? `${minutes} मिनट पहले`
            : `${minutes} ${t('prod.minutesAgo')}`;
    };

    // Deduplicate insights by SKU ID (keep first occurrence)
    const deduplicatedInsights = insights.reduce((acc, current) => {
        const exists = acc.find(item => item.skuId === current.skuId);
        if (!exists) {
            acc.push(current);
        }
        return acc;
    }, [] as InventoryInsightResponse[]);

    const criticalInsights = deduplicatedInsights
        .filter(i => i.riskLevel === 'CRITICAL' || i.riskLevel === 'HIGH')
        .slice(0, 3);

    // Real business metrics (using deduplicated data)
    const LOW_STOCK_THRESHOLD = 20; // Items below this are considered low stock
    const stockValue = deduplicatedInsights.reduce((sum, i) => sum + (i.currentStock * 50), 0); // Estimated value
    const criticalCount = deduplicatedInsights.filter(i => i.riskLevel === 'CRITICAL').length;
    const lowStockCount = deduplicatedInsights.filter(i => i.currentStock < LOW_STOCK_THRESHOLD).length;
    const actionRequiredCount = criticalCount + lowStockCount;

    return (
        <Box sx={{ 
            p: { xs: 2, md: 3 }, 
            maxWidth: 1400, 
            margin: '0 auto',
            minHeight: '100vh',
            bgcolor: '#f5f5f5'
        }}>
            {/* Header with Language Toggle and Refresh */}
            <Box sx={{ 
                display: 'flex', 
                justifyContent: 'space-between', 
                alignItems: 'center', 
                mb: 3,
                flexWrap: 'wrap',
                gap: 2
            }}>
                <Box>
                    <Typography variant="h4" sx={{ 
                        fontWeight: 'bold', 
                        color: '#1976d2',
                        fontSize: { xs: '1.5rem', md: '2.125rem' }
                    }}>
                        {storeName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {language === 'hi' ? 'AI-संचालित इन्वेंटरी सहायक' : 'AI-Powered Inventory Assistant'}
                    </Typography>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Chip 
                        icon={<Circle sx={{ fontSize: 12 }} />} 
                        label={isOnline ? t('prod.online') : t('prod.offline')}
                        color={isOnline ? 'success' : 'error'}
                        size="small"
                        sx={{ fontWeight: 'bold' }}
                    />
                    <Typography variant="caption" color="text.secondary" sx={{ mx: 1 }}>
                        {t('prod.lastUpdated')}: {getTimeAgo(lastUpdated)}
                    </Typography>
                    <IconButton 
                        onClick={handleRefresh} 
                        disabled={refreshing}
                        sx={{ 
                            bgcolor: 'white',
                            '&:hover': { bgcolor: '#f5f5f5' }
                        }}
                    >
                        {refreshing ? <CircularProgress size={24} /> : <Refresh />}
                    </IconButton>
                </Box>
            </Box>

            {/* Loading State */}
            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
                    <Box sx={{ textAlign: 'center' }}>
                        <CircularProgress size={60} />
                        <Typography variant="h6" sx={{ mt: 2 }}>
                            {language === 'hi' 
                                ? `${storeName} का विश्लेषण हो रहा है...`
                                : `Analyzing ${storeName} inventory...`
                            }
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            {language === 'hi' 
                                ? 'AI इन्वेंटरी इंटेलिजेंस लोड हो रहा है'
                                : 'Loading AI inventory intelligence'
                            }
                        </Typography>
                    </Box>
                </Box>
            )}

            {/* 3 Hero Cards */}
            {!loading && (
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(3, 1fr)' }, gap: 3, mb: 3 }}>
                
                {/* Card 1: Critical Actions */}
                <Card sx={{ 
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: 'white',
                    minHeight: { xs: 250, md: 300 },
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { 
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                    }
                }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <Warning sx={{ fontSize: { xs: 32, md: 40 }, mr: 1 }} />
                            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', md: '1.25rem' } }}>
                                {language === 'hi' ? 'ज़रूरी कार्रवाई' : 'Critical Actions Needed'}
                            </Typography>
                        </Box>
                        
                        {criticalInsights.length === 0 ? (
                            <Box sx={{ 
                                display: 'flex', 
                                flexDirection: 'column', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                minHeight: 150,
                                textAlign: 'center'
                            }}>
                                {insights.length === 0 ? (
                                    <>
                                        <CircularProgress sx={{ color: 'white', mb: 2 }} size={40} />
                                        <Typography>{language === 'hi' ? 'डेटा लोड हो रहा है...' : 'Loading data...'}</Typography>
                                    </>
                                ) : (
                                    <>
                                        <Typography variant="h3" sx={{ mb: 1 }}>✓</Typography>
                                        <Typography>{language === 'hi' ? 'सब ठीक है! कोई ज़रूरी कार्रवाई नहीं।' : 'All good! No critical actions needed.'}</Typography>
                                    </>
                                )}
                            </Box>
                        ) : (
                            <Box sx={{ mt: 2, maxHeight: 220, overflowY: 'auto' }}>
                                {criticalInsights.map((insight, idx) => {
                                    const isLowStock = insight.currentStock < LOW_STOCK_THRESHOLD;
                                    return (
                                    <Box key={idx} sx={{ 
                                        mb: 2, 
                                        p: 2, 
                                        bgcolor: 'rgba(255,255,255,0.2)', 
                                        borderRadius: 2,
                                        transition: 'background-color 0.2s',
                                        '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                                        border: isLowStock ? '2px solid #ffeb3b' : 'none'
                                    }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                            <Typography variant="body1" sx={{ fontWeight: 'bold', fontSize: { xs: '0.875rem', md: '1rem' }, flex: 1 }}>
                                                {insight.skuName}
                                            </Typography>
                                            {isLowStock && (
                                                <Chip 
                                                    icon={<Inventory2 sx={{ fontSize: 14 }} />}
                                                    label={language === 'hi' ? 'कम स्टॉक' : 'Low Stock'}
                                                    size="small"
                                                    sx={{ 
                                                        bgcolor: '#ffeb3b', 
                                                        color: '#000',
                                                        fontSize: '0.65rem',
                                                        height: 20,
                                                        ml: 1
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Typography variant="body2" sx={{ mt: 0.5, fontSize: { xs: '0.75rem', md: '0.875rem' }, mb: 1 }}>
                                            {insight.aiRecommendation}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap', alignItems: 'center' }}>
                                            <Chip 
                                                label={insight.riskLevel}
                                                size="small"
                                                sx={{ bgcolor: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}
                                            />
                                            <Chip 
                                                icon={<Inventory2 sx={{ fontSize: 14 }} />}
                                                label={`${insight.currentStock} ${language === 'hi' ? 'यूनिट' : 'units'}`}
                                                size="small"
                                                sx={{ bgcolor: 'rgba(255,255,255,0.3)', fontSize: '0.7rem' }}
                                            />
                                            <Button
                                                size="small"
                                                variant="contained"
                                                startIcon={<ShoppingCart sx={{ fontSize: 14 }} />}
                                                onClick={(e) => handleOpenMenu(e, insight.skuId, insight.skuName)}
                                                sx={{
                                                    bgcolor: 'rgba(255,255,255,0.9)',
                                                    color: '#667eea',
                                                    fontSize: '0.7rem',
                                                    py: 0.5,
                                                    px: 1,
                                                    '&:hover': { bgcolor: 'white' }
                                                }}
                                            >
                                                {language === 'hi' ? 'ऑर्डर करें' : 'Order'}
                                            </Button>
                                        </Box>
                                    </Box>
                                    );
                                })}
                            </Box>
                        )}
                    </CardContent>
                </Card>

                {/* Card 2: Ask AI */}
                <Card sx={{ 
                    background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                    color: 'white',
                    minHeight: { xs: 250, md: 300 },
                    cursor: 'pointer',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': { 
                        transform: 'scale(1.05)',
                        boxShadow: '0 12px 32px rgba(245,87,108,0.3)'
                    }
                }} onClick={() => {
                    // Open AI Chat Assistant
                    if (onOpenAIChat) {
                        onOpenAIChat();
                    }
                }}>
                    <CardContent sx={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        alignItems: 'center', 
                        justifyContent: 'center', 
                        height: '100%',
                        p: { xs: 2, md: 3 }
                    }}>
                        <Chat sx={{ fontSize: { xs: 60, md: 80 }, mb: 2, animation: 'pulse 2s infinite' }} />
                        <Typography variant="h5" sx={{ 
                            fontWeight: 'bold', 
                            textAlign: 'center', 
                            mb: 2,
                            fontSize: { xs: '1.25rem', md: '1.5rem' }
                        }}>
                            {language === 'hi' ? 'AI से पूछें' : 'Ask AI Anything'}
                        </Typography>
                        <Typography variant="body1" sx={{ 
                            textAlign: 'center', 
                            opacity: 0.9,
                            fontSize: { xs: '0.875rem', md: '1rem' },
                            fontStyle: 'italic'
                        }}>
                            {language === 'hi' 
                                ? '"मैगी कितना ऑर्डर करूं?"'
                                : '"How much Maggi should I order?"'
                            }
                        </Typography>
                        <Typography variant="body2" sx={{ 
                            textAlign: 'center', 
                            mt: 1, 
                            opacity: 0.8,
                            fontSize: { xs: '0.75rem', md: '0.875rem' }
                        }}>
                            {language === 'hi' 
                                ? 'हिंदी या अंग्रेजी में पूछें'
                                : 'Ask in Hindi or English'
                            }
                        </Typography>
                        <Button 
                            variant="contained" 
                            sx={{ 
                                mt: 2, 
                                bgcolor: 'rgba(255,255,255,0.2)',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' }
                            }}
                        >
                            {language === 'hi' ? 'अभी पूछें' : 'Ask Now'}
                        </Button>
                    </CardContent>
                </Card>

                {/* Card 3: Today's Summary */}
                <Card sx={{ 
                    background: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                    color: 'white',
                    minHeight: { xs: 250, md: 300 },
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': { 
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                    }
                }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                            <TrendingUp sx={{ fontSize: { xs: 32, md: 40 }, mr: 1 }} />
                            <Typography variant="h6" sx={{ fontWeight: 'bold', fontSize: { xs: '1rem', md: '1.25rem' } }}>
                                {language === 'hi' ? 'आज का सारांश' : "Today's Summary"}
                            </Typography>
                        </Box>
                        
                        <Box sx={{ mt: 3 }}>
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h3" sx={{ 
                                    fontWeight: 'bold',
                                    fontSize: { xs: '2rem', md: '3rem' }
                                }}>
                                    ₹{stockValue.toLocaleString('en-IN')}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                    {language === 'hi' ? 'स्टॉक मूल्य' : 'Stock Value'}
                                </Typography>
                            </Box>
                            
                            <Box sx={{ mb: 3 }}>
                                <Typography variant="h3" sx={{ 
                                    fontWeight: 'bold',
                                    fontSize: { xs: '2rem', md: '3rem' },
                                    color: actionRequiredCount > 0 ? '#ffeb3b' : 'white'
                                }}>
                                    {actionRequiredCount}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                    {language === 'hi' ? 'कार्रवाई चाहिए' : 'Action Required'}
                                </Typography>
                            </Box>

                            <Box>
                                <Typography variant="h3" sx={{ 
                                    fontWeight: 'bold',
                                    fontSize: { xs: '2rem', md: '3rem' }
                                }}>
                                    {lowStockCount}
                                </Typography>
                                <Typography variant="body2" sx={{ opacity: 0.9, fontSize: { xs: '0.75rem', md: '0.875rem' } }}>
                                    {language === 'hi' ? 'कम स्टॉक' : 'Low Stock Items'}
                                </Typography>
                            </Box>
                        </Box>
                    </CardContent>
                </Card>
            </Box>
            )}

            {/* AI Daily Insights - Removed as per requirements */}

            {/* View Details Button */}
            {!loading && (
            <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Button
                    variant="contained"
                    size="large"
                    startIcon={<Visibility />}
                    onClick={() => {
                        if (onNavigateToAdvanced) {
                            onNavigateToAdvanced();
                        }
                    }}
                    sx={{ 
                        borderRadius: 3,
                        px: 4,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        fontSize: { xs: '0.875rem', md: '1rem' },
                        '&:hover': {
                            background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)',
                            transform: 'scale(1.05)',
                        },
                        transition: 'all 0.2s'
                    }}
                >
                    {language === 'hi' ? 'विस्तृत डैशबोर्ड देखें' : 'View Detailed Dashboard'}
                </Button>
            </Box>
            )}

            {/* Error Snackbar */}
            <Snackbar 
                open={showError} 
                autoHideDuration={6000} 
                onClose={() => setShowError(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setShowError(false)} severity="error" sx={{ width: '100%' }}>
                    {error}
                </Alert>
            </Snackbar>

            {/* Action Menu for Reorder */}
            <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseMenu}
                slotProps={{
                    paper: {
                        sx: { minWidth: 200 }
                    }
                }}
            >
                <MenuItem onClick={handleWhatsAppOrder}>
                    <ListItemIcon>
                        <WhatsApp fontSize="small" sx={{ color: '#25D366' }} />
                    </ListItemIcon>
                    <ListItemText>
                        {language === 'hi' ? 'WhatsApp पर ऑर्डर करें' : 'Order via WhatsApp'}
                    </ListItemText>
                </MenuItem>
                <MenuItem onClick={handleMarkOrdered}>
                    <ListItemIcon>
                        <CheckCircle fontSize="small" sx={{ color: '#4caf50' }} />
                    </ListItemIcon>
                    <ListItemText>
                        {language === 'hi' ? 'ऑर्डर किया हुआ चिह्नित करें' : 'Mark as Ordered'}
                    </ListItemText>
                </MenuItem>
            </Menu>

            {/* Add pulse animation */}
            <style>
                {`
                    @keyframes pulse {
                        0%, 100% { opacity: 1; }
                        50% { opacity: 0.7; }
                    }
                `}
            </style>
        </Box>
    );
};

export default SimpleDashboard;
