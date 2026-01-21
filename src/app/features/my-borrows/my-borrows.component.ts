import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { SupabaseService } from '../../core/services/supabase.service';
import { BorrowService } from '../../core/services/borrow.service';
import { ReturnConfirmDialogComponent } from '../../shared/components/return-confirm-dialog/return-confirm-dialog.component';

interface MyBorrow {
  id: string;
  device_id: string;
  device_name: string;
  device_brand: string;
  device_model: string;
  device_image_url: string | null;
  borrowed_at: string;
  purpose: string | null;
  processing?: boolean;
}

@Component({
  selector: 'app-my-borrows',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="my-borrows-container">
      <h1>我的借用</h1>

      <!-- 載入中 -->
      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- 無借用記錄 -->
      <mat-card class="empty-card" *ngIf="!loading && borrows.length === 0">
        <mat-card-content>
          <mat-icon>devices</mat-icon>
          <p>目前沒有借用中的設備</p>
          <a mat-raised-button color="primary" routerLink="/">
            瀏覽設備列表
          </a>
        </mat-card-content>
      </mat-card>

      <!-- 借用列表 -->
      <div class="borrow-list" *ngIf="!loading && borrows.length > 0">
        <mat-card *ngFor="let borrow of borrows" class="borrow-card">
          <div class="borrow-content">
            <div class="device-image">
              <img *ngIf="borrow.device_image_url" [src]="borrow.device_image_url" [alt]="borrow.device_name">
              <mat-icon *ngIf="!borrow.device_image_url">phone_android</mat-icon>
            </div>
            <div class="device-info">
              <h3>{{ borrow.device_name }}</h3>
              <p class="device-model">{{ borrow.device_brand }} · {{ borrow.device_model }}</p>
              <p class="borrow-time">
                <mat-icon>schedule</mat-icon>
                借用時間：{{ formatDate(borrow.borrowed_at) }}
              </p>
              <p class="borrow-purpose" *ngIf="borrow.purpose">
                <mat-icon>description</mat-icon>
                用途：{{ borrow.purpose }}
              </p>
            </div>
            <div class="actions">
              <button mat-raised-button
                      color="warn"
                      [disabled]="borrow.processing"
                      (click)="returnDevice(borrow)">
                <mat-spinner diameter="20" *ngIf="borrow.processing"></mat-spinner>
                <span *ngIf="!borrow.processing">歸還</span>
              </button>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
  styles: [`
    .my-borrows-container {
      max-width: 800px;
      margin: 0 auto;
    }

    h1 {
      margin: 0 0 24px 0;
      font-size: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .empty-card {
      text-align: center;
      padding: 48px 24px;
    }

    .empty-card mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      color: var(--app-text-muted);
      margin-bottom: 16px;
    }

    .empty-card p {
      color: var(--app-text-muted);
      margin-bottom: 24px;
    }

    .borrow-list {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }

    .borrow-card {
      overflow: hidden;
    }

    .borrow-content {
      display: flex;
      align-items: center;
      gap: 16px;
      padding: 16px;
    }

    .device-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      background: var(--app-surface-hover);
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .device-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .device-image mat-icon {
      font-size: 40px;
      width: 40px;
      height: 40px;
      color: var(--app-text-muted);
    }

    .device-info {
      flex: 1;
      min-width: 0;
    }

    .device-info h3 {
      margin: 0 0 4px 0;
      font-size: 18px;
    }

    .device-model {
      margin: 0 0 8px 0;
      color: var(--app-text-muted);
      font-size: 14px;
    }

    .borrow-time,
    .borrow-purpose {
      margin: 0;
      font-size: 13px;
      color: var(--app-text-muted);
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .borrow-time mat-icon,
    .borrow-purpose mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .actions {
      flex-shrink: 0;
    }

    .actions button {
      min-width: 80px;
    }

    @media (max-width: 600px) {
      .borrow-content {
        flex-wrap: wrap;
      }

      .device-image {
        width: 60px;
        height: 60px;
      }

      .device-info {
        flex-basis: calc(100% - 76px);
      }

      .actions {
        width: 100%;
        margin-top: 8px;
      }

      .actions button {
        width: 100%;
      }
    }
  `]
})
export class MyBorrowsComponent implements OnInit {
  borrows: MyBorrow[] = [];
  loading = true;
  userEmail = '';

  constructor(
    private supabase: SupabaseService,
    private borrowService: BorrowService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    this.userEmail = this.supabase.currentUserValue?.email || '';
    await this.loadMyBorrows();
  }

  async loadMyBorrows() {
    this.loading = true;
    try {
      const { data, error } = await this.supabase.client
        .from('borrows')
        .select(`
          id,
          device_id,
          borrowed_at,
          purpose,
          devices (
            name,
            brand,
            model,
            image_url
          )
        `)
        .eq('borrower_email', this.userEmail)
        .eq('status', 'active')
        .order('borrowed_at', { ascending: false });

      if (error) throw error;

      this.borrows = (data || []).map((b: any) => ({
        id: b.id,
        device_id: b.device_id,
        device_name: b.devices?.name || '未知設備',
        device_brand: b.devices?.brand || '',
        device_model: b.devices?.model || '',
        device_image_url: b.devices?.image_url || null,
        borrowed_at: b.borrowed_at,
        purpose: b.purpose
      }));
    } catch (error: any) {
      console.error('Load my borrows error:', error);
      this.snackBar.open('載入借用記錄失敗', '關閉', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }

  returnDevice(borrow: MyBorrow) {
    const dialogRef = this.dialog.open(ReturnConfirmDialogComponent, {
      width: '400px',
      data: { deviceName: borrow.device_name }
    });

    dialogRef.afterClosed().subscribe(async (confirmed: boolean) => {
      if (confirmed) {
        borrow.processing = true;
        try {
          const response = await this.borrowService.returnDevice(borrow.id);
          if (response.success) {
            this.snackBar.open('歸還成功！', '關閉', { duration: 3000 });
            await this.loadMyBorrows();
          } else {
            this.snackBar.open(response.error || '歸還失敗', '關閉', { duration: 5000 });
          }
        } catch (error: any) {
          console.error('Return error:', error);
          this.snackBar.open(error.message || '歸還失敗', '關閉', { duration: 5000 });
        } finally {
          borrow.processing = false;
        }
      }
    });
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}
