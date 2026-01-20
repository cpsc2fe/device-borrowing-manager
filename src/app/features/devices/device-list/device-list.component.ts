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
import { DeviceService, DeviceWithBorrower } from '../../../core/services/device.service';
import { QrDialogComponent } from '../../../shared/components/qr-dialog/qr-dialog.component';

@Component({
  selector: 'app-device-list',
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
    <div class="device-list-container">
      <!-- 說明 -->
      <div class="info-banner">
        <mat-icon>qr_code_scanner</mat-icon>
        <span>掃描設備上的 QR Code 即可借用或歸還</span>
      </div>

      <!-- 統計卡片 -->
      <div class="stats-row">
        <div class="stat-card">
          <div class="stat-number">{{ stats.total }}</div>
          <div class="stat-label">總設備</div>
        </div>
        <div class="stat-card available">
          <div class="stat-number">{{ stats.available }}</div>
          <div class="stat-label">可借用</div>
        </div>
        <div class="stat-card borrowed">
          <div class="stat-number">{{ stats.borrowed }}</div>
          <div class="stat-label">已借出</div>
        </div>
      </div>

      <!-- 載入中 -->
      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
        <span>載入中...</span>
      </div>

      <!-- 設備列表 -->
      <div class="device-grid" *ngIf="!loading">
        <mat-card class="device-card" *ngFor="let device of devices">
          <!-- 設備圖片 -->
          <div class="device-image" [routerLink]="['/device', device.id]">
            <img *ngIf="device.image_url"
                 [src]="device.image_url"
                 [alt]="device.name"
                 (error)="onImageError($event)">
            <div class="no-image" *ngIf="!device.image_url">
              <mat-icon>phone_android</mat-icon>
            </div>
          </div>

          <!-- 狀態標籤 -->
          <div class="status-badge" [ngClass]="device.status">
            <span *ngIf="device.status === 'available'">可借用</span>
            <span *ngIf="device.status === 'borrowed'">已借出</span>
            <span *ngIf="device.status === 'maintenance'">維修中</span>
          </div>

          <!-- 設備資訊 -->
          <mat-card-content>
            <h3 class="device-name">{{ device.name }}</h3>
            <p class="device-info">{{ device.brand }} · {{ device.os }} {{ device.os_version }}</p>

            <!-- 借用者資訊 -->
            <div class="borrower-info" *ngIf="device.status === 'borrowed' && device.borrower_name">
              <mat-icon>person</mat-icon>
              <span>{{ device.borrower_name }}</span>
            </div>
          </mat-card-content>

          <!-- 操作按鈕 -->
          <mat-card-actions>
            <button mat-stroked-button
                    color="primary"
                    (click)="showQrCode(device)">
              <mat-icon>qr_code</mat-icon>
              QR Code
            </button>
            <button mat-flat-button
                    color="primary"
                    [routerLink]="['/device', device.id]">
              <mat-icon>open_in_new</mat-icon>
              開啟
            </button>
          </mat-card-actions>
        </mat-card>
      </div>

      <!-- 空狀態 -->
      <div class="empty-state" *ngIf="!loading && devices.length === 0">
        <mat-icon>devices</mat-icon>
        <p>目前沒有任何設備</p>
      </div>
    </div>
  `,
  styles: [`
    .device-list-container {
      max-width: 1200px;
      margin: 0 auto;
    }

    .info-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 12px 16px;
      background: #e3f2fd;
      border-radius: 8px;
      margin-bottom: 16px;
      color: #1565c0;
    }

    .info-banner mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
    }

    .stats-row {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      flex: 1;
      background: white;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .stat-number {
      font-size: 32px;
      font-weight: 500;
      color: rgba(0,0,0,0.87);
    }

    .stat-label {
      font-size: 14px;
      color: rgba(0,0,0,0.54);
    }

    .stat-card.available .stat-number {
      color: #4caf50;
    }

    .stat-card.borrowed .stat-number {
      color: #f44336;
    }

    .loading {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 16px;
      padding: 48px;
      color: rgba(0,0,0,0.54);
    }

    .device-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 16px;
    }

    .device-card {
      display: flex;
      flex-direction: column;
    }

    .device-image {
      width: 100%;
      height: 180px;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
      overflow: hidden;
      cursor: pointer;
    }

    .device-image:hover {
      opacity: 0.9;
    }

    .device-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .no-image {
      color: rgba(0,0,0,0.26);
    }

    .no-image mat-icon {
      font-size: 64px;
      width: 64px;
      height: 64px;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 16px;
      font-size: 12px;
      font-weight: 500;
      margin: 12px 16px 0;
      width: fit-content;
    }

    .status-badge.available {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-badge.borrowed {
      background: #ffebee;
      color: #c62828;
    }

    .status-badge.maintenance {
      background: #fff3e0;
      color: #ef6c00;
    }

    mat-card-content {
      flex: 1;
      padding: 16px !important;
    }

    .device-name {
      margin: 0 0 4px;
      font-size: 18px;
      font-weight: 500;
    }

    .device-info {
      margin: 0;
      font-size: 14px;
      color: rgba(0,0,0,0.54);
    }

    .borrower-info {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-top: 8px;
      font-size: 12px;
      color: rgba(0,0,0,0.54);
    }

    .borrower-info mat-icon {
      font-size: 16px;
      width: 16px;
      height: 16px;
    }

    mat-card-actions {
      padding: 8px 16px 16px !important;
      display: flex;
      gap: 8px;
    }

    mat-card-actions button {
      flex: 1;
    }

    mat-card-actions button mat-icon {
      margin-right: 4px;
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

    @media (max-width: 600px) {
      .stats-row {
        flex-wrap: wrap;
      }

      .stat-card {
        min-width: calc(50% - 8px);
      }

      .device-grid {
        grid-template-columns: 1fr;
      }
    }
  `]
})
export class DeviceListComponent implements OnInit {
  devices: DeviceWithBorrower[] = [];
  stats = { total: 0, available: 0, borrowed: 0, maintenance: 0 };
  loading = true;

  constructor(
    private deviceService: DeviceService,
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

  async ngOnInit() {
    await this.loadDevices();
  }

  async loadDevices() {
    this.loading = true;
    try {
      this.devices = await this.deviceService.getDevices();
      this.stats = await this.deviceService.getStats();
    } catch (error) {
      console.error('Error loading devices:', error);
      this.snackBar.open('載入設備失敗', '關閉', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  showQrCode(device: DeviceWithBorrower) {
    this.dialog.open(QrDialogComponent, {
      width: '350px',
      data: {
        deviceId: device.id,
        deviceName: device.name
      }
    });
  }

  onImageError(event: Event) {
    (event.target as HTMLImageElement).style.display = 'none';
  }
}
