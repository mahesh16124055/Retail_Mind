import React, { useState } from 'react';
import { Box, Chip, Tooltip, Typography, Collapse, IconButton } from '@mui/material';
import { ExpandMore, ExpandLess, CloudQueue, Warning } from '@mui/icons-material';

interface BedrockMetadata {
    requestId: string;
    modelId: string;
    latencyMs: number;
    region: string;
}

interface BedrockIndicatorProps {
    bedrockMetadata?: BedrockMetadata;
    isFallback?: boolean;
    isProcessing?: boolean;
}

const BedrockIndicator: React.FC<BedrockIndicatorProps> = ({ 
    bedrockMetadata, 
    isFallback = false,
    isProcessing = false 
}) => {
    const [expanded, setExpanded] = useState(false);

    // Show loading indicator during processing
    if (isProcessing) {
        return (
            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                <CloudQueue sx={{ fontSize: 14, color: '#667eea' }} />
                <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    AI analyzing...
                </Typography>
            </Box>
        );
    }

    // Show fallback warning if using fallback response
    if (isFallback) {
        return (
            <Box display="flex" alignItems="center" gap={0.5} mt={0.5}>
                <Warning sx={{ fontSize: 14, color: '#ff9800' }} />
                <Typography variant="caption" color="warning.main" sx={{ fontStyle: 'italic' }}>
                    AI service unavailable - using fallback response
                </Typography>
            </Box>
        );
    }

    // Show Bedrock indicator with metadata
    if (bedrockMetadata) {
        return (
            <Box mt={0.5}>
                <Box display="flex" alignItems="center" gap={0.5}>
                    <Chip
                        icon={<CloudQueue />}
                        label="Powered by Amazon Bedrock Nova"
                        size="small"
                        sx={{
                            height: 20,
                            fontSize: '0.7rem',
                            bgcolor: '#e3f2fd',
                            color: '#1976d2',
                            '& .MuiChip-icon': {
                                fontSize: 14,
                                color: '#1976d2'
                            }
                        }}
                    />
                    <Tooltip title={expanded ? "Hide details" : "Show details"}>
                        <IconButton 
                            size="small" 
                            onClick={() => setExpanded(!expanded)}
                            sx={{ padding: 0.25 }}
                        >
                            {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </Box>
                
                <Collapse in={expanded}>
                    <Box 
                        mt={0.5} 
                        p={0.75} 
                        bgcolor="#f5f5f5" 
                        borderRadius={1}
                        sx={{ fontSize: '0.7rem' }}
                    >
                        <Typography variant="caption" display="block" color="text.secondary">
                            <strong>Request ID:</strong> {bedrockMetadata.requestId}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                            <strong>Model:</strong> {bedrockMetadata.modelId}
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                            <strong>Latency:</strong> {bedrockMetadata.latencyMs}ms
                        </Typography>
                        <Typography variant="caption" display="block" color="text.secondary">
                            <strong>Region:</strong> {bedrockMetadata.region}
                        </Typography>
                    </Box>
                </Collapse>
            </Box>
        );
    }

    return null;
};

export default BedrockIndicator;
