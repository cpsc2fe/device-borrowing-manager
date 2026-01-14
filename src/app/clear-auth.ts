// 清理認證相關的 localStorage 項目以解決鎖衝突
export function clearAuthTokens(): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    // 清理所有可能的 Supabase 認證令牌
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (
        key.includes('supabase') &&
        (key.includes('auth') || key.includes('token'))
      ) {
        try {
          localStorage.removeItem(key);
          console.log(`Cleared localStorage key: ${key}`);
        } catch (error) {
          console.warn(`Failed to clear localStorage key ${key}:`, error);
        }
      }
    });

    // 特別處理已知的鍵
    const knownKeys = [
      'supabase.auth.token',
      'sb-access-token',
      'sb-refresh-token',
      'supabase-auth-token',
    ];

    knownKeys.forEach((key) => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        // 忽略錯誤
      }
    });

    // 清理 sessionStorage 也可能包含鎖信息
    if (window.sessionStorage) {
      try {
        const sessionKeys = Object.keys(sessionStorage);
        sessionKeys.forEach((key) => {
          if (key.includes('supabase') || key.includes('lock')) {
            try {
              sessionStorage.removeItem(key);
            } catch (error) {
              // 忽略錯誤
            }
          }
        });
      } catch (error) {
        console.warn('Failed to clear sessionStorage:', error);
      }
    }
  }
}

// 強制執行清理
clearAuthTokens();
