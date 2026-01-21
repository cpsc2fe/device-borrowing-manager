import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { DeviceService, DeviceWithBorrower } from '../../../core/services/device.service';
import { BorrowService } from '../../../core/services/borrow.service';
import { SupabaseService } from '../../../core/services/supabase.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { ReturnConfirmDialogComponent } from '../../../shared/components/return-confirm-dialog/return-confirm-dialog.component';
import { ImageLightboxComponent } from '../../../shared/components/image-lightbox/image-lightbox.component';

@Component({
  selector: 'app-device-page',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule,
    RouterModule
  ],
  template: `
    <div class="device-page">
      <!-- Loading -->
      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <span>載入中...</span>
      </div>

      <!-- Error -->
      <div class="error-state" *ngIf="!loading && error">
        <mat-icon>error_outline</mat-icon>
        <p>{{ error }}</p>
      </div>

      <!-- Device Info -->
      <div class="device-content" *ngIf="!loading && device">
        <a class="back-link" routerLink="/">
          <mat-icon>arrow_back</mat-icon>
          返回設備列表
        </a>
        <mat-card class="device-card">
        <!-- Device Image -->
        <div class="device-image"
             [class.clickable]="device.image_url"
             (click)="openImageLightbox(device)">
          <img *ngIf="device.image_url" [src]="device.image_url" [alt]="device.name">
          <div class="no-image" *ngIf="!device.image_url">
            <mat-icon>smartphone</mat-icon>
          </div>
        </div>

        <!-- Device Info -->
        <mat-card-content>
          <h1 class="device-name">{{ device.name }}</h1>
          <p class="device-detail">
            {{ device.brand }}
            <span *ngIf="device.model"> · {{ device.model }}</span>
          </p>
          <p class="device-os" *ngIf="device.os">
            {{ device.os }} {{ device.os_version }}
          </p>
          <p class="device-notes" *ngIf="device.notes">{{ device.notes }}</p>

          <!-- Status Badge -->
          <div class="status-section">
            <div class="status-badge" [class]="device.status">
              <span *ngIf="device.status === 'available'">可借用</span>
              <span *ngIf="device.status === 'borrowed'">借用中</span>
              <span *ngIf="device.status === 'maintenance'">維修中</span>
            </div>

            <!-- Borrower Info -->
            <div class="borrower-info" *ngIf="device.status === 'borrowed' && device.borrower_name">
              <p>借用者：{{ device.borrower_name }}</p>
              <p class="borrow-time" *ngIf="device.borrowed_at">
                借用時間：{{ formatDate(device.borrowed_at) }}
              </p>
            </div>
          </div>
        </mat-card-content>

        <!-- Actions -->
        <mat-card-actions>
          <!-- Borrow Form (when available) -->
          <div class="borrow-form" *ngIf="device.status === 'available'">
            <mat-form-field appearance="outline" class="full-width">
              <mat-label>你的名字</mat-label>
              <input matInput
                     [(ngModel)]="borrowerName"
                     placeholder="請輸入你的名字"
                     [disabled]="processing">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>Email（選填）</mat-label>
              <input matInput
                     type="email"
                     [(ngModel)]="borrowerEmail"
                     placeholder="your@email.com"
                     [disabled]="processing">
            </mat-form-field>

            <mat-form-field appearance="outline" class="full-width">
              <mat-label>借用用途（選填）</mat-label>
              <input matInput
                     [(ngModel)]="purpose"
                     placeholder="例：iOS App 測試"
                     [disabled]="processing">
            </mat-form-field>

            <button mat-raised-button
                    color="primary"
                    class="full-width action-btn"
                    (click)="borrowDevice()"
                    [disabled]="processing || !borrowerName.trim()">
              <mat-spinner diameter="20" *ngIf="processing"></mat-spinner>
              <span *ngIf="!processing">借用此設備</span>
            </button>
          </div>

          <!-- Return Button (when borrowed by current user) -->
          <div class="return-section" *ngIf="device.status === 'borrowed' && device.borrower_email === currentUserEmail">
            <button mat-raised-button
                    color="warn"
                    class="full-width action-btn"
                    (click)="returnDevice()"
                    [disabled]="processing">
              <mat-spinner diameter="20" *ngIf="processing"></mat-spinner>
              <span *ngIf="!processing">歸還此設備</span>
            </button>
          </div>

          <!-- Borrowed by another user notice -->
          <div class="other-borrower-notice" *ngIf="device.status === 'borrowed' && device.borrower_email !== currentUserEmail">
            <mat-icon>info</mat-icon>
            <p>此設備由其他用戶借用中，無法歸還</p>
          </div>

          <!-- Maintenance Notice -->
          <div class="maintenance-notice" *ngIf="device.status === 'maintenance'">
            <mat-icon>build</mat-icon>
            <p>此設備目前維修中，暫時無法借用</p>
          </div>
        </mat-card-actions>
      </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .device-page {
      min-height: 100vh;
      background: var(--app-bg);
      padding: 16px;
      display: flex;
      justify-content: center;
      align-items: flex-start;
    }

    .device-content {
      width: 100%;
      max-width: 400px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .loading, .error-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      color: var(--app-text-muted);
    }

    .error-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--app-danger);
    }

    .device-card {
      width: 100%;
      margin-top: 0;
      border-radius: 3px;
      overflow: hidden;
    }

    .back-link {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 4px 0;
      color: var(--app-text-muted);
      text-decoration: none;
    }

    .back-link:hover {
      color: var(--app-text);
    }

    .back-link mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .device-image {
      width: 100%;
      height: 200px;
      background: var(--app-surface-elev);
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: 3px 3px 0 0;
      overflow: hidden;
    }

    .device-image.clickable {
      cursor: zoom-in;
    }

    .device-image:not(.clickable) {
      cursor: default;
    }

    .device-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: top center;
    }

    .device-image .no-image {
      color: var(--app-text-muted);
    }

    .device-image .no-image mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
    }

    .device-name {
      font-size: 24px;
      font-weight: 500;
      margin: 16px 0 8px;
    }

    .device-detail {
      font-size: 16px;
      color: var(--app-text);
      margin: 0 0 4px;
    }

    .device-os {
      font-size: 14px;
      color: var(--app-text-muted);
      margin: 0 0 8px;
    }

    .device-notes {
      font-size: 14px;
      color: var(--app-text-muted);
      margin: 8px 0;
      padding: 8px;
      background: var(--app-surface);
      border-radius: 3px;
    }

    .status-section {
      margin: 16px 0;
    }

    .status-badge {
      display: inline-block;
      padding: 6px 16px;
      border-radius: 3px;
      font-size: 14px;
      font-weight: 500;
    }

    .status-badge.available {
      background: var(--app-success-bg);
      color: var(--app-success);
    }

    .status-badge.borrowed {
      background: var(--app-danger-bg);
      color: var(--app-danger);
    }

    .status-badge.maintenance {
      background: var(--app-warning-bg);
      color: var(--app-warning);
    }

    .borrower-info {
      margin-top: 12px;
      padding: 12px;
      background: var(--app-danger-bg);
      border-radius: 3px;
    }

    .borrower-info p {
      margin: 0;
      font-size: 14px;
    }

    .borrower-info .borrow-time {
      color: var(--app-text-muted);
      margin-top: 4px;
    }

    .borrow-form, .return-section {
      padding: 16px;
    }

    .full-width {
      width: 100%;
    }

    .action-btn {
      height: 48px;
      font-size: 16px;
      margin-top: 8px;
    }

    .action-btn mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }

    .maintenance-notice,
    .other-borrower-notice {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      padding: 24px;
      color: var(--app-text-muted);
    }

    .maintenance-notice mat-icon,
    .other-borrower-notice mat-icon {
      font-size: 48px;
      width: 48px;
      height: 48px;
    }

    .other-borrower-notice p {
      margin: 0;
      text-align: center;
    }
  `]
})
export class DevicePageComponent implements OnInit {
  device: DeviceWithBorrower | null = null;
  loading = true;
  error: string | null = null;
  processing = false;
  currentUserEmail = '';

