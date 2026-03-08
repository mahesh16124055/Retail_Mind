import { ThemeProvider, createTheme, CssBaseline, AppBar, Toolbar, Typography, Box } from '@mui/material';
import Dashboard from './pages/Dashboard';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // BharatAI blue
    },
    secondary: {
      main: '#dc004e',
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
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              RetailMind 🚀 AI for Kiranas
            </Typography>
            <Typography variant="body2">
              Powered by AWS Bedrock & DynamoDB
            </Typography>
          </Toolbar>
        </AppBar>

        <Dashboard />

      </Box>
    </ThemeProvider>
  );
}

export default App;
