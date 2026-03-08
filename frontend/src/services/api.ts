import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add authentication interceptor
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle 401 errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('username');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

export interface InventoryInsightResponse {
  skuId: string;
  skuName: string;
  currentStock: number;
  riskLevel: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  aiRecommendation: string;
}

export const RetailMindApi = {
  getInsights: async (storeId: string, scenario?: string): Promise<InventoryInsightResponse[]> => {
    const response = await apiClient.get(`/dashboard/insights/${storeId}`, {
      params: scenario ? { scenario } : undefined,
    });
    return response.data;
  },

  seedData: async (storeId: string): Promise<string> => {
    const response = await apiClient.post(`/data/seed/${storeId}`);
    return response.data;
  },

  initializeDatabase: async (): Promise<string> => {
    const response = await apiClient.post(`/data/init-tables`);
    return response.data;
  }
};
