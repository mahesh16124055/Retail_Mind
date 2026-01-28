/**
 * API service for RetailMind frontend
 * Handles all HTTP requests to the FastAPI backend
 */

import axios, { AxiosResponse } from 'axios';
import {
  DashboardSummary,
  ProductAlert,
  SKUDetail,
  DemandForecast,
  Recommendation,
  UploadResult,
  UploadResponse,
  AnalysisResult,
  ApiResponse
} from '../types';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || '/api/v1',
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for logging
api.interceptors.request.use(
  (config) => {
    console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
    return config;
  },
  (error) => {
    console.error('API Request Error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    console.error('API Response Error:', error.response?.data || error.message);
    return Promise.reject(error);
  }
);

// Dashboard API
export const dashboardApi = {
  getSummary: async (storeId: string): Promise<DashboardSummary> => {
    const response: AxiosResponse<DashboardSummary> = await api.get(`/dashboard/summary/${storeId}`);
    return response.data;
  },

  getAlerts: async (storeId: string, severity?: string, limit?: number): Promise<ProductAlert[]> => {
    const params = new URLSearchParams();
    if (severity) params.append('severity', severity);
    if (limit) params.append('limit', limit.toString());
    
    const response: AxiosResponse<ProductAlert[]> = await api.get(
      `/dashboard/alerts/${storeId}?${params.toString()}`
    );
    return response.data;
  },

  getSKUDetail: async (storeId: string, skuId: string): Promise<SKUDetail> => {
    const response: AxiosResponse<SKUDetail> = await api.get(`/dashboard/sku/${storeId}/${skuId}`);
    return response.data;
  },

  triggerAnalysis: async (storeId: string): Promise<AnalysisResult> => {
    const response: AxiosResponse<AnalysisResult> = await api.post(`/dashboard/analyze/${storeId}`);
    return response.data;
  },
};

// Data Upload API
export const dataApi = {
  uploadSales: async (storeId: string, file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response: AxiosResponse<UploadResponse> = await api.post(
      `/data/upload/sales/${storeId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  uploadInventory: async (storeId: string, file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response: AxiosResponse<UploadResponse> = await api.post(
      `/data/upload/inventory/${storeId}`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  uploadSKUMaster: async (file: File): Promise<UploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response: AxiosResponse<UploadResponse> = await api.post(
      '/data/upload/sku-master',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );
    return response.data;
  },

  generateSampleData: async (
    storeId: string, 
    numSkus: number = 20, 
    daysOfSales: number = 30
  ): Promise<any> => {
    const formData = new FormData();
    formData.append('num_skus', numSkus.toString());
    formData.append('days_of_sales', daysOfSales.toString());
    
    const response = await api.post(`/data/sample-data/${storeId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getUploadStatus: async (storeId: string): Promise<any> => {
    const response = await api.get(`/data/upload-status/${storeId}`);
    return response.data;
  },
};

// Predictions API
export const predictionsApi = {
  predictDemand: async (
    storeId: string, 
    skuId: string, 
    horizonDays: number = 7
  ): Promise<DemandForecast> => {
    const response: AxiosResponse<DemandForecast> = await api.post(
      `/predictions/predict/${storeId}/${skuId}?horizon_days=${horizonDays}`
    );
    return response.data;
  },

  batchPredict: async (storeId: string, skuList?: string[]): Promise<DemandForecast[]> => {
    const response: AxiosResponse<DemandForecast[]> = await api.post(
      `/predictions/predict/batch/${storeId}`,
      { sku_list: skuList }
    );
    return response.data;
  },

  getLatestForecast: async (storeId: string, skuId: string): Promise<DemandForecast | null> => {
    const response: AxiosResponse<DemandForecast | null> = await api.get(
      `/predictions/forecast/${storeId}/${skuId}`
    );
    return response.data;
  },

  getAllForecasts: async (storeId: string, limit: number = 50): Promise<DemandForecast[]> => {
    const response: AxiosResponse<DemandForecast[]> = await api.get(
      `/predictions/forecasts/${storeId}?limit=${limit}`
    );
    return response.data;
  },

  getModelPerformance: async (storeId: string, daysBack: number = 30): Promise<any> => {
    const response = await api.get(
      `/predictions/model-performance/${storeId}?days_back=${daysBack}`
    );
    return response.data;
  },
};

// Recommendations API
export const recommendationsApi = {
  generateRecommendations: async (
    storeId: string, 
    types?: string[]
  ): Promise<Recommendation[]> => {
    const params = new URLSearchParams();
    if (types) {
      types.forEach(type => params.append('recommendation_types', type));
    }
    
    const response: AxiosResponse<Recommendation[]> = await api.post(
      `/recommendations/generate/${storeId}?${params.toString()}`
    );
    return response.data;
  },

  getStoreRecommendations: async (
    storeId: string, 
    type?: string, 
    limit: number = 50
  ): Promise<Recommendation[]> => {
    const params = new URLSearchParams();
    if (type) params.append('recommendation_type', type);
    params.append('limit', limit.toString());
    
    const response: AxiosResponse<Recommendation[]> = await api.get(
      `/recommendations/store/${storeId}?${params.toString()}`
    );
    return response.data;
  },

  getSKURecommendations: async (storeId: string, skuId: string): Promise<Recommendation[]> => {
    const response: AxiosResponse<Recommendation[]> = await api.get(
      `/recommendations/sku/${storeId}/${skuId}`
    );
    return response.data;
  },

  submitFeedback: async (
    recommendationId: string, 
    accepted: boolean, 
    feedback?: string
  ): Promise<any> => {
    const response = await api.post('/recommendations/feedback', {
      recommendation_id: recommendationId,
      accepted,
      feedback,
    });
    return response.data;
  },

  getFeedbackStats: async (storeId: string, daysBack: number = 30): Promise<any> => {
    const response = await api.get(
      `/recommendations/feedback-stats/${storeId}?days_back=${daysBack}`
    );
    return response.data;
  },
};

// Utility functions
export const handleApiError = (error: any): string => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isApiError = (error: any): boolean => {
  return error.response && error.response.status >= 400;
};

export default api;