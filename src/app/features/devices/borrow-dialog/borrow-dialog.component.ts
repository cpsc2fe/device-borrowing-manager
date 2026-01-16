import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { DeviceWithBorrower } from '../../../core/services/device.service';
import { BorrowService } from '../../../core/services/borrow.service';

@Component({
  selector: 'app-borrow-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatSnackBarModule
  ],
  template: `
    <h2 mat-dialog-title>借用設備</h2>

    <mat-dialog-content>
      <!-- 設備資訊 -->
      <div class="device-preview">
        <div class="device-image">
          <img *ngIf="data.device.image_url"
               [src]="data.device.image_url"
               [alt]="data.device.name">
          <div class="no-image" *ngIf="!data.device.image_url">📱</div>
        </div>
        <div class="device-info">
          <h3>{{ data.device.name }}</h3>
          <p>{{ data.device.brand }} · {{ data.device.os }} {{ data.device.os_version }}</p>
        </div>
      </div>

      <!-- 借用用途 -->
      <mat-form-field appearance="outline" class="full-width">
        <mat-label>借用用途（選填）</mat-label>
        <input matInput
               [(ngModel)]="purpose"
               placeholder="例：iOS App 測試"
               [disabled]="loading">
      </mat-form-field>
    </mat-dialog-content>

    <mat-dialog-actions align="end">
      <button mat-button
              (click)="onCancel()"
              [disabled]="loading">
        取消
      </button>
      <button mat-raised-button
              color="primary"
              (click)="onConfirm()"
              [disabled]="loading">
        <mat-spinner diameter="18" *ngIf="loading"></mat-spinner>
        <span *ngIf="!loading">確認借用</span>
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .device-preview {
      display: flex;
      gap: 16px;
      margin-bottom: 24px;
      padding: 16px;
      background: #f5f5f5;
      border-radius: 8px;
    }

    .device-image {
      width: 80px;
      height: 80px;
      border-radius: 8px;
      overflow: hidden;
      background: white;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .device-image img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .no-image {
      font-size: 32px;
    }

    .device-info h3 {
      margin: 0 0 4px;
      font-size: 16px;
    }

    .device-info p {
      margin: 0;
      font-size: 14px;
      color: rgba(0,0,0,0.54);
    }

    .full-width {
      width: 100%;
    }

    mat-dialog-actions button mat-spinner {
      display: inline-block;
      margin-right: 8px;
    }
  `]
})
export class BorrowDialogComponent {
  purpose = '';
  loading = false;

  constructor(
    public dialogRef: MatDialogRef<BorrowDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { device: DeviceWithBorrower },
    private borrowService: BorrowService,
    private snackBar: MatSnackBar
  ) {}

  onCancel() {
    this.dialogRef.close(false);
  }

  async onConfirm() {
    this.loading = true;
    try {
      const result = await this.borrowService.borrowDevice(
        this.data.device.id,
        this.purpose || undefined
      );

      if (result.success) {
        this.snackBar.open('借用成功！', '關閉', { duration: 3000 });
        await this.borrowService.notifyBorrow(this.data.device.name, this.purpose || undefined);
        this.dialogRef.close(true);
      } else {
        this.snackBar.open(result.error || '借用失敗', '關閉', { duration: 5000 });
      }
    } catch (error: any) {
      console.error('Borrow error:', error);
      this.snackBar.open(error.message || '借用失敗', '關閉', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
