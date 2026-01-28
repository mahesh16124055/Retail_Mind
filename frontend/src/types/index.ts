/**
 * TypeScript type definitions for RetailMind frontend
 * Maps to backend domain models for type safety
 */

export interface Store {
  store_id: string;
  name: string;
  location: GeoLocation;
  store_type: 'KIRANA' | 'DARK_STORE' | 'WAREHOUSE';
  capacity_constraints: Record<string, number>;
  operating_hours: TimeRange;
  created_at: string;
}

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface TimeRange {
  start_time: string;
  end_time: string;
}

export interface SKU {
  sku_id: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  unit_cost: number;
  selling_price: number;
  shelf_life_days: number;
  storage_requirements: StorageRequirements;
  created_at: string;
}

export interface StorageRequirements {
  temperature_min?: number;
  temperature_max?: number;
  humidity_max?: number;
  requires_refrigeration: boolean;
  requires_freezing: boolean;
}

export interface InventoryItem {
  sku_id: string;
  store_id: string;
  current_stock: number;
  reserved_stock: number;
  available_stock: number;
  reorder_point: number;
  safety_stock: number;
  last_updated: string;
  batch_info: BatchInfo[];
}

export interface BatchInfo {
  batch_id: string;
  expiry_date: string;
  quantity: number;
  cost_per_unit: number;
}

export interface DemandForecast {
  sku_id: string;
  store_id: string;
  forecast_date: string;
  predicted_demand: number;
  confidence_interval: [number, number];
  confidence_level: number;
  model_used: string;
  external_factors: Record<string, any>;
  created_at: string;
}

export interface Risk {
  risk_id: string;
  risk_type: 'STOCKOUT' | 'EXPIRY' | 'OVERSTOCK' | 'SLOW_MOVING';
  sku_id: string;
  store_id: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  risk_score: number;
  estimated_impact: number;
  time_to_impact: number; // seconds
  description: string;
  detected_at: string;
}

export interface Recommendation {
  recommendation_id: string;
  recommendation_type: 'REORDER' | 'DISCOUNT' | 'REDISTRIBUTE' | 'PROMOTE';
  sku_id: string;
  store_id: string;
  action: string;
  parameters: Record<string, any>;
  expected_outcome: string;
  confidence_level: number;
  estimated_roi?: number;
  explanation: string;
  created_at: string;
}

export interface SalesTransaction {
  transaction_id: string;
  store_id: string;
  sku_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  timestamp: string;
  customer_id?: string;
}

// Dashboard-specific types
export interface DashboardSummary {
  store_id: string;
  total_skus: number;
  critical_alerts: number;
  low_stock_items: number;
  expiry_warnings: number;
  recommendations_pending: number;
  last_updated: string;
}

export interface ProductAlert {
  sku_id: string;
  sku_name: string;
  current_stock: number;
  predicted_demand_7d: number;
  days_until_stockout?: number;
  days_until_expiry?: number;
  risk_severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  primary_recommendation: string;
}

export interface SKUDetail {
  sku: SKU;
  inventory: InventoryItem;
  forecast?: DemandForecast;
  risks: Risk[];
  recommendations: Recommendation[];
  sales_history_30d: SalesTransaction[];
}

// API Response types
export interface ApiResponse<T> {
  data?: T;
  message?: string;
  error?: string;
}

export interface UploadResponse {
  message: string;
  store_id?: string;
  filename: string;
  processing_result: UploadResult;
}

export interface UploadResult {
  status: string;
  total_rows: number;
  success_count: number;
  error_count: number;
  errors: Array<{
    row: number;
    error: string;
    data: Record<string, any>;
  }>;
}

export interface AnalysisResult {
  status: string;
  store_id: string;
  analysis_timestamp: string;
  results: {
    forecasts_generated: number;
    risks_detected: {
      stockout: number;
      expiry: number;
      overstock: number;
      slow_moving: number;
      total: number;
    };
    recommendations_generated: {
      reorder: number;
      pricing: number;
      promotional: number;
      total: number;
    };
  };
}

// Chart data types
export interface ChartData {
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
}

// Utility types
export type RiskSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type RiskType = 'STOCKOUT' | 'EXPIRY' | 'OVERSTOCK' | 'SLOW_MOVING';
export type RecommendationType = 'REORDER' | 'DISCOUNT' | 'REDISTRIBUTE' | 'PROMOTE';