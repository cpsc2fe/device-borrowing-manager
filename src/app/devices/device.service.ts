import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase.service';
import { Device } from './device.model';

@Injectable({
  providedIn: 'root'
})
export class DeviceService {
  private supabase: SupabaseClient;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.supabase;
  }

  async getDevices(): Promise<{ data: Device[] | null, error: any }> {
    const { data, error } = await this.supabase
      .from('devices')
      .select('*')
      .order('created_at', { ascending: false });
    
    return { data, error };
  }
}