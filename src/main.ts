import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';
import { clearAuthTokens } from './app/clear-auth';
import { AppModule } from './app/app.module';

// 強制清理所有可能的認證令牌衝突
function forceCleanStorage() {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // 清除所有 Supabase 相關項目
      const keys = Object.keys(localStorage);
      keys.forEach((key) => {
        if (
          key.includes('supabase') ||
          key.includes('auth') ||
          key.includes('lock') ||
          key.includes('sb-')
        ) {
          try {
            localStorage.removeItem(key);
            console.log('Force removed:', key);
          } catch (e) {
            console.warn('Failed to remove:', key);
          }
        }
      });

      // 也清理 sessionStorage
      if (window.sessionStorage) {
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach((key) => {
          if (
            key.includes('supabase') ||
            key.includes('auth') ||
            key.includes('lock')
          ) {
            try {
              sessionStorage.removeItem(key);
            } catch (e) {
              // 忽略錯誤
            }
          }
        });
      }
    }
  } catch (error) {
    console.warn('Force clean failed:', error);
  }
}

// 在應用程序啟動前執行強制清理
forceCleanStorage();

// 在應用程序啟動前清理可能衝突的認證令牌
try {
  clearAuthTokens();
} catch (error) {
  console.warn('Failed to clear auth tokens:', error);
}

console.log('Storage cleared, starting application...');

platformBrowserDynamic()
  .bootstrapModule(AppModule)
  .catch((err) => console.error(err));
