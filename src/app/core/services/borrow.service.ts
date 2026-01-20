import { Injectable } from '@angular/core';
import { SupabaseService } from './supabase.service';

export interface Borrow {
  id: string;
  device_id: string;
  borrower_name: string;
  borrower_email: string | null;
  purpose: string | null;
  borrowed_at: string;
  returned_at: string | null;
  status: 'active' | 'returned';
  created_at: string;
}

@Injectable({
  providedIn: 'root'
})
export class BorrowService {
  constructor(private supabase: SupabaseService) {}

  // 借用設備（QR Code 版本 - 使用姓名而非登入）
  // Telegram 通知由資料庫 trigger 自動處理
  async borrowDevice(
    deviceId: string,
    borrowerName: string,
    borrowerEmail?: string,
    purpose?: string
  ): Promise<{ success: boolean; error?: string; borrow_id?: string }> {
    const { data, error } = await this.supabase.client
      .rpc('borrow_device', {
        p_device_id: deviceId,
        p_borrower_name: borrowerName,
        p_borrower_email: borrowerEmail || null,
        p_purpose: purpose || null
      });

    if (error) throw error;
    return data;
  }

  // 歸還設備
  // Telegram 通知由資料庫 trigger 自動處理
  async returnDevice(borrowId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await this.supabase.client
      .rpc('return_device', {
        p_borrow_id: borrowId
      });

    if (error) throw error;
    return data;
  }

  // 取得所有借用記錄（管理員用）
  async getAllBorrows(): Promise<Borrow[]> {
    const { data, error } = await this.supabase.client
      .from('borrows')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Borrow[];
  }
}
