import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environment';

// 創建一個完全獨立的存儲系統來避開 LockManager
class IsolatedStorage {
  private data: { [key: string]: string } = {};

  getItem(key: string): string | null {
    return this.data[key] || null;
  }

  setItem(key: string, value: string): void {
    this.data[key] = value;
  }

  removeItem(key: string): void {
    delete this.data[key];
  }

  clear(): void {
    this.data = {};
  }
}

// 手動會話管理
interface ManualSession {
  access_token: string;
  refresh_token: string;
  expires_at: number;
  user: any;
}

class ManualSessionManager {
  private session: ManualSession | null = null;

  setSession(session: ManualSession | null): void {
    this.session = session;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        if (session) {
          localStorage.setItem('manual_session', JSON.stringify(session));
        } else {
          localStorage.removeItem('manual_session');
        }
      } catch (error) {
        console.warn('Failed to save session to localStorage:', error);
      }
    }
  }

  getSession(): ManualSession | null {
    if (this.session) {
      return this.session;
    }

    // 嘗試從 localStorage 恢復
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        const saved = localStorage.getItem('manual_session');
        if (saved) {
          this.session = JSON.parse(saved);
          return this.session;
        }
      } catch (error) {
        console.warn('Failed to restore session from localStorage:', error);
      }
    }

    return null;
  }

  clearSession(): void {
    this.session = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        localStorage.removeItem('manual_session');
      } catch (error) {
        console.warn('Failed to clear session from localStorage:', error);
      }
    }
  }

  isSessionValid(): boolean {
    const session = this.getSession();
    if (!session) return false;

    const now = Math.floor(Date.now() / 1000);
    return session.expires_at > now;
  }
}

@Injectable({
  providedIn: 'root',
})
export class SupabaseService {
  private static _instance: SupabaseClient | null = null;
  private static _isolatedStorage = new IsolatedStorage();
  private static _sessionManager = new ManualSessionManager();
  public readonly supabase: SupabaseClient;

  constructor() {
    this.supabase = this.getInstance();
  }

  private getInstance(): SupabaseClient {
    if (SupabaseService._instance) {
      return SupabaseService._instance;
    }

    // 創建新的 Supabase 實例，完全避開原生存儲和鎖機制
    SupabaseService._instance = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          persistSession: true, // 完全禁用會話持久化
          autoRefreshToken: false,
          detectSessionInUrl: false,
          storage: SupabaseService._isolatedStorage,
          storageKey: 'isolated_auth_token',
          flowType: 'implicit' as const,
          debug: false,
        },
        global: {
          headers: {
            'X-Client-Info': 'device-borrowing-manager-isolated',
          },
        },
      }
    );

    return SupabaseService._instance;
  }

  // 添加安全的認證方法包裝
  async safeAuthOperation<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error: any) {
      console.error('Auth operation failed:', error);
      throw error;
    }
  }

  // 手動 token 刷新管理（完全避開 Supabase 鎖機制）
  async refreshTokenIfNeeded(): Promise<boolean> {
    try {
      const session = await this.getCurrentSession();
      if (!session || !session.refresh_token) return false;

      // 檢查 token 是否即將過期（提前5分鐘刷新）
      const expiresAt = session.expires_at;
      const now = Math.floor(Date.now() / 1000);
      const fiveMinutes = 5 * 60;

      if (expiresAt && expiresAt - now < fiveMinutes) {
        console.log('Token即將過期，嘗試手動刷新...');
        return await this.manualRefreshToken(session.refresh_token);
      }

      return true; // Token 還有效
    } catch (error) {
      console.error('檢查 token 狀態失敗:', error);
      return false;
    }
  }

  // 手動刷新 token（提供給用戶主動調用）
  async manualRefreshToken(refreshToken?: string): Promise<boolean> {
    try {
      const currentSession = await this.getCurrentSession();
      const tokenToUse = refreshToken || currentSession?.refresh_token;

      if (!tokenToUse) {
        console.error('沒有可用的 refresh token');
        return false;
      }

      // 直接調用 Supabase REST API 來刷新 token，避開 auth.refreshSession()
      const response = await fetch(
        `${environment.supabaseUrl}/auth/v1/token?grant_type=refresh_token`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: environment.supabaseKey,
          },
          body: JSON.stringify({
            refresh_token: tokenToUse,
          }),
        }
      );

      if (!response.ok) {
        console.error('Token 刷新失敗:', response.statusText);
        return false;
      }

      const data = await response.json();

      if (data.access_token && data.refresh_token) {
        // 更新手動會話管理器
        const updatedSession: ManualSession = {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
          expires_at: Math.floor(Date.now() / 1000) + (data.expires_in || 3600),
          user: currentSession?.user || data.user,
        };

        SupabaseService._sessionManager.setSession(updatedSession);
        console.log('Token 刷新成功');
        return true;
      }

      return false;
    } catch (error) {
      console.error('手動刷新 token 失敗:', error);
      return false;
    }
  }

  // 用戶可以主動調用的刷新方法
  async forceRefreshToken(): Promise<boolean> {
    console.log('用戶主動刷新 token...');
    return await this.manualRefreshToken();
  }

  // 啟動定期 token 檢查（替代 autoRefreshToken）
  startTokenRefreshTimer(): void {
    // 每4分鐘檢查一次 token 狀態
    setInterval(async () => {
      await this.refreshTokenIfNeeded();
    }, 4 * 60 * 1000);
  }

  // 手動會話管理
  async getCurrentSession() {
    try {
      // 先檢查手動會話管理器
      const manualSession = SupabaseService._sessionManager.getSession();
      if (manualSession && SupabaseService._sessionManager.isSessionValid()) {
        return {
          access_token: manualSession.access_token,
          refresh_token: manualSession.refresh_token,
          expires_at: manualSession.expires_at,
          user: manualSession.user,
        };
      }

      // 如果沒有有效的手動會話，返回 null
      return null;
    } catch (error) {
      console.warn('Failed to get current session:', error);
      return null;
    }
  }

  // 手動登入（完全避開 Supabase Auth 的鎖機制）
  async manualSignIn(email: string, password: string) {
    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.session) {
        // 保存到手動會話管理器
        SupabaseService._sessionManager.setSession({
          access_token: data.session.access_token,
          refresh_token: data.session.refresh_token,
          expires_at: data.session.expires_at || 0,
          user: data.session.user,
        });
      }

      return { data, error };
    } catch (error) {
      console.error('Manual sign in failed:', error);
      return { data: null, error };
    }
  }

  // 手動登出
  async manualSignOut() {
    try {
      // 清除手動會話
      SupabaseService._sessionManager.clearSession();

      // 不調用 Supabase auth.signOut() 以避免鎖問題
      return { error: null };
    } catch (error) {
      console.error('Manual sign out failed:', error);
      return { error };
    }
  }

  // 添加清理方法
  async cleanup(): Promise<void> {
    if (SupabaseService._instance) {
      try {
        SupabaseService._isolatedStorage.clear();
        SupabaseService._instance = null;
      } catch (error) {
        console.warn('Error during cleanup:', error);
      }
    }
  }
}
