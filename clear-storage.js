// 手動執行這個腳本來清理所有可能衝突的存儲項目
// 在瀏覽器控制台中執行：clearAllSupabaseStorage()

window.clearAllSupabaseStorage = function () {
  console.log("開始清理 Supabase 相關存儲...");

  // 清理 localStorage
  if (localStorage) {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.includes("supabase") ||
          key.includes("auth") ||
          key.includes("token") ||
          key.includes("lock") ||
          key.includes("sb-"))
      ) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach((key) => {
      try {
        localStorage.removeItem(key);
        console.log("已移除 localStorage 鍵:", key);
      } catch (error) {
        console.warn("移除失敗:", key, error);
      }
    });
  }

  // 清理 sessionStorage
  if (sessionStorage) {
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (
        key &&
        (key.includes("supabase") ||
          key.includes("auth") ||
          key.includes("lock"))
      ) {
        sessionKeysToRemove.push(key);
      }
    }

    sessionKeysToRemove.forEach((key) => {
      try {
        sessionStorage.removeItem(key);
        console.log("已移除 sessionStorage 鍵:", key);
      } catch (error) {
        console.warn("移除失敗:", key, error);
      }
    });
  }

  console.log("存儲清理完成，請重新整理頁面");
};

// 自動執行清理
console.log("執行清理腳本...");
window.clearAllSupabaseStorage();

// 提示用戶
console.log("如果仍有問題，請執行: clearAllSupabaseStorage()");
