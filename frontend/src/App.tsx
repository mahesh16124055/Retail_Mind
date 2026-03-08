import { useState, useEffect } from 'react';
import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Box, Button, Tabs, Tab } from '@mui/material';
import Dashboard from './pages/Dashboard';
import Login from './components/Login';
import StoreSelector from './components/StoreSelector';
import MultiStoreAnalytics from './components/MultiStoreAnalytics';
import AlertsPanel from './components/AlertsPanel';
import AIChatAssistant from './components/AIChatAssistant';

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
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              🛒 RetailMind - AI for Bharat Hackathon
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <StoreSelector onStoreSelect={handleStoreSelect} currentStore={currentStore} />
              
              <AlertsPanel storeId={currentStore} />
              
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
                Logout
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
            <Tab label="Store Dashboard" />
            <Tab label="Multi-Store Analytics" />
          </Tabs>
        </AppBar>

        {currentTab === 0 && <Dashboard storeId={currentStore} />}
        {currentTab === 1 && <MultiStoreAnalytics />}
        
        <AIChatAssistant storeId={currentStore} />

      </Box>
    </ThemeProvider>
  );
}

export default App;
