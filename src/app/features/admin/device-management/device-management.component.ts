import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DeviceService, Device } from '../../../core/services/device.service';
import { DeviceFormDialogComponent } from '../device-form-dialog/device-form-dialog.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-device-management',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  template: `
    <div class="device-management-container">
      <div class="header">
        <h1>設備管理</h1>
        <button mat-raised-button color="primary" (click)="openAddDialog()">
          <mat-icon>add</mat-icon>
          新增設備
        </button>
      </div>

      <!-- 載入中 -->
      <div class="loading" *ngIf="loading">
        <mat-spinner diameter="40"></mat-spinner>
      </div>

      <!-- 設備列表 -->
      <mat-card *ngIf="!loading">
        <table mat-table [dataSource]="devices" class="device-table">
          <!-- 圖片 -->
          <ng-container matColumnDef="image">
            <th mat-header-cell *matHeaderCellDef></th>
            <td mat-cell *matCellDef="let device">
              <div class="device-thumb">
                <img *ngIf="device.image_url" [src]="device.image_url" [alt]="device.name">
                <mat-icon *ngIf="!device.image_url">phone_android</mat-icon>
              </div>
            </td>
          </ng-container>

          <!-- 名稱 -->
          <ng-container matColumnDef="name">
            <th mat-header-cell *matHeaderCellDef>名稱</th>
            <td mat-cell *matCellDef="let device">
              <strong>{{ device.name }}</strong>
              <div class="device-model">{{ device.brand }} · {{ device.model }}</div>
            </td>
          </ng-container>

          <!-- 系統 -->
          <ng-container matColumnDef="os">
            <th mat-header-cell *matHeaderCellDef>作業系統</th>
            <td mat-cell *matCellDef="let device">
              {{ device.os }} {{ device.os_version }}
            </td>
          </ng-container>

          <!-- 狀態 -->
          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef>狀態</th>
            <td mat-cell *matCellDef="let device">
              <span class="status-chip" [ngClass]="device.status">
                <span *ngIf="device.status === 'available'">🟢 可借用</span>
                <span *ngIf="device.status === 'borrowed'">🔴 已借出</span>
                <span *ngIf="device.status === 'maintenance'">🟡 維修中</span>
              </span>
            </td>
          </ng-container>

          <!-- 操作 -->
          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef>操作</th>
            <td mat-cell *matCellDef="let device">
              <button mat-icon-button color="primary" (click)="openEditDialog(device)">
                <mat-icon>edit</mat-icon>
              </button>
              <button mat-icon-button color="warn" (click)="deleteDevice(device)">
                <mat-icon>delete</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <!-- 空狀態 -->
        <div class="empty-state" *ngIf="devices.length === 0">
          <mat-icon>devices</mat-icon>
          <p>還沒有任何設備</p>
          <button mat-raised-button color="primary" (click)="openAddDialog()">
            新增第一台設備
          </button>
        </div>
      </mat-card>
    </div>
  `,
  styles: [`
    .device-management-container {
      max-width: 1000px;
      margin: 0 auto;
    }

    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }

    .header h1 {
      margin: 0;
      font-size: 24px;
    }

    .loading {
      display: flex;
      justify-content: center;
      padding: 48px;
    }

    .device-table {
      width: 100%;
    }

    .device-thumb {
      width: 48px;
      height: 48px;
      border-radius: 8px;
      overflow: hidden;
      background: #f5f5f5;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .device-thumb img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .device-thumb mat-icon {
      color: rgba(0,0,0,0.26);
    }

    .device-model {
      font-size: 12px;
      color: rgba(0,0,0,0.54);
    }

    .status-chip {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 12px;
      font-size: 12px;
    }

    .status-chip.available {
      background: #e8f5e9;
      color: #2e7d32;
    }

    .status-chip.borrowed {
      background: #ffebee;
      color: #c62828;
    }

    .status-chip.maintenance {
      background: #fff3e0;
      color: #ef6c00;
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
      .header {
        flex-direction: column;
        gap: 16px;
        align-items: flex-start;
      }
    }
  `]
})
export class DeviceManagementComponent implements OnInit {
  devices: Device[] = [];
  displayedColumns = ['image', 'name', 'os', 'status', 'actions'];
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
    } catch (error) {
      console.error('Error loading devices:', error);
      this.snackBar.open('載入設備失敗', '關閉', { duration: 3000 });
    } finally {
      this.loading = false;
    }
  }

  openAddDialog() {
    const dialogRef = this.dialog.open(DeviceFormDialogComponent, {
      width: '500px',
      data: { mode: 'add' }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDevices();
      }
    });
  }

  openEditDialog(device: Device) {
    const dialogRef = this.dialog.open(DeviceFormDialogComponent, {
      width: '500px',
      data: { mode: 'edit', device }
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.loadDevices();
      }
    });
  }

  deleteDevice(device: Device) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '320px',
      data: {
        title: '確認刪除',
        message: `確定要刪除「${device.name}」嗎？此操作無法復原。`,
        confirmText: '確認刪除',
        confirmColor: 'warn'
      }
    });

    dialogRef.afterClosed().subscribe(async (result) => {
      if (result) {
        try {
          await this.deviceService.deleteDevice(device.id);
          this.snackBar.open('刪除成功', '關閉', { duration: 3000 });
          await this.loadDevices();
        } catch (error: any) {
          console.error('Delete error:', error);
          this.snackBar.open(error.message || '刪除失敗', '關閉', { duration: 5000 });
        }
      }
    });
  }
}
