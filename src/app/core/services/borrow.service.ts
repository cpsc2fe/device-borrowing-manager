import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { Device } from './device.service';

export interface Borrow {
  id: string;
  user_id: string;
  device_id: string;
  purpose: string | null;
  borrowed_at: string;
  returned_at: string | null;
  status: 'active' | 'returned';
  created_at: string;
}

export interface BorrowWithDevice extends Borrow {
  devices: Pick<Device, 'id' | 'name' | 'brand' | 'model' | 'image_url'>;
}

@Injectable({
  providedIn: 'root'
})
export class BorrowService {
  constructor(private supabase: SupabaseService) {}

  // 借用設備（使用 RPC 確保原子性）
  async borrowDevice(deviceId: string, purpose?: string): Promise<{ success: boolean; error?: string; borrow_id?: string }> {
    const { data, error } = await this.supabase.client
      .rpc('borrow_device', {
        p_device_id: deviceId,
        p_purpose: purpose || null
      });

    if (error) throw error;
    return data;
  }

  // 歸還設備（使用 RPC 確保原子性）
  async returnDevice(borrowId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await this.supabase.client
      .rpc('return_device', {
        p_borrow_id: borrowId
      });

    if (error) throw error;
    return data;
  }

  // 取得我的借用記錄
  async getMyBorrows(): Promise<BorrowWithDevice[]> {
    const user = this.supabase.currentUserValue;
    if (!user) return [];

    const { data, error } = await this.supabase.client
      .from('borrows')
      .select(`
        *,
        devices (id, name, brand, model, image_url)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as BorrowWithDevice[];
  }

  // 取得我目前正在借用的設備
  async getMyActiveBorrows(): Promise<BorrowWithDevice[]> {
    const user = this.supabase.currentUserValue;
    if (!user) return [];

    const { data, error } = await this.supabase.client
      .from('borrows')
      .select(`
        *,
        devices (id, name, brand, model, image_url)
      `)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('borrowed_at', { ascending: false });

    if (error) throw error;
    return data as BorrowWithDevice[];
  }

  // 取得所有借用記錄（管理員用）
  async getAllBorrows(): Promise<BorrowWithDevice[]> {
    const { data, error } = await this.supabase.client
      .from('borrows')
      .select(`
        *,
        devices (id, name, brand, model, image_url)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as BorrowWithDevice[];
  }
}
