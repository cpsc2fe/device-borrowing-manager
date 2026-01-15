import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Device {
  id: string;
  name: string;
  brand: string;
  model: string | null;
  os: string | null;
  os_version: string | null;
  image_url: string | null;
  status: 'available' | 'borrowed' | 'maintenance';
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceWithBorrower extends Device {
  borrower_email: string | null;
  borrowed_at: string | null;
}

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  constructor(private supabase: SupabaseService) {}

  // 取得所有設備（含借用者資訊）
  async getDevices(): Promise<DeviceWithBorrower[]> {
    const { data, error } = await this.supabase.client
      .from('devices_with_borrower')
      .select('*')
      .order('name');

    if (error) throw error;
    return data as DeviceWithBorrower[];
  }

  // 取得單一設備
  async getDevice(id: string): Promise<DeviceWithBorrower | null> {
    const { data, error } = await this.supabase.client
      .from('devices_with_borrower')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as DeviceWithBorrower;
  }

  // 新增設備
  async createDevice(device: Partial<Device>): Promise<Device> {
    const user = this.supabase.currentUserValue;
    const { data, error } = await this.supabase.client
      .from('devices')
      .insert({
        ...device,
        created_by: user?.id
      })
      .select()
      .single();

    if (error) throw error;
    return data as Device;
  }

  // 更新設備
  async updateDevice(id: string, device: Partial<Device>): Promise<Device> {
    const { data, error } = await this.supabase.client
      .from('devices')
      .update(device)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Device;
  }

  // 刪除設備
  async deleteDevice(id: string): Promise<void> {
    const { error } = await this.supabase.client
      .from('devices')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // 上傳設備圖片
  async uploadImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `devices/${fileName}`;

    const { error: uploadError } = await this.supabase.client.storage
      .from('device-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = this.supabase.client.storage
      .from('device-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  // 刪除設備圖片
  async deleteImage(imageUrl: string): Promise<void> {
    const path = imageUrl.split('/device-images/')[1];
    if (path) {
      const { error } = await this.supabase.client.storage
        .from('device-images')
        .remove([path]);

      if (error) throw error;
    }
  }

  // 取得設備統計
  async getStats(): Promise<{ total: number; available: number; borrowed: number; maintenance: number }> {
    const { data, error } = await this.supabase.client
      .from('devices')
      .select('status');

    if (error) throw error;

    const stats = {
      total: data.length,
      available: data.filter(d => d.status === 'available').length,
      borrowed: data.filter(d => d.status === 'borrowed').length,
      maintenance: data.filter(d => d.status === 'maintenance').length
    };

    return stats;
  }
}
