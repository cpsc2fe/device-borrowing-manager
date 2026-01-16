import { Injectable } from '@angular/core';
import { createClient, SupabaseClient, User, Session } from '@supabase/supabase-js';
import { environment } from '../../../environments/environment';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SupabaseService {
  private supabase: SupabaseClient;
  private currentUser = new BehaviorSubject<User | null>(null);
  private currentSession = new BehaviorSubject<Session | null>(null);

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey
    );

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

  // 登入
  async signIn(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // 註冊
  async signUp(email: string, password: string) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password
    });
    if (error) throw error;
    return data;
  }

  // 管理員新增會員（透過 Edge Function）
  async createMember(email: string, password: string, role: 'admin' | 'user') {
    const { data, error } = await this.supabase.functions.invoke('create-member', {
      body: { email, password, role }
    });

    if (error) {
      throw new Error(error.message || '新增使用者失敗');
    }

    return data;
  }

  // 登出
  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) throw error;
  }

  // 重設密碼
  async resetPassword(email: string) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
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
