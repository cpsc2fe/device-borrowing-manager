import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { BorrowService, BorrowWithDevice } from '../../../core/services/borrow.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-my-borrows',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDialogModule
  ],
  template: `
    <div class="my-borrows-container">
      <!-- 載入中 -->
      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <span>載入中...</span>
      </div>

      <div *ngIf="!loading">
        <!-- 目前借用中 -->
        <section class="section" *ngIf="activeBorrows.length > 0">
          <h2 class="section-title">目前借用中</h2>
          <div class="borrow-list">
            <mat-card class="borrow-card active" *ngFor="let borrow of activeBorrows">
              <div class="borrow-content">
                <div class="device-image">
                  <img *ngIf="borrow.devices?.image_url"
                       [src]="borrow.devices.image_url"
                       [alt]="borrow.devices?.name">
                  <div class="no-image" *ngIf="!borrow.devices?.image_url">📱</div>
                </div>
                <div class="borrow-info">
                  <h3>{{ borrow.devices?.name }}</h3>
                  <p class="device-detail">{{ borrow.devices?.brand }} · {{ borrow.devices?.model }}</p>
                  <p class="borrow-time">
                    <mat-icon>schedule</mat-icon>
                    借用時間：{{ formatDate(borrow.borrowed_at) }}
                  </p>
                  <p class="purpose" *ngIf="borrow.purpose">
                    <mat-icon>description</mat-icon>
                    用途：{{ borrow.purpose }}
                  </p>
                </div>
                <div class="borrow-actions">
                  <button mat-raised-button
                          color="primary"
                          (click)="returnDevice(borrow)"
                          [disabled]="returning === borrow.id">
                    <mat-spinner diameter="18" *ngIf="returning === borrow.id"></mat-spinner>
                    <span *ngIf="returning !== borrow.id">歸還設備</span>
                  </button>
                </div>
              </div>
            </mat-card>
          </div>
        </section>

        <!-- 歷史記錄 -->
        <section class="section" *ngIf="returnedBorrows.length > 0">
          <h2 class="section-title">歷史記錄</h2>
          <div class="borrow-list">
            <mat-card class="borrow-card returned" *ngFor="let borrow of returnedBorrows">
              <div class="borrow-content">
                <div class="device-image small">
                  <img *ngIf="borrow.devices?.image_url"
                       [src]="borrow.devices.image_url"
                       [alt]="borrow.devices?.name">
                  <div class="no-image" *ngIf="!borrow.devices?.image_url">📱</div>
                </div>
                <div class="borrow-info">
                  <h3>{{ borrow.devices?.name }}</h3>
                  <p class="borrow-time">
                    {{ formatDate(borrow.borrowed_at) }} ~ {{ formatDate(borrow.returned_at) }}
                  </p>
                  <p class="purpose" *ngIf="borrow.purpose">用途：{{ borrow.purpose }}</p>
                </div>
                <div class="status-badge">
                  <mat-icon>check_circle</mat-icon>
                  已歸還
                </div>
              </div>
            </mat-card>
          </div>
        </section>

        <!-- 空狀態 -->
        <div class="empty-state" *ngIf="activeBorrows.length === 0 && returnedBorrows.length === 0">
          <mat-icon>assignment</mat-icon>
          <p>還沒有任何借用記錄</p>
          <p class="hint">前往設備列表借用設備吧！</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .my-borrows-container {
      max-width: 800px;
      margin: 0 auto;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      color: rgba(0,0,0,0.54);
    }

    .section {
      margin-bottom: 32px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 500;
      margin-bottom: 16px;
      color: rgba(0,0,0,0.87);
    }

    .borrow-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    .borrow-card {
      padding: 16px;
    }

    .borrow-card.active {
      border-left: 4px solid #4caf50;
    }

    .borrow-card.returned {
      opacity: 0.7;
    }

    .borrow-content {
      display: flex;
      gap: 16px;
      align-items: center;
    }

    .device-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .device-image.small {
      width: 60px;
      height: 60px;
    }

    .device-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .no-image {
      font-size: 24px;
    }

    .borrow-info {
      flex: 1;
      min-width: 0;
    }

    .borrow-info h3 {
      margin: 0 0 4px;
      font-size: 16px;
      font-weight: 500;
    }

    .device-detail {
      margin: 0 0 8px;
      font-size: 14px;
      color: rgba(0,0,0,0.54);
    }

    .borrow-time {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 4px 0;
      font-size: 13px;
      color: rgba(0,0,0,0.54);
    }

    .borrow-time mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .purpose {
      display: flex;
      align-items: center;
      gap: 4px;
      margin: 4px 0;
      font-size: 13px;
      color: rgba(0,0,0,0.54);
    }

    .purpose mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    .borrow-actions {
      flex-shrink: 0;
    }

    .borrow-actions button mat-spinner {
      display: inline-block;
    }

    .status-badge {
      display: flex;
      align-items: center;
      gap: 4px;
      color: #4caf50;
      font-size: 13px;
    }

    .status-badge mat-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
    }

    .empty-state {
      text-align: center;
      padding: 48px;
      color: rgba(0,0,0,0.54);
    }

    .empty-state mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
      margin-bottom: 16px;
    }

    .empty-state .hint {
      font-size: 14px;
    }

    @media (max-width: 600px) {
      .borrow-content {
        flex-wrap: wrap;
      }

      .borrow-actions {
        width: 100%;
        margin-top: 8px;
      }

      .borrow-actions button {
        width: 100%;
      }
    }
  `]
})
export class MyBorrowsComponent implements OnInit {
  activeBorrows: BorrowWithDevice[] = [];
  returnedBorrows: BorrowWithDevice[] = [];
  loading = true;
  returning: string | null = null;

  constructor(
    private borrowService: BorrowService,
    private snackBar: MatSnackBar,
    private dialog: MatDialog
  ) {}

  async ngOnInit() {
    await this.loadBorrows();
  }

  async loadBorrows() {
    this.loading = true;
    try {
      const borrows = await this.borrowService.getMyBorrows();
      this.activeBorrows = borrows.filter(b => b.status === 'active');
      this.returnedBorrows = borrows.filter(b => b.status === 'returned');
    } catch (error) {
      console.error('Error loading borrows:', error);
      this.snackBar.open('載入借用記錄失敗', '關閉', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  async returnDevice(borrow: BorrowWithDevice) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '320px',
      data: {
        title: '確認歸還',
        message: `確定要歸還「${borrow.devices?.name}」嗎？`,
        confirmText: '確認歸還',
        cancelText: '取消'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        this.returning = borrow.id;
        try {
          const response = await this.borrowService.returnDevice(borrow.id);
          if (response.success) {
            this.snackBar.open('歸還成功！', '關閉', { duration: 3000 });
            if (borrow.devices?.name) {
              await this.borrowService.notifyReturn(borrow.devices.name);
            }
            await this.loadBorrows();
          } else {
            this.snackBar.open(response.error || '歸還失敗', '關閉', { duration: 5000 });
          }
        } catch (error: any) {
          console.error('Return error:', error);
          this.snackBar.open(error.message || '歸還失敗', '關閉', { duration: 5000 });
        } finally {
          this.returning = null;
        }
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
