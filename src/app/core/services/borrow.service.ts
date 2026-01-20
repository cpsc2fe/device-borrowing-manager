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
  async returnDevice(borrowId: string): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await this.supabase.client
      .rpc('return_device', {
        p_borrow_id: borrowId
      });

    if (error) throw error;
    return data;
  }

  // 發送借用通知
  async notifyBorrow(deviceName: string, borrowerName: string, borrowerEmail?: string, purpose?: string) {
    await this.sendTelegramNotification('borrow', deviceName, borrowerName, borrowerEmail, purpose);
  }

  // 發送歸還通知
  async notifyReturn(deviceName: string, borrowerName: string) {
    await this.sendTelegramNotification('return', deviceName, borrowerName);
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

  private async sendTelegramNotification(
    type: 'borrow' | 'return',
    deviceName: string,
    borrowerName: string,
    borrowerEmail?: string,
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
        .select('name,status,borrower_name')
        .order('name');

      const now = new Date().toLocaleString('zh-TW');
      let message = '';

      const borrowerDisplay = borrowerEmail
        ? `${borrowerName} (${borrowerEmail})`
        : borrowerName;

      if (type === 'borrow') {
        message = [
          '📱 設備借用通知',
          '━━━━━━━━━━━━━━━',
          `設備：${deviceName}`,
          `借用者：${borrowerDisplay}`,
          purpose ? `用途：${purpose}` : null,
          `時間：${now}`
        ].filter(Boolean).join('\n');
      } else {
        message = [
          '✅ 設備歸還通知',
          '━━━━━━━━━━━━━━━',
          `設備：${deviceName}`,
          `歸還者：${borrowerName}`,
          `時間：${now}`
        ].join('\n');
      }

      if (devices?.length) {
        message += '\n\n📊 目前狀態：';
        devices.forEach((device) => {
          if (device.status === 'available') {
            message += `\n🟢 ${device.name} - 可借用`;
          } else if (device.status === 'borrowed') {
            const borrower = device.borrower_name || '未知';
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
        payload['message_thread_id'] = parseInt(config.thread_id, 10);
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
