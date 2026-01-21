import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

const REMEMBER_ME_KEY = 'device-borrowing-remember-me';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser = new BehaviorSubject<User | null>(null);
  private currentSession = new BehaviorSubject<Session | null>(null);

  constructor() {
    // 初始化時根據「記住我」設定選擇 storage
    const rememberMe = localStorage.getItem(REMEMBER_ME_KEY) !== 'false';
    this.supabase = this.createSupabaseClient(rememberMe);

    this.setupAuthListeners();
  }

  private createSupabaseClient(rememberMe: boolean): SupabaseClient {
    return createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          storageKey: 'device-borrowing-auth-token',
          storage: rememberMe ? window.localStorage : window.sessionStorage,
          lock: async (_name, _timeout, fn) => await fn()
        }
      }
    );
  }

  private setupAuthListeners() {
    // 監聽認證狀態變化
    this.supabase.auth.onAuthStateChange((event, session) => {
      this.currentUser.next(session?.user ?? null);
      this.currentSession.next(session);
    });

    // 初始化時檢查現有 session
    this.supabase.auth.getSession().then(({ data: { session } }) => {
      this.currentUser.next(session?.user ?? null);
      this.currentSession.next(session);
    });
  }

  // 設定「記住我」並重新建立 client
  setRememberMe(remember: boolean) {
    localStorage.setItem(REMEMBER_ME_KEY, remember ? 'true' : 'false');
    this.supabase = this.createSupabaseClient(remember);
    this.setupAuthListeners();
  }

  get client(): SupabaseClient {
    return this.supabase;
  }

  get user$(): Observable<User | null> {
    return this.currentUser.asObservable();
  }

  get session$(): Observable<Session | null> {
    return this.currentSession.asObservable();
  }

  get currentUserValue(): User | null {
    return this.currentUser.value;
  }

  // 使用者登入
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // 登出
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  // 變更密碼（需要輸入原本密碼進行驗證）
  async changePassword(currentPassword: string, newPassword: string) {
    const user = this.currentUserValue;
    const email = user?.email;
    if (!email) {
      throw new Error('尚未登入');
    }

    const { error: signInError } = await this.supabase.auth.signInWithPassword({
      email,
      password: currentPassword
    });
    if (signInError) {
      throw new Error('原本密碼錯誤');
    }

    const { error: updateError } = await this.supabase.auth.updateUser({
      password: newPassword
    });
    if (updateError) {
      throw updateError;
    }
  }

  // 取得使用者角色
  async getUserRole(): Promise<'admin' | 'user' | null> {
    const user = this.currentUserValue;
    if (!user) return null;

    const { data, error } = await this.supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) return 'user';
    return data?.role ?? 'user';
  }

  // 檢查是否為管理員
  async isAdmin(): Promise<boolean> {
    const role = await this.getUserRole();
    return role === 'admin';
  }
}