  borrowerName = '';
  borrowerEmail = '';
  purpose = '';

  private readonly STORAGE_KEY_NAME = 'borrower_name';
  private readonly STORAGE_KEY_EMAIL = 'borrower_email';

  constructor(
    private route: ActivatedRoute,
    private deviceService: DeviceService,
    private borrowService: BorrowService,
    private supabase: SupabaseService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog,
    private router: Router
  ) {
    this.borrowerName = localStorage.getItem(this.STORAGE_KEY_NAME) || '';
    this.borrowerEmail = localStorage.getItem(this.STORAGE_KEY_EMAIL) || '';
    this.currentUserEmail = this.supabase.currentUserValue?.email || '';
  }

  ngOnInit() {
    const deviceId = this.route.snapshot.paramMap.get('id');
    if (deviceId) {
      this.loadDevice(deviceId);
    } else {
      this.error = '無效的設備連結';
      this.loading = false;
    }
  }

  async loadDevice(deviceId: string) {
    this.loading = true;
    this.error = null;
    try {
      this.device = await this.deviceService.getDevice(deviceId);
      if (!this.device) {
        this.error = '找不到此設備';
      }
    } catch (err: any) {
      console.error('Load device error:', err);
      this.error = '載入設備資訊失敗';
    } finally {
      this.loading = false;
    }
  }

