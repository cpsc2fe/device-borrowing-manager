// Based on the database schema in database_schema.sql

export interface Device {
  id: string; // UUID is a string in TypeScript
  device_name: string;
  brand?: string;
  model?: string;
  device_type?: 'phone' | 'tablet' | 'laptop' | 'other';
  operating_system?: string;
  os_version?: string;
  specifications?: any; // JSONB can be any object
  asset_number?: string;
  purchase_date?: string; // Date is a string
  warranty_end_date?: string;
  location?: string;
  status: 'available' | 'borrowed' | 'maintenance' | 'retired' | 'reserved';
  condition?: 'excellent' | 'good' | 'fair' | 'poor';
  notes?: string;
  created_by?: string; // UUID
  created_at: string; // Timestamp is a string
  updated_at: string;
}
