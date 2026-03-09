import React from 'react';
import { Box, Typography, Chip, Tooltip, Paper } from '@mui/material';
import { Cloud, Storage, Security, Api, SmartToy, Functions } from '@mui/icons-material';
import { useTranslation } from '../hooks/useTranslation';

const AWSBadge: React.FC = () => {
    const { t } = useTranslation();

    const services = [
        { icon: <Functions />, name: t('aws.lambda'), color: '#FF9900' },
        { icon: <Storage />, name: t('aws.dynamodb'), color: '#527FFF' },
        { icon: <SmartToy />, name: t('aws.bedrock'), color: '#FF9900' },
        { icon: <Security />, name: t('aws.kms'), color: '#DD344C' },
        { icon: <Storage />, name: t('aws.s3'), color: '#569A31' },
        { icon: <Api />, name: t('aws.apiGateway'), color: '#FF4F8B' },
    ];

    return (
        <Paper 
            elevation={0} 
            sx={{ 
                p: 2, 
                background: 'linear-gradient(135deg, #232F3E 0%, #FF9900 100%)',
                color: 'white',
                borderRadius: 2
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Cloud sx={{ fontSize: 32 }} />
                    <Box>
                        <Typography variant="h6" fontWeight="bold">
                            {t('aws.poweredBy')}
                        </Typography>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {t('aws.services')}
                        </Typography>
                    </Box>
                </Box>
                
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                    {services.map((service, idx) => (
                        <Tooltip key={idx} title={service.name} arrow>
                            <Chip
                                icon={service.icon}
                                label={service.name.split('(')[0].trim()}
                                size="small"
                                sx={{
                                    bgcolor: 'rgba(255,255,255,0.2)',
                                    color: 'white',
                                    fontWeight: 'bold',
                                    '&:hover': {
                                        bgcolor: 'rgba(255,255,255,0.3)',
                                    },
                                    '& .MuiChip-icon': {
                                        color: service.color
                                    }
                                }}
                            />
                        </Tooltip>
                    ))}
                </Box>
            </Box>
        </Paper>
    );
};

export default AWSBadge;
