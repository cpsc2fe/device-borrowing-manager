import { Component, OnDestroy } from '@angular/core';
import { SupabaseService } from './supabase.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnDestroy {
  title = 'device-borrowing-manager';

  constructor(private supabaseService: SupabaseService) {
    // 監聽頁面卸載事件
    window.addEventListener('beforeunload', this.cleanup.bind(this));
    window.addEventListener('pagehide', this.cleanup.bind(this));
  }

  ngOnDestroy() {
    this.cleanup();
  }

  private cleanup() {
    // 清理 Supabase 連接以避免鎖衝突
    this.supabaseService.cleanup().catch((error) => {
      console.warn('Cleanup error:', error);
    });
  }
}
