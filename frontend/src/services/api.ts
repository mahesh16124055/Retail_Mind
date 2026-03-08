import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

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
