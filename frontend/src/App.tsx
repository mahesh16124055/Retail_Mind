import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Box, Button, Tabs, Tab, Switch, FormControlLabel, Fab } from '@mui/material';
import { Language, Chat } from '@mui/icons-material';
import Dashboard from './pages/Dashboard';
import Login from './components/Login';
import StoreSelector from './components/StoreSelector';
import MultiStoreAnalytics from './components/MultiStoreAnalytics';
import AlertsPanel from './components/AlertsPanel';
import AIChatAssistant from './components/AIChatAssistant';
import SimpleDashboard from './components/SimpleDashboard';
import { useTranslation } from './hooks/useTranslation';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#667eea',
    },
    secondary: {
      main: '#764ba2',
    },
    background: {
      default: '#f5f5f5',
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
  },
});

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [username, setUsername] = useState('');
  const [currentStore, setCurrentStore] = useState('101');
  const [currentTab, setCurrentTab] = useState(0);
  const [storeName, setStoreName] = useState('Sharma Kirana Store');
  const [aiChatOpen, setAiChatOpen] = useState(false);
  const { language, toggleLanguage, t } = useTranslation();

  useEffect(() => {
    const token = localStorage.getItem('token');
    const savedUsername = localStorage.getItem('username');
    const savedStore = localStorage.getItem('currentStore');
    
    if (token && savedUsername) {
      setIsAuthenticated(true);
      setUsername(savedUsername);
      if (savedStore) {
        setCurrentStore(savedStore);
      }
    }
  }, []);

  const handleLoginSuccess = (_token: string, user: string) => {
    setIsAuthenticated(true);
    setUsername(user);
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('username');
    localStorage.removeItem('currentStore');
    setIsAuthenticated(false);
    setUsername('');
  };

  const handleStoreSelect = (storeId: string) => {
    setCurrentStore(storeId);
    localStorage.setItem('currentStore', storeId);
    
    // Update store name based on ID
    const storeNames: Record<string, string> = {
      '101': 'Sharma Kirana Store',
      '102': 'Patel General Store',
      '103': 'Kumar Provision Store',
      '104': 'Singh Grocery',
      '105': 'Reddy Supermarket'
    };
    setStoreName(storeNames[storeId] || 'Store');
  };

  if (!isAuthenticated) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Login onLoginSuccess={handleLoginSuccess} />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static" sx={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}>
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 600 }}>
              🛒 RetailMind
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <StoreSelector onStoreSelect={handleStoreSelect} currentStore={currentStore} />
              
              <AlertsPanel storeId={currentStore} />
              
              <FormControlLabel
                control={
                  <Switch
                    checked={language === 'hi'}
                    onChange={toggleLanguage}
                    sx={{ 
                      '& .MuiSwitch-switchBase.Mui-checked': { color: 'white' },
                      '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: 'rgba(255,255,255,0.3)' }
                    }}
                  />
                }
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Language fontSize="small" />
                    <Typography variant="body2">{language === 'hi' ? 'हिंदी' : 'English'}</Typography>
                  </Box>
                }
                sx={{ mr: 1 }}
              />
              
              <Typography variant="body2" sx={{ mr: 2 }}>
                👤 {username}
              </Typography>
              
              <Button 
                color="inherit" 
                onClick={handleLogout}
                sx={{ 
                  border: '1px solid rgba(255,255,255,0.3)',
                  '&:hover': { background: 'rgba(255,255,255,0.1)' }
                }}
              >
                {t('app.logout')}
              </Button>
            </Box>
          </Toolbar>
          
          <Tabs 
            value={currentTab} 
            onChange={(_, v) => setCurrentTab(v)}
            sx={{ bgcolor: 'rgba(0,0,0,0.1)' }}
            textColor="inherit"
            TabIndicatorProps={{ style: { backgroundColor: 'white' } }}
          >
            <Tab label={t('tabs.simple')} />
            <Tab label={t('tabs.advanced')} />
            <Tab label={t('tabs.multiStore')} />
          </Tabs>
        </AppBar>

        {currentTab === 0 && <SimpleDashboard storeId={currentStore} storeName={storeName} onNavigateToAdvanced={() => setCurrentTab(1)} onOpenAIChat={() => setAiChatOpen(true)} />}
        {currentTab === 1 && <Dashboard storeId={currentStore} />}
        {currentTab === 2 && <MultiStoreAnalytics />}
        
        {/* Floating AI Chat Button - Hide when chat is open */}
        {!aiChatOpen && (
          <Fab
            color="primary"
            aria-label="chat"
            onClick={() => setAiChatOpen(true)}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              '&:hover': {
                background: 'linear-gradient(135deg, #e082ea 0%, #e4465b 100%)',
                transform: 'scale(1.1)',
              },
              transition: 'all 0.3s ease',
              boxShadow: '0 4px 20px rgba(245,87,108,0.4)',
              zIndex: 9999,
            }}
          >
            <Chat />
          </Fab>
        )}
        
        <AIChatAssistant storeId={currentStore} open={aiChatOpen} onClose={() => setAiChatOpen(false)} />

      </Box>
    </ThemeProvider>
  );
}

export default App;