  async borrowDevice() {
    if (!this.device || !this.borrowerName.trim()) return;

    const name = this.borrowerName.trim();
    const email = this.borrowerEmail.trim() || undefined;

    this.processing = true;
    try {
      const result = await this.borrowService.borrowDevice(
        this.device.id,
        name,
        email,
        this.purpose.trim() || undefined
      );

      if (result.success) {
        // 儲存到 localStorage
        localStorage.setItem(this.STORAGE_KEY_NAME, name);
        if (email) {
          localStorage.setItem(this.STORAGE_KEY_EMAIL, email);
        }

        this.snackBar.open('借用成功！', '關閉', { duration: 3000 });
        // Telegram 通知由資料庫 trigger 自動處理
        await this.loadDevice(this.device.id);
        // 只清除用途，保留姓名和 email
        this.purpose = '';
      } else {
        this.snackBar.open(result.error || '借用失敗', '關閉', { duration: 5000 });
      }
    } catch (err: any) {
      console.error('Borrow error:', err);
      this.snackBar.open(err.message || '借用失敗', '關閉', { duration: 5000 });
    } finally {
      this.processing = false;
    }
  }

  async returnDevice() {
    if (!this.device || !this.device.active_borrow_id) return;

    const dialogRef = this.dialog.open(ReturnConfirmDialogComponent, {
      width: '400px',
      data: {
        deviceName: this.device.name
      }
    });

    dialogRef.afterClosed().subscribe(async (confirmed) => {
      if (confirmed && this.device?.active_borrow_id) {
        this.processing = true;
        try {
          const result = await this.borrowService.returnDevice(this.device.active_borrow_id);
          if (result.success) {
            this.snackBar.open('歸還成功！', '關閉', { duration: 3000 });
            // Telegram 通知由資料庫 trigger 自動處理
            await this.router.navigate(['/']);
          } else {
            this.snackBar.open(result.error || '歸還失敗', '關閉', { duration: 5000 });
          }
        } catch (err: any) {
          console.error('Return error:', err);
          this.snackBar.open(err.message || '歸還失敗', '關閉', { duration: 5000 });
        } finally {
          this.processing = false;
        }
      }
    });
  }

  openImageLightbox(device: DeviceWithBorrower) {
    if (!device.image_url) return;
    this.dialog.open(ImageLightboxComponent, {
      data: {
        imageUrl: device.image_url,
        title: device.name
      }
    });
  }

  formatDate(dateString: string | null): string {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('zh-TW', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
