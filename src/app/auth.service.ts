import { Injectable } from '@angular/core';
import {
  AuthChangeEvent,
  Session,
  SupabaseClient,
  User,
} from '@supabase/supabase-js';
import { BehaviorSubject, Observable } from 'rxjs';
import { filter } from 'rxjs/operators';
import { SupabaseService } from './supabase.service';

export interface UserProfile {
  id: string;
  email: string;
  role: 'admin' | 'user';
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private supabase: SupabaseClient;
  private _session: BehaviorSubject<Session | null | undefined> =
    new BehaviorSubject<Session | null | undefined>(undefined);
  private _userProfile: BehaviorSubject<UserProfile | null | undefined> =
    new BehaviorSubject<UserProfile | null | undefined>(undefined);
  private _initialized = false;
  private _initPromise: Promise<void> | null = null;

  public readonly session$: Observable<Session | null> = this._session
    .asObservable()
    .pipe(
      filter((session) => session !== undefined)
    ) as Observable<Session | null>;

  public readonly userProfile$: Observable<UserProfile | null> =
    this._userProfile
      .asObservable()
      .pipe(
        filter((profile) => profile !== undefined)
      ) as Observable<UserProfile | null>;

  constructor(private supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.supabase;
    this.initialize();
  }

  private async initialize(): Promise<void> {
    if (this._initialized || this._initPromise) {
      return this._initPromise || Promise.resolve();
    }

    this._initPromise = this.doInitialize();
    await this._initPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log(
        'Initializing auth service with manual session management...'
      );

      // 檢查是否有保存的會話
      const savedSession = await this.supabaseService.getCurrentSession();
      if (savedSession && savedSession.user) {
        this._session.next(savedSession as any);
        await this.fetchUserProfile(savedSession.user.id);
      } else {
        this._session.next(null);
        this._userProfile.next(null);
      }

      // 設置認證狀態變化監聽器（但不依賴它）
      this.supabase.auth.onAuthStateChange(
        async (event: AuthChangeEvent, session: Session | null) => {
          console.log('Auth state change (advisory only):', event);
          // 不依賴這個事件，因為我們手動管理會話
        }
      );

      this._initialized = true;
      console.log('Auth service initialized with manual session management');

      // 啟動手動 token 刷新計時器
      this.supabaseService.startTokenRefreshTimer();
    } catch (error) {
      console.error('Error initializing auth service:', error);
      this._session.next(null);
      this._userProfile.next(null);
      this._initialized = true;
    }
  }

  get session(): Session | null {
    const sessionValue = this._session.value;
    return sessionValue === undefined ? null : sessionValue;
  }

  get userProfile(): UserProfile | null {
    const profileValue = this._userProfile.value;
    return profileValue === undefined ? null : profileValue;
  }

  async fetchUserProfile(userId: string): Promise<void> {
    try {
      const { data, error } = await this.supabase
        .from('users')
        .select('id, email, role')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Error fetching user profile:', error);
        this._userProfile.next(null);
      } else {
        this._userProfile.next(data as UserProfile);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
      this._userProfile.next(null);
    }
  }

  async signIn(email: string, password: string): Promise<any> {
    try {
      await this.initialize();

      // 使用手動登入方法
      const result = await this.supabaseService.manualSignIn(email, password);

      if (result.data?.session) {
        this._session.next(result.data.session);
        if (result.data.session.user) {
          await this.fetchUserProfile(result.data.session.user.id);
        }
      }

      return result;
    } catch (error) {
      console.error('Error during sign in:', error);
      return { error };
    }
  }

  async signOut(): Promise<any> {
    try {
      // 先清除本地狀態
      this._session.next(null);
      this._userProfile.next(null);

      // 使用手動登出方法
      return await this.supabaseService.manualSignOut();
    } catch (error) {
      console.error('Error during sign out:', error);
      // 即使登出失敗，也確保本地狀態被清除
      this._session.next(null);
      this._userProfile.next(null);
      return { error };
    }
  }

  async signUp(email: string, password: string): Promise<any> {
    try {
      await this.initialize();

      console.log('Attempting to sign up user:', email);

      // 先檢查用戶是否已存在
      const { data: existingUsers, error: checkError } = await this.supabase
        .from('users')
        .select('email')
        .eq('email', email);

      if (!checkError && existingUsers && existingUsers.length > 0) {
        console.log('User already exists with email:', email);
        return {
          error: {
            message: 'User already registered',
            code: 'user_already_exists',
          },
        };
      }

      // 創建用戶帳戶
      const { data, error: authError } = await this.supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        console.error('Auth sign up error:', authError);

        // 檢查是否是重複註冊錯誤
        if (
          authError.message.includes('User already registered') ||
          authError.message.includes('already exists') ||
          authError.message.includes('duplicate')
        ) {
          return {
            error: {
              message: 'User already registered',
              code: 'user_already_exists',
            },
          };
        }

        return { error: authError };
      }

      // 如果成功創建用戶，添加用戶資料到 users 表（觸發器會處理）
      if (data.user) {
        console.log('Sign up successful for user:', data.user.id);
        // 觸發器會自動創建用戶資料，不需要手動插入
      }

      return { data, error: null };
    } catch (error: any) {
      console.error('Unexpected error during sign up:', error);

      // 處理 RLS 策略錯誤
      if (
        error.code === '42501' ||
        (error.message && error.message.includes('row-level security policy'))
      ) {
        console.log('RLS policy error, likely duplicate user');
        return {
          error: {
            message: 'User already registered',
            code: 'user_already_exists',
          },
        };
      }

      return {
        error: {
          message: 'Unexpected error occurred during sign up',
          code: 'unexpected_error',
        },
      };
    }
  }

  // 提供給用戶手動刷新 token 的方法
  async refreshToken(): Promise<boolean> {
    try {
      const success = await this.supabaseService.forceRefreshToken();
      if (success) {
        // 刷新成功後，更新本地會話狀態
        const updatedSession = await this.supabaseService.getCurrentSession();
        if (updatedSession) {
          this._session.next(updatedSession as any);
        }
      }
      return success;
    } catch (error) {
      console.error('Error refreshing token:', error);
      return false;
    }
  }

  // 檢查 token 是否即將過期
  isTokenExpiringSoon(): boolean {
    const session = this.session;
    if (!session || !session.expires_at) return false;

    const now = Math.floor(Date.now() / 1000);
    const fiveMinutes = 5 * 60;
    return session.expires_at - now < fiveMinutes;
  }
}
