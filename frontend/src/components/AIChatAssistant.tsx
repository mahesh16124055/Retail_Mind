import React, { useState, useRef, useEffect } from 'react';
import {
    Fab, Drawer, Box, Typography, TextField, IconButton, Paper,
    List, ListItem, Avatar, CircularProgress, Chip
} from '@mui/material';
import { Chat, Close, Send, SmartToy, Person } from '@mui/icons-material';
import BedrockIndicator from './BedrockIndicator';
import { useTranslation } from '../hooks/useTranslation';

interface BedrockMetadata {
    requestId: string;
    modelId: string;
    latencyMs: number;
    region: string;
}

interface Message {
    conversationId: string;
    message: string;
    timestamp: string;
    isAI: boolean;
    bedrockMetadata?: BedrockMetadata;
    isFallback?: boolean;
}

interface AIChatAssistantProps {
    storeId: string;
    open?: boolean;
    onClose?: () => void;
}

const AIChatAssistant: React.FC<AIChatAssistantProps> = ({ storeId, open: externalOpen, onClose: externalOnClose }) => {
    const [internalOpen, setInternalOpen] = useState(false);
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [conversationId, setConversationId] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    // Use external open state if provided, otherwise use internal
    const open = externalOpen !== undefined ? externalOpen : internalOpen;
    const setOpen = externalOnClose ? (value: boolean) => {
        if (!value) externalOnClose();
    } : setInternalOpen;

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMessage: Message = {
            conversationId: conversationId || '',
            message: input,
            timestamp: new Date().toISOString(),
            isAI: false
        };

        setMessages([...messages, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const token = localStorage.getItem('token') || localStorage.getItem('accessToken');
            const apiUrl = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL;
            const response = await fetch(`${apiUrl}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    storeId,
                    message: input,
                    conversationId
                })
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const aiResponse: Message = await response.json();
            setMessages(prev => [...prev, aiResponse]);
            setConversationId(aiResponse.conversationId);
        } catch (err: any) {
            console.error('Chat error:', err);
            // Show error message to user
            const errorMsg: Message = {
                conversationId: conversationId || '',
                message: t('chat.error'),
                timestamp: new Date().toISOString(),
                isAI: true
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <Fab
                color="primary"
                sx={{
                    position: 'fixed',
                    bottom: 24,
                    right: 24,
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    '&:hover': {
                        background: 'linear-gradient(135deg, #5568d3 0%, #653a8b 100%)'
                    }
                }}
                onClick={() => setInternalOpen(true)}
            >
                <Chat />
            </Fab>

            <Drawer anchor="right" open={open} onClose={() => setOpen(false)}>
                <Box sx={{ width: 400, height: '100%', display: 'flex', flexDirection: 'column' }}>
                    <Box sx={{ p: 2, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
                        <Box display="flex" justifyContent="space-between" alignItems="center">
                            <Box display="flex" alignItems="center">
                                <SmartToy sx={{ mr: 1 }} />
                                <Typography variant="h6" fontWeight="bold">{t('chat.title')}</Typography>
                            </Box>
                            <IconButton onClick={() => setOpen(false)} sx={{ color: 'white' }} size="small">
                                <Close />
                            </IconButton>
                        </Box>
                        <Typography variant="caption" sx={{ opacity: 0.9 }}>
                            {t('chat.subtitle')}
                        </Typography>
                    </Box>

                    <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, bgcolor: '#f5f7fa' }}>
                        {messages.length === 0 && (
                            <Box textAlign="center" py={4}>
                                <SmartToy sx={{ fontSize: 60, color: '#ccc', mb: 2 }} />
                                <Typography color="text.secondary" variant="body2" mb={2}>
                                    {t('chat.welcome')}
                                </Typography>
                                <Box display="flex" flexDirection="column" gap={1}>
                                    <Chip 
                                        label={t('chat.prompt1')}
                                        onClick={() => setInput(t('chat.prompt1'))}
                                        clickable
                                    />
                                    <Chip 
                                        label={t('chat.prompt2')}
                                        onClick={() => setInput(t('chat.prompt2'))}
                                        clickable
                                    />
                                    <Chip 
                                        label={t('chat.prompt3')}
                                        onClick={() => setInput(t('chat.prompt3'))}
                                        clickable
                                    />
                                </Box>
                            </Box>
                        )}

                        <List>
                            {messages.map((msg, idx) => (
                                <ListItem key={idx} sx={{ alignItems: 'flex-start', px: 0 }}>
                                    <Avatar sx={{ bgcolor: msg.isAI ? '#667eea' : '#4caf50', mr: 1, mt: 0.5 }}>
                                        {msg.isAI ? <SmartToy /> : <Person />}
                                    </Avatar>
                                    <Paper sx={{ p: 1.5, flexGrow: 1, bgcolor: msg.isAI ? '#e3f2fd' : '#f1f8e9' }}>
                                        <Typography variant="body2">{msg.message}</Typography>
                                        <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                                            {new Date(msg.timestamp).toLocaleTimeString()}
                                        </Typography>
                                        {msg.isAI && (
                                            <BedrockIndicator 
                                                bedrockMetadata={msg.bedrockMetadata}
                                                isFallback={msg.isFallback}
                                            />
                                        )}
                                    </Paper>
                                </ListItem>
                            ))}
                            {loading && (
                                <ListItem sx={{ px: 0 }}>
                                    <Avatar sx={{ bgcolor: '#667eea', mr: 1 }}>
                                        <SmartToy />
                                    </Avatar>
                                    <Paper sx={{ p: 1.5 }}>
                                        <CircularProgress size={20} />
                                        <Typography variant="caption" display="block" mt={0.5}>
                                            {t('chat.analyzing')}
                                        </Typography>
                                        <BedrockIndicator isProcessing={true} />
                                    </Paper>
                                </ListItem>
                            )}
                        </List>
                        <div ref={messagesEndRef} />
                    </Box>

                    <Box sx={{ p: 2, borderTop: '1px solid #e0e0e0', bgcolor: 'white' }}>
                        <Box display="flex" gap={1}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder={t('chat.placeholder')}
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                                disabled={loading}
                                multiline
                                maxRows={3}
                            />
                            <IconButton 
                                color="primary" 
                                onClick={handleSend}
                                disabled={loading || !input.trim()}
                            >
                                <Send />
                            </IconButton>
                        </Box>
                    </Box>
                </Box>
            </Drawer>
        </>
    );
};

export default AIChatAssistant;
