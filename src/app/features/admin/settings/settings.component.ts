import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '../../../core/services/supabase.service';

interface TelegramConfig {
  id: string;
  bot_token: string | null;
  chat_id: string | null;
  thread_id: string | null;
  is_enabled: boolean;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <div class="settings-container">
      <h1>系統設定</h1>

      <!-- 載入中 -->
      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- Telegram 設定 -->
      <mat-card *ngIf="!loading">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>telegram</mat-icon>
            Telegram 通知設定
          </mat-card-title>
        </mat-card-header>

        <mat-card-content>
          <div class="toggle-row">
            <mat-slide-toggle [(ngModel)]="config.is_enabled">
              啟用 Telegram 通知
            </mat-slide-toggle>
          </div>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>Bot Token</mat-label>
            <input matInput
                   [(ngModel)]="config.bot_token"
                   placeholder="123456789:ABCdefGHIjklMNOpqrSTUvwxYZ"
                   [disabled]="!config.is_enabled">
            <mat-hint>從 BotFather 取得</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>群組 Chat ID</mat-label>
            <input matInput
                   [(ngModel)]="config.chat_id"
                   placeholder="-1001234567890"
                   [disabled]="!config.is_enabled">
            <mat-hint>群組 ID 是負數開頭</mat-hint>
          </mat-form-field>

          <mat-form-field appearance="outline" class="full-width">
            <mat-label>話題 Thread ID（選填）</mat-label>
            <input matInput
                   [(ngModel)]="config.thread_id"
                   placeholder="123"
                   [disabled]="!config.is_enabled">
            <mat-hint>如果群組有開啟話題功能</mat-hint>
          </mat-form-field>
        </mat-card-content>

        <mat-card-actions>
          <button mat-button
                  class="test-button"
                  (click)="testNotification()"
                  [disabled]="testing || !config.is_enabled || !config.bot_token || !config.chat_id">
            <mat-spinner diameter="18" *ngIf="testing"></mat-spinner>
            <span *ngIf="!testing">測試通知</span>
          </button>
          <button mat-raised-button
                  color="primary"
                  (click)="saveSettings()"
                  [disabled]="saving">
            <mat-spinner diameter="18" *ngIf="saving"></mat-spinner>
            <span *ngIf="!saving">儲存設定</span>
          </button>
        </mat-card-actions>
      </mat-card>

      <!-- 說明 -->
      <mat-card class="help-card">
        <mat-card-header>
          <mat-card-title>
            <mat-icon>help_outline</mat-icon>
            設定說明
          </mat-card-title>
        </mat-card-header>
        <mat-card-content>
          <ol>
            <li>在 Telegram 搜尋 BotFather</li>
            <li>發送 <code>/newbot</code> 建立新 Bot</li>
            <li>複製 Bot Token 貼到上方欄位</li>
            <li>把 Bot 加入你的群組</li>
            <li>使用 userinfobot 取得群組 Chat ID</li>
            <li>儲存設定並測試通知</li>
          </ol>
          <p>
            詳細教學請參考
            <a href="./TELEGRAM_SETUP.md" target="_blank">TELEGRAM_SETUP.md</a>
          </p>
        </mat-card-content>
      </mat-card>
    </div>
  `,
  styles: [`
    .settings-container {
      max-width: 600px;
      margin: 0 auto;
    }

    h1 {
      margin-bottom: 24px;
      font-size: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    mat-card {
      margin-bottom: 24px;
      box-shadow: none;
      border: 1px solid var(--app-border);
      background: var(--app-surface);
      border-radius: 3px;
    }

    mat-card-header {
      margin-bottom: 16px;
    }

    mat-card-title {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toggle-row {
      margin-bottom: 24px;
    }

    .full-width {
      width: 100%;
      margin-bottom: 8px;
    }

    mat-card-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
      border-top: 1px solid var(--app-border);
      padding-top: 12px;
    }

    .test-button {
      color: var(--app-text);
    }

    mat-card-actions button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .help-card {
      background: var(--app-surface);
    }

    .help-card ol {
      margin: 0;
      padding-left: 20px;
    }

    .help-card li {
      margin-bottom: 8px;
    }

    .help-card code {
      background: var(--app-surface-elev);
      padding: 2px 6px;
      border-radius: 3px;
      font-family: monospace;
    }

    .help-card p {
      margin-top: 16px;
      margin-bottom: 0;
    }

    .help-card a {
      color: var(--app-accent);
    }
  `]
})
export class SettingsComponent implements OnInit {
  config: TelegramConfig = {
    id: '',
    bot_token: '',
    chat_id: '',
    thread_id: '',
    is_enabled: false
  };
  loading = true;
  saving = false;
  testing = false;

  constructor(
    private supabase: SupabaseService,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.loadSettings();
  }

  async loadSettings() {
    this.loading = true;
    try {
      const { data, error } = await this.supabase.client
        .from('telegram_config')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        this.config = data as TelegramConfig;
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      this.snackBar.open('載入設定失敗', '關閉', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  async saveSettings() {
    this.saving = true;
    try {
      const { error } = await this.supabase.client
        .from('telegram_config')
        .update({
          bot_token: this.config.bot_token || null,
          chat_id: this.config.chat_id || null,
          thread_id: this.config.thread_id || null,
          is_enabled: this.config.is_enabled
        })
        .eq('id', this.config.id);

      if (error) throw error;

      this.snackBar.open('設定已儲存', '關閉', { duration: 3000 });
    } catch (error: any) {
      console.error('Save error:', error);
      this.snackBar.open(error.message || '儲存失敗', '關閉', { duration: 5000 });
    } finally {
      this.saving = false;
    }
  }

  async testNotification() {
    if (!this.config.bot_token || !this.config.chat_id) {
      this.snackBar.open('請先填寫 Bot Token 和 Chat ID', '關閉', { duration: 3000 });
      return;
    }

    this.testing = true;
    try {
      const message = `🔔 測試通知\n\n這是一則測試訊息，如果你看到這個，表示 Telegram 通知設定正確！\n\n時間：${new Date().toLocaleString('zh-TW')}`;

      const payload: any = {
        chat_id: this.config.chat_id,
        text: message
      };

      if (this.config.thread_id) {
        payload.message_thread_id = parseInt(this.config.thread_id);
      }

      const response = await fetch(
        `https://api.telegram.org/bot${this.config.bot_token}/sendMessage`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const result = await response.json();

      if (result.ok) {
        this.snackBar.open('測試通知已發送！', '關閉', { duration: 3000 });
      } else {
        throw new Error(result.description || '發送失敗');
      }
    } catch (error: any) {
      console.error('Test error:', error);
      this.snackBar.open(error.message || '測試失敗', '關閉', { duration: 5000 });
    } finally {
      this.testing = false;
    }
  }
}
