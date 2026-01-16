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

  async notifyBorrow(deviceName: string, purpose?: string) {
    const userEmail = this.supabase.currentUserValue?.email || '未知';
    await this.sendTelegramNotification('borrow', deviceName, userEmail, purpose);
  }

  async notifyReturn(deviceName: string) {
    const userEmail = this.supabase.currentUserValue?.email || '未知';
    await this.sendTelegramNotification('return', deviceName, userEmail);
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

  private async sendTelegramNotification(
    type: 'borrow' | 'return',
    deviceName: string,
    userEmail: string,
    purpose?: string
  ) {
    try {
      const { data: config } = await this.supabase.client
        .from('telegram_config')
        .select('*')
        .limit(1)
        .single();

      if (!config?.is_enabled || !config.bot_token || !config.chat_id) {
        return;
      }

      const { data: devices } = await this.supabase.client
        .from('devices_with_borrower')
        .select('name,status,borrower_email')
        .order('name');

      const now = new Date().toLocaleString('zh-TW');
      let message = '';

      if (type === 'borrow') {
        message = [
          '📱 設備借用通知',
          '━━━━━━━━━━━━━━━',
          `設備：${deviceName}`,
          `借用者：${userEmail}`,
          purpose ? `用途：${purpose}` : null,
          `時間：${now}`
        ].filter(Boolean).join('\n');
      } else {
        message = [
          '✅ 設備歸還通知',
          '━━━━━━━━━━━━━━━',
          `設備：${deviceName}`,
          `歸還者：${userEmail}`,
          `時間：${now}`
        ].join('\n');
      }

      if (devices?.length) {
        message += '\n\n📊 目前狀態：';
        devices.forEach((device) => {
          if (device.status === 'available') {
            message += `\n🟢 ${device.name} - 可借用`;
          } else if (device.status === 'borrowed') {
            const borrower = device.borrower_email || '未知';
            message += `\n🔴 ${device.name} - ${borrower}`;
          } else if (device.status === 'maintenance') {
            message += `\n🟡 ${device.name} - 維修中`;
          }
        });
      }

      const payload: Record<string, unknown> = {
        chat_id: config.chat_id,
        text: message
      };

      if (config.thread_id) {
        payload.message_thread_id = parseInt(config.thread_id, 10);
      }

      await fetch(`https://api.telegram.org/bot${config.bot_token}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (error) {
      console.error('Telegram notify error:', error);
    }
  }
}
